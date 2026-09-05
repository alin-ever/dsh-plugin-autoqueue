/**
 * 会话驱动 — 所有 apiProxy 调用集中在此
 * 核心差异：goals + antiBlock（task-board 用 turn/end 判定）
 * @module autoqueue/runner
 */

import { ensureRunDir, writeTaskCopy, writeGoalSnapshot, writeResult, getQueueDir } from "./files.js";

const DEFAULT_MAX_GOAL_ROUNDS = 40;
const DEFAULT_MAX_BLOCKED_RESUMES = 3;
const TASK_TIMEOUT_MS = 180 * 60 * 1000; // 3 小时，给慢模型和长任务留足时间
const DEFAULT_RPC_TIMEOUT_MS = 30_000;

/**
 * DSH session ids are a shared host namespace.  A syntactically distinct,
 * UUID-backed prefix is the only kind of session this plugin is allowed to
 * inspect or mutate.
 */
export const AUTOQUEUE_SESSION_PREFIX = "autoqueue-session-";
const AUTOQUEUE_SESSION_ID_PATTERN = /^autoqueue-session-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const AUTOQUEUE_UNATTENDED_PRESET = "autoqueue-unattended-v2";
export const AUTOQUEUE_PTC_UNATTENDED_PRESET = "autoqueue-ptc-unattended-v2";
const AUTOQUEUE_AGENT_PRESETS = new Set([
  AUTOQUEUE_UNATTENDED_PRESET,
  AUTOQUEUE_PTC_UNATTENDED_PRESET,
]);

export function createAutoqueueSessionId() {
  return `${AUTOQUEUE_SESSION_PREFIX}${crypto.randomUUID()}`;
}

export function isAutoqueueSessionId(sessionId) {
  return typeof sessionId === "string" && AUTOQUEUE_SESSION_ID_PATTERN.test(sessionId);
}

function sessionOwnershipFailure(sessionId, operation) {
  const err = new Error(`${operation}: session-not-owned: refusing to access non-autoqueue session ${JSON.stringify(sessionId)}`);
  err.code = "session-not-owned";
  return err;
}

function assertOwnedSession(sessionId, operation) {
  if (!isAutoqueueSessionId(sessionId)) {
    throw sessionOwnershipFailure(sessionId, operation);
  }
}

// ─── RPC 辅助 ──────────────────────────────────────────

function rpcId() {
  return `autoqueue-${crypto.randomUUID()}`;
}

function request(payload) {
  return { rpcId: rpcId(), payload };
}

function failure(error, operation = "DSH RPC") {
  const code = error?.code ?? "rpc-failed";
  const message = error?.message ?? "unknown RPC failure";
  const err = new Error(`${operation}: ${code}: ${message}`);
  err.code = code;
  err.details = error?.details;
  err.goalCode = error?.details?.goalCode;
  err.status = error?.status ?? error?.statusCode ?? error?.details?.status ?? error?.details?.statusCode;
  err.statusCode = error?.statusCode ?? error?.status ?? error?.details?.statusCode ?? error?.details?.status;
  err.providerRetryAfterMs = error?.providerRetryAfterMs ?? error?.details?.providerRetryAfterMs;
  return err;
}

function timeoutFailure(operation, timeoutMs) {
  const err = new Error(`${operation}: RPC timed out after ${timeoutMs}ms`);
  err.code = "rpc-timeout";
  return err;
}

function isSessionAbsent(error) {
  return error?.code === "session-not-found";
}

function isGoalAbsent(error) {
  return error?.goalCode === "GOAL_NOT_FOUND";
}

async function withTimeout(promise, timeoutMs, operation) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(timeoutFailure(operation, timeoutMs)), timeoutMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Prompt 构建 ───────────────────────────────────────

function buildAntiBlockPrompt() {
  return `[SYSTEM — 反阻塞唤醒]

⚠️ 重要：仍须严格遵守 goal 中的“无人值守执行边界”。先调用 get_goal 检查当前 goal 状态，确认你真的卡住了再继续。

如果 goal 已经完成或接近完成，直接调用 update_goal(action:'complete') 标记完成，不要执行下面的步骤。

只有当 get_goal 返回 phase='blocked' 或 truly stuck 时，才执行以下步骤：

1. 对照最小完成清单，只定位尚未满足的明确要求。
2. 对该要求的诊断性工具调用最多两次，每次使用彼此不同、严格限于任务范围的方法（包括已经尝试的诊断）。
3. 仍无法解决时，将该部分记录到《GAP.md》，继续其余清单；无其余项时按已有证据收口。
4. 清单一旦满足，立即标记 complete，不做额外探索、复核或替代方案比较。

禁止查看其他队列、~/.dsh、回收站、凭据、既往运行或无关 session 来“找线索”。`;
}

// ─── Runner 工厂 ───────────────────────────────────────

/**
 * 创建 Runner 实例
 * @param {object} apiProxy - ctx.apiProxy
 * @param {object} [options]
 * @param {(state: {sessionId: string}) => Promise<void>|void} [options.prepareSession] Pins and verifies owned session policy before launch or resumed execution.
 */
export function createRunner(apiProxy, options = {}) {
  const maxGoalRounds = options.maxGoalRounds ?? DEFAULT_MAX_GOAL_ROUNDS;
  const maxBlockedResumes = options.maxBlockedResumes ?? DEFAULT_MAX_BLOCKED_RESUMES;
  const taskTimeoutMs = options.taskTimeoutMs ?? TASK_TIMEOUT_MS;
  const configuredRpcTimeout = Number(options.rpcTimeoutMs ?? DEFAULT_RPC_TIMEOUT_MS);
  const rpcTimeoutMs = Number.isFinite(configuredRpcTimeout)
    ? Math.max(1_000, Math.min(120_000, configuredRpcTimeout))
    : DEFAULT_RPC_TIMEOUT_MS;
  const prepareSession = options.prepareSession;
  if (prepareSession !== undefined && typeof prepareSession !== "function") {
    throw new TypeError("prepareSession must be a function");
  }
  // This map is only an in-flight single-flight. Every sequential continuation
  // re-verifies both policy folds so Host-side drift cannot be hidden by a
  // process-lifetime success cache; truly concurrent paths still share work.
  const sessionPreparations = new Map();

  async function ensureSessionPrepared(sessionId, sourceSessionId) {
    if (!prepareSession) return;
    let preparation = sessionPreparations.get(sessionId);
    if (!preparation) {
      preparation = Promise.resolve().then(() => prepareSession({ sessionId, sourceSessionId }));
      sessionPreparations.set(sessionId, preparation);
      const clearPreparation = () => {
        if (sessionPreparations.get(sessionId) === preparation) {
          sessionPreparations.delete(sessionId);
        }
      };
      // Register cleanup before await continuations. Supplying both handlers
      // also avoids manufacturing an unobserved rejected `.finally()` promise.
      preparation.then(clearPreparation, clearPreparation);
    }
    await preparation;
  }

  /**
   * Execute one apiProxy call with a hard wait bound and unwrap only an
   * explicit successful RPC envelope. apiProxy failures are values, not just
   * rejected promises, so every caller must pass through this helper.
   */
  async function callRpc(operation, invoke) {
    let response;
    try {
      response = await withTimeout(Promise.resolve().then(invoke), rpcTimeoutMs, operation);
    } catch (err) {
      if (err?.code === "rpc-timeout") {
        err.rpcAdmissionUncertain = true;
        throw err;
      }
      const wrapped = new Error(`${operation}: ${err instanceof Error ? err.message : String(err)}`);
      wrapped.code = err?.code ?? "rpc-exception";
      wrapped.details = err?.details;
      wrapped.goalCode = err?.goalCode ?? err?.details?.goalCode;
      wrapped.status = err?.status ?? err?.statusCode;
      wrapped.statusCode = err?.statusCode ?? err?.status;
      wrapped.providerRetryAfterMs = err?.providerRetryAfterMs ?? err?.details?.providerRetryAfterMs;
      wrapped.rpcAdmissionUncertain = true;
      throw wrapped;
    }
    if (!response?.result || response.result.ok !== true) {
      const err = failure(response?.result?.error, operation);
      // An explicit ok:false response proves the RPC was rejected. A missing
      // or malformed envelope does not prove whether admission happened.
      err.rpcAdmissionUncertain = response?.result?.ok !== false;
      throw err;
    }
    return response.result.value;
  }

  async function currentGoalSnapshot(sessionId) {
    assertOwnedSession(sessionId, "sessions.history(goal-state)");
    const value = await callRpc("sessions.history(goal-state)", () => (
      apiProxy.sessions.history(request({ sessionId, maxMessages: 1 }))
    ));
    const goal = value?.projections?.values?.goal?.goal;
    if (typeof goal?.id !== "string" || !Number.isInteger(goal?.revision)) return null;
    return {
      ref: { id: goal.id, revision: goal.revision },
      phase: typeof goal.phase === "string" ? goal.phase : "unknown",
    };
  }

  async function currentGoalRef(sessionId) {
    return (await currentGoalSnapshot(sessionId))?.ref ?? null;
  }

  function goalTransitionError(operation, message, { uncertain = false } = {}) {
    const err = new Error(`${operation}: invalid-response: ${message}`);
    err.code = "invalid-response";
    err.rpcAdmissionUncertain = uncertain;
    return err;
  }

  function goalRefFromTransition(value, operation) {
    const ref = value?.ref;
    if (typeof ref?.id !== "string" || !Number.isInteger(ref?.revision)) {
      // A syntactically successful response with no revision is not proof that
      // the Host skipped the transition. Reconcile from history before any
      // follow-up mutation.
      throw goalTransitionError(operation, "goal ref is missing", { uncertain: true });
    }
    return ref;
  }

  function isStaleGoalRevision(err) {
    return err?.goalCode === "GOAL_STALE_REVISION" ||
      err?.code === "GOAL_STALE_REVISION" ||
      err?.code === "goal-stale-revision";
  }

  function isInvalidGoalTransition(err) {
    return err?.goalCode === "GOAL_INVALID_TRANSITION" ||
      err?.code === "GOAL_INVALID_TRANSITION";
  }

  return {
    /**
     * 启动任务：创建隔离会话 → 重命名 → 固化会话策略 → 以完整任务挂 goal
     * 对齐 task-board HostExecutionRunner.launch() 模式
     * @param {import('./ledger.js').LedgerEntry} entry
     * @param {{beforeGoal?: (state: {sessionId: string}) => Promise<void>|void, afterGoal?: (state: {sessionId: string, goalRef: {id:string, revision:number}}) => Promise<void>|void}} [hooks]
     * @returns {Promise<{sessionId: string, goalRef: {id: string, revision: number}}>}
     */
    async launch(entry, hooks = {}) {
      ensureRunDir(entry.workDir);
      writeTaskCopy(entry.workDir, entry.body);

      // cwd is session-local in DSH rc.2. Creating or selecting a Host
      // workspace would mutate global UI state, so autoqueue never does it.
      const requestedSessionId = typeof entry.sessionId === "string" && entry.sessionId.trim()
        ? entry.sessionId
        : createAutoqueueSessionId();
      assertOwnedSession(requestedSessionId, "sessions.create");
      if (entry.agentPreset && !AUTOQUEUE_AGENT_PRESETS.has(entry.agentPreset)) {
        const err = new Error(`sessions.create: agent-preset-not-allowed: ${entry.agentPreset}`);
        err.code = "agent-preset-not-allowed";
        throw err;
      }
      let createValue;
      try {
        createValue = await callRpc("sessions.create", () => apiProxy.sessions.create(request({
          sessionId: requestedSessionId,
          cwd: entry.cwd || getQueueDir(),
          ...(entry.agentPreset ? { agentPreset: entry.agentPreset } : {}),
        })));
      } catch (err) {
        // A timed-out create may still settle remotely. Carry the chosen id so
        // the engine can issue idempotent orphan cleanup.
        throw new SessionLaunchError(requestedSessionId, err, {
          sessionCreateRejected: err?.rpcAdmissionUncertain !== true,
        });
      }
      const sessionId = createValue?.sessionId ?? requestedSessionId;
      if (sessionId !== requestedSessionId || !isAutoqueueSessionId(sessionId)) {
        throw new SessionLaunchError(
          requestedSessionId,
          failure({ code: "session-id-mismatch", message: "sessions.create returned a different session id" }, "sessions.create"),
        );
      }
      let goalRef = null;
      let goalIssued = false;
      let goalRpcAccepted = false;

      try {
        // 重命名
        await callRpc("sessions.rename", () => (
          apiProxy.sessions.rename(request({ sessionId, title: entry.title || entry.key }))
        ));

        // 继承源会话的大模型
        if (entry.provider && entry.model) {
          try {
            await callRpc("session.selectModel", () => apiProxy.sessions.selectModel(request({
              sessionId, provider: entry.provider, model: entry.model,
            })));
          } catch (selectErr) {
            // 模型选择失败不阻塞任务执行，记录但不抛出
            console.error(`[autoqueue] ${entry.key} 模型选择失败:`, selectErr instanceof Error ? selectErr.message : String(selectErr));
          }
        }

        // Approval/sandbox policy is session state, not agent-preset state in
        // DSH rc.2. The host entrypoint supplies a same-process callback that
        // durably pins and verifies that state. It runs after the session is
        // addressable but before goals.create, so failure cannot admit work.
        try {
          await ensureSessionPrepared(sessionId, entry.sourceSessionId);
        } catch (cause) {
          // Normalize into our own extensible error: a host callback may throw
          // a frozen error object, but cleanup metadata must never be allowed
          // to fail before the cancellation attempt runs.
          const prepareError = new Error(
            cause instanceof Error ? cause.message : `session preparation failed: ${String(cause)}`,
            { cause },
          );
          prepareError.code = cause?.code ?? "session-prepare-failed";
          prepareError.details = cause?.details;
          prepareError.status = cause?.status ?? cause?.statusCode;
          prepareError.statusCode = cause?.statusCode ?? cause?.status;
          let cleanupConfirmed = false;
          try {
            await callRpc("sessions.cancel(prepare-failure)", () => (
              apiProxy.sessions.cancel(request({ sessionId }))
            ));
            cleanupConfirmed = true;
          } catch (cleanupError) {
            prepareError.cleanupError = cleanupError;
          }
          prepareError.cleanupConfirmed = cleanupConfirmed;
          throw prepareError;
        }

        // DSH rc.2's goal driver starts work as soon as goals.create arms the
        // goal. The full task therefore has exactly one admission path: the
        // objective itself. A follow-up queue prompt would race and duplicate
        // execution, sometimes starting from only the first heading.
        const objective = entry.body;
        const goalRounds = entry.maxGoalRounds ?? maxGoalRounds;
        // The engine persists the exact session plus a goal-admission marker
        // before the unabortable RPC can mutate remote state.
        await hooks.beforeGoal?.({ sessionId });
        goalIssued = true;
        const goalValue = await callRpc("goals.create", () => apiProxy.goals.create(request({
          sessionId,
          objective,
          maxGoalRounds: goalRounds,
        })));
        goalRpcAccepted = true;
        const candidateGoalRef = goalValue?.ref;
        if (!candidateGoalRef?.id || !Number.isInteger(candidateGoalRef.revision)) {
          throw failure({ code: "invalid-response", message: "goal ref is missing" }, "goals.create");
        }
        goalRef = candidateGoalRef;
        await hooks.afterGoal?.({ sessionId, goalRef });

        return { sessionId, goalRef };
      } catch (err) {
        // 启动失败但 session 已创建 — 返回 sessionId 让调用方记录
        throw new SessionLaunchError(sessionId, err, {
          goalRef,
          goalIssued,
          goalUncertain: goalIssued && !goalRef && (
            err?.rpcAdmissionUncertain === true || goalRpcAccepted
          ),
          promptIssued: false,
          promptUncertain: false,
        });
      }
    },

    /**
     * 轮询会话状态：通过 sessions.history 的 projections.goal 判断
     * @param {string} sessionId
     * @returns {Promise<{phase: string, goalRef?: {id: string, revision: number}, totalMessages?: number, lastActivityTime?: number, output?: string}>}
     */
    async pollTask(sessionId) {
      if (!isAutoqueueSessionId(sessionId)) {
        return {
          phase: "unknown",
          errorCode: "session-not-owned",
          error: sessionOwnershipFailure(sessionId, "sessions.history").message,
        };
      }
      let value;
      try {
        value = await callRpc("sessions.history", () => (
          apiProxy.sessions.history(request({ sessionId, maxMessages: 20 }))
        ));
      } catch (err) {
        return { phase: "unknown", errorCode: err?.code ?? "rpc-exception", error: err?.message };
      }
      const { projections, events } = value;
      const goalProjection = projections?.values?.goal;
      const goal = goalProjection?.goal;
      if (!goal) return { phase: "unknown", errorCode: "goal-projection-missing" };
      // 从历史记录中提取消息数和最后活动时间，用作"确认为活着"的信号
      const historyEvents = Array.isArray(events)
        ? events.map(entry => entry?.event ?? entry).filter(Boolean)
        : [];
      // `goal.phase=complete` can become visible before the goal driver's
      // closing assistant message is appended. The engine waits for the owned
      // session to become idle before settling, then persists this last
      // assembled, uninterrupted model text as an execution artifact. Keep it
      // separate from goal/control state and never derive it from chunks,
      // reasoning, tool calls, or tool results.
      let output;
      for (const event of historyEvents) {
        if (event?.type !== "assistant/message" || event?.data?.interrupted === true) continue;
        const content = event.data?.message?.content;
        if (!Array.isArray(content)) continue;
        const text = content
          .filter(block => block?.type === "text" && typeof block.text === "string")
          .map(block => block.text)
          .join("");
        if (text.trim()) output = text;
      }
      const totalMessages = Number.isInteger(goalProjection.roundsStarted)
        ? goalProjection.roundsStarted
        : historyEvents.filter(event => (
          event?.type === "user/message" || event?.type === "assistant/message"
        )).length;
      let lastActivityTime = typeof goalProjection.updatedAt === "number" ? goalProjection.updatedAt : 0;
      if (historyEvents.length > 0) {
        const lastEvent = historyEvents[historyEvents.length - 1];
        const eventTime = typeof lastEvent.time === "number"
          ? lastEvent.time
          : (lastEvent.time ? new Date(lastEvent.time).getTime() : 0);
        lastActivityTime = Math.max(lastActivityTime, eventTime || 0);
      }
      const goalRef = typeof goal.id === "string" && Number.isInteger(goal.revision)
        ? { id: goal.id, revision: goal.revision }
        : undefined;
      return { phase: goal.phase, goalRef, totalMessages, lastActivityTime, ...(output ? { output } : {}) };
    },

    /**
     * 列出所有活跃 session：用于判断 session 是否还活着
     * @returns {Promise<{known: boolean, items: Array<{sessionId: string, running: boolean}>}>}
     */
    async listSessions() {
      try {
        const value = await callRpc("sessions.list", () => apiProxy.sessions.list(request({})));
        const items = value?.items;
        if (!Array.isArray(items) || items.some(item => (
          !item || typeof item.sessionId !== "string" || typeof item.running !== "boolean"
        ))) {
          return { known: false, items: [], errorCode: "invalid-session-list", error: "sessions.list returned an invalid shape" };
        }
        return { known: true, items };
      } catch (err) {
        return { known: false, items: [], errorCode: err?.code, error: err?.message };
      }
    },

    /**
     * 反阻塞：steering 注入 + resume goal
     * @param {string} sessionId
     * @param {{id: string, revision: number}} goalRef
     * @returns {Promise<{id: string, revision: number}>}
     */
    async antiBlock(sessionId, goalRef) {
      assertOwnedSession(sessionId, "antiBlock");
      await ensureSessionPrepared(sessionId);
      // 注入 steering 指令
      await callRpc("sessions.prompt(steer)", () => apiProxy.sessions.prompt(request({
        sessionId,
        mode: "steer",
        content: [{ type: "text", text: buildAntiBlockPrompt() }],
      })));

      // 重新激活 goal
      const value = await callRpc("goals.resume", () => (
        apiProxy.goals.resume(request({ sessionId, ref: goalRef }))
      ));
      return value.ref;
    },

    /**
     * 唤醒：重启后发 queue prompt + resume goal 重新激活
     * @param {string} sessionId
     * @param {{id: string, revision: number}} goalRef
     */
    async wakeup(sessionId, goalRef) {
      assertOwnedSession(sessionId, "wakeup");
      await ensureSessionPrepared(sessionId);
      await callRpc("sessions.prompt(wakeup)", () => apiProxy.sessions.prompt(request({
        sessionId,
        mode: "queue",
        content: [{ type: "text", text: "[SYSTEM] 任务可能因超时或连接中断而停滞。请先调用 get_goal 检查当前 goal 状态，确认后继续执行未完成的部分。如果已完成，直接调用 update_goal(action:'complete')。" }],
      })));
      const value = await callRpc("goals.resume(wakeup)", () => (
        apiProxy.goals.resume(request({ sessionId, ref: goalRef }))
      ));
      return value.ref;
    },

    /**
     * 循环任务复用会话：在已有 session 中发送新任务内容并创建 goal
     * @param {string} sessionId - 已有 session id
     * @param {string} body - 任务正文
     * @param {number} maxGoalRounds - 最大轮数
     * @returns {Promise<{goalRef: {id: string, revision: number}}>}
     */
    async continueSession(sessionId, body, maxGoalRounds) {
      assertOwnedSession(sessionId, "continueSession");
      await ensureSessionPrepared(sessionId);
      const objective = body;
      await callRpc("sessions.prompt(continue)", () => apiProxy.sessions.prompt(request({
        sessionId,
        mode: "queue",
        content: [{ type: "text", text: objective }],
      })));
      const goalValue = await callRpc("goals.create(continue)", () => apiProxy.goals.create(request({
        sessionId,
        objective,
        maxGoalRounds: maxGoalRounds ?? DEFAULT_MAX_GOAL_ROUNDS,
      })));
      const goalRef = goalValue?.ref;
      if (!goalRef?.id || !Number.isInteger(goalRef.revision)) {
        throw goalTransitionError("continueSession", "goal ref is missing in continue response");
      }
      return { goalRef };
    },

    /**
     * Cooperatively disarm an owned goal before cancelling its current turn.
     * A revision can advance between history/list and this RPC, so stale and
     * admission-uncertain outcomes are reconciled against the authoritative
     * goal projection. The caller must persist the returned ref before cancel.
     */
    async pauseGoal(sessionId, goalRef) {
      assertOwnedSession(sessionId, "pauseGoal");
      await ensureSessionPrepared(sessionId);
      let effectiveRef = goalRef;
      let lastError;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const value = await callRpc("goals.pause(foreground-yield)", () => (
            apiProxy.goals.pause(request({ sessionId, ref: effectiveRef }))
          ));
          return goalRefFromTransition(value, "goals.pause(foreground-yield)");
        } catch (err) {
          lastError = err;
          if (!isStaleGoalRevision(err) && !isInvalidGoalTransition(err) && err?.rpcAdmissionUncertain !== true) {
            throw err;
          }

          let snapshot;
          try {
            snapshot = await currentGoalSnapshot(sessionId);
          } catch {
            throw err;
          }
          if (snapshot?.phase === "paused") return snapshot.ref;
          if (snapshot?.phase !== "active" || attempt > 0) throw err;
          effectiveRef = snapshot.ref;
        }
      }
      throw lastError;
    },

    /**
     * Rearm a cold/disarmed or foreground-paused goal without injecting a
     * duplicate user prompt. Late/uncertain success and stale refs converge
     * through history so a restart cannot strand a paused owned goal.
     */
    async resumeGoal(sessionId, goalRef) {
      assertOwnedSession(sessionId, "resumeGoal");
      await ensureSessionPrepared(sessionId);
      let effectiveRef = goalRef;
      let lastError;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const value = await callRpc("goals.resume(rearm)", () => (
            apiProxy.goals.resume(request({ sessionId, ref: effectiveRef }))
          ));
          return goalRefFromTransition(value, "goals.resume(rearm)");
        } catch (err) {
          lastError = err;
          if (!isStaleGoalRevision(err) && !isInvalidGoalTransition(err) && err?.rpcAdmissionUncertain !== true) {
            throw err;
          }

          let snapshot;
          try {
            snapshot = await currentGoalSnapshot(sessionId);
          } catch {
            throw err;
          }
          // An uncertain RPC followed by an active projection is positive
          // evidence that resumption won. Likewise rc.2 explicitly reports
          // "already active and armed" for a completed idempotent resume.
          if (snapshot?.phase === "active" && (
            err?.rpcAdmissionUncertain === true ||
            (isInvalidGoalTransition(err) && /already active and armed/i.test(err.message))
          )) return snapshot.ref;
          if (!snapshot || !["paused", "blocked", "active"].includes(snapshot.phase) || attempt > 0) {
            throw err;
          }
          effectiveRef = snapshot.ref;
        }
      }
      throw lastError;
    },

    /**
     * 结算：写报告 → 归档会话
     * @param {import('./ledger.js').LedgerEntry} entry
     * @param {"done"|"failed"} result
     * @param {string} [error]
     * @param {string} [output] Last complete assistant text observed after the owned session became idle.
     */
    async finalize(entry, result, error, output) {
      const now = new Date().toISOString();
      writeGoalSnapshot(entry.workDir, `目标: ${entry.body.split("\n")[0]}\n结果: ${result}\n时间: ${now}`);
      writeResult(entry.workDir, JSON.stringify({
        result,
        error: error ?? null,
        output: typeof output === "string" && output.trim() ? output : null,
        attempts: entry.attempts,
        blockedResumes: entry.blockedResumes,
        finishedAt: now,
      }, null, 2));
    },

    /**
     * Clean a partially launched session. If the engine crashed after goal
     * creation but before persisting its ref, recover the current ref from
     * history so cleanup still clears the durable goal before cancellation.
     */
    async cancelLaunch(sessionId, goalRef, { missingIsSuccess = true } = {}) {
      if (!isAutoqueueSessionId(sessionId)) return false;
      let effectiveRef = goalRef;
      if (!effectiveRef) {
        try {
          effectiveRef = await currentGoalRef(sessionId);
        } catch (err) {
          return missingIsSuccess && isSessionAbsent(err);
        }
      }
      if (effectiveRef) return this.cancelTask(sessionId, effectiveRef);
      return this.cancelSession(sessionId, { missingIsSuccess });
    },

    /**
     * 取消任务：clear goal → cancel session
     * @param {string} sessionId
     * @param {{id: string, revision: number}} goalRef
     */
    async cancelTask(sessionId, goalRef) {
      if (!isAutoqueueSessionId(sessionId)) return false;
      let goalCleared = true;
      try {
        await callRpc("goals.clear", () => apiProxy.goals.clear(request({ sessionId, ref: goalRef })));
      } catch (err) {
        goalCleared = isSessionAbsent(err) || isGoalAbsent(err);
        if (err?.goalCode === "GOAL_STALE_REVISION" || err?.code === "GOAL_STALE_REVISION" || err?.code === "goal-stale-revision") {
          try {
            const latestRef = await currentGoalRef(sessionId);
            if (latestRef) {
              await callRpc("goals.clear(latest)", () => (
                apiProxy.goals.clear(request({ sessionId, ref: latestRef }))
              ));
            }
            goalCleared = true;
          } catch (retryError) {
            goalCleared = isSessionAbsent(retryError) || isGoalAbsent(retryError);
          }
        }
      }
      try {
        await callRpc("sessions.cancel", () => apiProxy.sessions.cancel(request({ sessionId })));
        // sessions.cancel stops only the current turn and preserves inbox
        // work. The durable goal must also be cleared or it can continue.
        return goalCleared;
      } catch (err) {
        return isSessionAbsent(err); // idempotent cancellation: already gone
      }
    },

    /**
     * 清理孤儿 session（无 goal）
     * @param {string} sessionId
     * @returns {Promise<boolean>}
     */
    async cancelSession(sessionId, { missingIsSuccess = true } = {}) {
      if (!isAutoqueueSessionId(sessionId)) return false;
      try {
        await callRpc("sessions.cancel", () => apiProxy.sessions.cancel(request({ sessionId })));
        return true;
      } catch (err) {
        return missingIsSuccess && isSessionAbsent(err);
      }
    },

    /**
     * 归档任务的所有会话
     * @param {import('./ledger.js').LedgerEntry} entry
     */
    async archiveSessions(entry) {
      const ids = new Set();
      for (const exec of entry.executions ?? []) {
        if (exec.sessionId) ids.add(exec.sessionId);
      }
      if (entry.sessionId) ids.add(entry.sessionId);
      // Validate the whole batch before the first mutation. One foreign id in
      // a legacy/corrupt ledger makes the archive operation fail closed.
      if ([...ids].some(sid => !isAutoqueueSessionId(sid))) return false;
      let succeeded = true;
      for (const sid of ids) {
        try {
          await callRpc("workspace.archiveSession", () => (
            apiProxy.workspace.archiveSession(request({ sessionId: sid }))
          ));
        } catch (err) {
          // 会话可能已被清理或不存在，视为已归档
          if (!isSessionAbsent(err)) succeeded = false;
        }
      }
      return succeeded;
    },

    maxBlockedResumes,
    taskTimeoutMs,
    rpcTimeoutMs,
  };
}

// ─── 错误类型 ──────────────────────────────────────────

/**
 * 启动失败但已创建 session 的错误
 */
export class SessionLaunchError extends Error {
  /**
   * @param {string} sessionId
   * @param {unknown} cause
   * @param {{goalRef?: {id:string, revision:number}|null, goalIssued?: boolean, goalUncertain?: boolean, promptIssued?: boolean, promptUncertain?: boolean, sessionCreateRejected?: boolean}} [state]
   */
  constructor(sessionId, cause, state = {}) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`execution session ${sessionId} failed during launch: ${msg}`);
    this.name = "SessionLaunchError";
    this.sessionId = sessionId;
    this.code = cause?.code;
    this.details = cause?.details;
    this.goalCode = cause?.goalCode ?? cause?.details?.goalCode;
    this.status = cause?.status ?? cause?.statusCode;
    this.statusCode = cause?.statusCode ?? cause?.status;
    this.providerRetryAfterMs = cause?.providerRetryAfterMs ?? cause?.details?.providerRetryAfterMs;
    this.goalRef = state.goalRef ?? null;
    this.goalIssued = state.goalIssued === true;
    this.goalUncertain = state.goalUncertain === true;
    this.promptIssued = state.promptIssued === true;
    this.promptUncertain = state.promptUncertain === true;
    this.sessionCreateRejected = state.sessionCreateRejected === true;
    this.cause = cause;
  }
}

// antiBlock is now called by engine._pollOne for the blocked case.
// wakeup is available for restart recovery when reconcileInterrupted detects
// a session that may still be alive.

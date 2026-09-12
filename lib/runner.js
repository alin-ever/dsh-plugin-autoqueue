/**
 * 会话驱动 — 所有 DSH 服务调用集中在此
 * 核心差异：goals + antiBlock（task-board 用 turn/end 判定）
 * @module autoqueue/runner
 */

import { ensureRunDir, writeTaskCopy, writeGoalSnapshot, writeResult, getQueueDir } from "./files.js";
import { extractFailureFacts, extractToolCalls, extractAssistantMessages } from "./task-intelligence.js";
import { logger } from "./logger.js";

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
const AUTOQUEUE_AGENT_PRESETS = new Set([
  AUTOQUEUE_UNATTENDED_PRESET,
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

function wrapError(operation, err) {
  const wrapped = new Error(`${operation}: ${err instanceof Error ? err.message : String(err)}`);
  wrapped.code = err?.code ?? "rpc-exception";
  wrapped.details = err?.details;
  wrapped.goalCode = err?.goalCode ?? err?.details?.goalCode;
  wrapped.status = err?.status ?? err?.statusCode;
  wrapped.statusCode = err?.statusCode ?? err?.status;
  wrapped.providerRetryAfterMs = err?.providerRetryAfterMs ?? err?.details?.providerRetryAfterMs;
  wrapped.rpcAdmissionUncertain = true;
  return wrapped;
}

// ─── Message 构建 ──────────────────────────────────────

function buildUserMessage(text) {
  return {
    content: [{ type: "text", text }],
    source: { kind: "plugin", plugin: "autoqueue", form: "notice", summary: "autoqueue" },
  };
}

// ─── Prompt 构建 ───────────────────────────────────────

function buildAntiBlockPrompt(options = {}) {
  const loop = options.loop;
  const guard = options.guard || "";

  const loopHeader = loop
    ? `\n\n[SYSTEM — 空转检测]\n\n⚠️ 检测到异常模式：${loop.pattern}。\n\n请立即停止当前重复操作，换一种完全不同的方式继续。不要重复刚才的动作。\n\n`
    : "";

  return `[SYSTEM — 反阻塞唤醒]${loopHeader}

⚠️ 重要：仍须严格遵守 goal 中的“无人值守执行边界”。先调用 get_goal 检查当前 goal 状态，确认你真的卡住了再继续。

如果 goal 已经完成或接近完成，直接调用 update_goal(action:'complete') 标记完成，不要执行下面的步骤。

只有当 get_goal 返回 phase='blocked' 或 truly stuck 时，才执行以下步骤：

1. 对照最小完成清单，只定位尚未满足的明确要求。
2. 对该要求的诊断性工具调用最多两次，每次使用彼此不同、严格限于任务范围的方法（包括已经尝试的诊断）。
3. 仍无法解决时，将该部分记录到《GAP.md》，继续其余清单；无其余项时按已有证据收口。
4. 清单一旦满足，立即标记 complete，不做额外探索、复核或替代方案比较。

禁止查看其他队列、~/.dsh、回收站、凭据、既往运行或无关 session 来“找线索”。${guard}`;
}

// ─── Runner 工厂 ───────────────────────────────────────

/**
 * 创建 Runner 实例
 * @param {object} services - DSH 服务对象 { agents, sessions, goals, workspaceRegistry, sessionProjections, agentDefaultModel }
 * @param {object} [options]
 * @param {(state: {sessionId: string, session: object}) => Promise<void>|void} [options.prepareSession] Pins and verifies owned session policy before launch or resumed execution.
 */
export function createRunner(services, options = {}) {
  const {
    agents,
    sessions,
    goals,
    workspaceRegistry,
    sessionProjections,
    agentDefaultModel,
  } = services;

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
  const resolveSourceCwd = options.resolveSourceCwd;
  if (resolveSourceCwd !== undefined && typeof resolveSourceCwd !== "function") {
    throw new TypeError("resolveSourceCwd must be a function");
  }
  const attachToWorkspace = options.attachToWorkspace;
  if (attachToWorkspace !== undefined && typeof attachToWorkspace !== "function") {
    throw new TypeError("attachToWorkspace must be a function");
  }

  // This map is only an in-flight single-flight. Every sequential continuation
  // re-verifies both policy folds so Host-side drift cannot be hidden by a
  // process-lifetime success cache; truly concurrent paths still share work.
  const sessionPreparations = new Map();

  async function ensureSessionPrepared(sessionId, sourceSessionId, sandbox) {
    if (!prepareSession) return;
    let preparation = sessionPreparations.get(sessionId);
    if (!preparation) {
      preparation = Promise.resolve().then(() => {
        const session = sessions.get(sessionId);
        return prepareSession({ sessionId, session, sourceSessionId, sandbox });
      });
      sessionPreparations.set(sessionId, preparation);
      const clearPreparation = () => {
        if (sessionPreparations.get(sessionId) === preparation) {
          sessionPreparations.delete(sessionId);
        }
      };
      preparation.then(clearPreparation, clearPreparation);
    }
    await preparation;
  }

  async function getAgent(sessionId) {
    assertOwnedSession(sessionId, "getAgent");
    const agent = agents.get(sessionId);
    if (!agent) {
      const err = new Error(`agent not found: ${sessionId}`);
      err.code = "session-not-found";
      throw err;
    }
    return agent;
  }

  async function currentGoalSnapshot(sessionId) {
    assertOwnedSession(sessionId, "sessionProjections.snapshot(goal)");
    const agent = await getAgent(sessionId);
    const projection = sessionProjections.snapshot(agent.session, ["goal"]);
    const goal = projection.values?.goal?.goal;
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

  function resolveAgentModel(entry) {
    if (entry.provider && entry.model) {
      return { provider: entry.provider, model: entry.model };
    }
    try {
      return agentDefaultModel?.currentSelection?.() ?? null;
    } catch {
      return null;
    }
  }

  return {
    /**
     * 启动任务：创建隔离会话 → 重命名 → 固化会话策略 → 以完整任务挂 goal
     * @param {import('./ledger.js').LedgerEntry} entry
     * @param {{beforeGoal?: (state: {sessionId: string}) => Promise<void>|void, afterGoal?: (state: {sessionId: string, goalRef: {id:string, revision:number}}) => Promise<void>|void}} [hooks]
     * @returns {Promise<{sessionId: string, goalRef: {id: string, revision: number}}>}
     */
    async launch(entry, hooks = {}) {
      ensureRunDir(entry.workDir);
      writeTaskCopy(entry.workDir, entry.body);

      const requestedSessionId = typeof entry.sessionId === "string" && entry.sessionId.trim()
        ? entry.sessionId
        : createAutoqueueSessionId();
      assertOwnedSession(requestedSessionId, "sessions.create");
      if (entry.agentPreset && !AUTOQUEUE_AGENT_PRESETS.has(entry.agentPreset)) {
        const err = new Error(`sessions.create: agent-preset-not-allowed: ${entry.agentPreset}`);
        err.code = "agent-preset-not-allowed";
        throw err;
      }

      // cwd: 优先显式传入 → 源会话继承 → 默认 .dsh/queue
      let sessionCwd = entry.cwd || getQueueDir();
      if (!entry.cwd && entry.sourceSessionId && typeof resolveSourceCwd === "function") {
        try {
          const resolved = await resolveSourceCwd(entry.sourceSessionId);
          if (resolved) sessionCwd = resolved;
        } catch { /* 查找失败，保持默认 */ }
      }

      const effectivePreset = entry.agentPreset || AUTOQUEUE_UNATTENDED_PRESET;
      const modelSelection = resolveAgentModel(entry);
      const sessionId = requestedSessionId;

      // 创建 agent（传入 provider/model 确保 prompt assembly 变量有值）
      // agents.create 内部通过 sessions.prepare 自动创建并 enter/announce session
      let agent;
      try {
        const agentOptions = modelSelection
          ? { provider: modelSelection.provider, model: modelSelection.model }
          : {};
        const handle = await withTimeout(
          agents.create({
            sessionId,
            meta: { cwd: sessionCwd, agentPreset: effectivePreset },
            agentOptions,
          }),
          rpcTimeoutMs,
          "agents.create",
        );
        agent = handle.agent;
      } catch (err) {
        throw new SessionLaunchError(sessionId, wrapError("agents.create", err), {
          sessionCreateRejected: err?.rpcAdmissionUncertain !== true,
        });
      }
      if (agent.session.id !== sessionId || !isAutoqueueSessionId(sessionId)) {
        throw new SessionLaunchError(
          sessionId,
          new Error("agents.create returned a different session id"),
        );
      }

      let goalRef = null;
      let goalIssued = false;
      let goalRpcAccepted = false;

      try {
        // 3. 重命名
        try {
          agent.session.append("session/title", { title: entry.title || entry.key });
        } catch (renameErr) {
          logger.error(`[autoqueue] ${entry.key} 重命名失败:`, renameErr instanceof Error ? renameErr.message : String(renameErr));
        }

        // 4. 选择模型（显式覆盖 agentOptions 中的默认值）
        if (entry.provider && entry.model) {
          try {
            agent.session.append("model/selection", {
              provider: entry.provider,
              model: entry.model,
            });
          } catch (selectErr) {
            logger.error(`[autoqueue] ${entry.key} 模型选择失败:`, selectErr instanceof Error ? selectErr.message : String(selectErr));
          }
        }

        // 5. Approval/sandbox policy
        try {
          await ensureSessionPrepared(sessionId, entry.sourceSessionId, entry.sandbox);
          if (attachToWorkspace) {
            try {
              await attachToWorkspace(sessionId, sessionCwd);
            } catch { /* 工作区挂载失败不影响任务执行 */ }
          }
        } catch (cause) {
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
            agent.cancel({ kind: "user" }, { keepInbox: true });
            cleanupConfirmed = true;
          } catch (cleanupError) {
            prepareError.cleanupError = cleanupError;
          }
          prepareError.cleanupConfirmed = cleanupConfirmed;
          throw prepareError;
        }

        // 6. 创建 goal
        const objective = entry.body;
        const goalRounds = entry.maxGoalRounds ?? maxGoalRounds;
        await hooks.beforeGoal?.({ sessionId });
        goalIssued = true;
        const goalValue = await withTimeout(
          goals.create(agent, { objective, maxGoalRounds: goalRounds }),
          rpcTimeoutMs,
          "goals.create",
        );
        goalRpcAccepted = true;
        const candidateGoalRef = goalValue?.ref;
        if (!candidateGoalRef?.id || !Number.isInteger(candidateGoalRef.revision)) {
          throw new Error("goal ref is missing");
        }
        goalRef = candidateGoalRef;
        await hooks.afterGoal?.({ sessionId, goalRef });

        return { sessionId, goalRef };
      } catch (err) {
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
     * 轮询会话状态：通过 sessionProjections 的 goal projection 判断
     * @param {string} sessionId
     * @returns {Promise<{phase: string, goalRef?: {id: string, revision: number}, totalMessages?: number, lastActivityTime?: number, output?: string, failureFacts?: object, toolCalls?: object, assistantMessages?: object, error?: string, errorCode?: string}>}
     */
    async pollTask(sessionId) {
      if (!isAutoqueueSessionId(sessionId)) {
        return {
          phase: "unknown",
          errorCode: "session-not-owned",
          error: sessionOwnershipFailure(sessionId, "pollTask").message,
        };
      }
      let agent;
      try {
        agent = await getAgent(sessionId);
      } catch (err) {
        return { phase: "unknown", errorCode: err?.code ?? "rpc-exception", error: err?.message };
      }

      const projection = sessionProjections.snapshot(agent.session, ["goal"]);
      const goalProjection = projection.values?.goal;
      const goal = goalProjection?.goal;
      if (!goal) return { phase: "unknown", errorCode: "goal-projection-missing" };

      const historyEvents = Array.isArray(agent.session.log)
        ? agent.session.log
        : [];

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
      const failureFacts = extractFailureFacts(historyEvents);
      const toolCalls = extractToolCalls(historyEvents);
      const assistantMessages = extractAssistantMessages(historyEvents);
      return { phase: goal.phase, goalRef, totalMessages, lastActivityTime, failureFacts, toolCalls, assistantMessages, ...(output ? { output } : {}) };
    },

    /**
     * 列出所有活跃 session
     * @returns {Promise<{known: boolean, items: Array<{sessionId: string, running: boolean}>}>}
     */
    async listSessions() {
      try {
        const agentList = agents.list();
        if (!Array.isArray(agentList)) {
          return { known: false, items: [], errorCode: "invalid-session-list", error: "agents.list returned an invalid shape" };
        }
        const items = agentList.map(agent => ({
          sessionId: agent.id,
          running: agent.status === "running",
        }));
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
    async antiBlock(sessionId, goalRef, options = {}) {
      assertOwnedSession(sessionId, "antiBlock");
      await ensureSessionPrepared(sessionId);
      const agent = await getAgent(sessionId);
      agent.steer(buildUserMessage(buildAntiBlockPrompt(options)));
      const value = await withTimeout(
        goals.resume(agent, goalRef),
        rpcTimeoutMs,
        "goals.resume(antiBlock)",
      );
      return goalRefFromTransition(value, "goals.resume(antiBlock)");
    },

    /**
     * 唤醒：重启后发 queue prompt + resume goal 重新激活
     * @param {string} sessionId
     * @param {{id: string, revision: number}} goalRef
     */
    async wakeup(sessionId, goalRef) {
      assertOwnedSession(sessionId, "wakeup");
      await ensureSessionPrepared(sessionId);
      const agent = await getAgent(sessionId);
      agent.followup(buildUserMessage(
        "[SYSTEM] 任务可能因超时或连接中断而停滞。请先调用 get_goal 检查当前 goal 状态，确认后继续执行未完成的部分。如果已完成，直接调用 update_goal(action:'complete')。"
      ));
      const value = await withTimeout(
        goals.resume(agent, goalRef),
        rpcTimeoutMs,
        "goals.resume(wakeup)",
      );
      return goalRefFromTransition(value, "goals.resume(wakeup)");
    },

    /**
     * Cooperatively disarm an owned goal before cancelling its current turn.
     */
    async pauseGoal(sessionId, goalRef) {
      assertOwnedSession(sessionId, "pauseGoal");
      await ensureSessionPrepared(sessionId);
      const agent = await getAgent(sessionId);
      let effectiveRef = goalRef;
      let lastError;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const value = await withTimeout(
            goals.pause(agent, effectiveRef),
            rpcTimeoutMs,
            "goals.pause(foreground-yield)",
          );
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
     * duplicate user prompt.
     */
    async resumeGoal(sessionId, goalRef) {
      assertOwnedSession(sessionId, "resumeGoal");
      await ensureSessionPrepared(sessionId);
      const agent = await getAgent(sessionId);
      let effectiveRef = goalRef;
      let lastError;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const value = await withTimeout(
            goals.resume(agent, effectiveRef),
            rpcTimeoutMs,
            "goals.resume(rearm)",
          );
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
     * Clean a partially launched session.
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
     */
    async cancelTask(sessionId, goalRef) {
      if (!isAutoqueueSessionId(sessionId)) return false;
      let agent;
      try {
        agent = await getAgent(sessionId);
      } catch {
        return true;
      }
      let goalCleared = true;
      try {
        await withTimeout(goals.clear(agent, goalRef), rpcTimeoutMs, "goals.clear");
      } catch (err) {
        goalCleared = isSessionAbsent(err) || isGoalAbsent(err) || isInvalidGoalTransition(err);
        if (err?.goalCode === "GOAL_STALE_REVISION" || err?.code === "GOAL_STALE_REVISION" || err?.code === "goal-stale-revision") {
          try {
            const latestRef = await currentGoalRef(sessionId);
            if (latestRef) {
              await withTimeout(goals.clear(agent, latestRef), rpcTimeoutMs, "goals.clear(latest)");
              goalCleared = true;
            } else {
              goalCleared = false;
            }
          } catch (retryError) {
            goalCleared = isSessionAbsent(retryError) || isGoalAbsent(retryError);
          }
        }
      }
      try {
        agent.cancel({ kind: "user" }, { keepInbox: true });
        return goalCleared;
      } catch (err) {
        return isSessionAbsent(err);
      }
    },

    /**
     * 清理孤儿 session（无 goal）
     */
    async cancelSession(sessionId, { missingIsSuccess = true } = {}) {
      if (!isAutoqueueSessionId(sessionId)) return false;
      try {
        const agent = await getAgent(sessionId);
        agent.cancel({ kind: "user" }, { keepInbox: true });
        return true;
      } catch (err) {
        return missingIsSuccess && isSessionAbsent(err);
      }
    },

    /**
     * 归档任务的所有会话
     */
    async archiveSessions(entry) {
      const ids = new Set();
      for (const exec of entry.executions ?? []) {
        if (exec.sessionId && isAutoqueueSessionId(exec.sessionId)) ids.add(exec.sessionId);
      }
      if (entry.sessionId && isAutoqueueSessionId(entry.sessionId)) ids.add(entry.sessionId);
      
      if (ids.size === 0) return true; // 没有待归档的 session
      
      let succeeded = true;
      const archivePromises = [];
      
      for (const sid of ids) {
        // 为每个 archiveSession 调用添加超时保护
        const promise = withTimeout(
          workspaceRegistry.archiveSession(sid),
          rpcTimeoutMs,
          `archiveSession ${sid}`
        ).catch(err => {
          // 仅当错误不是 session-absent 时才标记失败
          if (!isSessionAbsent(err)) {
            console.error(`[autoqueue] archiveSessions ${sid} 失败:`, err.message);
            succeeded = false;
          }
          // 静默处理，继续下一个
        });
        archivePromises.push(promise);
      }
      
      // 并行执行所有归档操作
      await Promise.allSettled(archivePromises);
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

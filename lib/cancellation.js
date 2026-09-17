/**
 * 取消收敛 — 怎么停止
 * DSH 特有的取消协议：cancel 只取消当前 turn，不取消 durable goal
 * 因此需要先 clear goal → cancel session → 两次空闲确认 → settle
 * @module autoqueue/cancellation
 */

import { transition, isCancellable, isCancelling } from "./state-machine.js";
import { snapshot } from "./ledger.js";
import { logger } from "./logger.js";

// ─── 常量 ──────────────────────────────────────────────

const MAX_CANCEL_ATTEMPTS = 3;

// ─── 取消意图 ──────────────────────────────────────────

/**
 * @typedef {"stop"|"deadline"|"retry"|"cleanup"} CancelIntent
 */

// ─── 创建取消器 ────────────────────────────────────────

/**
 * 创建取消收敛器
 * @param {object} runner - DSH RPC 调用层
 * @param {object} stateMachine - 状态机
 */
export function createCancellation(runner, stateMachine) {
  if (!runner || typeof runner.cancelTask !== "function") {
    throw new TypeError("cancellation requires runner.cancelTask");
  }
  if (!stateMachine || typeof stateMachine.transition !== "function") {
    throw new TypeError("cancellation requires stateMachine.transition");
  }

  /**
   * 持久化取消意图并请求 DSH 取消
   * @param {object} entry - 当前任务条目
   * @param {CancelIntent} intent - 取消意图
   * @param {string} reason - 取消原因
   * @param {string} [error] - 错误信息
   * @param {object} [extraPatch] - 额外持久化字段
   * @returns {Promise<{accepted: boolean, phase: object}>}
   */
  async function begin(entry, intent, reason, error, extraPatch = {}) {
    if (!entry || !entry.sessionId) {
      return { accepted: false, phase: entry?.phase ?? null, error: "no session" };
    }

    // 检查是否可取消
    const currentPhase = entry.phase ?? { execution: "idle", cancellation: null };
    if (isCancelling(currentPhase)) {
      return { accepted: false, phase: currentPhase, error: "already cancelling" };
    }

    // 转换状态
    const newPhase = transition(currentPhase, "cancel-request");
    if (newPhase === currentPhase) {
      return { accepted: false, phase: currentPhase, error: "cannot cancel in current phase" };
    }

    const patch = {
      phase: newPhase,
      _cancelPending: true,
      _cancelIntent: intent,
      _cancelReason: reason,
      _cancelError: error ?? null,
      _cancelStartedAt: new Date().toISOString(),
      ...extraPatch,
    };

    // 请求 DSH 取消
    let accepted = false;
    let cancelError = null;
    for (let attempt = 0; attempt < MAX_CANCEL_ATTEMPTS; attempt++) {
      try {
        if (entry.goalRef) {
          accepted = await runner.cancelTask(entry.sessionId, entry.goalRef);
        } else {
          accepted = await runner.cancelSession(entry.sessionId, {
            missingIsSuccess: entry._sessionCreateRejected === true,
          });
        }
        if (accepted) break;
      } catch (err) {
        cancelError = err;
        logger.warn(`[autoqueue] 取消任务 ${entry.key} 失败 (尝试 ${attempt + 1}):`, err.message);
        // 即使出现错误，也记录取消意图已接受
        if (attempt === MAX_CANCEL_ATTEMPTS - 1) {
          accepted = true; // 在最后一次尝试后，标记为已接受以避免无限循环
        }
      }
    }

    if (accepted) {
      patch._cancelAccepted = true;
      // NOTE: 这是 ledger 的本地 revision，用于在 converge 时判断两次 poll 之间是否发生了新的
      // ledger 写入。它与 DSH session 的事件 watermark 无关——session 的因果顺序由 DSH 内部管理。
      patch._cancelAcceptedRevision = snapshot().revision;
      const acceptedPhase = transition(newPhase, "cancel-accepted");
      if (acceptedPhase !== newPhase) patch.phase = acceptedPhase;
    }

    return { accepted, phase: patch.phase || newPhase, patch };
  }

  /**
   * 收敛取消：检查 DSH session 是否已空闲
   * @param {object} entry - 当前任务条目
   * @param {object} sessions - sessions.list 结果
   * @param {number} sessions.ledgerRevisionAtRequest
   * @param {boolean} sessions.known
   * @param {Array} sessions.items
   * @returns {Promise<{settled: boolean, phase: object, patch?: object}>}
   */
  async function converge(entry, sessions) {
    const currentPhase = entry.phase ?? { execution: "idle", cancellation: null };
    if (currentPhase.cancellation === "intent-pending" && entry._cancelAccepted) {
      const acceptedPhase = transition(currentPhase, "cancel-accepted");
      if (acceptedPhase !== currentPhase) {
        return { settled: false, phase: acceptedPhase, patch: { phase: acceptedPhase } };
      }
    }
    if (currentPhase.cancellation !== "accepted" && currentPhase.cancellation !== "idle-confirmed") {
      // 如果 cancel 未被 DSH 受理（_cancelAccepted=false）且 session 已不存在，直接 settle
      if (currentPhase.cancellation === "intent-pending" && !entry._cancelAccepted) {
        const sessionId = entry.sessionId;
        const summary = sessions?.known
          ? sessions.items.find(item => item.sessionId === sessionId)
          : null;
        if (sessions?.known && !summary) {
          // session 已消失，无法取消，直接 force settle
          const newPhase = transition(currentPhase, "second-idle");
          return {
            settled: true,
            phase: newPhase,
            patch: { phase: newPhase, ...clearCancelState() },
          };
        }
      }
      return { settled: false, phase: currentPhase };
    }

    const sessionId = entry.sessionId;
    const summary = sessions?.known
      ? sessions.items.find(item => item.sessionId === sessionId)
      : null;

    // 检查是否因果晚于受理
    const causallyAfterAcceptance = sessions?.known === true &&
      (Number.isSafeInteger(entry._cancelAcceptedRevision)
        ? sessions.ledgerRevisionAtRequest >= entry._cancelAcceptedRevision
        : true);

    // 第一次空闲观察
    if (currentPhase.cancellation === "accepted") {
      const idle = sessions?.known === true && causallyAfterAcceptance &&
        (!summary || summary.running === false);

      if (!idle) {
        // 再次请求取消
        try {
          if (entry.goalRef) {
            await runner.cancelTask(sessionId, entry.goalRef);
          } else {
            await runner.cancelSession(sessionId, { missingIsSuccess: true });
          }
        } catch { /* retry on next poll */ }
        return { settled: false, phase: currentPhase };
      }

      const newPhase = transition(currentPhase, "idle-observed");
      return {
        settled: false,
        phase: newPhase,
        patch: { phase: newPhase, _cancelIdleConfirmed: true },
      };
    }

    // 第二次空闲观察
    if (currentPhase.cancellation === "idle-confirmed") {
      const stillIdle = sessions?.known === true &&
        (!summary || summary.running === false);

      if (!stillIdle) {
        // 回退到 accepted
        const fallback = { execution: currentPhase.execution, cancellation: "accepted" };
        return {
          settled: false,
          phase: fallback,
          patch: { phase: fallback, _cancelIdleConfirmed: false },
        };
      }

      // 两次空闲确认 → 可以结算
      const newPhase = transition(currentPhase, "second-idle");
      return {
        settled: true,
        phase: newPhase,
        patch: { phase: newPhase, ...clearCancelState() },
      };
    }

    return { settled: false, phase: currentPhase };
  }

  /**
   * 结算取消后的状态
   * @param {object} entry
   * @param {CancelIntent} intent
   * @param {string} [error]
   * @returns {{status: string, patch: object}}
   */
  function settle(entry, intent, error) {
    if (intent === "stop" || intent === "deadline") {
      const patch = {
        status: "stopped",
        sessionId: null,
        goalRef: null,
        phase: { execution: "idle", cancellation: null },
        ...clearCancelState(),
        _goalPhase: "stopped",
      };
      // 彻底清除调度状态，防止停止后任务因 nextRunAt/cron 残留而复活
      if (entry.cron) { patch.cron = null; patch.nextRunAt = null; }
      if (entry.schedule) { patch.schedule = null; patch.nextRunAt = null; }
      if (entry.deadline) patch.deadline = null;
      return { status: "stopped", patch };
    }
    // retry/cleanup → 由调用方决定是重试还是 failed
    const patch = {
      phase: { execution: "idle", cancellation: null },
      ...clearCancelState(),
    };
    if (entry.schedule) patch.schedule = null;
    return { status: "retry", patch };
  }

  /**
   * 清除取消相关状态
   * @returns {object}
   */
  function clearCancelState() {
    return {
      _cancelPending: false,
      _cancelIntent: null,
      _cancelReason: null,
      _cancelError: null,
      _cancelAccepted: false,
      _cancelAcceptedRevision: null,
      _cancelIdleConfirmed: false,
      _cancelStartedAt: null,
    };
  }

  return {
    begin,
    converge,
    settle,
    clearCancelState,
  };
}
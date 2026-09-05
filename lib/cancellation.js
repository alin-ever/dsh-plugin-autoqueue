/**
 * 取消收敛 — 怎么停止
 * DSH 特有的取消协议：cancel 只取消当前 turn，不取消 durable goal
 * 因此需要先 clear goal → cancel session → 两次空闲确认 → settle
 * @module autoqueue/cancellation
 */

import { transition, isCancellable, isCancelling } from "./state-machine.js";

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
    if (!isCancellable(currentPhase) && isCancelling(currentPhase)) {
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
      ...extraPatch,
    };

    // 请求 DSH 取消
    let accepted = false;
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
      } catch {
        // 重试
      }
    }

    if (accepted) {
      patch._cancelAccepted = true;
      patch._cancelAcceptedRevision = Date.now(); // 调用方应覆盖为实际 ledger revision
      patch.cancellation = "accepted";
    }

    return { accepted, phase: newPhase, patch };
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
    if (currentPhase.cancellation !== "accepted" && currentPhase.cancellation !== "idle-confirmed") {
      return { settled: false, phase: currentPhase };
    }

    const sessionId = entry.sessionId;
    const summary = sessions?.known
      ? sessions.items.find(item => item.sessionId === sessionId)
      : null;

    // 检查是否因果晚于受理
    const causallyAfterAcceptance = Number.isSafeInteger(entry._cancelAcceptedRevision) &&
      Number.isSafeInteger(sessions?.ledgerRevisionAtRequest) &&
      sessions.ledgerRevisionAtRequest >= entry._cancelAcceptedRevision;

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
      return {
        status: "stopped",
        patch: {
          status: "stopped",
          sessionId: null,
          goalRef: null,
          phase: { execution: "idle", cancellation: null },
          ...clearCancelState(),
          _goalPhase: "stopped",
        },
      };
    }
    // retry/cleanup → 由调用方决定是重试还是 failed
    return {
      status: "retry",
      patch: {
        phase: { execution: "idle", cancellation: null },
        ...clearCancelState(),
      },
    };
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
    };
  }

  return {
    begin,
    converge,
    settle,
    clearCancelState,
  };
}
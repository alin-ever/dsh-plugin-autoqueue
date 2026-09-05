/**
 * 状态机 — 纯函数，无外部依赖
 * 正交区域：execution + cancellation
 * 参考 XState 的分层状态机模式
 * @module autoqueue/state-machine
 */

// ─── 状态定义 ──────────────────────────────────────────

/** @typedef {"idle"|"dispatching"|"launching"|"active"|"blocked"|"goal-uncertain"} ExecutionPhase */
/** @typedef {null|"intent-pending"|"accepted"|"idle-confirmed"} CancellationPhase */

/**
 * @typedef {Object} TaskPhase
 * @property {ExecutionPhase} execution
 * @property {CancellationPhase} cancellation
 */

/** @typedef {"pending"|"running"|"done"|"failed"|"stopped"} TaskStatus */

// ─── 合法状态值 ────────────────────────────────────────

const EXECUTION_PHASES = Object.freeze([
  "idle", "dispatching", "launching", "active", "blocked", "goal-uncertain",
]);

const CANCELLATION_PHASES = Object.freeze([
  null, "intent-pending", "accepted", "idle-confirmed",
]);

const TERMINAL_STATUSES = Object.freeze(["done", "failed", "stopped"]);

// ─── 事件类型 ──────────────────────────────────────────

/**
 * @typedef {"dispatch"|"launch-success"|"launch-failed"|"launch-uncertain"
 *  |"goal-active"|"goal-blocked"|"goal-complete"
 *  |"cancel-request"|"cancel-accepted"|"idle-observed"|"second-idle"
 *  |"retry"|"settle-done"|"settle-failed"|"settle-stopped"
 *  |"unknown-threshold"} TaskEvent
 */

// ─── 区域有效性 ────────────────────────────────────────

function isValidExecutionPhase(phase) {
  return EXECUTION_PHASES.includes(phase);
}

function isValidCancellationPhase(phase) {
  return CANCELLATION_PHASES.includes(phase);
}

/**
 * 检查 phase 组合是否合法
 */
export function isValidPhase(phase) {
  if (!phase || typeof phase !== "object") return false;
  if (!isValidExecutionPhase(phase.execution)) return false;
  if (!isValidCancellationPhase(phase.cancellation)) return false;

  // 某些组合非法
  // cancellation 状态只在 running 时有意义，但我们不在这里校验 status

  return true;
}

/**
 * 创建初始 phase
 * @returns {TaskPhase}
 */
export function createInitialPhase() {
  return { execution: "idle", cancellation: null };
}

// ─── 守卫 ──────────────────────────────────────────────

/**
 * 检查是否可以进行某次转换
 * @param {TaskPhase} current
 * @param {TaskEvent} event
 * @param {TaskStatus} [status]
 * @returns {{allowed: boolean, reason?: string}}
 */
export function canTransition(current, event, status) {
  if (!isValidPhase(current)) {
    return { allowed: false, reason: "invalid current phase" };
  }
  return { allowed: true };
}

/**
 * 获取不允许转换的原因列表
 * @param {TaskPhase} current
 * @param {TaskEvent} event
 * @param {TaskStatus} [status]
 * @returns {string[]}
 */
export function guardViolations(current, event, status) {
  const violations = [];
  if (!isValidPhase(current)) {
    violations.push("当前 phase 状态无效");
    return violations;
  }
  return violations;
}

// ─── 状态转换 ──────────────────────────────────────────

/**
 * 纯函数：计算状态转换
 * @param {TaskPhase} current
 * @param {TaskEvent} event
 * @returns {TaskPhase} 新的 phase（不修改原对象）
 */
export function transition(current, event) {
  const { execution, cancellation } = current;

  switch (event) {
    // ─── 派发 ───────────────────────────────────────
    case "dispatch":
      if (execution === "idle") return { execution: "dispatching", cancellation };
      return current;

    // ─── 启动结果 ────────────────────────────────────
    case "launch-success":
      if (execution === "dispatching") return { execution: "launching", cancellation };
      return current;

    case "launch-failed":
      if (execution === "dispatching") return { execution: "idle", cancellation: null };
      return current;

    case "launch-uncertain":
      if (execution === "dispatching") return { execution: "goal-uncertain", cancellation };
      return current;

    // ─── Goal 阶段 ───────────────────────────────────
    case "goal-active":
      if (execution === "launching" || execution === "goal-uncertain" || execution === "blocked") {
        return { execution: "active", cancellation };
      }
      return current;

    case "goal-blocked":
      if (execution === "active") return { execution: "blocked", cancellation };
      return current;

    case "goal-complete":
      if (execution === "active" || execution === "blocked") {
        return { execution: "idle", cancellation: null };
      }
      return current;

    // ─── 取消 ────────────────────────────────────────
    case "cancel-request":
      if (cancellation !== null) return current;
      if (execution === "active" || execution === "blocked" || execution === "launching") {
        return { execution, cancellation: "intent-pending" };
      }
      return current;

    case "cancel-accepted":
      if (cancellation === "intent-pending") {
        return { execution, cancellation: "accepted" };
      }
      return current;

    case "idle-observed":
      if (cancellation === "accepted") {
        return { execution, cancellation: "idle-confirmed" };
      }
      return current;

    case "second-idle":
      if (cancellation === "idle-confirmed") {
        return { execution: "idle", cancellation: null };
      }
      return current;

    // ─── 重试 ────────────────────────────────────────
    case "retry":
      if (execution === "active" || execution === "blocked" || execution === "goal-uncertain") {
        return { execution: "idle", cancellation: null };
      }
      return current;

    // ─── 结算 ────────────────────────────────────────
    case "settle-done":
    case "settle-failed":
    case "settle-stopped":
      // 从任何 running 状态都能结算
      return { execution: "idle", cancellation: null };

    // ─── 未知阈值 ────────────────────────────────────
    case "unknown-threshold":
      return { execution: "idle", cancellation: null };

    default:
      return current;
  }
}

// ─── 派生状态 ──────────────────────────────────────────

/**
 * 从 phase 和 status 推导用户可见状态
 * @param {TaskPhase} phase
 * @param {TaskStatus} [status]
 * @returns {TaskStatus}
 */
export function deriveStatus(phase, status) {
  if (status && TERMINAL_STATUSES.includes(status)) return status;
  if (phase.execution === "idle" && phase.cancellation === null) return "pending";
  // 如果有 cancellation 正在收敛，但用户看来还是 running
  return "running";
}

/**
 * 判断是否处于 terminal 状态
 * @param {TaskStatus} status
 * @returns {boolean}
 */
export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * 判断是否处于 running 状态
 * @param {TaskPhase} phase
 * @returns {boolean}
 */
export function isRunning(phase) {
  return phase.execution !== "idle" || phase.cancellation !== null;
}

/**
 * 判断是否可以取消
 * @param {TaskPhase} phase
 * @returns {boolean}
 */
export function isCancellable(phase) {
  return (phase.execution === "active" || phase.execution === "blocked" || phase.execution === "launching")
    && phase.cancellation === null;
}

/**
 * 判断是否处于取消收敛中
 * @param {TaskPhase} phase
 * @returns {boolean}
 */
export function isCancelling(phase) {
  return phase.cancellation !== null;
}

/**
 * 判断是否处于不确定状态
 * @param {TaskPhase} phase
 * @returns {boolean}
 */
export function isUncertain(phase) {
  return phase.execution === "goal-uncertain";
}

// ─── 进入/退出动作（纯函数，返回需要持久化的 patch）────

/**
 * 进入某个状态时需要持久化的字段
 * @param {TaskPhase} phase
 * @returns {object} ledger patch
 */
export function entryActions(phase) {
  const patch = {};
  if (phase.execution === "goal-uncertain") {
    patch._admissionUncertain = true;
  }
  if (phase.cancellation === "accepted") {
    patch._cancelAcceptedRevision = Date.now(); // 调用方应覆盖为实际 revision
  }
  return patch;
}

/**
 * 退出某个状态时需要清理的字段
 * @param {TaskPhase} oldPhase
 * @param {TaskPhase} newPhase
 * @returns {object} ledger patch
 */
export function exitActions(oldPhase, newPhase) {
  const patch = {};
  if (oldPhase.execution === "goal-uncertain" && newPhase.execution !== "goal-uncertain") {
    patch._admissionUncertain = false;
  }
  if (oldPhase.cancellation !== null && newPhase.cancellation === null) {
    patch._cancelAcceptedRevision = null;
  }
  return patch;
}

// ─── 序列化辅助 ────────────────────────────────────────

/**
 * 将 phase 序列化为单字段（用于 snapshot 对外暴露）
 * @param {TaskPhase} phase
 * @returns {string}
 */
export function phaseToString(phase) {
  const parts = [phase.execution];
  if (phase.cancellation) parts.push(`cancel:${phase.cancellation}`);
  return parts.join(" | ");
}

/**
 * 从字符串反序列化 phase
 * @param {string} str
 * @returns {TaskPhase}
 */
export function stringToPhase(str) {
  if (!str) return createInitialPhase();
  const parts = str.split(" | ");
  const execution = parts[0];
  const cancellation = parts[1]?.startsWith("cancel:") ? parts[1].slice(7) : null;
  return {
    execution: isValidExecutionPhase(execution) ? execution : "idle",
    cancellation: isValidCancellationPhase(cancellation) ? cancellation : null,
  };
}
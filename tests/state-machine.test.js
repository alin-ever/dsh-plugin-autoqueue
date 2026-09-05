/**
 * state-machine.js 单元测试
 * 纯函数，不需要 mock
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  createInitialPhase,
  isValidPhase,
  transition,
  canTransition,
  deriveStatus,
  isTerminal,
  isRunning,
  isCancellable,
  isCancelling,
  isUncertain,
  phaseToString,
  stringToPhase,
} from "../lib/state-machine.js";

// ─── 初始状态 ──────────────────────────────────────────

test("createInitialPhase 返回初始状态", () => {
  const phase = createInitialPhase();
  assert.deepEqual(phase, { execution: "idle", cancellation: null });
});

test("isValidPhase 接受合法状态", () => {
  assert.equal(isValidPhase({ execution: "idle", cancellation: null }), true);
  assert.equal(isValidPhase({ execution: "active", cancellation: null }), true);
  assert.equal(isValidPhase({ execution: "active", cancellation: "intent-pending" }), true);
  assert.equal(isValidPhase({ execution: "blocked", cancellation: "accepted" }), true);
  assert.equal(isValidPhase({ execution: "goal-uncertain", cancellation: null }), true);
});

test("isValidPhase 拒绝非法状态", () => {
  assert.equal(isValidPhase(null), false);
  assert.equal(isValidPhase(undefined), false);
  assert.equal(isValidPhase("idle"), false);
  assert.equal(isValidPhase({ execution: "invalid-phase", cancellation: null }), false);
  assert.equal(isValidPhase({ execution: "idle", cancellation: "invalid-cancel" }), false);
});

// ─── 状态转换：派发 ────────────────────────────────────

test("dispatch: idle → dispatching", () => {
  const result = transition(createInitialPhase(), "dispatch");
  assert.deepEqual(result, { execution: "dispatching", cancellation: null });
});

test("dispatch: 非 idle 状态拒绝", () => {
  const active = { execution: "active", cancellation: null };
  const result = transition(active, "dispatch");
  assert.deepEqual(result, active); // 不变
});

// ─── 状态转换：启动结果 ────────────────────────────────

test("launch-success: dispatching → launching", () => {
  const phase = { execution: "dispatching", cancellation: null };
  const result = transition(phase, "launch-success");
  assert.deepEqual(result, { execution: "launching", cancellation: null });
});

test("launch-failed: dispatching → idle（可重试）", () => {
  const phase = { execution: "dispatching", cancellation: null };
  const result = transition(phase, "launch-failed");
  assert.deepEqual(result, { execution: "idle", cancellation: null });
});

test("launch-uncertain: dispatching → goal-uncertain", () => {
  const phase = { execution: "dispatching", cancellation: null };
  const result = transition(phase, "launch-uncertain");
  assert.deepEqual(result, { execution: "goal-uncertain", cancellation: null });
});

// ─── 状态转换：Goal 阶段 ───────────────────────────────

test("goal-active: launching → active", () => {
  const phase = { execution: "launching", cancellation: null };
  const result = transition(phase, "goal-active");
  assert.deepEqual(result, { execution: "active", cancellation: null });
});

test("goal-active: goal-uncertain → active（不确定后确认成功）", () => {
  const phase = { execution: "goal-uncertain", cancellation: null };
  const result = transition(phase, "goal-active");
  assert.deepEqual(result, { execution: "active", cancellation: null });
});

test("goal-active: blocked → active（反阻塞后恢复）", () => {
  const phase = { execution: "blocked", cancellation: null };
  const result = transition(phase, "goal-active");
  assert.deepEqual(result, { execution: "active", cancellation: null });
});

test("goal-blocked: active → blocked", () => {
  const phase = { execution: "active", cancellation: null };
  const result = transition(phase, "goal-blocked");
  assert.deepEqual(result, { execution: "blocked", cancellation: null });
});

test("goal-complete: active → idle（结算）", () => {
  const phase = { execution: "active", cancellation: null };
  const result = transition(phase, "goal-complete");
  assert.deepEqual(result, { execution: "idle", cancellation: null });
});

test("goal-complete: blocked → idle（阻塞后完成）", () => {
  const phase = { execution: "blocked", cancellation: null };
  const result = transition(phase, "goal-complete");
  assert.deepEqual(result, { execution: "idle", cancellation: null });
});

// ─── 状态转换：取消 ────────────────────────────────────

test("cancel-request: active → active + intent-pending", () => {
  const phase = { execution: "active", cancellation: null };
  const result = transition(phase, "cancel-request");
  assert.deepEqual(result, { execution: "active", cancellation: "intent-pending" });
});

test("cancel-request: 已经取消中则拒绝", () => {
  const phase = { execution: "active", cancellation: "intent-pending" };
  const result = transition(phase, "cancel-request");
  assert.deepEqual(result, phase); // 不变
});

test("cancel-request: idle 状态拒绝", () => {
  const phase = createInitialPhase();
  const result = transition(phase, "cancel-request");
  assert.deepEqual(result, phase); // 不变
});

test("cancel-accepted: intent-pending → accepted", () => {
  const phase = { execution: "active", cancellation: "intent-pending" };
  const result = transition(phase, "cancel-accepted");
  assert.deepEqual(result, { execution: "active", cancellation: "accepted" });
});

test("idle-observed: accepted → idle-confirmed（第一次空闲确认）", () => {
  const phase = { execution: "active", cancellation: "accepted" };
  const result = transition(phase, "idle-observed");
  assert.deepEqual(result, { execution: "active", cancellation: "idle-confirmed" });
});

test("second-idle: idle-confirmed → idle（第二次空闲确认，取消完成）", () => {
  const phase = { execution: "active", cancellation: "idle-confirmed" };
  const result = transition(phase, "second-idle");
  assert.deepEqual(result, { execution: "idle", cancellation: null });
});

// ─── 状态转换：完整取消流程 ────────────────────────────

test("完整取消流程：active → intent-pending → accepted → idle-confirmed → idle", () => {
  let phase = { execution: "active", cancellation: null };

  phase = transition(phase, "cancel-request");
  assert.deepEqual(phase, { execution: "active", cancellation: "intent-pending" });

  phase = transition(phase, "cancel-accepted");
  assert.deepEqual(phase, { execution: "active", cancellation: "accepted" });

  phase = transition(phase, "idle-observed");
  assert.deepEqual(phase, { execution: "active", cancellation: "idle-confirmed" });

  phase = transition(phase, "second-idle");
  assert.deepEqual(phase, { execution: "idle", cancellation: null });
});

// ─── 状态转换：重试 ────────────────────────────────────

test("retry: active → idle（重试回到 idle）", () => {
  const phase = { execution: "active", cancellation: null };
  const result = transition(phase, "retry");
  assert.deepEqual(result, { execution: "idle", cancellation: null });
});

test("retry: blocked → idle（阻塞后重试）", () => {
  const phase = { execution: "blocked", cancellation: null };
  const result = transition(phase, "retry");
  assert.deepEqual(result, { execution: "idle", cancellation: null });
});

test("retry: goal-uncertain → idle（不确定后重试）", () => {
  const phase = { execution: "goal-uncertain", cancellation: null };
  const result = transition(phase, "retry");
  assert.deepEqual(result, { execution: "idle", cancellation: null });
});

// ─── 状态转换：结算 ────────────────────────────────────

test("settle-done: 从任何 running 状态都能结算", () => {
  const phases = [
    { execution: "active", cancellation: null },
    { execution: "blocked", cancellation: null },
    { execution: "launching", cancellation: null },
    { execution: "dispatching", cancellation: null },
    { execution: "goal-uncertain", cancellation: null },
    { execution: "active", cancellation: "intent-pending" },
  ];
  for (const phase of phases) {
    const result = transition(phase, "settle-done");
    assert.deepEqual(result, { execution: "idle", cancellation: null }, `settle-done from ${JSON.stringify(phase)}`);
  }
});

// ─── 派生状态 ──────────────────────────────────────────

test("deriveStatus: idle → pending", () => {
  assert.equal(deriveStatus({ execution: "idle", cancellation: null }), "pending");
});

test("deriveStatus: 非 idle → running", () => {
  assert.equal(deriveStatus({ execution: "active", cancellation: null }), "running");
  assert.equal(deriveStatus({ execution: "blocked", cancellation: null }), "running");
  assert.equal(deriveStatus({ execution: "launching", cancellation: null }), "running");
  assert.equal(deriveStatus({ execution: "goal-uncertain", cancellation: null }), "running");
});

test("deriveStatus: terminal status 保持", () => {
  assert.equal(deriveStatus({ execution: "idle", cancellation: null }, "done"), "done");
  assert.equal(deriveStatus({ execution: "idle", cancellation: null }, "failed"), "failed");
  assert.equal(deriveStatus({ execution: "idle", cancellation: null }, "stopped"), "stopped");
});

// ─── 守卫函数 ──────────────────────────────────────────

test("isTerminal", () => {
  assert.equal(isTerminal("done"), true);
  assert.equal(isTerminal("failed"), true);
  assert.equal(isTerminal("stopped"), true);
  assert.equal(isTerminal("pending"), false);
  assert.equal(isTerminal("running"), false);
});

test("isRunning", () => {
  assert.equal(isRunning({ execution: "idle", cancellation: null }), false);
  assert.equal(isRunning({ execution: "active", cancellation: null }), true);
  assert.equal(isRunning({ execution: "blocked", cancellation: null }), true);
});

test("isCancellable", () => {
  assert.equal(isCancellable({ execution: "active", cancellation: null }), true);
  assert.equal(isCancellable({ execution: "blocked", cancellation: null }), true);
  assert.equal(isCancellable({ execution: "launching", cancellation: null }), true);
  assert.equal(isCancellable({ execution: "idle", cancellation: null }), false);
  assert.equal(isCancellable({ execution: "active", cancellation: "intent-pending" }), false);
});

test("isCancelling", () => {
  assert.equal(isCancelling({ execution: "active", cancellation: null }), false);
  assert.equal(isCancelling({ execution: "active", cancellation: "intent-pending" }), true);
  assert.equal(isCancelling({ execution: "active", cancellation: "accepted" }), true);
  assert.equal(isCancelling({ execution: "active", cancellation: "idle-confirmed" }), true);
});

test("isUncertain", () => {
  assert.equal(isUncertain({ execution: "goal-uncertain", cancellation: null }), true);
  assert.equal(isUncertain({ execution: "active", cancellation: null }), false);
});

// ─── 序列化 ────────────────────────────────────────────

test("phaseToString", () => {
  assert.equal(phaseToString({ execution: "idle", cancellation: null }), "idle");
  assert.equal(phaseToString({ execution: "active", cancellation: null }), "active");
  assert.equal(phaseToString({ execution: "active", cancellation: "intent-pending" }), "active | cancel:intent-pending");
  assert.equal(phaseToString({ execution: "active", cancellation: "accepted" }), "active | cancel:accepted");
});

test("stringToPhase", () => {
  assert.deepEqual(stringToPhase("idle"), { execution: "idle", cancellation: null });
  assert.deepEqual(stringToPhase("active"), { execution: "active", cancellation: null });
  assert.deepEqual(stringToPhase("active | cancel:intent-pending"), { execution: "active", cancellation: "intent-pending" });
  assert.deepEqual(stringToPhase("active | cancel:accepted"), { execution: "active", cancellation: "accepted" });
  assert.deepEqual(stringToPhase(""), { execution: "idle", cancellation: null });
  assert.deepEqual(stringToPhase(null), { execution: "idle", cancellation: null });
});

// ─── 异常路径 ──────────────────────────────────────────

test("未知事件不改变状态", () => {
  const phase = { execution: "active", cancellation: null };
  const result = transition(phase, "unknown-event");
  assert.deepEqual(result, phase);
});

test("goal-blocked 只能在 active 时触发", () => {
  const phases = [
    { execution: "idle", cancellation: null },
    { execution: "dispatching", cancellation: null },
    { execution: "launching", cancellation: null },
    { execution: "goal-uncertain", cancellation: null },
    { execution: "blocked", cancellation: null },
  ];
  for (const phase of phases) {
    const result = transition(phase, "goal-blocked");
    assert.deepEqual(result, phase, `goal-blocked from ${JSON.stringify(phase)} should be rejected`);
  }
});

test("cancel-request 在 idle 时拒绝", () => {
  const phase = createInitialPhase();
  const result = transition(phase, "cancel-request");
  assert.deepEqual(result, phase);
});

test("cancel-accepted 在非 intent-pending 时拒绝", () => {
  const phase = { execution: "active", cancellation: null };
  const result = transition(phase, "cancel-accepted");
  assert.deepEqual(result, phase);
});
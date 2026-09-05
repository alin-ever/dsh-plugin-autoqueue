/**
 * cancellation.js 单元测试
 * 依赖 runner + state-machine，需要 mock
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createCancellation } from "../lib/cancellation.js";

// ─── 辅助 ──────────────────────────────────────────────

function ok(value = {}) {
  return { result: { ok: true, value } };
}

// ─── 测试 ──────────────────────────────────────────────

test("begin 持久化取消意图并请求 DSH 取消", async () => {
  let cancelTaskCalled = false;
  const runner = {
    cancelTask: async (sessionId, goalRef) => {
      cancelTaskCalled = true;
      assert.equal(sessionId, "autoqueue-session-test");
      assert.deepEqual(goalRef, { id: "goal-1", revision: 1 });
      return true;
    },
    cancelSession: async () => false,
  };
  const stateMachine = {
    transition: (current, event) => {
      if (event === "cancel-request" && current.cancellation === null) {
        return { execution: current.execution, cancellation: "intent-pending" };
      }
      return current;
    },
    isCancellable: (phase) => phase.cancellation === null && ["active", "blocked", "launching"].includes(phase.execution),
    isCancelling: (phase) => phase.cancellation !== null,
  };

  const cancellation = createCancellation(runner, stateMachine);
  const entry = {
    sessionId: "autoqueue-session-test",
    goalRef: { id: "goal-1", revision: 1 },
    phase: { execution: "active", cancellation: null },
  };

  const result = await cancellation.begin(entry, "stop", "用户手动停止");
  assert.equal(result.accepted, true);
  assert.equal(cancelTaskCalled, true);
  assert.ok(result.patch);
  assert.equal(result.patch._cancelIntent, "stop");
});

test("begin 没有 session 时返回不接受", async () => {
  const runner = { cancelTask: async () => true, cancelSession: async () => true };
  const stateMachine = {
    transition: (c, e) => c,
    isCancellable: () => false,
    isCancelling: () => false,
  };
  const cancellation = createCancellation(runner, stateMachine);
  const result = await cancellation.begin({}, "stop", "no session");
  assert.equal(result.accepted, false);
});

test("converge 第一次空闲确认", async () => {
  const runner = {
    pollTask: async () => ({ phase: "active" }),
    cancelTask: async () => true,
    cancelSession: async () => true,
  };
  const stateMachine = {
    transition: (current, event) => {
      if (event === "idle-observed" && current.cancellation === "accepted") {
        return { execution: current.execution, cancellation: "idle-confirmed" };
      }
      if (event === "second-idle" && current.cancellation === "idle-confirmed") {
        return { execution: "idle", cancellation: null };
      }
      return current;
    },
  };
  const cancellation = createCancellation(runner, stateMachine);

  const entry = {
    sessionId: "autoqueue-session-test",
    phase: { execution: "active", cancellation: "accepted" },
    _cancelAcceptedRevision: 100,
  };
  const sessions = {
    known: true,
    ledgerRevisionAtRequest: 101,
    items: [{ sessionId: "autoqueue-session-test", running: false }],
  };

  const result = await cancellation.converge(entry, sessions);
  assert.equal(result.settled, false);
  assert.ok(result.patch);
  assert.equal(result.patch._cancelIdleConfirmed, true);
});

test("converge 第二次空闲确认后结算", async () => {
  const runner = {
    cancelTask: async () => true,
    cancelSession: async () => true,
  };
  const stateMachine = {
    transition: (current, event) => {
      if (event === "second-idle" && current.cancellation === "idle-confirmed") {
        return { execution: "idle", cancellation: null };
      }
      return current;
    },
  };
  const cancellation = createCancellation(runner, stateMachine);

  const entry = {
    sessionId: "autoqueue-session-test",
    phase: { execution: "active", cancellation: "idle-confirmed" },
    _cancelAcceptedRevision: 100,
  };
  const sessions = {
    known: true,
    ledgerRevisionAtRequest: 101,
    items: [{ sessionId: "autoqueue-session-test", running: false }],
  };

  const result = await cancellation.converge(entry, sessions);
  assert.equal(result.settled, true);
  assert.ok(result.patch);
  assert.equal(result.patch.phase.cancellation, null);
  assert.equal(result.patch.phase.execution, "idle");
});

test("converge session 还在运行时不确认", async () => {
  const runner = { cancelTask: async () => true };
  const stateMachine = {
    transition: (current, event) => {
      if (event === "idle-observed") return { ...current, cancellation: "idle-confirmed" };
      return current;
    },
  };
  const cancellation = createCancellation(runner, stateMachine);

  const entry = {
    sessionId: "autoqueue-session-test",
    phase: { execution: "active", cancellation: "accepted" },
    _cancelAcceptedRevision: 100,
  };
  const sessions = {
    known: true,
    ledgerRevisionAtRequest: 101,
    items: [{ sessionId: "autoqueue-session-test", running: true }],
  };

  const result = await cancellation.converge(entry, sessions);
  assert.equal(result.settled, false);
  assert.equal(result.patch, undefined); // 没有 patch，因为还没确认
});

test("settle stop 返回 stopped", () => {
  const runner = { cancelTask: async () => true };
  const stateMachine = { transition: (c, e) => c };
  const cancellation = createCancellation(runner, stateMachine);

  const result = cancellation.settle({}, "stop");
  assert.equal(result.status, "stopped");
  assert.equal(result.patch.status, "stopped");
});

test("settle retry 返回 retry", () => {
  const runner = { cancelTask: async () => true };
  const stateMachine = { transition: (c, e) => c };
  const cancellation = createCancellation(runner, stateMachine);

  const result = cancellation.settle({}, "retry");
  assert.equal(result.status, "retry");
  assert.equal(result.patch.phase.cancellation, null);
});

test("begin 重复取消不重复请求", async () => {
  let cancelCalls = 0;
  const runner = {
    cancelTask: async () => { cancelCalls++; return true; },
    cancelSession: async () => false,
  };
  const stateMachine = {
    transition: (current, event) => {
      if (event === "cancel-request" && current.cancellation === null) {
        return { execution: current.execution, cancellation: "intent-pending" };
      }
      return current;
    },
    isCancellable: (p) => p.cancellation === null,
    isCancelling: (p) => p.cancellation !== null,
  };
  const cancellation = createCancellation(runner, stateMachine);

  const entry = {
    sessionId: "autoqueue-session-test",
    goalRef: { id: "g-1", revision: 1 },
    phase: { execution: "active", cancellation: null },
  };

  // 第一次取消
  const r1 = await cancellation.begin(entry, "stop", "first");
  assert.equal(r1.accepted, true);
  assert.equal(cancelCalls, 1);

  // 第二次取消（已取消中）
  const r2 = await cancellation.begin({ ...entry, phase: { execution: "active", cancellation: "intent-pending" } }, "stop", "second");
  assert.equal(r2.accepted, false);
  assert.equal(cancelCalls, 1); // 没有额外调用
});

test("begin 没有 goalRef 时调用 cancelSession", async () => {
  let cancelSessionCalled = false;
  const runner = {
    cancelTask: async () => false,
    cancelSession: async (sessionId, opts) => {
      cancelSessionCalled = true;
      assert.equal(sessionId, "autoqueue-session-test");
      return true;
    },
  };
  const stateMachine = {
    transition: (c, e) => ({ ...c, cancellation: "intent-pending" }),
    isCancellable: () => true,
    isCancelling: () => false,
  };
  const cancellation = createCancellation(runner, stateMachine);

  const entry = {
    sessionId: "autoqueue-session-test",
    goalRef: null,
    phase: { execution: "active", cancellation: null },
  };

  const result = await cancellation.begin(entry, "stop", "no goal");
  assert.equal(result.accepted, true);
  assert.equal(cancelSessionCalled, true);
});
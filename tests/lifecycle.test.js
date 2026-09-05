/**
 * lifecycle.js 单元测试
 * 依赖 runner + stateMachine + scheduler + files
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { setQueueDir } from "../lib/files.js";
import { reloadLedger } from "../lib/ledger.js";
import { createLifecycle } from "../lib/lifecycle.js";

const roots = [];

function freshQueue() {
  const root = mkdtempSync(join(tmpdir(), "autoqueue-lifecycle-test-"));
  roots.push(root);
  setQueueDir(join(root, "queue"));
  reloadLedger();
}

test.after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function ok(value = {}) {
  return { result: { ok: true, value } };
}

// ─── dispatch 成功 ─────────────────────────────────────

test("dispatch 成功返回 sessionId 和 goalRef", async () => {
  freshQueue();
  const runner = {
    launch: async (entry, hooks) => {
      await hooks.beforeGoal?.({ sessionId: entry.sessionId });
      await hooks.afterGoal?.({ sessionId: entry.sessionId, goalRef: { id: "goal-1", revision: 1 } });
      return { sessionId: entry.sessionId, goalRef: { id: "goal-1", revision: 1 } };
    },
  };
  const stateMachine = {};
  const scheduler = {};
  const lifecycle = createLifecycle(runner, stateMachine, scheduler, { maxGoalRounds: 40 });

  const entry = { key: "test-dispatch", body: "# test", attempts: 0, phase: { execution: "idle", cancellation: null } };
  const task = { body: "# test" };

  const result = await lifecycle.dispatch(entry, task);
  assert.ok(result.sessionId);
  assert.ok(result.goalRef);
  assert.equal(result.goalRef.id, "goal-1");
  assert.equal(result.phase.execution, "active");
});

// ─── dispatch 限流 ─────────────────────────────────────

test("dispatch 限流返回 rate-limited", async () => {
  freshQueue();
  const runner = {
    launch: async () => {
      const err = new Error("rate limit");
      err.code = "RATE_LIMIT";
      err.statusCode = 429;
      throw err;
    },
  };
  const stateMachine = {};
  const scheduler = {};
  const lifecycle = createLifecycle(runner, stateMachine, scheduler);

  const entry = { key: "test-rate-limit", body: "# test", attempts: 0, retryBackoffMs: 0 };
  const task = { body: "# test" };

  const result = await lifecycle.dispatch(entry, task);
  assert.equal(result.error, "rate-limited");
  assert.ok(result.patch.retryBackoffMs > 0);
  assert.ok(result.patch.nextRetryAt);
});

// ─── dispatch 失败 ─────────────────────────────────────

test("dispatch 失败返回错误信息", async () => {
  freshQueue();
  const runner = {
    launch: async () => { throw new Error("session creation failed"); },
  };
  const stateMachine = {};
  const scheduler = {};
  const lifecycle = createLifecycle(runner, stateMachine, scheduler);

  const entry = { key: "test-fail", body: "# test", attempts: 0, retryBackoffMs: 0 };
  const task = { body: "# test" };

  const result = await lifecycle.dispatch(entry, task);
  assert.equal(result.error, "session creation failed");
  assert.ok(result.patch.retryBackoffMs > 0);
});

// ─── antiBlock ─────────────────────────────────────────

test("antiBlock 成功返回新的 goalRef", async () => {
  let antiBlockCalled = false;
  const runner = {
    antiBlock: async (sessionId, goalRef) => {
      antiBlockCalled = true;
      assert.equal(sessionId, "autoqueue-session-test");
      assert.deepEqual(goalRef, { id: "goal-1", revision: 1 });
      return { id: "goal-1", revision: 2 };
    },
  };
  const stateMachine = {};
  const scheduler = {};
  const lifecycle = createLifecycle(runner, stateMachine, scheduler);

  const entry = {
    sessionId: "autoqueue-session-test",
    goalRef: { id: "goal-1", revision: 1 },
    phase: { execution: "blocked", cancellation: null },
    blockedResumes: 0,
  };

  const result = await lifecycle.antiBlock(entry);
  assert.equal(antiBlockCalled, true);
  assert.equal(result.ok, true);
  assert.equal(result.goalRef.revision, 2);
  assert.equal(result.patch.blockedResumes, 1);
});

test("antiBlock 没有 session 时失败", async () => {
  const runner = { antiBlock: async () => { throw new Error("no session"); } };
  const lifecycle = createLifecycle(runner, {}, {});
  const result = await lifecycle.antiBlock({ phase: { execution: "blocked", cancellation: null } });
  assert.equal(result.ok, false);
});

// ─── settle ────────────────────────────────────────────

test("settle done 返回 stopped 状态", async () => {
  const runner = { finalize: async () => {} };
  const scheduler = { calculateNextRun: () => null };
  const lifecycle = createLifecycle(runner, {}, scheduler);

  const entry = { key: "test", workDir: "/tmp", cron: null, phase: { execution: "active", cancellation: null } };
  const result = await lifecycle.settle(entry, "done");
  assert.equal(result.patch.status, "done");
  assert.equal(result.patch.sessionId, null);
  assert.equal(result.patch.goalRef, null);
});

test("settle 循环任务重新调度", async () => {
  const runner = { finalize: async () => {} };
  const scheduler = {
    calculateNextRun: (task) => {
      assert.equal(task.cron, "0 8 * * *");
      return Date.now() + 86400000;
    },
  };
  const lifecycle = createLifecycle(runner, {}, scheduler);

  const entry = { key: "test-cron", workDir: "/tmp", cron: "0 8 * * *", phase: { execution: "active", cancellation: null } };
  const result = await lifecycle.settle(entry, "done", undefined, {});
  assert.equal(result.patch.status, "pending");
  assert.ok(result.patch.nextRunAt > 0);
});

test("settle 循环任务 taskComplete 不再调度", async () => {
  const runner = { finalize: async () => {} };
  const scheduler = {
    calculateNextRun: () => Date.now() + 86400000,
  };
  const lifecycle = createLifecycle(runner, {}, scheduler);

  const entry = { key: "test-done", workDir: "/tmp", cron: "0 8 * * *", phase: { execution: "active", cancellation: null } };
  const result = await lifecycle.settle(entry, "done", undefined, { taskComplete: true });
  assert.equal(result.patch.status, "done");
  assert.equal(result.patch.cron, null);
  assert.equal(result.patch.nextRunAt, null);
});

test("settle 循环任务更新正文", async () => {
  const runner = { finalize: async () => {} };
  const scheduler = {
    calculateNextRun: () => Date.now() + 86400000,
  };
  const lifecycle = createLifecycle(runner, {}, scheduler);

  const entry = {
    key: "test-cron-body",
    workDir: "/tmp",
    cron: "0 8 * * *",
    raw: "# 处理文件\n已处理：无",
    phase: { execution: "active", cancellation: null },
  };
  const result = await lifecycle.settle(entry, "done", undefined, { output: "处理了文件 a.pdf" });
  assert.equal(result.patch.status, "pending");
  assert.ok(result.patch.raw.includes("处理了文件 a.pdf"));
  assert.ok(result.patch.raw.includes("已处理：无")); // 追加而非覆盖
});

// ─── retry ─────────────────────────────────────────────

test("retry 未达到上限返回 pending", () => {
  const lifecycle = createLifecycle({}, {}, {}, { maxAttempts: 3 });
  const entry = { key: "test-retry", attempts: 1, phase: { execution: "active", cancellation: null } };
  const result = lifecycle.retry(entry, "timeout");
  assert.equal(result.shouldRetry, true);
  assert.equal(result.patch.status, "pending");
  assert.ok(result.patch.nextRetryAt > Date.now());
});

test("retry 达到上限返回 failed", () => {
  const lifecycle = createLifecycle({}, {}, {}, { maxAttempts: 3 });
  const entry = { key: "test-retry-limit", attempts: 3, phase: { execution: "active", cancellation: null } };
  const result = lifecycle.retry(entry, "timeout");
  assert.equal(result.shouldRetry, false);
  assert.equal(result.patch.status, "failed");
});

// ─── handleUnreachable ─────────────────────────────────

test("handleUnreachable 未达阈值只增加计数", () => {
  const lifecycle = createLifecycle({}, {}, {}, { unknownThreshold: 3 });
  const entry = { key: "test-unknown", consecutiveUnknowns: 0, phase: { execution: "active", cancellation: null } };
  const result = lifecycle.handleUnreachable(entry, "unknown");
  assert.equal(result.shouldRetry, false);
  assert.equal(result.patch.consecutiveUnknowns, 1);
});

test("handleUnreachable 达到阈值触发重试", () => {
  const lifecycle = createLifecycle({}, {}, {}, { unknownThreshold: 3, maxAttempts: 5 });
  const entry = { key: "test-unknown-limit", consecutiveUnknowns: 2, attempts: 1, phase: { execution: "active", cancellation: null } };
  const result = lifecycle.handleUnreachable(entry, "unknown");
  assert.equal(result.shouldRetry, true);
  assert.equal(result.patch.status, "pending");
});

// ─── isTimeout ─────────────────────────────────────────

test("isTimeout 未超时返回 false", () => {
  const lifecycle = createLifecycle({}, {}, {}, { taskTimeoutMs: 60000 });
  const entry = {
    executions: [{ startedAt: new Date(Date.now() - 30000).toISOString() }],
  };
  assert.equal(lifecycle.isTimeout(entry), false);
});

test("isTimeout 已超时返回 true", () => {
  const lifecycle = createLifecycle({}, {}, {}, { taskTimeoutMs: 60000 });
  const entry = {
    executions: [{ startedAt: new Date(Date.now() - 120000).toISOString() }],
  };
  assert.equal(lifecycle.isTimeout(entry), true);
});

test("isTimeout 没有 executions 返回 false", () => {
  const lifecycle = createLifecycle({}, {}, {}, { taskTimeoutMs: 60000 });
  assert.equal(lifecycle.isTimeout({}), false);
  assert.equal(lifecycle.isTimeout({ executions: [] }), false);
});
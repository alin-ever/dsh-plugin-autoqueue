/**
 * engine-v2.js 集成测试
 * 使用 upsertEntry 直接操作账本，避免 async _dispatch 干扰
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { setQueueDir, getTasksDir, writeTaskFile } from "../lib/files.js";
import { reloadLedger, snapshot, findByKey, upsertEntry, flushLedger } from "../lib/ledger.js";
import { createEngine } from "../lib/engine-v2.js";

const roots = [];

function freshQueue() {
  const root = mkdtempSync(join(tmpdir(), "autoqueue-engine-v2-test-"));
  roots.push(root);
  setQueueDir(join(root, "queue"));
  reloadLedger();
  return root;
}

function makeTask(key, body, opts = {}) {
  // 直接写文件
  const content = opts.cron ? `<!-- cron: ${opts.cron} -->\n${body}` : body;
  writeTaskFile(key, content);
  // 直接写账本
  upsertEntry(key, {
    status: "pending",
    body,
    raw: content,
    phase: { execution: "idle", cancellation: null },
    cron: opts.cron ?? null,
    deadline: opts.deadline ?? null,
    priority: opts.priority ?? 5,
    nextRunAt: null,
    autoArchive: opts.autoArchive,
    maxGoalRounds: opts.maxGoalRounds,
    maxBlockedResumes: opts.maxBlockedResumes,
    timeoutMs: opts.timeoutMs,
    maxAttempts: opts.maxAttempts,
    webhook: opts.webhook,
    enableNotifications: opts.enableNotifications,
  });
  flushLedger();
}

test.after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

// ─── 基本 API ├───────────────

test("snapshot 返回任务列表", () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  makeTask("snap-test", "# 快照测试");

  const s = engine.snapshot(false);
  assert.ok(Array.isArray(s.tasks));
  assert.ok(Number.isInteger(s.revision));
  assert.ok(s.metrics);
  assert.equal(s.metrics.total, 1);
  assert.equal(s.metrics.pending, 1);
  assert.ok(s.runtime);
  assert.equal(s.runtime.monitorMode, "native-events+authoritative-reconcile");
  assert.ok(s.config);

  engine.dispose();
});

test("snapshot 包含 cron 任务", () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  makeTask("cron-snap", "# 定时", { cron: "0 8 * * *" });

  const s = engine.snapshot(false);
  const task = s.tasks.find(t => t.key === "cron-snap");
  assert.ok(task);
  assert.equal(task.taskType, "cron");
  assert.equal(task.status, "pending");

  engine.dispose();
});

test("getTaskDetail 返回完整信息", () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  makeTask("detail-test", "# 详情测试", { cron: "0 * * * *", priority: 8 });

  const result = engine.getTaskDetail("detail-test");
  assert.equal(result.ok, true);
  assert.equal(result.task.key, "detail-test");
  assert.equal(result.task.cron, "0 * * * *");
  assert.equal(result.task.priority, 8);
  assert.equal(result.task.taskType, "cron");
  assert.equal(result.task.status, "pending");
  assert.ok(result.task.body);

  engine.dispose();
});

// ─── 任务操作 ├───────────────

test("updateTask 修改 pending 任务", () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  makeTask("update-test", "# 原始内容", { cron: "0 8 * * *" });

  const result = engine.updateTask("update-test", { cron: "0 9 * * *", priority: 3 });
  assert.equal(result.ok, true);

  const entry = findByKey("update-test");
  assert.equal(entry.cron, "0 9 * * *");
  assert.equal(entry.priority, 3);

  engine.dispose();
});

test("deleteTask 删除 pending 任务", () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  makeTask("delete-test", "# 删除测试");

  const result = engine.deleteTask("delete-test");
  assert.equal(result.ok, true);
  assert.equal(findByKey("delete-test"), undefined);
  assert.equal(existsSync(join(getTasksDir(), "delete-test.md")), false);

  engine.dispose();
});

// ─── 配置 ├───────────────

test("getConfig / setConfig", () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  assert.equal(engine.getConfig().maxGoalRounds, 40);
  assert.equal(engine.getConfig().maxAttempts, 3);

  engine.setConfig({ maxGoalRounds: 50, maxAttempts: 5, autoArchive: false });

  assert.equal(engine.getConfig().maxGoalRounds, 50);
  assert.equal(engine.getConfig().maxAttempts, 5);
  assert.equal(engine.getConfig().autoArchive, false);

  // 隔离覆盖被拒绝（仅 workspace 和 agentPreset）
  assert.throws(() => engine.setConfig({ workspace: "custom" }));
  assert.throws(() => engine.setConfig({ agentPreset: "custom" }));

  engine.dispose();
});

// ─── 归档 ├───────────────

test("archiveTask 和 restoreTask", async () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  makeTask("archive-test", "# 归档");

  // 改为 done
  const entry = findByKey("archive-test");
  upsertEntry("archive-test", { status: "done", _generation: entry._generation });
  flushLedger();

  const ar = await engine.archiveTask("archive-test");
  assert.equal(ar.ok, true);
  assert.ok(findByKey("archive-test").archivedAt);

  const rr = await engine.restoreTask("archive-test");
  assert.equal(rr.ok, true);
  assert.equal(findByKey("archive-test").archivedAt, null);

  engine.dispose();
});

// ─── 停止 ├───────────────

test("stopTask 停止运行中的任务", async () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  upsertEntry("stop-test", {
    status: "running",
    sessionId: "autoqueue-session-stop",
    goalRef: { id: "goal-stop", revision: 1 },
    phase: { execution: "active", cancellation: null },
    body: "# 停止测试",
    _generation: 1,
  });
  flushLedger();

  const result = await engine.stopTask("stop-test");
  assert.ok(result);

  engine.dispose();
});

// ─── 重跑 ├───────────────

test("rerunTask 重置状态", async () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  upsertEntry("rerun-test", {
    status: "done",
    phase: { execution: "idle", cancellation: null },
    body: "# 重跑",
    _generation: 1,
  });
  flushLedger();

  const result = await engine.rerunTask("rerun-test");
  assert.equal(result.ok, true);

  // rerunTask 会调用 scanPending，但这里没有 mock runner 所以不会真正派发
  const entry = findByKey("rerun-test");
  assert.equal(entry.status, "pending");
  assert.equal(entry.sessionId, null);

  engine.dispose();
});

// ─── 事件 ├───────────────

test("requestRuntimePoll", () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  assert.equal(engine.requestRuntimePoll("test-event"), true);
  assert.equal(engine.requestRuntimePoll("test-event-2"), true);

  engine.dispose();
});

test("dispose", async () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  await engine.dispose();
  assert.equal(engine.isDisposed(), true);
  assert.equal(engine.requestRuntimePoll("test"), false);

  engine.dispose();
});

// ─── applyAction ├───────────────

test("applyAction force-scan", async () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  const result = await engine.applyAction(null, "force-scan", null);
  assert.equal(result.ok, true);

  engine.dispose();
});

test("applyAction set-concurrency", async () => {
  freshQueue();
  const engine = createEngine({ sessions: {}, goals: {} }, {});

  const result = await engine.applyAction(null, "set-concurrency", null, { maxConcurrent: 3 });
  assert.equal(result.ok, true);

  engine.dispose();
});
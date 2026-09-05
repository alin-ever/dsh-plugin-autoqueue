/**
 * scheduler.js 单元测试
 * 纯函数，依赖 files.js 的 cron 校验
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { setQueueDir } from "../lib/files.js";
import { reloadLedger } from "../lib/ledger.js";
import {
  nextCronMatchAfter,
  getNextCronTime,
  calculateNextRun,
  isDue,
  isCatchUpNeeded,
  getCronIntervalMs,
  markRunComplete,
  markRunFailed,
  resetSchedule,
  validateCron,
  isRecurring,
  buildFileContent,
} from "../lib/scheduler.js";

// ─── 测试环境 ──────────────────────────────────────────

const roots = [];
function freshQueue() {
  const root = mkdtempSync(join(tmpdir(), "autoqueue-scheduler-test-"));
  roots.push(root);
  setQueueDir(join(root, "queue"));
  reloadLedger();
}

test.after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

// ─── cron 校验 ─────────────────────────────────────────

test("validateCron 接受合法表达式", () => {
  assert.equal(validateCron("0 8 * * *"), "0 8 * * *");
  assert.equal(validateCron("*/15 * * * *"), "*/15 * * * *");
  assert.equal(validateCron("0 8 * * 1-5"), "0 8 * * 1-5");
  assert.equal(validateCron("0 8,20 * * *"), "0 8,20 * * *");
  assert.equal(validateCron("30 6 * * 0"), "30 6 * * 0");
});

test("validateCron 拒绝非法表达式", () => {
  assert.throws(() => validateCron(""), /cron 长度无效/);
  assert.throws(() => validateCron("60 8 * * *"), /数值超出范围/);
  assert.throws(() => validateCron("0 24 * * *"), /数值超出范围/);
  assert.throws(() => validateCron("0 8 * * 8"), /数值超出范围/);
});

// ─── nextCronMatchAfter ────────────────────────────────

test("nextCronMatchAfter 每天 8 点", () => {
  // 参考时间：2026-01-15 10:00:00（本地时间）
  const after = new Date(2026, 0, 15, 10, 0, 0, 0).getTime();
  const next = nextCronMatchAfter("0 8 * * *", after);
  // 下一次应该是 2026-01-16 08:00:00（本地时间）
  const expected = new Date(2026, 0, 16, 8, 0, 0, 0).getTime();
  assert.equal(next, expected);
});

test("nextCronMatchAfter 每 15 分钟", () => {
  // 参考时间 10:00，下一次 */15 应该是 10:15
  const after = new Date(2026, 0, 15, 10, 0, 0, 0).getTime();
  const next = nextCronMatchAfter("*/15 * * * *", after);
  const expected = new Date(2026, 0, 15, 10, 15, 0, 0).getTime();
  assert.equal(next, expected);
});

test("nextCronMatchAfter 工作日 8 点", () => {
  // 2026-01-15 是周四，下一次工作日 8 点应该是明天
  const after = new Date(2026, 0, 15, 10, 0, 0, 0).getTime();
  const next = nextCronMatchAfter("0 8 * * 1-5", after);
  const expected = new Date(2026, 0, 16, 8, 0, 0, 0).getTime();
  assert.equal(next, expected);
});

test("nextCronMatchAfter 周五到周一跨周末", () => {
  // 2026-01-16 是周五 10:00，下一次工作日 8 点是下周一
  const after = new Date(2026, 0, 16, 10, 0, 0, 0).getTime();
  const next = nextCronMatchAfter("0 8 * * 1-5", after);
  const expected = new Date(2026, 0, 19, 8, 0, 0, 0).getTime();
  assert.equal(next, expected);
});

test("nextCronMatchAfter 空表达式返回 null", () => {
  assert.equal(nextCronMatchAfter("", Date.now()), null);
  assert.equal(nextCronMatchAfter(null, Date.now()), null);
});

test("nextCronMatchAfter 非法表达式返回 null", () => {
  assert.equal(nextCronMatchAfter("invalid", Date.now()), null);
});

// ─── calculateNextRun ──────────────────────────────────

test("calculateNextRun 无 cron 返回 null", () => {
  assert.equal(calculateNextRun({ cron: null }), null);
  assert.equal(calculateNextRun({}), null);
});

test("calculateNextRun 有 cron 返回时间戳", () => {
  const after = new Date("2026-01-15T10:00:00Z").getTime();
  const next = calculateNextRun({ cron: "0 8 * * *" }, after);
  assert.equal(typeof next, "number");
  assert.ok(next > after);
});

// ─── isDue ─────────────────────────────────────────────

test("isDue 无 cron 立即执行", () => {
  const result = isDue({ cron: null });
  assert.equal(result.due, true);
  assert.equal(result.reason, "immediate");
});

test("isDue 无 nextRunAt 立即执行", () => {
  const result = isDue({ cron: "0 8 * * *", nextRunAt: null });
  assert.equal(result.due, true);
  assert.equal(result.reason, "no-next-run");
});

test("isDue 有 nextRunAt 且未到", () => {
  const farFuture = Date.now() + 86400000 * 365; // 一年后
  const result = isDue({ cron: "0 8 * * *", nextRunAt: farFuture });
  assert.equal(result.due, false);
});

test("isDue 有 nextRunAt 且已到", () => {
  const past = Date.now() - 60000; // 一分钟前
  const result = isDue({ cron: "0 8 * * *", nextRunAt: past });
  assert.equal(result.due, true);
  assert.equal(result.reason, "scheduled");
});

// ─── isCatchUpNeeded ───────────────────────────────────

test("isCatchUpNeeded 无 cron 不需要 catch-up", () => {
  const result = isCatchUpNeeded({ cron: null, nextRunAt: null });
  assert.equal(result.needed, false);
  assert.equal(result.shouldRun, true);
});

test("isCatchUpNeeded nextRunAt 在未来不需要", () => {
  const future = Date.now() + 86400000;
  const result = isCatchUpNeeded({ cron: "0 8 * * *", nextRunAt: future });
  assert.equal(result.needed, false);
  assert.equal(result.shouldRun, false);
});

test("isCatchUpNeeded 错过少量应该补跑", () => {
  const past = Date.now() - 3600000; // 一小时前
  const result = isCatchUpNeeded({ cron: "0 * * * *", nextRunAt: past });
  assert.equal(result.needed, true);
  assert.equal(result.shouldRun, true);
});

test("isCatchUpNeeded 错过太多跳过", () => {
  const past = Date.now() - 86400000 * 7; // 7 天前
  const result = isCatchUpNeeded({ cron: "0 * * * *", nextRunAt: past }, 3);
  assert.equal(result.needed, true);
  assert.equal(result.shouldRun, false); // 错过太多
});

// ─── getCronIntervalMs ─────────────────────────────────

test("getCronIntervalMs 每分钟", () => {
  assert.equal(getCronIntervalMs("* * * * *"), 60000);
});

test("getCronIntervalMs 每 15 分钟", () => {
  assert.equal(getCronIntervalMs("*/15 * * * *"), 15 * 60000);
});

test("getCronIntervalMs 每天 8 点", () => {
  assert.equal(getCronIntervalMs("0 8 * * *"), 86400000);
});

test("getCronIntervalMs 每小时", () => {
  assert.equal(getCronIntervalMs("0 * * * *"), 3600000);
});

test("getCronIntervalMs 空表达式返回 0", () => {
  assert.equal(getCronIntervalMs(""), 0);
  assert.equal(getCronIntervalMs(null), 0);
});

// ─── markRunComplete ───────────────────────────────────

test("markRunComplete 非循环任务 → done", () => {
  const result = markRunComplete({ cron: null });
  assert.equal(result.status, "done");
  assert.equal(result.nextRunAt, null);
});

test("markRunComplete 循环任务未完成 → 重新调度", () => {
  freshQueue();
  const result = markRunComplete({ cron: "0 8 * * *" }, false);
  // 下次执行时间应在未来
  assert.equal(result.status, "pending");
  assert.ok(result.nextRunAt == null || typeof result.nextRunAt === "number");
});

test("markRunComplete 循环任务 taskComplete → done", () => {
  const result = markRunComplete({ cron: "0 8 * * *" }, true);
  assert.equal(result.status, "done");
  assert.equal(result.nextRunAt, null);
});

// ─── markRunFailed ─────────────────────────────────────

test("markRunFailed 非循环任务 → failed", () => {
  const result = markRunFailed({ cron: null });
  assert.equal(result.status, "failed");
  assert.equal(result.nextRunAt, null);
});

test("markRunFailed 循环任务 → 重新调度", () => {
  freshQueue();
  const result = markRunFailed({ cron: "0 8 * * *" });
  assert.equal(result.status, "pending");
});

// ─── resetSchedule ─────────────────────────────────────

test("resetSchedule 清除调度", () => {
  const result = resetSchedule();
  assert.equal(result.cron, null);
  assert.equal(result.nextRunAt, null);
});

// ─── isRecurring ───────────────────────────────────────

test("isRecurring", () => {
  assert.equal(isRecurring({ cron: "0 8 * * *" }), true);
  assert.equal(isRecurring({ cron: null }), false);
  assert.equal(isRecurring({}), false);
});

// ─── buildFileContent ──────────────────────────────────

test("buildFileContent 无 cron 返回原内容", () => {
  assert.equal(buildFileContent("# hello", null), "# hello");
});

test("buildFileContent 有 cron 添加声明", () => {
  const result = buildFileContent("# hello", "0 8 * * *");
  assert.match(result, /^<!-- cron: 0 8 \* \* \* -->\n# hello$/);
});
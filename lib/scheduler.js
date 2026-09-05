/**
 * 调度器 — 什么时候执行
 * 参考 BullMQ QueueScheduler + K8s CronJob Controller
 * 核心模型：cron 是唯一调度字段，nextRunAt 驱动执行
 * @module autoqueue/scheduler
 */

import { validateCronExpression, matchCron } from "./files.js";

// ─── 常量 ──────────────────────────────────────────────

const MAX_CATCHUP_MISSED = 3;  // 最多补跑 3 次错过的调度
const CRON_SEARCH_WINDOW_DAYS = 1466; // 搜索未来时间的窗口（~4 年）
const MAX_FIELD_VALUE = 128; // 单字段最大长度

// ─── 内部缓存 ──────────────────────────────────────────

let nextCacheMinute = -1;
const nextCache = new Map();

// ─── cron 字段匹配 ─────────────────────────────────────

function matchField(field, value) {
  if (field === "*") return true;
  if (field.includes(",")) return field.split(",").some(f => matchField(f.trim(), value));
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    return step > 0 && value % step === 0;
  }
  if (field.includes("-")) {
    const [lo, hi] = field.split("-").map(Number);
    return value >= lo && value <= hi;
  }
  return parseInt(field, 10) === value;
}

// ─── 时间计算 ──────────────────────────────────────────

/**
 * 计算 cron 表达式在 afterMs 之后的下一次匹配时间
 * @param {string} expr - 5 字段 cron 表达式
 * @param {number} afterMs - 起始时间戳
 * @returns {number|null} 匹配时间戳，或 null
 */
export function nextCronMatchAfter(expr, afterMs) {
  if (!expr || !expr.trim()) return null;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const allowed = (field, min, max) => {
    const values = [];
    for (let v = min; v <= max; v++) {
      if (matchField(field, v)) values.push(v);
    }
    return values;
  };

  const minutes = allowed(parts[0], 0, 59);
  const hours = allowed(parts[1], 0, 23);
  const days = new Set(allowed(parts[2], 1, 31));
  const months = new Set(allowed(parts[3], 1, 12));
  const weekdays = new Set();
  for (let wd = 0; wd <= 6; wd++) {
    if (matchField(parts[4], wd) || (wd === 0 && matchField(parts[4], 7))) {
      weekdays.add(wd);
    }
  }

  if (!minutes.length || !hours.length || !days.size || !months.size || !weekdays.size) {
    return null;
  }

  const after = new Date(afterMs);
  if (!Number.isFinite(after.getTime())) return null;

  const midnight = new Date(after.getFullYear(), after.getMonth(), after.getDate());
  for (let offset = 0; offset <= CRON_SEARCH_WINDOW_DAYS; offset++) {
    const day = new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate() + offset);
    if (!months.has(day.getMonth() + 1)) continue;

    const domMatch = days.has(day.getDate());
    const dowMatch = weekdays.has(day.getDay());
    const calendarDayMatch = parts[2] === "*"
      ? dowMatch
      : parts[4] === "*"
        ? domMatch
        : domMatch || dowMatch;
    if (!calendarDayMatch) continue;

    for (const hour of hours) {
      for (const minute of minutes) {
        const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
        if (candidate.getTime() <= afterMs) continue;
        if (!matchCron(expr, candidate)) continue;
        return candidate.getTime();
      }
    }
  }
  return null;
}

/**
 * 获取 cron 下一次执行时间（带缓存）
 * @param {string} expr
 * @returns {string|null} ISO 时间字符串
 */
export function getNextCronTime(expr) {
  const now = Date.now();
  const minuteBucket = Math.floor(now / 60_000);
  if (nextCacheMinute !== minuteBucket) {
    nextCacheMinute = minuteBucket;
    nextCache.clear();
  }
  if (nextCache.has(expr)) return nextCache.get(expr);

  const next = nextCronMatchAfter(expr, now);
  const result = next == null ? null : new Date(next).toISOString();
  nextCache.set(expr, result);
  return result;
}

// ─── 调度计算 ──────────────────────────────────────────

/**
 * 计算任务的 nextRunAt
 * @param {object} task
 * @param {string|null} task.cron
 * @param {number} [afterMs]
 * @returns {number|null}
 */
export function calculateNextRun(task, afterMs = Date.now()) {
  if (!task.cron) return null; // 无 cron = 立即执行一次，不重新调度
  return nextCronMatchAfter(task.cron, afterMs);
}

/**
 * 判断任务是否应该在这一轮执行
 * @param {object} task
 * @param {number} task.nextRunAt - 下次执行时间戳
 * @param {string|null} task.cron
 * @returns {{due: boolean, reason?: string}}
 */
export function isDue(task) {
  if (!task.cron) {
    // cron:null 的任务，只要 status=pending 就立即执行
    return { due: true, reason: "immediate" };
  }
  if (!task.nextRunAt) return { due: true, reason: "no-next-run" };
  if (Date.now() >= task.nextRunAt) return { due: true, reason: "scheduled" };
  return { due: false };
}

/**
 * 判断是否需要 catch-up（重启后错过了执行时间）
 * @param {object} task
 * @param {number} task.nextRunAt
 * @param {string|null} task.cron
 * @param {number} [maxMissed]
 * @returns {{needed: boolean, missed: number, shouldRun: boolean}}
 */
export function isCatchUpNeeded(task, maxMissed = MAX_CATCHUP_MISSED) {
  if (!task.cron || !task.nextRunAt) {
    return { needed: false, missed: 0, shouldRun: true };
  }
  const now = Date.now();
  if (now < task.nextRunAt) {
    return { needed: false, missed: 0, shouldRun: false };
  }

  // 计算错过了多少次
  const interval = getCronIntervalMs(task.cron);
  if (interval <= 0) return { needed: false, missed: 0, shouldRun: true };

  const missed = Math.floor((now - task.nextRunAt) / interval);
  const shouldRun = missed <= maxMissed;

  return { needed: missed > 0, missed, shouldRun };
}

/**
 * 估算 cron 表达式的执行间隔（毫秒）
 * 用于 catch-up 计算
 * @param {string} expr
 * @returns {number}
 */
export function getCronIntervalMs(expr) {
  if (!expr) return 0;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 0;

  // 从最粗粒度（月）到最细粒度（分钟）检查，取第一个非 * 字段
  const fieldIntervals = [
    { field: parts[3], min: 1, max: 12, base: 2_592_000_000 },  // 月
    { field: parts[2], min: 1, max: 31, base: 86_400_000 },     // 日
    { field: parts[1], min: 0, max: 23, base: 3_600_000 },      // 小时
    { field: parts[0], min: 0, max: 59, base: 60_000 },         // 分钟
  ];

  for (const fi of fieldIntervals) {
    if (fi.field === "*") continue;
    if (fi.field.startsWith("*/")) {
      const step = parseInt(fi.field.slice(2), 10);
      if (step > 0) return step * fi.base;
    }
    // 精确值 = 周期等于该字段的完整周期
    return (fi.max - fi.min + 1) * fi.base;
  }

  // 所有字段都是 * → 每分钟
  return 60_000;
}

// ─── 调度更新 ──────────────────────────────────────────

/**
 * 任务执行完成后，更新调度状态
 * @param {object} task
 * @param {string|null} task.cron
 * @param {boolean} taskComplete - agent 是否声明任务完成
 * @returns {{nextRunAt: number|null, status: "pending"|"done"|"failed"}}
 */
export function markRunComplete(task, taskComplete = false) {
  if (!task.cron) {
    // 非循环任务 → terminal
    return { nextRunAt: null, status: "done" };
  }
  if (taskComplete) {
    // agent 说任务完成了 → terminal，不再调度
    return { nextRunAt: null, status: "done" };
  }
  // 循环任务，继续调度
  const nextRunAt = calculateNextRun(task);
  return { nextRunAt: nextRunAt ?? 0, status: "pending" };
}

/**
 * 任务失败后，更新调度状态
 * @param {object} task
 * @param {string|null} task.cron
 * @returns {{nextRunAt: number|null, status: "pending"|"failed"}}
 */
export function markRunFailed(task) {
  if (!task.cron) {
    return { nextRunAt: null, status: "failed" };
  }
  // 循环任务失败后仍然重新调度
  const nextRunAt = calculateNextRun(task);
  return { nextRunAt: nextRunAt ?? 0, status: "pending" };
}

/**
 * 清除调度状态（停止调度）
 * @returns {{nextRunAt: null, cron: null}}
 */
export function resetSchedule() {
  return { nextRunAt: null, cron: null };
}

// ─── 工具 ──────────────────────────────────────────────

/**
 * 验证 cron 表达式
 * @param {string} expr
 * @param {string} [label]
 * @returns {string} 标准化后的表达式
 */
export function validateCron(expr, label = "cron") {
  return validateCronExpression(expr, label);
}

/**
 * 判断是否为循环任务
 * @param {object} task
 * @param {string|null} task.cron
 * @returns {boolean}
 */
export function isRecurring(task) {
  return !!task.cron;
}

/**
 * 构建带调度声明的文件内容
 * @param {string} content
 * @param {string|null} cron
 * @returns {string}
 */
export function buildFileContent(content, cron) {
  if (!cron) return content;
  return `<!-- cron: ${cron} -->\n${content}`;
}
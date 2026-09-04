/**
 * Cron 调度与引擎辅助工具
 * 包含 cron 计算、时间戳格式化、隔离检查、会话状态检查
 * @module autoqueue/cron
 */

import { matchCron } from "./files.js";
import { isAutoqueueSessionId } from "./runner.js";

// ─── 常量 ──────────────────────────────────────────────

const ISOLATION_OVERRIDE_FIELDS = ["model", "workspace", "agentPreset"];

// ─── 隔离检查 ──────────────────────────────────────────

export function hasIsolationOverride(value) {
  return value !== undefined && value !== null && value !== "";
}

export function isolationOverrideError(field) {
  const err = new Error(`严格隔离模式不支持 ${field} 覆盖；autoqueue 必须继承 DSH 默认模型，并使用任务 cwd 与内置无人值守 preset`);
  err.code = "isolation-override-not-allowed";
  err.statusCode = 409;
  return err;
}

export function assertNoIsolationOverrides(value) {
  for (const field of ISOLATION_OVERRIDE_FIELDS) {
    if (hasIsolationOverride(value?.[field])) throw isolationOverrideError(field);
  }
}

// ─── 会话状态检查 ──────────────────────────────────────

export function isActiveSessionSummary(item) {
  if (item?.running === true) return true;
  return item?.projections?.values?.goal?.goal?.phase === "active";
}

export function hasActiveForeignSession(sessions) {
  if (!sessions?.known || !Array.isArray(sessions.items)) return true;
  return sessions.items.some(item => (
    isActiveSessionSummary(item) && !isAutoqueueSessionId(item.sessionId)
  ));
}

// ─── Goal ref 比较 ─────────────────────────────────────

export function sameGoalRef(left, right) {
  if (left == null || right == null) return left == null && right == null;
  return left.id === right.id && left.revision === right.revision;
}

// ─── Cron 计算 ─────────────────────────────────────────

function matchCronField(field, value) {
  if (field === "*") return true;
  if (field.includes(",")) return field.split(",").some(f => matchCronField(f.trim(), value));
  if (field.startsWith("*/")) { const step = parseInt(field.slice(2), 10); return step > 0 && value % step === 0; }
  if (field.includes("-")) { const [lo, hi] = field.split("-").map(Number); return value >= lo && value <= hi; }
  return parseInt(field, 10) === value;
}

/**
 * 计算 cron 表达式下一次触发时间
 * @param {string} expr - 5 字段 cron 表达式
 * @param {number} afterMs - 从这个时间戳之后开始查找
 * @returns {number|null} 毫秒时间戳
 */
export function nextCronMatchAfter(expr, afterMs) {
  if (!expr || !expr.trim()) return null;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const allowed = (field, min, max) => {
    const values = [];
    for (let value = min; value <= max; value++) {
      if (matchCronField(field, value)) values.push(value);
    }
    return values;
  };
  const minutes = allowed(parts[0], 0, 59);
  const hours = allowed(parts[1], 0, 23);
  const days = new Set(allowed(parts[2], 1, 31));
  const months = new Set(allowed(parts[3], 1, 12));
  const weekdays = new Set();
  for (let weekday = 0; weekday <= 6; weekday++) {
    if (matchCronField(parts[4], weekday) ||
        (weekday === 0 && matchCronField(parts[4], 7))) weekdays.add(weekday);
  }
  if (!minutes.length || !hours.length || !days.size || !months.size || !weekdays.size) {
    return null;
  }

  // Walk calendar days, then only the explicitly admissible hour/minute
  // combinations. A full Gregorian leap window keeps Feb 29 schedules
  // discoverable while impossible dates cost ~1,466 cheap day checks rather
  // than millions of minute-by-minute iterations.
  const after = new Date(afterMs);
  if (!Number.isFinite(after.getTime())) return null;
  const midnight = new Date(after.getFullYear(), after.getMonth(), after.getDate());
  for (let offset = 0; offset <= 1466; offset++) {
    const day = new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate() + offset);
    if (!months.has(day.getMonth() + 1)) continue;
    const dayOfMonthMatches = days.has(day.getDate());
    const dayOfWeekMatches = weekdays.has(day.getDay());
    const calendarDayMatches = parts[2] === "*"
      ? dayOfWeekMatches
      : parts[4] === "*"
        ? dayOfMonthMatches
        : dayOfMonthMatches || dayOfWeekMatches;
    if (!calendarDayMatches) continue;
    for (const hour of hours) {
      for (const minute of minutes) {
        const candidate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
        if (candidate.getTime() <= afterMs || !matchCron(expr, candidate)) continue;
        return candidate.getTime();
      }
    }
  }
  return null;
}

let cronNextCacheMinute = -1;
const cronNextCache = new Map();

/**
 * 获取 cron 表达式下一次触发时间的 ISO 字符串（带缓存）
 * @param {string} expr - 5 字段 cron 表达式
 * @returns {string|null} ISO 时间字符串
 */
export function getNextCronTime(expr) {
  const now = Date.now();
  const minuteBucket = Math.floor(now / 60_000);
  if (cronNextCacheMinute !== minuteBucket) {
    cronNextCacheMinute = minuteBucket;
    cronNextCache.clear();
  }
  if (cronNextCache.has(expr)) return cronNextCache.get(expr);
  const next = nextCronMatchAfter(expr, now);
  const result = next == null ? null : new Date(next).toISOString();
  cronNextCache.set(expr, result);
  return result;
}

/**
 * 紧凑时间戳 YYYYMMDD-HHmmss
 * @returns {string}
 */
export function formatTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * 构建带调度声明的文件内容
 * @param {string} content - 任务正文
 * @param {string|null} [schedule] - ISO 8601 调度时间
 * @param {string|null} [cron] - 5 字段 cron 表达式
 * @param {string|null} [deadline] - 5 字段 deadline 表达式
 * @returns {string}
 */
export function buildFileContent(content, schedule, cron, deadline) {
  let fc = content;
  if (schedule) fc = `<!-- schedule: ${schedule} -->\n${fc}`;
  if (cron) fc = `<!-- cron: ${cron} -->\n${fc}`;
  if (deadline) fc = `<!-- deadline: ${deadline} -->\n${fc}`;
  return fc;
}
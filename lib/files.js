/**
 * 收件箱 / 运行目录 I/O — 纯函数，无 ctx 依赖
 * @module autoqueue/files
 */

import {
  readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync,
  unlinkSync, openSync, closeSync, fsyncSync, renameSync, chmodSync, statSync,
  fstatSync, lstatSync, realpathSync, readSync, fchmodSync, constants as fsConstants,
} from "node:fs";
import { join, dirname, resolve, relative, isAbsolute } from "node:path";
import { homedir } from "node:os";

export const MAX_TASK_CONTENT_BYTES = 2 * 1024 * 1024;
export const MAX_TASK_FILE_BYTES = MAX_TASK_CONTENT_BYTES + 8 * 1024;
export const MAX_REPORT_BYTES = 2 * 1024 * 1024;

// ─── 路径解析 ──────────────────────────────────────────

function resolveDshHome() {
  const raw = process.env.DSH_HOME;
  if (raw && raw.trim()) {
    return raw.trim();
  }
  return join(homedir(), ".dsh");
}

let _queueDir = resolve(resolveDshHome(), "queue");

/** 设置队列根目录，必须在读写前调用 */
export function setQueueDir(dir) {
  if (typeof dir !== "string" || !dir.trim()) throw new Error("queueDir 必须是非空路径");
  if (dir.includes("\0")) throw new Error("queueDir 包含非法字符");
  _queueDir = resolve(dir.trim());
}

/** 获取队列根目录 */
export function getQueueDir() {
  return _queueDir;
}

function tasksDir() {
  return join(_queueDir, "tasks");
}

function runsDir() {
  return join(_queueDir, "runs");
}

/** 创建目录并收紧权限。Windows 上 chmod 由 ACL 语义接管。 */
export function ensurePrivateDir(dir) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { chmodSync(dir, 0o700); } catch { /* Windows ACLs own access */ }
}

// ─── 原子写入辅助 ──────────────────────────────────────

/**
 * 原子写入文件：tmp + rename + fsync，对齐 task-board 模式
 * @param {string} file - 目标路径
 * @param {string} content - 文件内容
 */
export function atomicWrite(file, content) {
  ensurePrivateDir(dirname(file));
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let fd;
  try {
    fd = openSync(tmp, "w", 0o600);
    writeFileSync(fd, Buffer.from(content, "utf8"));
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    try { chmodSync(tmp, 0o600); } catch { /* Windows ACLs own access */ }
    renameSync(tmp, file);
    try {
      const dirFd = openSync(dirname(file), "r");
      try { fsyncSync(dirFd); } finally { closeSync(dirFd); }
    } catch { /* Windows does not permit fsync on directory */ }
  } catch (err) {
    if (fd !== undefined) closeSync(fd);
    try { unlinkSync(tmp); } catch { /* best-effort */ }
    throw err;
  }
}

// ─── 路径安全 ──────────────────────────────────────────

const KEY_RE = /^[\u4e00-\u9fff\w][\u4e00-\u9fff\w ._\-]*[\u4e00-\u9fff\w]$|^[\u4e00-\u9fff\w]$/;
/** 供 OpenAPI spec 和 AI 工具层共享的 key 正则字符串 */
export const KEY_PATTERN = "^[\\u4e00-\\u9fff\\w][\\u4e00-\\u9fff\\w ._\\-]*[\\u4e00-\\u9fff\\w]$|^[\\u4e00-\\u9fff\\w]$";
/** 供 AI 工具层描述使用的 key 校验说明 */
export const KEY_VALIDATION_DESCRIPTION = "只允许中英文、数字、空格、下划线(_)、短横线(-)和点号(.)，200 字符以内";

/**
 * 校验 key 是否合法，防止路径逃逸
 * 只允许中文、英文、数字、下划线、短横线、空格、点号
 * 不允许 /、\、.. 等路径分隔符
 * @param {string} key
 * @throws {Error} 非法的 key
 */
export function validateKey(key) {
  if (!key || typeof key !== "string") throw new Error("任务名不能为空");
  if (key.length > 200) throw new Error("任务名不能超过 200 个字符");
  if (!KEY_RE.test(key)) throw new Error(`非法的任务名: ${key}，只允许中英文、数字、空格、下划线、短横线和点号`);
  // 二次确认：resolve 后路径必须在 tasksDir 内
  const resolved = resolve(tasksDir(), `${key}.md`);
  const base = resolve(tasksDir());
  if (!resolved.startsWith(base + String.fromCharCode(92 /* \ */)) && !resolved.startsWith(base + "/")) {
    throw new Error(`非法的任务名: ${key}`);
  }
}

/**
 * 严格校验 ISO 8601 一次性调度时间。允许显式时区，也兼容既有的本地时间写法。
 * @param {unknown} value
 * @returns {string} 去除首尾空白后的表达式
 */
export function validateSchedule(value) {
  if (typeof value !== "string") throw new Error("schedule 必须是 ISO 8601 字符串");
  const schedule = value.trim();
  if (!schedule || schedule.length > 64) throw new Error("schedule 长度无效");
  const match = schedule.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(?:Z|([+-])(\d{2}):(\d{2}))?$/);
  if (!match) throw new Error("schedule 必须是有效的 ISO 8601 日期时间");
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0", , , offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) {
    throw new Error("schedule 包含无效的日期或时间");
  }
  if (offsetHourText !== undefined && (Number(offsetHourText) > 23 || Number(offsetMinuteText) > 59)) {
    throw new Error("schedule 包含无效的时区偏移");
  }
  if (!Number.isFinite(Date.parse(schedule))) throw new Error("schedule 不是有效日期");
  return schedule;
}

// POSIX cron accepts both 0 and 7 for Sunday.
const CRON_LIMITS = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];

/**
 * 严格校验项目支持的五字段 cron 子集：*、*\/n、数字、范围、逗号列表。
 * @param {unknown} value
 * @param {string} [label]
 * @returns {string} 规范化后的表达式
 */
export function validateCronExpression(value, label = "cron") {
  if (typeof value !== "string") throw new Error(`${label} 必须是字符串`);
  const cron = value.trim();
  if (!cron || cron.length > 128) throw new Error(`${label} 长度无效`);
  const fields = cron.split(/\s+/);
  if (fields.length !== 5) throw new Error(`${label} 必须包含 5 个字段`);
  fields.forEach((field, index) => validateCronField(field, ...CRON_LIMITS[index], label));
  return fields.join(" ");
}

function validateCronField(field, min, max, label) {
  if (!field || field.length > 64) throw new Error(`${label} 字段无效`);
  for (const item of field.split(",")) {
    if (!item) throw new Error(`${label} 列表包含空项`);
    if (item === "*") continue;
    const step = item.match(/^\*\/(\d+)$/);
    if (step) {
      const n = Number(step[1]);
      if (!Number.isSafeInteger(n) || n < 1 || n > (max - min + 1)) throw new Error(`${label} 步长超出范围`);
      continue;
    }
    const range = item.match(/^(\d+)-(\d+)$/);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      if (lo < min || hi > max || lo > hi) throw new Error(`${label} 范围超出允许值`);
      continue;
    }
    if (!/^\d+$/.test(item)) throw new Error(`${label} 包含不支持的语法`);
    const n = Number(item);
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${label} 数值超出范围`);
  }
}

// ─── 收件箱 ────────────────────────────────────────────

/**
 * 扫描收件箱，返回所有待处理 .md 文件
 * @returns {TaskFile[]}
 */
export function listTaskFiles() {
  if (!existsSync(tasksDir())) return [];
  ensurePrivateDir(tasksDir());
  const entries = readdirSync(tasksDir(), { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const path = join(tasksDir(), entry.name);
    const key = entry.name.replace(/\.md$/, "");
    try {
      validateKey(key);
      const stat = statSync(path);
      if (!stat.isFile() || stat.size > MAX_TASK_FILE_BYTES) {
        console.error(`[autoqueue] 跳过过大的收件箱文件: ${entry.name}`);
        continue;
      }
      const buf = readFileSync(path);
      if (buf.length > MAX_TASK_FILE_BYTES) {
        console.error(`[autoqueue] 跳过过大的收件箱文件: ${entry.name}`);
        continue;
      }
      const raw = buf.toString("utf8");
      if (raw.trim().length === 0) continue;
      const schedule = parseSchedule(raw);
      const body = stripSchedule(raw);
      if (Buffer.byteLength(body, "utf8") > MAX_TASK_CONTENT_BYTES) {
        console.error(`[autoqueue] 跳过正文超过 2MB 的收件箱文件: ${entry.name}`);
        continue;
      }
      results.push({ key, path, raw, body, schedule });
    } catch (err) {
      console.error(`[autoqueue] 跳过无效的收件箱文件 ${entry.name}:`, err.message);
    }
  }
  return results;
}

/**
 * 删除收件箱文件（消费后清理）
 * @param {string} key
 */
export function removeTaskFile(key) {
  validateKey(key);
  const path = join(tasksDir(), `${key}.md`);
  if (existsSync(path)) unlinkSync(path);
}

/**
 * 写入任务文件（API 创建用）
 * @param {string} key
 * @param {string} content
 */
export function writeTaskFile(key, content) {
  validateKey(key);
  if (typeof content !== "string") throw new Error("任务内容必须是字符串");
  if (Buffer.byteLength(content, "utf8") > MAX_TASK_FILE_BYTES) throw new Error("任务文件超过大小限制");
  ensurePrivateDir(tasksDir());
  atomicWrite(join(tasksDir(), `${key}.md`), content);
}

// ─── 运行目录 ──────────────────────────────────────────

/**
 * 为任务创建运行目录
 * @param {string} key
 * @returns {string} workDir
 */
export function createRunDir(key) {
  validateKey(key);
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const dir = join(runsDir(), ym, `${key}-${stamp}`);
  ensurePrivateDir(dir);
  return dir;
}

/**
 * 确保运行目录存在
 * @param {string} workDir
 */
export function ensureRunDir(workDir) {
  assertRunDir(workDir);
  ensurePrivateDir(workDir);
  hardenReportFiles(workDir);
}

/**
 * 写入任务副本
 * @param {string} workDir
 * @param {string} body
 */
export function writeTaskCopy(workDir, body) {
  assertRunDir(workDir);
  if (Buffer.byteLength(body, "utf8") > MAX_TASK_CONTENT_BYTES) throw new Error("任务副本超过 2MB 限制");
  atomicWrite(join(workDir, ".task.md"), body);
}

/**
 * 写入目标快照
 * @param {string} workDir
 * @param {string} content
 */
export function writeGoalSnapshot(workDir, content) {
  assertRunDir(workDir);
  atomicWrite(join(workDir, ".目标.md"), content);
  hardenReportFiles(workDir);
}

/**
 * 写入结果
 * @param {string} workDir
 * @param {string} content
 */
export function writeResult(workDir, content) {
  assertRunDir(workDir);
  atomicWrite(join(workDir, ".结果.md"), content);
  hardenReportFiles(workDir);
}

function assertRunDir(workDir) {
  if (typeof workDir !== "string" || !workDir.trim() || workDir.includes("\0")) throw new Error("运行目录无效");
  const base = resolve(runsDir());
  const target = resolve(workDir);
  if (target !== base && !target.startsWith(base + "/") && !target.startsWith(base + "\\")) {
    throw new Error("运行目录必须位于 queue runs 目录内");
  }
}

function hardenReportFiles(workDir) {
  for (const name of [".task.md", ".目标.md", ".结果.md", "执行报告.md"]) {
    const file = join(workDir, name);
    let fd;
    try {
      const before = lstatSync(file);
      if (before.isSymbolicLink() || !before.isFile() || before.nlink !== 1) continue;
      fd = openSync(file, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
      const opened = fstatSync(fd);
      if (!opened.isFile() || opened.nlink !== 1 || opened.dev !== before.dev || opened.ino !== before.ino) continue;
      fchmodSync(fd, 0o600);
    } catch { /* missing/raced paths and Windows ACLs are ignored */ }
    finally { if (fd !== undefined) closeSync(fd); }
  }
}

const REPORT_FILE_NAMES = new Set([".目标.md", ".结果.md", "执行报告.md"]);

/**
 * 安全读取运行报告：只允许固定报告名，拒绝目录逃逸、symlink、非普通文件和 >2MB 文件。
 * 使用 O_NOFOLLOW + fstat/readSync，避免先检查后打开的最终路径竞态。
 * @param {string} workDir
 * @param {string} fileName
 * @returns {string}
 */
export function safeReadReportFile(workDir, fileName) {
  assertRunDir(workDir);
  if (!REPORT_FILE_NAMES.has(fileName)) throw new Error("不允许读取该报告文件");

  const workStat = lstatSync(workDir);
  if (workStat.isSymbolicLink() || !workStat.isDirectory()) throw new Error("运行目录不是安全的普通目录");
  const baseReal = realpathSync(runsDir());
  const workReal = realpathSync(workDir);
  const fromBase = relative(baseReal, workReal);
  if (!fromBase || fromBase === ".." || fromBase.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(fromBase)) {
    throw new Error("运行目录实际路径逃逸 queue runs 目录");
  }

  let dirFd;
  let fd;
  try {
    const noFollow = fsConstants.O_NOFOLLOW ?? 0;
    dirFd = openSync(workReal, fsConstants.O_RDONLY | (fsConstants.O_DIRECTORY ?? 0) | noFollow);
    const openedDir = fstatSync(dirFd);
    if (!openedDir.isDirectory() || openedDir.dev !== workStat.dev || openedDir.ino !== workStat.ino) {
      throw new Error("运行目录在读取前发生变化");
    }

    // Linux 上从已打开的目录 fd 解析最终文件，目录即使被 rename/symlink 替换也不会逃逸。
    const anchoredDir = process.platform === "linux" ? `/proc/self/fd/${dirFd}` : workReal;
    const target = join(anchoredDir, fileName);
    const before = lstatSync(target);
    if (before.isSymbolicLink() || !before.isFile() || before.nlink !== 1) throw new Error("报告不是安全的普通文件");
    if (before.size > MAX_REPORT_BYTES) throw new Error("报告超过 2MB 限制");

    fd = openSync(target, fsConstants.O_RDONLY | noFollow);
    const opened = fstatSync(fd);
    if (!opened.isFile() || opened.nlink !== 1) throw new Error("报告不是安全的普通文件");
    if (opened.dev !== before.dev || opened.ino !== before.ino) throw new Error("报告在读取前发生变化");
    if (opened.size > MAX_REPORT_BYTES) throw new Error("报告超过 2MB 限制");

    const chunks = [];
    let total = 0;
    while (total <= MAX_REPORT_BYTES) {
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, MAX_REPORT_BYTES + 1 - total));
      const bytesRead = readSync(fd, chunk, 0, chunk.length, null);
      if (bytesRead === 0) break;
      total += bytesRead;
      chunks.push(chunk.subarray(0, bytesRead));
    }
    if (total > MAX_REPORT_BYTES) throw new Error("报告超过 2MB 限制");
    return Buffer.concat(chunks, total).toString("utf8");
  } finally {
    if (fd !== undefined) try { closeSync(fd); } catch { /* best-effort close */ }
    if (dirFd !== undefined) try { closeSync(dirFd); } catch { /* best-effort close */ }
  }
}

// ─── 路径导出 ──────────────────────────────────────────

export function getTasksDir() { return tasksDir(); }
export function getRunsDir() { return runsDir(); }

// ─── 调度解析 ──────────────────────────────────────────

/**
 * 解析文件中的调度声明
 * <!-- schedule: 2026-08-25T10:00:00 -->
 * <!-- cron: 0 8 * * 1 -->
 * <!-- deadline: 0 21 * * * -->
 * @param {string} raw
 * @returns {{ schedule?: string, cron?: string, deadline?: string }}
 */
function parseSchedule(raw) {
  const result = {};
  const seen = new Set();
  const declaration = /^<!--\s*(schedule|cron|deadline):\s*(.+?)\s*-->\s*$/gm;
  for (const match of raw.matchAll(declaration)) {
    const kind = match[1];
    if (seen.has(kind)) throw new Error(`重复的 ${kind} 声明`);
    seen.add(kind);
    if (kind === "schedule") result.schedule = validateSchedule(match[2]);
    else result[kind] = validateCronExpression(match[2], kind);
  }
  if (result.schedule && result.cron) throw new Error("schedule 与 cron 不能同时设置");
  return result;
}

/**
 * 检查 cron 表达式是否匹配当前时间
 * 支持 5 字段: 分 时 日 月 周 (0/7=周日)
 * 每字段支持: 数字、星号、星号斜杠step、逗号列表
 * @param {string} expr
 * @param {Date} [now]
 * @returns {boolean}
 */
export function matchCron(expr, now = new Date()) {
  let parts;
  try { parts = validateCronExpression(expr).split(" "); } catch { return false; }

  if (!matchField(parts[0], now.getMinutes()) ||
      !matchField(parts[1], now.getHours()) ||
      !matchField(parts[3], now.getMonth() + 1)) return false;

  const dayOfMonthMatches = matchField(parts[2], now.getDate());
  const dayOfWeekMatches = matchField(parts[4], now.getDay()) ||
    (now.getDay() === 0 && matchField(parts[4], 7));

  // Standard five-field cron treats restricted DOM and DOW fields as an OR.
  // When either field is the wildcard, the other field remains authoritative.
  if (parts[2] === "*") return dayOfWeekMatches;
  if (parts[4] === "*") return dayOfMonthMatches;
  return dayOfMonthMatches || dayOfWeekMatches;
}

function matchField(field, value) {
  if (field === "*") return true;
  // 逗号分隔
  if (field.includes(",")) {
    return field.split(",").some(f => matchField(f.trim(), value));
  }
  // */step
  if (field.startsWith("*/")) {
    const step = Number(field.slice(2));
    return value % step === 0;
  }
  // 范围 a-b
  if (field.includes("-")) {
    const [lo, hi] = field.split("-").map(Number);
    return value >= lo && value <= hi;
  }
  // 精确值
  return Number(field) === value;
}

/**
 * 剥离调度声明，返回纯任务正文
 * @param {string} raw
 * @returns {string}
 */
function stripSchedule(raw) {
  return raw.replace(/^<!--\s*(schedule|cron|deadline):\s*.+?\s*-->\s*/gm, "").trim();
}

// ─── 类型定义 ──────────────────────────────────────────

/** @typedef {{ key: string, path: string, raw: string, body: string, schedule?: { schedule?: string, cron?: string, deadline?: string } }} TaskFile */

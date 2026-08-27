/**
 * 收件箱 / 运行目录 I/O — 纯函数，无 ctx 依赖
 * @module autoqueue/files
 */

import {
  readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync,
  unlinkSync, openSync, closeSync, fsyncSync, renameSync, chmodSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

// ─── 路径解析 ──────────────────────────────────────────

function resolveDshHome() {
  const raw = process.env.DSH_HOME;
  if (raw && raw.trim()) {
    return raw.trim();
  }
  return join(homedir(), ".dsh");
}

let _queueDir = join(resolveDshHome(), "queue");

/** 设置队列根目录，必须在读写前调用 */
export function setQueueDir(dir) {
  if (dir && dir.trim()) {
    _queueDir = dir.trim();
  }
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

// ─── 原子写入辅助 ──────────────────────────────────────

/**
 * 原子写入文件：tmp + rename + fsync，对齐 task-board 模式
 * @param {string} file - 目标路径
 * @param {string} content - 文件内容
 */
export function atomicWrite(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
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

// ─── 收件箱 ────────────────────────────────────────────

/**
 * 扫描收件箱，返回所有待处理 .md 文件
 * @returns {TaskFile[]}
 */
export function listTaskFiles() {
  if (!existsSync(tasksDir())) return [];
  const entries = readdirSync(tasksDir(), { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const path = join(tasksDir(), entry.name);
    const raw = readFileSync(path, "utf8");
    if (raw.trim().length === 0) continue;
    const key = entry.name.replace(/\.md$/, "");
    const schedule = parseSchedule(raw);
    results.push({ key, path, raw, body: stripSchedule(raw), schedule });
  }
  return results;
}

/**
 * 删除收件箱文件（消费后清理）
 * @param {string} key
 */
export function removeTaskFile(key) {
  const path = join(tasksDir(), `${key}.md`);
  if (existsSync(path)) unlinkSync(path);
}

/**
 * 写入任务文件（API 创建用）
 * @param {string} key
 * @param {string} content
 */
export function writeTaskFile(key, content) {
  mkdirSync(tasksDir(), { recursive: true });
  atomicWrite(join(tasksDir(), `${key}.md`), content);
}

// ─── 运行目录 ──────────────────────────────────────────

/**
 * 为任务创建运行目录
 * @param {string} key
 * @returns {string} workDir
 */
export function createRunDir(key) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const dir = join(runsDir(), ym, `${key}-${stamp}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * 确保运行目录存在
 * @param {string} workDir
 */
export function ensureRunDir(workDir) {
  mkdirSync(workDir, { recursive: true });
}

/**
 * 写入任务副本
 * @param {string} workDir
 * @param {string} body
 */
export function writeTaskCopy(workDir, body) {
  writeFileSync(join(workDir, ".task.md"), body, "utf8");
}

/**
 * 写入目标快照
 * @param {string} workDir
 * @param {string} content
 */
export function writeGoalSnapshot(workDir, content) {
  writeFileSync(join(workDir, ".目标.md"), content, "utf8");
}

/**
 * 写入结果
 * @param {string} workDir
 * @param {string} content
 */
export function writeResult(workDir, content) {
  writeFileSync(join(workDir, ".结果.md"), content, "utf8");
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
  const scheduleMatch = raw.match(/^<!--\s*schedule:\s*(.+?)\s*-->/m);
  if (scheduleMatch) result.schedule = scheduleMatch[1].trim();
  const cronMatch = raw.match(/^<!--\s*cron:\s*(.+?)\s*-->/m);
  if (cronMatch) result.cron = cronMatch[1].trim();
  const deadlineMatch = raw.match(/^<!--\s*deadline:\s*(.+?)\s*-->/m);
  if (deadlineMatch) result.deadline = deadlineMatch[1].trim();
  return result;
}

/**
 * 检查 cron 表达式是否匹配当前时间
 * 支持 5 字段: 分 时 日 月 周 (0=周日)
 * 每字段支持: 数字、星号、星号斜杠step、逗号列表
 * @param {string} expr
 * @param {Date} [now]
 * @returns {boolean}
 */
export function matchCron(expr, now = new Date()) {
  if (!expr || !expr.trim()) return false;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const values = [
    now.getMinutes(),
    now.getHours(),
    now.getDate(),
    now.getMonth() + 1,
    now.getDay(),
  ];

  for (let i = 0; i < 5; i++) {
    if (!matchField(parts[i], values[i])) return false;
  }
  return true;
}

function matchField(field, value) {
  if (field === "*") return true;
  // 逗号分隔
  if (field.includes(",")) {
    return field.split(",").some(f => matchField(f.trim(), value));
  }
  // */step
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    return step > 0 && value % step === 0;
  }
  // 范围 a-b
  if (field.includes("-")) {
    const [lo, hi] = field.split("-").map(Number);
    return value >= lo && value <= hi;
  }
  // 精确值
  return parseInt(field, 10) === value;
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
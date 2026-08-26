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
 * 读取单个任务文件
 * @param {string} key
 * @returns {TaskFile | undefined}
 */
export function readTaskFile(key) {
  const path = join(tasksDir(), `${key}.md`);
  if (!existsSync(path)) return undefined;
  const raw = readFileSync(path, "utf8");
  if (raw.trim().length === 0) return undefined;
  const schedule = parseSchedule(raw);
  return { key, path, raw, body: stripSchedule(raw), schedule };
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
  writeFileSync(join(tasksDir(), `${key}.md`), content, "utf8");
}

// ─── 运行目录 ──────────────────────────────────────────

/**
 * 为任务创建运行目录
 * @param {string} key
 * @returns {string} workDir
 */
export function createRunDir(key) {
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const workDir = join(runsDir(), ym, `${key}-${stamp}`);
  mkdirSync(workDir, { recursive: true });
  return workDir;
}

/**
 * 确保运行目录存在
 * @param {string} workDir
 */
export function ensureRunDir(workDir) {
  if (workDir) mkdirSync(workDir, { recursive: true });
}

/**
 * 写入任务副本
 * @param {string} workDir
 * @param {string} body
 */
export function writeTaskCopy(workDir, body) {
  if (!workDir) return;
  writeFileSync(join(workDir, ".task.md"), body, "utf8");
}

/**
 * 写入执行报告
 * @param {string} workDir
 * @param {string} report
 */
export function writeReport(workDir, report) {
  if (!workDir) return;
  writeFileSync(join(workDir, "执行报告.md"), report, "utf8");
}

/**
 * 写入目标快照
 * @param {string} workDir
 * @param {string} objective
 */
export function writeGoalSnapshot(workDir, objective) {
  if (!workDir) return;
  writeFileSync(join(workDir, ".目标.md"), objective, "utf8");
}

/**
 * 写入结果 JSON
 * @param {string} workDir
 * @param {object} result
 */
export function writeResult(workDir, result) {
  if (!workDir) return;
  writeFileSync(join(workDir, ".结果.md"), JSON.stringify(result, null, 2), "utf8");
}

// ─── 调度解析 ──────────────────────────────────────────

/**
 * 解析文件头中的 schedule/cron/deadline 声明
 * @param {string} raw
 * @returns {{ schedule?: string, cron?: string, deadline?: string }}
 */
export function parseSchedule(raw) {
  const result = {};
  const lines = raw.split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*<!--\s*(schedule|cron|deadline):\s*(.+?)\s*-->\s*$/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

/**
 * cron 表达式匹配当前时间（当前分钟）
 * @param {string} cron
 * @returns {boolean}
 */
export function matchCron(cron) {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const [min, hour, dom, month, dow] = parts;
  const now = new Date();
  return (
    matchField(min, now.getMinutes()) &&
    matchField(hour, now.getHours()) &&
    matchField(dom, now.getDate()) &&
    matchField(month, now.getMonth() + 1) &&
    matchField(dow, now.getDay())
  );
}

function matchField(field, value) {
  if (field === "*") return true;
  if (field.includes(",")) {
    return field.split(",").some(f => matchField(f.trim(), value));
  }
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
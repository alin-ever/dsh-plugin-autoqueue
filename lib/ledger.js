/**
 * 账本 — 对齐 task-board host-ledger.ts 模式
 * 原子写入 + requestId 去重 + schema version
 * @module autoqueue/ledger
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { getQueueDir, atomicWrite } from "./files.js";

// ─── 常量 ──────────────────────────────────────────────

const SCHEMA_VERSION = 2;
const LEDGER_FILE = join(getQueueDir(), "queue-ledger.json");
const DEFAULT_MAX_CONCURRENT = 2;
const MAX_CONCURRENT_CAP = 8;
const MAX_REQUEST_CACHE = 256;

// ─── 类型 ──────────────────────────────────────────────

/**
 * @typedef {Object} LedgerEntry
 * @property {string} key
 * @property {"pending"|"running"|"done"|"failed"|"stopped"|"interrupted"} status
 * @property {string|null} workDir
 * @property {string|null} sessionId
 * @property {{id:string, revision:number}|null} goalRef
 * @property {number} attempts
 * @property {number} blockedResumes
 * @property {string|null} [readAt]
 * @property {ExecutionRecord[]} executions
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} [raw]
 * @property {string} [body]
 * @property {string} [workspace]
 * @property {string} [agentPreset]
 * @property {string} [model]
 * @property {number} [lastActiveTime]
 * @property {number} [stallTimeoutMs]
 */

/**
 * @typedef {Object} ExecutionRecord
 * @property {string} id
 * @property {string|null} sessionId
 * @property {number} attempt
 * @property {string} startedAt
 * @property {string} [endedAt]
 * @property {"done"|"failed"|"stopped"} [result]
 * @property {string} [error]
 */

/**
 * @typedef {Object} LedgerDocument
 * @property {number} schemaVersion
 * @property {number} revision
 * @property {LedgerEntry[]} tasks
 * @property {{ maxConcurrent: number }} config
 * @property {Array<{requestId: string, fingerprint: string}>} recentRequests
 */

// ─── 内部状态 ──────────────────────────────────────────

/** @type {LedgerDocument} */
let document;
/** @type {Map<string, {fingerprint: string}>} */
const requestCache = new Map();

// ─── 初始化 ────────────────────────────────────────────

function load() {
  mkdirSync(getQueueDir(), { recursive: true });
  if (!existsSync(LEDGER_FILE)) {
    document = {
      schemaVersion: SCHEMA_VERSION,
      revision: 0,
      tasks: [],
      config: { maxConcurrent: DEFAULT_MAX_CONCURRENT },
      recentRequests: [],
    };
    return;
  }
  try {
    const raw = readFileSync(LEDGER_FILE, "utf8");
    /** @type {Partial<LedgerDocument>} */
    const parsed = JSON.parse(raw);
    if (parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.tasks)) {
      throw new Error("unsupported ledger schema");
    }
    document = {
      schemaVersion: SCHEMA_VERSION,
      revision: Number.isSafeInteger(parsed.revision) && parsed.revision >= 0 ? parsed.revision : 0,
      tasks: parsed.tasks,
      config: {
        maxConcurrent: clampConcurrency(
          typeof parsed.config?.maxConcurrent === "number" ? parsed.config.maxConcurrent : DEFAULT_MAX_CONCURRENT,
        ),
      },
      recentRequests: Array.isArray(parsed.recentRequests)
        ? parsed.recentRequests.filter(r => typeof r.requestId === "string" && typeof r.fingerprint === "string")
        : [],
    };
  } catch (err) {
    document = {
      schemaVersion: SCHEMA_VERSION,
      revision: 0,
      tasks: [],
      config: { maxConcurrent: DEFAULT_MAX_CONCURRENT },
      recentRequests: [],
    };
  }
  // 重建 requestCache
  for (const req of document.recentRequests) {
    requestCache.set(req.requestId, { fingerprint: req.fingerprint });
  }
  // 恢复中断的 running 任务
  reconcileInterrupted();
}

function clampConcurrency(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) return DEFAULT_MAX_CONCURRENT;
  if (n > MAX_CONCURRENT_CAP) return MAX_CONCURRENT_CAP;
  return n;
}

// ─── 原子提交 ──────────────────────────────────────────

let commitTimer = null;

function commit(bumpRevision = true) {
  if (bumpRevision) document.revision += 1;
  // 防抖：同一 tick 内多次 commit 只写一次
  if (commitTimer) clearTimeout(commitTimer);
  commitTimer = setTimeout(() => {
    commitTimer = null;
    syncRecentRequests();
    atomicWrite(LEDGER_FILE, JSON.stringify(document, null, 2));
  }, 0);
}

function syncRecentRequests() {
  document.recentRequests = [...requestCache].map(([requestId, req]) => ({
    requestId,
    fingerprint: req.fingerprint,
  }));
}

// ─── 启动恢复 ──────────────────────────────────────────

function reconcileInterrupted() {
  let changed = false;
  for (const entry of document.tasks) {
    if (entry.status === "running" && !entry.sessionId) {
      entry.status = "pending";
      entry.updatedAt = new Date().toISOString();
      changed = true;
    }
    // running 且有 sessionId 的任务：保持 running 状态，等 pollRunning 通过
    // sessionAlive 检查 + retryExecution 自动恢复（无需 wakeupNeeded 标记）
  }
  if (changed) {
    syncRecentRequests();
    atomicWrite(LEDGER_FILE, JSON.stringify(document, null, 2));
  }
}

// ─── 公开 API ──────────────────────────────────────────

/** @returns {LedgerEntry[]} */
export function loadLedger() {
  if (!document) load();
  return document.tasks;
}

/** 强制写入（用于显式同步） */
export function flushLedger() {
  if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
  syncRecentRequests();
  atomicWrite(LEDGER_FILE, JSON.stringify(document, null, 2));
}

/** @returns {{ revision: number, tasks: LedgerEntry[], config: { maxConcurrent: number } }} */
export function snapshot() {
  if (!document) load();
  return { revision: document.revision, tasks: document.tasks, config: document.config };
}

/**
 * 按 key 查找
 * @param {string} key
 * @returns {LedgerEntry | undefined}
 */
export function findByKey(key) {
  if (!document) load();
  return document.tasks.find(e => e.key === key);
}

/**
 * 更新或新增条目
 * @param {string} key
 * @param {Partial<LedgerEntry>} patch
 * @returns {LedgerEntry}
 */
export function upsertEntry(key, patch) {
  if (!document) load();
  const idx = document.tasks.findIndex(e => e.key === key);
  if (idx >= 0) {
    document.tasks[idx] = { ...document.tasks[idx], ...patch, updatedAt: new Date().toISOString() };
    return document.tasks[idx];
  }
  const entry = {
    key,
    status: "pending",
    workDir: null,
    sessionId: null,
    goalRef: null,
    attempts: 0,
    blockedResumes: 0,
    executions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...patch,
  };
  document.tasks.push(entry);
  return entry;
}

/**
 * 删除条目
 * @param {string} key
 * @returns {boolean}
 */
export function removeEntry(key) {
  if (!document) load();
  const idx = document.tasks.findIndex(e => e.key === key);
  if (idx < 0) return false;
  document.tasks.splice(idx, 1);
  return true;
}

/**
 * 读取并发配置
 * @returns {number}
 */
export function getConcurrency() {
  if (!document) load();
  return document.config.maxConcurrent;
}

/**
 * 设置并发配置
 * @param {number} maxConcurrent
 */
export function setConcurrency(maxConcurrent) {
  if (!document) load();
  document.config.maxConcurrent = clampConcurrency(maxConcurrent);
  commit();
}

// ─── requestId 去重 ────────────────────────────────────

/**
 * 检查并注册 requestId（去重）
 * @param {string} requestId
 * @param {object} action
 * @returns {boolean} true 表示新请求，需要执行；false 表示重复
 */
export function checkRequest(requestId, action) {
  if (!document) load();
  const fingerprint = createHash("sha256").update(JSON.stringify(action)).digest("hex");
  const cached = requestCache.get(requestId);
  if (cached) {
    if (cached.fingerprint !== fingerprint) {
      throw new Error("request id was reused with a different action");
    }
    return false; // 重复请求，跳过
  }
  requestCache.set(requestId, { fingerprint });
  while (requestCache.size > MAX_REQUEST_CACHE) {
    requestCache.delete(requestCache.keys().next().value);
  }
  return true;
}

// ─── 运行中任务计数 ────────────────────────────────────

/**
 * @returns {number} 当前 running 状态的任务数
 */
export function runningCount() {
  if (!document) load();
  return document.tasks.filter(e => e.status === "running").length;
}

/**
 * 标记任务为已读
 * @param {string} key
 * @returns {boolean}
 */
export function markRead(key) {
  if (!document) load();
  const entry = document.tasks.find(e => e.key === key);
  if (!entry) return false;
  entry.readAt = new Date().toISOString();
  commit();
  return true;
}

/**
 * 标记任务为未读
 * @param {string} key
 * @returns {boolean}
 */
export function markUnread(key) {
  if (!document) load();
  const entry = document.tasks.find(e => e.key === key);
  if (!entry) return false;
  entry.readAt = null;
  commit();
  return true;
}

/**
 * 获取未读任务数
 * @returns {number}
 */
export function unreadCount() {
  if (!document) load();
  return document.tasks.filter(e => {
    // 只统计 terminal 状态的任务（已完成/失败/停止）
    if (e.status !== "done" && e.status !== "failed" && e.status !== "stopped") return false;
    // 归档的不算
    if (e.archivedAt) return false;
    // 没有 readAt 或 updatedAt 晚于 readAt 视为未读
    if (!e.readAt) return true;
    return e.updatedAt > e.readAt;
  }).length;
}


// ─── 初始化 ────────────────────────────────────────────

// 模块加载时立即初始化
if (!document) load();
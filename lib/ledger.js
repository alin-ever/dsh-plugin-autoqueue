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
 * @property {ExecutionRecord[]} executions
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} [raw]
 * @property {string} [body]
 * @property {string} [workspace]
 * @property {string} [agentPreset]
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

/**
 * 恢复中断的 running 任务
 */
function reconcileInterrupted() {
  let changed = false;
  for (const entry of document.tasks) {
    if (entry.status === "running" && !entry.sessionId) {
      entry.status = "interrupted";
      entry.workDir = null;
      changed = true;
    }
    if (entry.status === "running" && entry.sessionId) {
      entry.wakeupNeeded = true;
      changed = true;
    }
  }
  if (changed) {
    syncRecentRequests();
    atomicWrite(LEDGER_FILE, JSON.stringify(document, null, 2));
  }
}

// ─── 并发控制 ──────────────────────────────────────────

function clampConcurrency(v) {
  return Math.max(1, Math.min(MAX_CONCURRENT_CAP, v));
}

/**
 * @returns {number}
 */
export function getConcurrency() {
  if (!document) load();
  return document.config.maxConcurrent;
}

/**
 * @param {number} v
 */
export function setConcurrency(v) {
  if (!document) load();
  document.config.maxConcurrent = clampConcurrency(v);
}

// ─── 持久化 ────────────────────────────────────────────

let commitTimer = null;

/** 提交缓存到磁盘（防抖） */
function commit() {
  if (commitTimer) clearTimeout(commitTimer);
  commitTimer = setTimeout(() => {
    commitTimer = null;
    syncRecentRequests();
    atomicWrite(LEDGER_FILE, JSON.stringify(document, null, 2));
  }, 0);
}

/** 立即刷盘 */
export function flushLedger() {
  if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
  syncRecentRequests();
  atomicWrite(LEDGER_FILE, JSON.stringify(document, null, 2));
}

/** 同步近期 requestId 到文档 */
function syncRecentRequests() {
  document.recentRequests = Array.from(requestCache.entries())
    .map(([requestId, v]) => ({ requestId, ...v }))
    .slice(-MAX_REQUEST_CACHE);
}

// ─── 快照 ──────────────────────────────────────────────

/**
 * @returns {{ revision: number, tasks: LedgerEntry[], config: { maxConcurrent: number } }}
 */
export function snapshot() {
  if (!document) load();
  return {
    revision: document.revision,
    tasks: document.tasks,
    config: { maxConcurrent: document.config.maxConcurrent },
  };
}

// ─── 查询 ──────────────────────────────────────────────

/**
 * @param {string} key
 * @returns {LedgerEntry | undefined}
 */
export function findByKey(key) {
  if (!document) load();
  return document.tasks.find(e => e.key === key);
}

/**
 * @returns {LedgerEntry[]}
 */
export function loadLedger() {
  if (!document) load();
  return document.tasks;
}

// ─── 写入 ──────────────────────────────────────────────

/**
 * 原子写入任务条目，自动 +1 revision
 * @param {string} key
 * @param {Partial<LedgerEntry>} patch
 * @returns {LedgerEntry}
 */
export function upsertEntry(key, patch) {
  if (!document) load();
  const idx = document.tasks.findIndex(e => e.key === key);
  if (idx >= 0) {
    document.tasks[idx] = { ...document.tasks[idx], ...patch, updatedAt: new Date().toISOString() };
    document.revision++;
    commit();
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
  document.revision++;
  commit();
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
  commit();
  return true;
}

// ─── 去重 ──────────────────────────────────────────────

/**
 * 检查 requestId 是否已使用（防重放）
 * @param {string} requestId
 * @param {object} action
 * @returns {boolean} true=首次，false=重复
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

// ─── 初始化 ────────────────────────────────────────────

// 模块加载时立即初始化
if (!document) load();
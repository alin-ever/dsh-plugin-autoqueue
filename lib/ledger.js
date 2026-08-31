/**
 * 账本 — 对齐 task-board host-ledger.ts 模式
 * 原子写入 + requestId 去重 + schema version
 * @module autoqueue/ledger
 */

import { existsSync, readFileSync, copyFileSync, chmodSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  getQueueDir, atomicWrite, ensurePrivateDir, validateKey,
  validateCronExpression, validateSchedule, MAX_TASK_CONTENT_BYTES, MAX_TASK_FILE_BYTES,
} from "./files.js";

// ─── 常量 ──────────────────────────────────────────────

const SCHEMA_VERSION = 2;
const DEFAULT_MAX_CONCURRENT = 1;
const MAX_CONCURRENT_CAP = 8;
const MAX_REQUEST_CACHE = 256;
const MAX_REQUEST_ID_LENGTH = 128;
const MAX_LEDGER_BYTES = 64 * 1024 * 1024;
const MAX_EXECUTIONS_PER_TASK = 100;
const LIFECYCLE_HEADROOM_BYTES = 64 * 1024;
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;

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
 * @property {number} [lastCronDispatch]
 * @property {boolean} [_foregroundPausePending]
 * @property {boolean} [_foregroundPaused]
 * @property {boolean} [_foregroundCancelPending]
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
let loadedQueueDir = null;
let loadedLedgerFile = null;
/** @type {Map<string, {fingerprint: string, completed: boolean}>} */
const requestCache = new Map();

// ─── 初始化 ────────────────────────────────────────────

function createEmptyDocument() {
  return {
      schemaVersion: SCHEMA_VERSION,
      revision: 0,
      tasks: [],
      config: { maxConcurrent: DEFAULT_MAX_CONCURRENT },
      recentRequests: [],
  };
}

function readLedger(queueDir, ledgerFile) {
  ensurePrivateDir(queueDir);
  if (!existsSync(ledgerFile)) {
    return createEmptyDocument();
  }
  try {
    const stat = statSync(ledgerFile);
    if (!stat.isFile()) throw new Error("ledger path is not a regular file");
    if (stat.size > MAX_LEDGER_BYTES) throw ledgerCapacityError(stat.size);
    const raw = readFileSync(ledgerFile, "utf8");
    /** @type {Partial<LedgerDocument>} */
    const parsed = JSON.parse(raw);
    validateLedgerDocument(parsed);
    try { chmodSync(ledgerFile, 0o600); } catch { /* Windows ACLs own access */ }
    const normalized = {
      schemaVersion: SCHEMA_VERSION,
      revision: parsed.revision,
      tasks: parsed.tasks.map(normalizeEntry),
      config: {
        maxConcurrent: clampConcurrency(
          typeof parsed.config?.maxConcurrent === "number" ? parsed.config.maxConcurrent : DEFAULT_MAX_CONCURRENT,
        ),
      },
      recentRequests: Array.isArray(parsed.recentRequests)
        ? parsed.recentRequests.slice(-MAX_REQUEST_CACHE)
        : [],
    };
    assertSerializedCapacity(normalized, new Map(normalized.recentRequests.map(req => [
      req.requestId,
      { fingerprint: req.fingerprint, completed: true },
    ])));
    return normalized;
  } catch (err) {
    // fail-closed：保留原文件和只读诊断副本，不得以空账本继续运行。
    let backupFile = null;
    if (existsSync(ledgerFile)) {
      backupFile = ledgerFile + ".corrupt-" + Date.now();
      try {
        copyFileSync(ledgerFile, backupFile);
        chmodSync(backupFile, 0o600);
      } catch { backupFile = null; }
    }
    const suffix = backupFile ? `；诊断副本: ${backupFile}` : "";
    const wrapped = new Error(`autoqueue 账本损坏，已拒绝启动且未修改原文件: ${ledgerFile}${suffix}；${err.message}`, { cause: err });
    wrapped.code = err?.code === "ledger-capacity" ? "ledger-capacity" : "ledger-corrupt";
    throw wrapped;
  }
}

function activateDocument(nextDocument, queueDir, ledgerFile) {
  document = nextDocument;
  loadedQueueDir = queueDir;
  loadedLedgerFile = ledgerFile;
  persistenceError = null;
  requestCache.clear();
  for (const req of document.recentRequests) {
    // Only completed requests are serialized into recentRequests.
    requestCache.set(req.requestId, { fingerprint: req.fingerprint, completed: true });
  }
  reconcileInterrupted();
}

function isTimestampString(value) {
  return typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

function assertOptionalTimestamp(entry, name) {
  if (entry[name] !== undefined && entry[name] !== null && !isTimestampString(entry[name])) {
    throw new Error(`ledger task ${name} is invalid: ${entry.key}`);
  }
}

function assertOptionalBoolean(entry, name) {
  if (entry[name] !== undefined && entry[name] !== null && typeof entry[name] !== "boolean") {
    throw new Error(`ledger task ${name} is invalid: ${entry.key}`);
  }
}

function assertOptionalInteger(entry, name, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (entry[name] !== undefined && entry[name] !== null &&
      (!Number.isSafeInteger(entry[name]) || entry[name] < min || entry[name] > max)) {
    throw new Error(`ledger task ${name} is invalid: ${entry.key}`);
  }
}

function validateLedgerDocument(parsed) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("ledger root must be an object");
  if (parsed.schemaVersion !== SCHEMA_VERSION) throw new Error("unsupported ledger schema");
  if (!Number.isSafeInteger(parsed.revision) || parsed.revision < 0) throw new Error("ledger revision is invalid");
  if (!Array.isArray(parsed.tasks)) throw new Error("ledger tasks must be an array");
  const keys = new Set();
  const statuses = new Set(["pending", "running", "done", "failed", "stopped", "interrupted"]);
  const executionResults = new Set(["done", "failed", "stopped"]);
  for (const entry of parsed.tasks) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("ledger contains an invalid task entry");
    validateKey(entry.key);
    if (keys.has(entry.key)) throw new Error(`ledger contains duplicate task key: ${entry.key}`);
    keys.add(entry.key);
    if (!statuses.has(entry.status)) throw new Error(`ledger task has invalid status: ${entry.key}`);
    if (!isTimestampString(entry.createdAt) || !isTimestampString(entry.updatedAt)) throw new Error(`ledger task timestamps are invalid: ${entry.key}`);
    assertOptionalTimestamp(entry, "readAt");
    assertOptionalTimestamp(entry, "archivedAt");
    for (const name of ["workDir", "sessionId", "workspace", "agentPreset", "model", "webhook"]) {
      if (entry[name] !== undefined && entry[name] !== null && typeof entry[name] !== "string") throw new Error(`ledger task ${name} is invalid: ${entry.key}`);
    }
    for (const name of ["attempts", "blockedResumes"]) {
      if (!Number.isSafeInteger(entry[name]) || entry[name] < 0) throw new Error(`ledger task ${name} is invalid: ${entry.key}`);
    }
    for (const [name, min, max] of [
      ["priority", 1, 10],
      ["maxAttempts", 1, 10],
      ["maxGoalRounds", 1, 100],
      ["maxBlockedResumes", 0, 10],
      ["timeoutMs", 600_000, 86_400_000],
      ["unknownThreshold", 1, 10],
    ]) {
      if (entry[name] !== undefined && entry[name] !== null &&
          (!Number.isSafeInteger(entry[name]) || entry[name] < min || entry[name] > max)) {
        throw new Error(`ledger task ${name} is invalid: ${entry.key}`);
      }
    }
    for (const name of [
      "_generation", "consecutiveUnknowns", "_currentRound", "_lastActivityTime",
      "lastActiveTime", "lastCronDispatch", "nextRetryAt", "_launchReservedAt",
      "_orphanCleanupDeadline", "_orphanCleanupAttempts", "_rateLimitAttemptBase",
    ]) assertOptionalInteger(entry, name);
    assertOptionalInteger(entry, "retryBackoffMs", 0, MAX_RETRY_DELAY_MS);
    assertOptionalInteger(entry, "_rateLimitDelayMs", 0, MAX_RETRY_DELAY_MS);
    for (const name of [
      "autoArchive", "enableNotifications", "_deadlinePending", "_launchPending",
      "_orphanCleanupPending", "_rateLimitPending", "_goalAdmissionUncertain",
      "_goalContainmentConfirmed", "_promptAdmissionUncertain", "_promptContainmentConfirmed",
      "_foregroundPausePending", "_foregroundPaused", "_foregroundCancelPending",
    ]) assertOptionalBoolean(entry, name);
    if (entry._goalPhase !== undefined && entry._goalPhase !== null && typeof entry._goalPhase !== "string") {
      throw new Error(`ledger task _goalPhase is invalid: ${entry.key}`);
    }
    if (entry.goalRef !== undefined && entry.goalRef !== null) {
      if (!entry.goalRef || typeof entry.goalRef !== "object" || Array.isArray(entry.goalRef)
        || typeof entry.goalRef.id !== "string" || !entry.goalRef.id
        || !Number.isSafeInteger(entry.goalRef.revision) || entry.goalRef.revision < 0) {
        throw new Error(`ledger task goalRef is invalid: ${entry.key}`);
      }
    }
    if (entry._goalAdmissionUncertain === true && entry._promptAdmissionUncertain === true) {
      throw new Error(`ledger task admission quarantine markers are not mutually exclusive: ${entry.key}`);
    }
    if (entry._goalAdmissionUncertain === true &&
        (entry.status !== "running" || typeof entry.sessionId !== "string" || !entry.sessionId.trim())) {
      throw new Error(`ledger task goal admission quarantine is invalid: ${entry.key}`);
    }
    if (entry._goalContainmentConfirmed != null && entry._goalAdmissionUncertain !== true) {
      throw new Error(`ledger task goal containment state is invalid: ${entry.key}`);
    }
    if (entry._promptAdmissionUncertain === true &&
        (entry.status !== "running" || typeof entry.sessionId !== "string" || !entry.sessionId.trim() || !entry.goalRef)) {
      throw new Error(`ledger task prompt admission quarantine is invalid: ${entry.key}`);
    }
    if (entry._promptContainmentConfirmed != null && entry._promptAdmissionUncertain !== true) {
      throw new Error(`ledger task prompt containment state is invalid: ${entry.key}`);
    }
    if ((entry._foregroundPausePending === true || entry._foregroundPaused === true ||
        entry._foregroundCancelPending === true) &&
        (entry.status !== "running" || typeof entry.sessionId !== "string" || !entry.sessionId.trim())) {
      throw new Error(`ledger task foreground pause state is invalid: ${entry.key}`);
    }
    if (entry._foregroundPaused === true && !entry.goalRef) {
      throw new Error(`ledger task foreground pause has no goal ref: ${entry.key}`);
    }
    if (entry._foregroundPausePending === true && entry._foregroundPaused === true) {
      throw new Error(`ledger task foreground pause markers conflict: ${entry.key}`);
    }
    if (entry._foregroundCancelPending === true && entry._foregroundPaused !== true) {
      throw new Error(`ledger task foreground cancel has no durable pause: ${entry.key}`);
    }
    if (!Array.isArray(entry.executions)) throw new Error(`ledger task executions is invalid: ${entry.key}`);
    const executionIds = new Set();
    for (const execution of entry.executions) {
      if (!execution || typeof execution !== "object" || Array.isArray(execution)) throw new Error(`ledger task has invalid execution record: ${entry.key}`);
      if (typeof execution.id !== "string" || !execution.id.trim()) throw new Error(`ledger execution id is invalid: ${entry.key}`);
      if (executionIds.has(execution.id)) throw new Error(`ledger contains duplicate execution id: ${entry.key}`);
      executionIds.add(execution.id);
      if (execution.sessionId !== null && (typeof execution.sessionId !== "string" || !execution.sessionId.trim())) throw new Error(`ledger execution sessionId is invalid: ${entry.key}`);
      if (!Number.isSafeInteger(execution.attempt) || execution.attempt < 1) throw new Error(`ledger execution attempt is invalid: ${entry.key}`);
      if (!isTimestampString(execution.startedAt)) throw new Error(`ledger execution startedAt is invalid: ${entry.key}`);
      if (execution.endedAt !== undefined && execution.endedAt !== null && !isTimestampString(execution.endedAt)) throw new Error(`ledger execution endedAt is invalid: ${entry.key}`);
      if (execution.error !== undefined && execution.error !== null && typeof execution.error !== "string") throw new Error(`ledger execution error is invalid: ${entry.key}`);
      if (execution.result !== undefined && !executionResults.has(execution.result)) throw new Error(`ledger execution result is invalid: ${entry.key}`);
      if (execution.result !== undefined && !isTimestampString(execution.endedAt)) throw new Error(`ledger execution result has no valid endedAt: ${entry.key}`);
      for (const name of ["workDir", "workspaceId"]) {
        if (execution[name] !== undefined && execution[name] !== null && typeof execution[name] !== "string") throw new Error(`ledger execution ${name} is invalid: ${entry.key}`);
      }
    }
    if (typeof entry.body !== "string") throw new Error(`ledger task body is invalid: ${entry.key}`);
    if (entry.raw !== undefined && entry.raw !== null && typeof entry.raw !== "string") throw new Error(`ledger task raw is invalid: ${entry.key}`);
    if (typeof entry.body === "string" && Buffer.byteLength(entry.body, "utf8") > MAX_TASK_CONTENT_BYTES) throw new Error(`ledger task body exceeds 2MB: ${entry.key}`);
    if (typeof entry.raw === "string" && Buffer.byteLength(entry.raw, "utf8") > MAX_TASK_FILE_BYTES) throw new Error(`ledger task raw content is too large: ${entry.key}`);
    if (entry.schedule != null) validateSchedule(entry.schedule);
    if (entry.cron != null) validateCronExpression(entry.cron, "cron");
    if (entry.deadline != null) validateCronExpression(entry.deadline, "deadline");
    if (entry.schedule && entry.cron) throw new Error(`ledger task has both schedule and cron: ${entry.key}`);
  }
  if (parsed.config !== undefined && (!parsed.config || typeof parsed.config !== "object" || Array.isArray(parsed.config))) {
    throw new Error("ledger config is invalid");
  }
  if (parsed.config?.maxConcurrent !== undefined && (!Number.isSafeInteger(parsed.config.maxConcurrent) || parsed.config.maxConcurrent < 1 || parsed.config.maxConcurrent > MAX_CONCURRENT_CAP)) {
    throw new Error("ledger maxConcurrent is invalid");
  }
  if (parsed.recentRequests !== undefined && !Array.isArray(parsed.recentRequests)) throw new Error("ledger recentRequests is invalid");
  const requestIds = new Set();
  for (const request of parsed.recentRequests ?? []) {
    if (!request || typeof request !== "object" || typeof request.requestId !== "string" || !request.requestId || request.requestId.length > MAX_REQUEST_ID_LENGTH || !/^[a-f0-9]{64}$/.test(request.fingerprint)) {
      throw new Error("ledger recentRequests contains an invalid record");
    }
    if (requestIds.has(request.requestId)) throw new Error("ledger recentRequests contains a duplicate requestId");
    requestIds.add(request.requestId);
  }
}

function currentQueueDir() {
  return resolve(getQueueDir());
}

function assertInitialized() {
  if (!document) initializeLedger();
  if (currentQueueDir() !== loadedQueueDir) {
    throw new Error("queueDir 已变更；运行时热切换被拒绝，请显式 reloadLedger 或重启插件");
  }
}

function clampConcurrency(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) return DEFAULT_MAX_CONCURRENT;
  if (n > MAX_CONCURRENT_CAP) return MAX_CONCURRENT_CAP;
  return n;
}

// ─── 原子提交 ──────────────────────────────────────────

let commitTimer = null;
let persistenceError = null;

function normalizeEntry(entry) {
  const executions = Array.isArray(entry.executions)
    ? entry.executions.slice(-MAX_EXECUTIONS_PER_TASK).map(record => ({ ...record }))
    : [];
  const normalized = {
    ...entry,
    _generation: Number.isSafeInteger(entry._generation) && entry._generation >= 0 ? entry._generation : 0,
    ...(entry.goalRef && typeof entry.goalRef === "object" ? { goalRef: { ...entry.goalRef } } : {}),
    executions,
  };
  // Foreground pause ownership exists only for a concrete running goal. Every
  // terminal/requeue/new-launch transition therefore clears these markers in
  // one schema boundary instead of relying on dozens of callers to remember.
  if (normalized.status !== "running" || !normalized.sessionId || !normalized.goalRef) {
    normalized._foregroundPausePending = false;
    normalized._foregroundPaused = false;
    normalized._foregroundCancelPending = false;
  }
  return normalized;
}

function requestRecords(cache, includeInflight = false) {
  return [...cache]
    .filter(([, req]) => includeInflight || req.completed)
    .map(([requestId, req]) => ({
      requestId,
      fingerprint: req.fingerprint,
    }));
}

function ledgerCapacityError(actualBytes, reservedBytes = 0) {
  const detail = reservedBytes ? `，另需 ${reservedBytes} 字节任务生命周期预留` : "";
  const err = new Error(`queue-ledger.json 将达到 ${actualBytes} 字节${detail}，超过 ${MAX_LEDGER_BYTES} 字节上限`);
  err.code = "ledger-capacity";
  err.statusCode = 507;
  err.actualBytes = actualBytes;
  err.reservedBytes = reservedBytes;
  err.limitBytes = MAX_LEDGER_BYTES;
  return err;
}

/**
 * 以最终 pretty JSON 精确计量。另把 in-flight 预留投影成 completed，确保操作成功后
 * completeRequest 不会因只差一条 recentRequests 记录而留下半完成任务。
 */
function assertSerializedCapacity(candidate, cache, { reserveLifecycle = false } = {}) {
  const persisted = { ...candidate, recentRequests: requestRecords(cache) };
  const serialized = JSON.stringify(persisted, null, 2);
  const actualBytes = Buffer.byteLength(serialized, "utf8");
  if (actualBytes > MAX_LEDGER_BYTES) throw ledgerCapacityError(actualBytes);

  const hasInflight = [...cache.values()].some(request => !request.completed);
  let measuredBytes = actualBytes;
  if (hasInflight) {
    const projected = JSON.stringify({ ...persisted, recentRequests: requestRecords(cache, true) }, null, 2);
    const projectedBytes = Buffer.byteLength(projected, "utf8");
    if (projectedBytes > MAX_LEDGER_BYTES) throw ledgerCapacityError(projectedBytes);
    measuredBytes = projectedBytes;
  }
  if (reserveLifecycle) {
    const activeTasks = persisted.tasks.filter(entry =>
      entry.status === "pending" || entry.status === "running" || entry.status === "interrupted"
      || (!!entry.cron && !entry.archivedAt)).length;
    const reservedBytes = activeTasks * LIFECYCLE_HEADROOM_BYTES;
    if (measuredBytes + reservedBytes > MAX_LEDGER_BYTES) throw ledgerCapacityError(measuredBytes, reservedBytes);
  }
  return { document: persisted, serialized };
}

function cloneRequestCache(cache = requestCache) {
  return new Map([...cache].map(([requestId, request]) => [requestId, { ...request }]));
}

function replaceRequestCache(nextCache) {
  requestCache.clear();
  for (const [requestId, request] of nextCache) requestCache.set(requestId, request);
}

function scheduleCommit(targetDocument, serialized) {
  if (commitTimer) clearTimeout(commitTimer);
  const targetFile = loadedLedgerFile;
  commitTimer = setTimeout(() => {
    commitTimer = null;
    if (document !== targetDocument) return;
    try {
      atomicWrite(targetFile, serialized);
      persistenceError = null;
    } catch (err) {
      persistenceError = err;
      console.error("[autoqueue] 账本持久化失败，后续状态变更已暂停:", err.message);
    }
  }, 0);
}

function assertWritable() {
  if (!persistenceError) return;
  const err = new Error(`账本此前持久化失败，请先恢复磁盘并调用 flushLedger: ${persistenceError.message}`, { cause: persistenceError });
  err.code = "ledger-persistence";
  err.statusCode = 507;
  throw err;
}

/**
 * 所有持久化状态变更都先在副本上完成，再做 schema/容量校验，最后一次性换入。
 * mutator 或容量检查失败时 document、requestCache、revision 和待提交写入均保持不变。
 */
function transact(mutator, { bumpRevision = true } = {}) {
  assertInitialized();
  assertWritable();
  const draft = {
    ...document,
    tasks: [...document.tasks],
    config: { ...document.config },
    recentRequests: [...document.recentRequests],
  };
  const nextCache = cloneRequestCache();
  const result = mutator(draft, nextCache);
  draft.schemaVersion = SCHEMA_VERSION;
  draft.revision = document.revision + (bumpRevision ? 1 : 0);
  const prepared = assertSerializedCapacity(draft, nextCache, { reserveLifecycle: true });
  validateLedgerDocument(prepared.document);

  document = prepared.document;
  replaceRequestCache(nextCache);
  scheduleCommit(document, prepared.serialized);
  return result;
}

// ─── 启动恢复 ──────────────────────────────────────────

function reconcileInterrupted() {
  const hasInterrupted = document.tasks.some(entry => entry.status === "running" && !entry.sessionId);
  if (!hasInterrupted) return;
  const updatedAt = new Date().toISOString();
  transact(draft => {
    draft.tasks = draft.tasks.map(entry => entry.status === "running" && !entry.sessionId
      ? normalizeEntry({ ...entry, status: "pending", updatedAt, _generation: (entry._generation ?? 0) + 1 })
      : entry);
  });
  // running 且有 sessionId 的任务保持 running，等 pollRunning 做存活检查。
  flushActiveLedger();
}

// ─── 公开 API ──────────────────────────────────────────

/**
 * 显式初始化当前 queueDir 的账本。重复调用同一路径是幂等的。
 * @returns {LedgerEntry[]}
 */
export function initializeLedger() {
  const queueDir = currentQueueDir();
  if (document) {
    if (queueDir !== loadedQueueDir) throw new Error("账本已从其他 queueDir 加载；请使用 reloadLedger 或重启插件");
    return document.tasks;
  }
  const ledgerFile = join(queueDir, "queue-ledger.json");
  activateDocument(readLedger(queueDir, ledgerFile), queueDir, ledgerFile);
  return document.tasks;
}

/**
 * 显式切换/重新读取账本。旧账本的待提交数据会先写回旧路径。
 * @returns {LedgerEntry[]}
 */
export function reloadLedger() {
  if (document) flushActiveLedger();
  const queueDir = currentQueueDir();
  const ledgerFile = join(queueDir, "queue-ledger.json");
  const nextDocument = readLedger(queueDir, ledgerFile);
  activateDocument(nextDocument, queueDir, ledgerFile);
  return document.tasks;
}

/** @returns {LedgerEntry[]} */
export function loadLedger() {
  assertInitialized();
  return document.tasks;
}

function flushActiveLedger() {
  if (!document || !loadedLedgerFile) return;
  if (commitTimer) { clearTimeout(commitTimer); commitTimer = null; }
  const prepared = assertSerializedCapacity(document, requestCache);
  validateLedgerDocument(prepared.document);
  try {
    atomicWrite(loadedLedgerFile, prepared.serialized);
    persistenceError = null;
  } catch (err) {
    persistenceError = err;
    err.code ||= "ledger-persistence";
    err.statusCode ||= 507;
    throw err;
  }
}

/** 强制写入（用于显式同步） */
export function flushLedger() {
  assertInitialized();
  flushActiveLedger();
}

/** @returns {{ revision: number, tasks: LedgerEntry[], config: { maxConcurrent: number } }} */
export function snapshot() {
  assertInitialized();
  return { revision: document.revision, tasks: document.tasks, config: document.config };
}

/**
 * 按 key 查找
 * @param {string} key
 * @returns {LedgerEntry | undefined}
 */
export function findByKey(key) {
  assertInitialized();
  return document.tasks.find(e => e.key === key);
}

/**
 * 更新或新增条目
 * @param {string} key
 * @param {Partial<LedgerEntry>} patch
 * @returns {LedgerEntry}
 */
export function upsertEntry(key, patch) {
  const now = new Date().toISOString();
  transact(draft => {
    const idx = draft.tasks.findIndex(entry => entry.key === key);
    if (idx >= 0) {
      const generation = (draft.tasks[idx]._generation ?? 0) + 1;
      draft.tasks[idx] = normalizeEntry({ ...draft.tasks[idx], ...patch, key, updatedAt: now, _generation: generation });
      return;
    }
    draft.tasks.push(normalizeEntry({
      status: "pending",
      workDir: null,
      sessionId: null,
      goalRef: null,
      attempts: 0,
      blockedResumes: 0,
      executions: [],
      createdAt: now,
      updatedAt: now,
      ...patch,
      key,
      _generation: 1,
    }));
  });
  return document.tasks.find(entry => entry.key === key);
}

/**
 * 删除条目
 * @param {string} key
 * @returns {boolean}
 */
export function removeEntry(key) {
  assertInitialized();
  const idx = document.tasks.findIndex(e => e.key === key);
  if (idx < 0) return false;
  transact(draft => {
    draft.tasks.splice(idx, 1);
  });
  return true;
}

/**
 * 读取并发配置
 * @returns {number}
 */
export function getConcurrency() {
  assertInitialized();
  return document.config.maxConcurrent;
}

/**
 * 设置并发配置
 * @param {number} maxConcurrent
 */
export function setConcurrency(maxConcurrent) {
  transact(draft => {
    draft.config.maxConcurrent = clampConcurrency(maxConcurrent);
  });
}

// ─── requestId 去重 ────────────────────────────────────

/**
 * 检查并注册 requestId（去重）
 * @param {string} requestId
 * @param {object} action
 * @returns {"new"|"inflight"|"completed"}
 */
export function checkRequest(requestId, action) {
  assertInitialized();
  if (typeof requestId !== "string" || !requestId.trim() || requestId.length > MAX_REQUEST_ID_LENGTH) {
    throw new Error("requestId 必须是 1-128 个字符的字符串");
  }
  const fingerprint = createHash("sha256").update(JSON.stringify(action)).digest("hex");
  const cached = requestCache.get(requestId);
  if (cached) {
    if (cached.fingerprint !== fingerprint) {
      const err = new Error("request id was reused with a different action");
      err.code = "request-id-conflict";
      throw err;
    }
    return cached.completed ? "completed" : "inflight";
  }

  const nextCache = cloneRequestCache();
  let evictedCompleted = false;
  if (nextCache.size >= MAX_REQUEST_CACHE) {
    const completed = [...nextCache].find(([, request]) => request.completed);
    if (!completed) {
      const err = new Error(`requestId 缓存已有 ${MAX_REQUEST_CACHE} 个处理中请求，请稍后重试`);
      err.code = "request-cache-full";
      err.statusCode = 503;
      throw err;
    }
    nextCache.delete(completed[0]);
    evictedCompleted = true;
  }
  nextCache.set(requestId, { fingerprint, completed: false });

  // 预留本身不落盘；但容量投影必须为它将来的 completed 记录留出精确空间。
  assertSerializedCapacity(document, nextCache, { reserveLifecycle: true });
  if (evictedCompleted) {
    transact((_draft, cache) => {
      cache.clear();
      for (const [id, request] of nextCache) cache.set(id, request);
    }, { bumpRevision: false });
  } else {
    replaceRequestCache(nextCache);
  }
  return "new";
}

/** Persist a successfully committed requestId without changing task revision. */
export function completeRequest(requestId) {
  assertInitialized();
  const request = requestCache.get(requestId);
  if (!request) return false;
  if (request.completed) return true;
  transact((_draft, cache) => {
    const completed = { ...cache.get(requestId), completed: true };
    // Move to the end so completed eviction follows completion recency.
    cache.delete(requestId);
    cache.set(requestId, completed);
  }, { bumpRevision: false });
  return true;
}

/** 释放一次未成功执行的 requestId 预留，允许调用方安全重试。 */
export function releaseRequest(requestId) {
  assertInitialized();
  const request = requestCache.get(requestId);
  if (!request) return false;
  if (!request.completed) {
    requestCache.delete(requestId);
    return true;
  }
  transact((_draft, cache) => {
    cache.delete(requestId);
  }, { bumpRevision: false });
  return true;
}

// ─── 运行中任务计数 ────────────────────────────────────

/**
 * @returns {number} 当前 running 状态的任务数
 */
export function runningCount() {
  assertInitialized();
  return document.tasks.filter(e => e.status === "running").length;
}

/**
 * 标记任务为已读
 * @param {string} key
 * @returns {boolean}
 */
export function markRead(key) {
  assertInitialized();
  if (!document.tasks.some(entry => entry.key === key)) return false;
  const readAt = new Date().toISOString();
  transact(draft => {
    const idx = draft.tasks.findIndex(entry => entry.key === key);
    draft.tasks[idx] = normalizeEntry({ ...draft.tasks[idx], readAt, updatedAt: readAt });
  });
  return true;
}

/**
 * 标记任务为未读
 * @param {string} key
 * @returns {boolean}
 */
export function markUnread(key) {
  assertInitialized();
  if (!document.tasks.some(entry => entry.key === key)) return false;
  const updatedAt = new Date().toISOString();
  transact(draft => {
    const idx = draft.tasks.findIndex(entry => entry.key === key);
    draft.tasks[idx] = normalizeEntry({ ...draft.tasks[idx], readAt: null, updatedAt });
  });
  return true;
}

/**
 * 获取未读任务数
 * @returns {number}
 */
export function unreadCount() {
  assertInitialized();
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

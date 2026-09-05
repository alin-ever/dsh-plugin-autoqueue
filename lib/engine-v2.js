/**
 * QueueEngine v2 — 薄编排层
 * 组装 state-machine + scheduler + cancellation + lifecycle
 * 参考 K8s Controller 的 reconciliation loop 模式
 * @module autoqueue/engine-v2
 */

import {
  listTaskFiles, removeTaskFile, createRunDir, writeTaskFile, matchCron,
  safeReadReportFile, getTasksDir, writeTaskCopy, writeGoalSnapshot, writeResult,
} from "./files.js";
import { join } from "node:path";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

import {
  loadLedger, snapshot, findByKey, upsertEntry,
  getConcurrency, setConcurrency, runningCount, checkRequest, completeRequest, releaseRequest,
  flushLedger, removeEntry, unreadCount,
} from "./ledger.js";
import {
  AUTOQUEUE_UNATTENDED_PRESET,
  createAutoqueueSessionId,
  createRunner,
  isAutoqueueSessionId,
  SessionLaunchError,
} from "./runner.js";
import { createInitialPhase, transition, isValidPhase, deriveStatus, isTerminal, isRunning, isCancellable, isCancelling, isUncertain } from "./state-machine.js";
import { calculateNextRun, isDue, isCatchUpNeeded, markRunComplete, markRunFailed, buildFileContent } from "./scheduler.js";
import { createCancellation } from "./cancellation.js";
import { createLifecycle } from "./lifecycle.js";

// ─── 常量 ──────────────────────────────────────────────

const POLL_INTERVAL_MS = 10_000;
const WEBHOOK_TIMEOUT_MS = 10_000;
const DNS_TIMEOUT_MS = 5_000;
const MAX_WEBHOOK_RESPONSE_BYTES = 64 * 1024;
const MAX_PROVIDER_RETRY_AFTER_MS = 24 * 60 * 60 * 1000;
const ISOLATION_OVERRIDE_FIELDS = ["workspace", "agentPreset"];

// ─── 辅助函数 ──────────────────────────────────────────

function hasIsolationOverride(value) {
  return value !== undefined && value !== null && value !== "";
}

function isolationOverrideError(field) {
  const err = new Error(`隔离模式不支持 ${field} 覆盖`);
  err.code = "isolation-override-not-allowed";
  err.statusCode = 409;
  return err;
}

function assertNoIsolationOverrides(value) {
  for (const field of ISOLATION_OVERRIDE_FIELDS) {
    if (hasIsolationOverride(value?.[field])) throw isolationOverrideError(field);
  }
}

function sameGoalRef(left, right) {
  if (left == null || right == null) return left == null && right == null;
  return left.id === right.id && left.revision === right.revision;
}

async function withDeadline(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Webhook ───────────────────────────────────────────

function ipv4Octets(address) { /* 复用自重构前的实现 */
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map(part => Number(part));
  if (octets.some((part, index) => (
    !/^\d{1,3}$/.test(parts[index]) || !Number.isInteger(part) || part < 0 || part > 255
  ))) return null;
  return octets;
}

function ipv6Hextets(address) {
  const expandPart = part => {
    if (!part) return [];
    const result = [];
    for (const token of part.split(":")) {
      if (token.includes(".")) {
        const octets = ipv4Octets(token);
        if (!octets) return null;
        result.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
      } else {
        const value = Number.parseInt(token, 16);
        if (!/^[0-9a-f]{1,4}$/i.test(token) || !Number.isInteger(value)) return null;
        result.push(value);
      }
    }
    return result;
  };
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const head = expandPart(halves[0]);
  const tail = expandPart(halves[1] ?? "");
  if (!head || !tail) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const missing = 8 - head.length - tail.length;
  if (missing < 1) return null;
  return [...head, ...Array(missing).fill(0), ...tail];
}

function isUnsafeIpv4(address) {
  const octets = ipv4Octets(address);
  if (!octets) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224;
}

function isUnsafeIp(address) {
  const unbracketed = address.startsWith("[") && address.endsWith("]")
    ? address.slice(1, -1) : address;
  const normalized = unbracketed.toLowerCase().split("%")[0];
  const family = isIP(normalized);
  if (family === 4) return isUnsafeIpv4(normalized);
  if (family !== 6) return true;
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("::ffff:") || normalized.startsWith("::ffff:0:")) return true;
  if (normalized.startsWith("::")) return true;
  const hextets = ipv6Hextets(normalized);
  if (!hextets) return true;
  const [first, second, third, fourth, fifth, sixth] = hextets;
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  if ((first & 0xffc0) === 0xfec0) return true;
  if ((first & 0xff00) === 0xff00) return true;
  if (first === 0x0064 && second === 0xff9b &&
      ((third === 0 && fourth === 0 && fifth === 0 && sixth === 0) || third === 1)) return true;
  if (first === 0x2002) return true;
  if (first === 0x2001 && second === 0) return true;
  return false;
}

async function resolvePublicWebhookUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error("invalid webhook URL"); }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("webhook protocol must be http or https");
  }
  if (url.username || url.password) throw new Error("webhook credentials are not allowed");
  const hostname = url.hostname.startsWith("[") && url.hostname.endsWith("]")
    ? url.hostname.slice(1, -1) : url.hostname;
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isUnsafeIp(hostname)) throw new Error("webhook target is not public");
    return { url, address: hostname, family: literalFamily };
  }
  const records = await withDeadline(
    lookup(hostname, { all: true, verbatim: true }),
    DNS_TIMEOUT_MS, "webhook DNS lookup",
  );
  if (!Array.isArray(records) || records.length === 0 || records.some(r => isUnsafeIp(r.address))) {
    throw new Error("webhook target is not public");
  }
  return { url, address: records[0].address, family: records[0].family };
}

function postPinnedWebhook(target, body) {
  return new Promise((resolve, reject) => {
    const { url, address, family } = target;
    const hostname = url.hostname.startsWith("[") && url.hostname.endsWith("]")
      ? url.hostname.slice(1, -1) : url.hostname;
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const opts = {
      protocol: url.protocol, hostname: address, family,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      method: "POST", path: `${url.pathname}${url.search}`,
      headers: { Host: url.host, "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body), Connection: "close" },
      ...(url.protocol === "https:" && !isIP(hostname) ? { servername: hostname } : {}),
    };
    let settled = false;
    let req, responseStream, wallTimer;
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(wallTimer);
      if (error) reject(error); else resolve(value);
    };
    req = transport(opts, response => {
      responseStream = response;
      let received = 0;
      response.on("data", chunk => {
        received += chunk.length;
        if (received > MAX_WEBHOOK_RESPONSE_BYTES) { response.destroy(); finish(false); }
      });
      response.on("end", () => finish((response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300));
      response.on("error", e => finish(false, e));
    });
    req.setTimeout(WEBHOOK_TIMEOUT_MS, () => req.destroy(new Error(`webhook timed out after ${WEBHOOK_TIMEOUT_MS}ms`)));
    req.on("error", e => finish(false, e));
    wallTimer = setTimeout(() => {
      const e = new Error(`webhook exceeded ${WEBHOOK_TIMEOUT_MS}ms wall-clock`);
      responseStream?.destroy(e); req.destroy(e); finish(false, e);
    }, WEBHOOK_TIMEOUT_MS);
    req.end(body);
  });
}

function releaseFailedRequest(requestId) {
  if (!requestId) return;
  releaseRequest(requestId);
  try { flushLedger(); } catch { /* preserve original failure */ }
}

function mergeExecutionRecord(executions, record) {
  const next = [...(executions ?? [])];
  const index = next.findIndex(c => c?.id === record.id);
  if (index >= 0) next[index] = { ...next[index], ...record };
  else next.push(record);
  return next;
}

function formatTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ─── 创建引擎 ──────────────────────────────────────────

/**
 * 创建 QueueEngine v2 实例
 * @param {object} apiProxy - ctx.apiProxy
 * @param {object} [options]
 */
export function createEngine(apiProxy, options = {}) {
  assertNoIsolationOverrides(options);

  // 创建子模块
  const runner = createRunner(apiProxy, options);
  const stateMachine = { transition, isValidPhase, createInitialPhase, deriveStatus, isTerminal, isRunning, isCancellable, isCancelling, isUncertain };
  const cancellation = createCancellation(runner, stateMachine);
  const lifecycle = createLifecycle(runner, stateMachine, { calculateNextRun, isDue, isCatchUpNeeded, markRunComplete, markRunFailed, buildFileContent }, {
    maxGoalRounds: options.maxGoalRounds ?? 40,
    taskTimeoutMs: options.taskTimeoutMs ?? 180 * 60 * 1000,
    maxAttempts: options.maxAttempts ?? 3,
  });

  // 运行时状态
  const inFlight = new Set();
  const dispatchReservations = new Set();
  const stopping = new Set();
  const goalAdmissionsInFlight = new Set();
  let disposed = false;
  let runtimePollDirty = false;
  let runtimePollScheduled = false;
  let runtimePollDraining = false;
  let pendingScanDirty = false;
  let pendingScanScheduled = false;
  let pendingScanTimer = null;

  const runtimeObservation = {
    lastPollAt: null, lastScanAt: null,
    lastNativeEventAt: null, lastNativeEventSource: null,
    foregroundGate: "unknown", sessionListKnown: false,
  };

  // 运行时配置
  const engineConfig = {
    maxGoalRounds: options.maxGoalRounds ?? 40,
    maxBlockedResumes: options.maxBlockedResumes ?? 3,
    autoArchive: options.autoArchive ?? true,
    maxAttempts: options.maxAttempts ?? 3,
    taskTimeoutMs: options.taskTimeoutMs ?? 180 * 60 * 1000,
    priority: options.priority ?? 5,
    webhook: options.webhook ?? null,
    queueDir: options.queueDir ?? null,
    defaultDeadline: options.defaultDeadline ?? null,
    enableNotifications: options.enableNotifications ?? false,
    enableHostAiTools: options.enableHostAiTools ?? true,
    unknownThreshold: options.unknownThreshold ?? 3,
    retryBackoffBaseMs: options.retryBackoffBaseMs ?? 30_000,
    retryBackoffMaxMs: options.retryBackoffMaxMs ?? 300_000,
  };

  // ─── 事件调度 ──────────────────────────────────────

  function scheduleRuntimePoll() {
    if (disposed || !runtimePollDirty || runtimePollScheduled || runtimePollDraining || engine._polling) return;
    runtimePollScheduled = true;
    queueMicrotask(async () => {
      runtimePollScheduled = false;
      if (disposed || !runtimePollDirty || runtimePollDraining || engine._polling) return;
      runtimePollDirty = false;
      runtimePollDraining = true;
      try { await engine.pollRunning(); }
      catch (err) { console.error("[autoqueue] runtime pollRunning 失败:", err.message); }
      finally { runtimePollDraining = false; scheduleRuntimePoll(); }
    });
  }

  function schedulePendingScan() {
    if (disposed || !pendingScanDirty || pendingScanScheduled || engine._scanning || dispatchReservations.size > 0) return;
    pendingScanScheduled = true;
    pendingScanTimer = setTimeout(async () => {
      pendingScanTimer = null;
      pendingScanScheduled = false;
      if (disposed || !pendingScanDirty || engine._scanning || dispatchReservations.size > 0) return;
      pendingScanDirty = false;
      try { await engine.scanPending(); }
      catch (err) { console.error("[autoqueue] replay scanPending 失败:", err.message); }
      finally { schedulePendingScan(); }
    }, 0);
    pendingScanTimer.unref?.();
  }

  function releaseDispatchReservation(key) {
    const released = dispatchReservations.delete(key);
    if (released && !disposed && dispatchReservations.size === 0) schedulePendingScan();
    return released;
  }

  // ─── Webhook ────────────────────────────────────────

  async function callWebhook(entry, result, error, terminalStatus = result) {
    const url = entry.webhook ?? engineConfig.webhook;
    if (!url) return true;
    try {
      const target = await resolvePublicWebhookUrl(url);
      const body = JSON.stringify({
        key: entry.key, status: terminalStatus, result, error: error ?? null,
        attempts: entry.attempts, blockedResumes: entry.blockedResumes,
        finishedAt: new Date().toISOString(),
      });
      return await postPinnedWebhook(target, body);
    } catch { return false; }
  }

  // ─── 条件归档 ──────────────────────────────────────

  async function archiveIfEnabled(entry) {
    if (disposed) return false;
    const shouldArchive = entry.autoArchive ?? engineConfig.autoArchive;
    if (!shouldArchive) return true;
    const archived = await runner.archiveSessions(entry);
    if (!archived) return false;
    if (!isCurrentEntry(entry)) return false;
    upsertEntry(entry.key, { archivedAt: new Date().toISOString() });
    return true;
  }

  function isCurrentEntry(entry) {
    const current = findByKey(entry.key);
    return Boolean(current) && Number.isSafeInteger(entry._generation) && current._generation === entry._generation;
  }

  function closeCurrentExecution(entry, result, error) {
    const current = findByKey(entry.key) ?? entry;
    const executions = [...(current.executions ?? [])];
    for (let i = executions.length - 1; i >= 0; i--) {
      if (executions[i].endedAt) continue;
      executions[i] = { ...executions[i], endedAt: new Date().toISOString(), result, ...(error ? { error } : {}) };
      break;
    }
    return upsertEntry(current.key, { executions });
  }

  // ─── 模式解析 ──────────────────────────────────────

  function resolveMode() {
    return AUTOQUEUE_UNATTENDED_PRESET;
  }

  // ─── 引擎对象 ──────────────────────────────────────

  const engine = {
    runner,

    isDisposed() { return disposed; },

    dispose() {
      disposed = true;
      runtimePollDirty = false;
      pendingScanDirty = false;
      pendingScanScheduled = false;
      if (pendingScanTimer) { clearTimeout(pendingScanTimer); pendingScanTimer = null; }
      return new Promise(resolve => {
        let prev = runtimePollScheduled || pendingScanScheduled;
        let i = 0;
        (function drain() {
          queueMicrotask(() => {
            if (i++ > 32) { resolve(); return; }
            const now = runtimePollScheduled || pendingScanScheduled;
            if (!now) { resolve(); return; }
            drain();
          });
        })();
      });
    },

    requestRuntimePoll(source) {
      if (disposed) return false;
      if (typeof source === "string" && source) {
        runtimeObservation.lastNativeEventAt = new Date().toISOString();
        runtimeObservation.lastNativeEventSource = source;
      }
      runtimePollDirty = true;
      scheduleRuntimePoll();
      return true;
    },

    requestPendingScan() {
      if (disposed) return false;
      pendingScanDirty = true;
      schedulePendingScan();
      return true;
    },

    // ─── 快照 ────────────────────────────────────────

    snapshot(includeArchived = false) {
      const s = snapshot();
      const metricTasks = s.tasks.filter(t => !t.archivedAt);
      let tasks = includeArchived ? s.tasks : metricTasks;
      tasks = [...tasks].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      const enriched = tasks.map(t => {
        const e = { ...t };
        const executions = Array.isArray(t.executions) ? t.executions : [];
        const lastExec = executions[executions.length - 1];
        const lastWithSession = [...executions].reverse().find(ex => typeof ex?.sessionId === "string" && ex.sessionId);
        e.taskType = t.cron ? "cron" : "manual";
        e.nextRunAt = t.nextRunAt ? new Date(t.nextRunAt).toISOString() : (t.cron ? new Date(calculateNextRun(t) ?? Date.now()).toISOString() : null);
        e.currentRound = t._currentRound ?? 0;
        e.goalPhase = t.phase?.execution ?? t._goalPhase ?? null;
        e.lastActivityTime = t._lastActivityTime ?? null;
        e.lastSessionId = lastWithSession?.sessionId ?? null;
        e.lastError = typeof lastExec?.error === "string" ? lastExec.error : null;
        e.readAt = t.readAt ?? null;
        e.startedAt = lastExec?.startedAt ?? null;
        e.foregroundPaused = false;
        e.stopPending = t.phase?.cancellation != null && ["stop", "deadline"].includes(t._cancelIntent);
        delete e.raw;
        for (const field of Object.keys(e)) { if (field.startsWith("_")) delete e[field]; }
        return e;
      });
      const now = Date.now();
      const done24h = metricTasks.filter(t => t.status === "done" && t.updatedAt && (now - new Date(t.updatedAt).getTime()) < 86400000).length;
      const failed24h = metricTasks.filter(t => t.status === "failed" && t.updatedAt && (now - new Date(t.updatedAt).getTime()) < 86400000).length;
      const total24h = done24h + failed24h;
      return {
        ...s, tasks: enriched,
        unreadCount: unreadCount(),
        metrics: { total: metricTasks.length, running: metricTasks.filter(t => t.status === "running").length, pending: metricTasks.filter(t => t.status === "pending").length, done24h, failed24h, successRate: total24h > 0 ? Math.round((done24h / total24h) * 100) : 0 },
        runtime: { monitorMode: "native-events+authoritative-reconcile", watchdogMs: POLL_INTERVAL_MS, ...runtimeObservation },
        config: { ...s.config, webhook: engineConfig.webhook, queueDir: engineConfig.queueDir, enableNotifications: engineConfig.enableNotifications, unknownThreshold: engineConfig.unknownThreshold },
      };
    },

    // ─── 运行时配置 ──────────────────────────────────

    getConfig() { return { ...engineConfig }; },

    setConfig(patch) {
      assertNoIsolationOverrides(patch);
      if (patch.maxGoalRounds != null) engineConfig.maxGoalRounds = Math.max(1, Math.min(100, parseInt(patch.maxGoalRounds, 10)));
      if (patch.maxBlockedResumes != null) engineConfig.maxBlockedResumes = Math.max(0, Math.min(10, parseInt(patch.maxBlockedResumes, 10)));
      if (patch.unknownThreshold != null) engineConfig.unknownThreshold = Math.max(1, Math.min(10, parseInt(patch.unknownThreshold, 10)));
      if (patch.maxAttempts != null) engineConfig.maxAttempts = Math.max(1, Math.min(10, parseInt(patch.maxAttempts, 10)));
      if (patch.taskTimeoutMs != null) engineConfig.taskTimeoutMs = Math.max(600_000, Math.min(86_400_000, parseInt(patch.taskTimeoutMs, 10)));
      if (patch.autoArchive !== undefined) engineConfig.autoArchive = !!patch.autoArchive;
      if (patch.webhook !== undefined) engineConfig.webhook = patch.webhook || null;
      if (patch.queueDir !== undefined && patch.queueDir !== engineConfig.queueDir) {
        throw new Error("queueDir 不能在运行时切换");
      }
      if (patch.enableHostAiTools !== undefined && patch.enableHostAiTools !== engineConfig.enableHostAiTools) {
        throw new Error("enableHostAiTools 不能在运行时切换");
      }
      if (patch.enableNotifications !== undefined) engineConfig.enableNotifications = !!patch.enableNotifications;
      if (patch.priority != null) engineConfig.priority = Math.max(1, Math.min(10, parseInt(patch.priority, 10)));
      if (patch.defaultDeadline !== undefined) engineConfig.defaultDeadline = patch.defaultDeadline || null;
      if (patch.retryBackoffBaseMs != null) engineConfig.retryBackoffBaseMs = Math.max(5_000, Math.min(600_000, parseInt(patch.retryBackoffBaseMs, 10)));
      if (patch.retryBackoffMaxMs != null) engineConfig.retryBackoffMaxMs = Math.max(10_000, Math.min(3_600_000, parseInt(patch.retryBackoffMaxMs, 10)));
      return { ...engineConfig };
    },

    // ─── API 操作 ────────────────────────────────────

    createTask(requestId, key, content, opts = {}) {
      assertNoIsolationOverrides(opts);
      let reserved = false;
      let wroteTaskFile = false;
      if (requestId) {
        const reservation = checkRequest(requestId, { kind: "create", key: key ?? null, content, opts });
        if (reservation === "inflight") return { ok: false, key, error: "相同 requestId 的请求正在处理中" };
        if (reservation === "completed" || reservation === false) return { ok: false, key, error: "重复提交" };
        reserved = reservation === "new" || reservation === true;
      }
      try {
        if (!key) key = `task-${formatTimestamp()}`;
        let resolvedKey = key;
        let attempt = 0;
        while (findByKey(resolvedKey)) {
          attempt++;
          resolvedKey = `${key}-${formatTimestamp()}`;
          if (attempt > 10) resolvedKey = `${key}-${Date.now()}`;
        }
        key = resolvedKey;
        const priority = opts.priority != null ? Math.max(1, Math.min(10, parseInt(opts.priority, 10))) : engineConfig.priority;
        const fileContent = buildFileContent(content, opts.cron);
        writeTaskFile(key, fileContent);
        wroteTaskFile = true;
        upsertEntry(key, {
          status: "pending",
          body: content,
          raw: fileContent,
          phase: createInitialPhase(),
          title: opts.title ?? null,
          provider: opts.provider ?? null,
          model: opts.model ?? null,
          cron: opts.cron ?? null,
          deadline: opts.deadline ?? null,
          priority,
          nextRunAt: null,
          autoArchive: opts.autoArchive,
          maxGoalRounds: opts.maxGoalRounds,
          maxBlockedResumes: opts.maxBlockedResumes,
          timeoutMs: opts.timeoutMs,
          maxAttempts: opts.maxAttempts,
          webhook: opts.webhook,
          enableNotifications: opts.enableNotifications,
          cwd: opts.cwd ?? null,
          sourceSessionId: opts.sourceSessionId ?? null,
        });
        if (reserved) { completeRequest(requestId); flushLedger(); }
        const task = { key, path: join(getTasksDir(), `${key}.md`), body: content, raw: fileContent };
        engine._dispatch(task, true).catch(err => {
          console.error(`[autoqueue] ${key} 派发失败:`, err.message);
        });
        return { ok: true, key };
      } catch (err) {
        if (wroteTaskFile && key) {
          try { if (!findByKey(key)) removeTaskFile(key); } catch { /* ignore */ }
        }
        if (reserved) releaseFailedRequest(requestId);
        throw err;
      }
    },

    async applyAction(requestId, action, key, opts = {}) {
      let reserved = false;
      if (requestId) {
        const reservation = checkRequest(requestId, { kind: "action", action, key: key ?? null, opts });
        if (reservation === "inflight") return { ok: false, error: "相同 requestId 的请求正在处理中" };
        if (reservation === "completed" || reservation === false) return { ok: true };
        reserved = reservation === "new" || reservation === true;
      }
      try {
        let result;
        switch (action) {
          case "stop": result = await engine.stopTask(key); break;
          case "archive": result = opts.keys && Array.isArray(opts.keys) ? await engine.archiveTasks(opts.keys) : await engine.archiveTask(key); break;
          case "restore": result = await engine.restoreTask(key); break;
          case "force-scan": await engine.scanPending(); result = { ok: true }; break;
          case "rerun": result = await engine.rerunTask(key); break;
          case "set-concurrency": setConcurrency(opts.maxConcurrent ?? 1); result = { ok: true }; break;
          case "update": result = engine.updateTask(key, opts); break;
          case "delete": result = engine.deleteTask(key); break;
          default: throw new Error(`未知 action: ${action}`);
        }
        if (reserved) {
          if (result?.ok === false) releaseFailedRequest(requestId);
          else { completeRequest(requestId); flushLedger(); }
        }
        return result;
      } catch (err) {
        if (reserved) releaseFailedRequest(requestId);
        throw err;
      }
    },

    // ─── 收件箱扫描 ──────────────────────────────────

    async scanPending() {
      if (disposed) return;
      if (dispatchReservations.size > 0) { pendingScanDirty = true; return; }
      if (this._scanning) { pendingScanDirty = true; return; }
      runtimeObservation.lastScanAt = new Date().toISOString();
      this._scanning = true;
      pendingScanDirty = false;
      try {
        const tasks = listTaskFiles();
        const maxConcurrent = getConcurrency();
        const current = runningCount();
        const available = maxConcurrent - current - dispatchReservations.size;
        if (available <= 0 || tasks.length === 0) return;

        tasks.sort((a, b) => {
          const pa = findByKey(a.key)?.priority ?? 5;
          const pb = findByKey(b.key)?.priority ?? 5;
          return pb - pa;
        });

        let dispatched = 0;
        const dispatchPromises = [];
        for (const task of tasks) {
          if (disposed || dispatched >= available) break;
          if (inFlight.has(task.key) || dispatchReservations.has(task.key)) continue;

          let entry = findByKey(task.key);
          if (!entry) {
            entry = {
              key: task.key, status: "pending", body: task.body, raw: task.raw,
              phase: createInitialPhase(),
              cron: task.schedule?.cron ?? null, deadline: task.schedule?.deadline ?? null,
              nextRunAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
              attempts: 0, blockedResumes: 0, executions: [], priority: engineConfig.priority ?? 5,
            };
            try { entry = upsertEntry(task.key, entry); }
            catch (err) { console.error(`[autoqueue] ${task.key} 无法写入账本:`, err.message); continue; }
          }

          if (entry.status !== "pending") continue;
          if (entry.archivedAt) continue;
          if (entry.nextRetryAt && Date.now() < entry.nextRetryAt) continue;

          // 检查调度
          const due = isDue(entry);
          if (!due.due) continue;

          dispatchReservations.add(task.key);
          inFlight.add(task.key);
          dispatched++;
          dispatchPromises.push(
            engine._dispatch(task, true)
              .catch(err => console.error(`[autoqueue] ${task.key} 派发失败:`, err.message))
              .finally(() => { releaseDispatchReservation(task.key); inFlight.delete(task.key); })
          );
        }
        await Promise.allSettled(dispatchPromises);
      } finally {
        this._scanning = false;
        schedulePendingScan();
      }
    },

    // ─── 内部派发 ────────────────────────────────────

    async _dispatch(task, reservationHeld = false) {
      const key = task?.key;
      if (typeof key !== "string" || !key.length) return;
      if (!reservationHeld) {
        if (dispatchReservations.has(key)) return;
        dispatchReservations.add(key);
      } else if (!dispatchReservations.has(key)) {
        dispatchReservations.add(key);
      }

      try {
        if (disposed) return;
        let entry = findByKey(key);
        if (!entry || entry.status !== "pending") return;
        if (entry.archivedAt) return;
        if (entry.nextRetryAt && Date.now() < entry.nextRetryAt) return;

        const otherReservations = Math.max(0, dispatchReservations.size - 1);
        if (runningCount() + otherReservations >= getConcurrency()) return;

        const maxAttempt = entry.maxAttempts ?? engineConfig.maxAttempts;
        if ((entry.attempts ?? 0) >= maxAttempt) {
          if (entry.cron) {
            // 循环任务到最大尝试次数后重新调度
            const nextRunAt = calculateNextRun(entry);
            upsertEntry(key, { status: "pending", nextRunAt: nextRunAt ?? 0, attempts: 0 });
          } else {
            upsertEntry(key, { status: "failed", sessionId: null, goalRef: null, phase: { execution: "idle", cancellation: null } });
            removeTaskFile(key);
          }
          flushLedger();
          releaseDispatchReservation(key);
          await callWebhook({ ...entry, status: "failed" }, "failed", "max dispatch attempts reached", "failed");
          return;
        }

        const effectivePreset = resolveMode();
        const attemptNumber = (entry.attempts ?? 0) + 1;
        const workDir = createRunDir(`${key}-a${attemptNumber}-${crypto.randomUUID().slice(0, 8)}`);
        const sessionId = createAutoqueueSessionId();

        const execRecord = {
          id: crypto.randomUUID(), sessionId, attempt: attemptNumber,
          startedAt: new Date().toISOString(), workDir,
        };

        // 持久化运行状态
        entry = upsertEntry(key, {
          status: "running", workDir, sessionId, goalRef: null,
          phase: { execution: "dispatching", cancellation: null },
          attempts: attemptNumber, blockedResumes: 0,
          consecutiveUnknowns: 0, nextRetryAt: null, retryBackoffMs: 0,
          _launchPending: true, _admissionUncertain: false,
          executions: mergeExecutionRecord(entry.executions, execRecord),
          cron: entry.cron ?? null,
          deadline: entry.deadline ?? null,
          body: task.body ?? entry.body,
          raw: task.raw ?? entry.raw,
          ...(entry.cron ? { lastCronDispatch: Math.floor(Date.now() / 60_000) } : {}),
        });
        flushLedger();
        releaseDispatchReservation(key);

        try {
          // 调用 runner.launch
          const launchResult = await runner.launch({
            key, body: task.body ?? entry.body, workDir, sessionId,
            agentPreset: effectivePreset,
            maxGoalRounds: entry.maxGoalRounds ?? engineConfig.maxGoalRounds,
            cwd: entry.cwd ?? null,
            sourceSessionId: entry.sourceSessionId ?? null,
            title: entry.title ?? null,
            provider: entry.provider ?? null,
            model: entry.model ?? null,
          }, {
            beforeGoal: async (state) => {
              if (disposed) throw new Error("engine disposed before goal admission");
              let current = findByKey(key);
              if (!current || current.status !== "running" || current.sessionId !== state.sessionId) {
                throw new Error("lost ownership before goal admission");
              }
              goalAdmissionsInFlight.add(key);
              upsertEntry(key, { _admissionUncertain: true, phase: { execution: "launching", cancellation: null } });
              flushLedger();
            },
            afterGoal: async (state) => {
              const current = findByKey(key);
              if (!current || current.status !== "running" || current.sessionId !== state.sessionId) {
                throw new Error("lost ownership after goal admission");
              }
              upsertEntry(key, {
                goalRef: state.goalRef,
                _admissionUncertain: false,
                phase: { execution: "active", cancellation: null },
              });
              flushLedger();
              goalAdmissionsInFlight.delete(key);
              if (disposed) throw new Error("engine disposed after goal admission");
            },
          });

          execRecord.sessionId = launchResult.sessionId;
          if (!isCurrentEntry(entry)) { goalAdmissionsInFlight.delete(key); return; }

          upsertEntry(key, {
            sessionId: launchResult.sessionId,
            goalRef: launchResult.goalRef,
            retryBackoffMs: 0,
            _launchPending: false,
            _admissionUncertain: false,
            phase: { execution: "active", cancellation: null },
            executions: mergeExecutionRecord(entry.executions, execRecord),
          });
          flushLedger();
          goalAdmissionsInFlight.delete(key);

          if (disposed) {
            await runner.cancelTask(launchResult.sessionId, launchResult.goalRef);
            return;
          }

          // 检查是否在 launch 期间被 stop
          const current = findByKey(key);
          if (current && current.status !== "running") {
            const cancelled = await runner.cancelTask(launchResult.sessionId, launchResult.goalRef);
            if (!cancelled) upsertEntry(key, { status: "running", sessionId: launchResult.sessionId, goalRef: launchResult.goalRef });
            else {
              closeCurrentExecution(current, current.status === "stopped" ? "stopped" : "failed", "launch lost task ownership");
              upsertEntry(key, { sessionId: null, goalRef: null });
            }
            flushLedger();
            return;
          }
          removeTaskFile(key);
        } catch (err) {
          // 处理派发失败
          goalAdmissionsInFlight.delete(key);
          const rateLimit = { limited: err?.code === "RATE_LIMIT" || err?.statusCode === 429 };
          const launchError = err instanceof SessionLaunchError && Boolean(err.sessionId);
          const admissionUncertain = launchError && (err.goalUncertain === true);

          if (admissionUncertain) {
            // 不确定的 admission → 尝试检查，不永久隔离
            try {
              const poll = await runner.pollTask(err.sessionId);
              if (poll.goalRef) {
                // 实际上成功了
                upsertEntry(key, {
                  sessionId: err.sessionId, goalRef: poll.goalRef,
                  _admissionUncertain: false, phase: { execution: "active", cancellation: null },
                  _launchPending: false,
                });
                flushLedger();
                return;
              }
            } catch { /* 确实不确定，走重试 */ }
          }

          if (launchError) {
            execRecord.sessionId = err.sessionId;
            execRecord.error = err.message;
            // 清理
            try { await runner.cancelLaunch(err.sessionId, err.goalRef, { missingIsSuccess: true }); } catch { /* best effort */ }
          }

          execRecord.endedAt = new Date().toISOString();
          execRecord.result = "failed";
          execRecord.error = err.message;
          const catchEntry = findByKey(key) ?? entry;
          upsertEntry(key, {
            executions: mergeExecutionRecord(entry.executions, execRecord),
            _launchPending: false, _admissionUncertain: false,
            body: catchEntry.body, raw: catchEntry.raw,
          });

          if (rateLimit.limited) {
            const delay = retryBackoff(entry);
            upsertEntry(key, {
              status: "pending", sessionId: null, goalRef: null,
              phase: { execution: "idle", cancellation: null },
              retryBackoffMs: delay, nextRetryAt: Date.now() + delay,
              body: catchEntry.body, raw: catchEntry.raw,
            });
          } else if ((entry.attempts ?? 0) < maxAttempt) {
            const delay = retryBackoff(entry);
            upsertEntry(key, {
              status: "pending", sessionId: null, goalRef: null,
              phase: { execution: "idle", cancellation: null },
              retryBackoffMs: delay, nextRetryAt: Date.now() + delay,
              body: catchEntry.body, raw: catchEntry.raw,
            });
          } else {
            if (entry.cron) {
              const nextRunAt = calculateNextRun(entry);
              upsertEntry(key, {
                status: "pending", nextRunAt: nextRunAt ?? 0,
                sessionId: null, goalRef: null, attempts: 0,
                phase: { execution: "idle", cancellation: null },
                body: catchEntry.body, raw: catchEntry.raw,
              });
            } else {
              upsertEntry(key, {
                status: "failed", sessionId: null, goalRef: null,
                phase: { execution: "idle", cancellation: null },
                body: catchEntry.body, raw: catchEntry.raw,
              });
              removeTaskFile(key);
              const terminal = findByKey(key);
              if (terminal) await archiveIfEnabled(terminal);
            }
            await callWebhook({ ...entry, status: "failed" }, "failed", err.message, "failed");
          }
          flushLedger();
        }
      } finally {
        releaseDispatchReservation(key);
      }
    },

    // ─── 轮询运行中任务 ──────────────────────────────

    async pollRunning() {
      if (disposed || this._polling) return;
      runtimeObservation.lastPollAt = new Date().toISOString();
      this._polling = true;
      try {
        const entries = loadLedger();
        const running = entries.filter(e => e.status === "running" && e.sessionId);
        if (running.length === 0) {
          runtimeObservation.sessionListKnown = false;
          return;
        }

        const sessions = await listSessions();
        if (disposed) return;

        const jobs = [];
        for (const entry of running) {
          if (inFlight.has(entry.key)) continue;
          inFlight.add(entry.key);
          jobs.push((async () => {
            try {
              await pollOne(entry, sessions);
            } catch (err) {
              console.error(`[autoqueue] ${entry.key} 轮询失败:`, err.message);
            } finally {
              inFlight.delete(entry.key);
            }
          })());
        }
        await Promise.all(jobs);
      } finally {
        this._polling = false;
        scheduleRuntimePoll();
      }
    },

    // ─── 任务操作 ────────────────────────────────────

    async stopTask(key) {
      if (stopping.has(key)) return { ok: false, error: "任务正在停止" };
      stopping.add(key);
      try {
        const entry = findByKey(key);
        if (!entry) return { ok: false, error: "任务不存在" };
        if (entry.status !== "running") {
          if (entry.status === "pending" && (entry.cron || entry.nextRunAt)) {
            removeTaskFile(key);
            upsertEntry(key, { status: "stopped", cron: null, nextRunAt: null });
            flushLedger();
            return { ok: true };
          }
          return { ok: false, error: "只能停止运行中的任务" };
        }
        if (entry._admissionUncertain) {
          if (goalAdmissionsInFlight.has(key)) {
            return { ok: false, error: "goal 正在投递，请稍后重试" };
          }
          try { await runner.cancelLaunch(entry.sessionId, entry.goalRef, { missingIsSuccess: true }); } catch { /* best effort */ }
          return { ok: false, error: "goal 投递不确定，已尝试清理" };
        }
        if (!entry.sessionId) return { ok: false, error: "任务正在启动，请稍后重试" };
        const result = await cancellation.begin(entry, "stop", "用户手动停止");
        if (result.patch) {
          upsertEntry(key, result.patch);
          flushLedger();
        }
        return { ok: true, accepted: true, pending: true };
      } finally {
        stopping.delete(key);
      }
    },

    async archiveTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.status === "running") return { ok: false, error: "运行中的任务不能归档" };
      if (entry.archivedAt) return { ok: false, error: "任务已归档" };
      const archived = await runner.archiveSessions(entry);
      if (!archived) return { ok: false, error: "归档失败" };
      if (!isCurrentEntry(entry)) return { ok: false, error: "归档期间状态已变化" };
      removeTaskFile(key);
      upsertEntry(key, { archivedAt: new Date().toISOString() });
      flushLedger();
      return { ok: true };
    },

    async archiveTasks(keys) {
      const results = [];
      for (const k of keys) {
        const entry = findByKey(k);
        if (!entry) { results.push({ key: k, ok: false, error: "任务不存在" }); continue; }
        if (entry.status === "running") { results.push({ key: k, ok: false, error: "运行中" }); continue; }
        if (entry.archivedAt) { results.push({ key: k, ok: true }); continue; }
        const archived = await runner.archiveSessions(entry);
        if (!archived) { results.push({ key: k, ok: false, error: "归档失败" }); continue; }
        if (!isCurrentEntry(entry)) { results.push({ key: k, ok: false, error: "状态已变化" }); continue; }
        removeTaskFile(k);
        upsertEntry(k, { archivedAt: new Date().toISOString() });
        results.push({ key: k, ok: true });
      }
      flushLedger();
      return { ok: results.every(r => r.ok), results };
    },

    async restoreTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (!entry.archivedAt) return { ok: false, error: "任务未归档" };
      if (entry.status === "pending") writeTaskFile(key, entry.raw ?? entry.body ?? "");
      upsertEntry(key, { archivedAt: null });
      flushLedger();
      if (entry.status === "pending") await engine.scanPending();
      return { ok: true };
    },

    async rerunTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.archivedAt) return { ok: false, error: "任务已归档，请先恢复" };
      if (entry.status === "running") return { ok: false, error: "任务正在运行" };
      writeTaskFile(key, entry.raw ?? entry.body ?? "");
      upsertEntry(key, {
        status: "pending", workDir: null, sessionId: null, goalRef: null,
        phase: createInitialPhase(),
        consecutiveUnknowns: 0, attempts: 0, nextRetryAt: null, retryBackoffMs: 0,
        _admissionUncertain: false, _launchPending: false,
        body: entry.body,
        raw: entry.raw,
      });
      flushLedger();
      await engine.scanPending();
      return { ok: true };
    },

    deleteTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.status !== "pending") return { ok: false, error: "只能删除待执行的任务" };
      removeTaskFile(key);
      removeEntry(key);
      flushLedger();
      return { ok: true };
    },

    updateTask(key, patch) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.archivedAt) return { ok: false, error: "已归档任务不能修改" };
      if (entry.status !== "pending") return { ok: false, error: "只能修改待执行任务" };
      try { assertNoIsolationOverrides(patch); } catch (err) { return { ok: false, error: err.message }; }
      try {
        if (patch.cron !== undefined) {
          const content = patch.content ?? entry.body ?? "";
          const fileContent = buildFileContent(content, patch.cron);
          writeTaskFile(key, fileContent);
        } else if (patch.content) {
          const fileContent = buildFileContent(patch.content, entry.cron);
          writeTaskFile(key, fileContent);
        }
        upsertEntry(key, {
          ...(patch.content ? { body: patch.content, raw: patch.content } : {}),
          ...(patch.title !== undefined ? { title: patch.title || null } : {}),
          ...(patch.provider !== undefined ? { provider: patch.provider || null } : {}),
          ...(patch.model !== undefined ? { model: patch.model || null } : {}),
          ...(patch.cron !== undefined ? { cron: patch.cron || null } : {}),
          ...(patch.priority != null ? { priority: Math.max(1, Math.min(10, parseInt(patch.priority, 10))) } : {}),
          ...(patch.deadline !== undefined ? { deadline: patch.deadline || null } : {}),
          ...(patch.maxGoalRounds !== undefined ? { maxGoalRounds: patch.maxGoalRounds } : {}),
          ...(patch.maxBlockedResumes !== undefined ? { maxBlockedResumes: patch.maxBlockedResumes } : {}),
          ...(patch.timeoutMs !== undefined ? { timeoutMs: patch.timeoutMs } : {}),
          ...(patch.maxAttempts !== undefined ? { maxAttempts: patch.maxAttempts } : {}),
          ...(patch.webhook !== undefined ? { webhook: patch.webhook || null } : {}),
          ...(patch.autoArchive !== undefined ? { autoArchive: patch.autoArchive } : {}),
          ...(patch.enableNotifications !== undefined ? { enableNotifications: patch.enableNotifications } : {}),
        });
        flushLedger();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    },

    // ─── 任务详情 ────────────────────────────────────

    getTaskDetail(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      const executions = Array.isArray(entry.executions) ? entry.executions : [];
      const lastExec = executions[executions.length - 1];
      const lastWithSession = [...executions].reverse().find(ex => typeof ex?.sessionId === "string" && ex.sessionId);
      const detail = {
        key: entry.key, status: entry.status, workDir: entry.workDir,
        sessionId: entry.sessionId, goalRef: entry.goalRef,
        title: entry.title ?? null,
        provider: entry.provider ?? null,
        model: entry.model ?? null,
        attempts: entry.attempts, blockedResumes: entry.blockedResumes,
        createdAt: entry.createdAt, updatedAt: entry.updatedAt,
        readAt: entry.readAt ?? null, archivedAt: entry.archivedAt,
        body: entry.body ?? "", cron: entry.cron, deadline: entry.deadline,
        nextRunAt: entry.nextRunAt ? new Date(entry.nextRunAt).toISOString() : (entry.cron ? new Date(calculateNextRun(entry) ?? Date.now()).toISOString() : null),
        maxGoalRounds: entry.maxGoalRounds, maxBlockedResumes: entry.maxBlockedResumes,
        timeoutMs: entry.timeoutMs, priority: entry.priority, webhook: entry.webhook,
        autoArchive: entry.autoArchive, enableNotifications: entry.enableNotifications,
        maxAttempts: entry.maxAttempts,
        taskType: entry.cron ? "cron" : "manual",
        currentRound: entry._currentRound ?? 0,
        goalPhase: entry.phase?.execution ?? entry._goalPhase ?? null,
        lastActivityTime: entry._lastActivityTime ?? null,
        lastSessionId: lastWithSession?.sessionId ?? null,
        lastError: typeof lastExec?.error === "string" ? lastExec.error : null,
        stopPending: entry.phase?.cancellation != null,
        executions, reports: {},
      };
      if (entry.workDir) {
        for (const [field, fileName] of [["goal", ".目标.md"], ["result", ".结果.md"], ["report", "执行报告.md"]]) {
          try { detail.reports[field] = safeReadReportFile(entry.workDir, fileName); } catch { /* ignore */ }
        }
      }
      return { ok: true, task: detail };
    },

    // ─── 生命周期定时器 ──────────────────────────────

    startPolling(timer) {
      return timer.interval(() => {
        if (disposed) return;
        engine.pollRunning().catch(err => console.error("[autoqueue] pollRunning 失败:", err.message));
      }, POLL_INTERVAL_MS);
    },

    startScanning(timer, intervalMs = 15_000) {
      return timer.interval(() => {
        if (disposed) return;
        engine.scanPending().catch(err => console.error("[autoqueue] scanPending 失败:", err.message));
      }, intervalMs);
    },
  };

  // ─── 内部辅助 ──────────────────────────────────────

  function retryBackoff(entry) {
    const current = entry.retryBackoffMs ?? 0;
    const base = engineConfig.retryBackoffBaseMs;
    const max = engineConfig.retryBackoffMaxMs;
    const exponential = current === 0 ? base : Math.min(current * 2, max);
    return Math.min(MAX_PROVIDER_RETRY_AFTER_MS, exponential);
  }

  async function listSessions() {
    const ledgerRevision = snapshot().revision;
    const sessions = await runner.listSessions();
    const known = sessions?.known === true && Array.isArray(sessions.items);
    runtimeObservation.sessionListKnown = known;
    return { ...sessions, ledgerRevisionAtRequest: ledgerRevision, known };
  }

  async function pollOne(entry, sessions) {
    if (disposed || stopping.has(entry.key)) return;
    const latest = findByKey(entry.key);
    if (!latest || latest.status !== "running" || latest.sessionId !== entry.sessionId) return;
    entry = latest;

    // 处理不确定的 admission
    if (entry._admissionUncertain) {
      if (!goalAdmissionsInFlight.has(entry.key)) {
        try {
          const poll = await runner.pollTask(entry.sessionId);
          if (poll.goalRef) {
            upsertEntry(entry.key, {
              goalRef: poll.goalRef, _admissionUncertain: false,
              phase: { execution: "active", cancellation: null },
            });
            flushLedger();
          }
        } catch { /* 保留不确定状态，下次再试 */ }
      }
      return;
    }

    // 处理取消收敛
    if (entry.phase?.cancellation != null) {
      const convResult = await cancellation.converge(entry, sessions);
      if (convResult.patch) {
        upsertEntry(entry.key, convResult.patch);
        flushLedger();
      }
      if (convResult.settled) {
        const intent = entry._cancelIntent || "stop";
        const settled = cancellation.settle(entry, intent, entry._cancelError);
        upsertEntry(entry.key, settled.patch);
        flushLedger();
        if (settled.status !== "retry") {
          await archiveIfEnabled(findByKey(entry.key) ?? entry);
          await callWebhook(entry, settled.status, entry._cancelError, settled.status);
        }
      }
      return;
    }

    // 检查超时
    if (lifecycle.isTimeout(entry)) {
      const result = await cancellation.begin(entry, "retry", "执行超时");
      if (result.patch) { upsertEntry(entry.key, result.patch); flushLedger(); }
      return;
    }

    // 检查 session 存活
    if (!sessions.known) {
      const unreachable = lifecycle.handleUnreachable(entry, "unknown");
      if (unreachable.patch) { upsertEntry(entry.key, unreachable.patch); flushLedger(); }
      return;
    }
    const summary = sessions.items.find(s => s.sessionId === entry.sessionId);
    if (!summary) {
      const unreachable = lifecycle.handleUnreachable(entry, "session-gone");
      if (unreachable.patch) { upsertEntry(entry.key, unreachable.patch); flushLedger(); }
      return;
    }

    // 查询 goal 状态
    const poll = await runner.pollTask(entry.sessionId);
    if (disposed) return;

    const afterPoll = findByKey(entry.key);
    if (!afterPoll || afterPoll._cancelPending) return;

    upsertEntry(entry.key, {
      _currentRound: poll.totalMessages ?? 0,
      _goalPhase: poll.phase,
      _lastActivityTime: poll.lastActivityTime ?? 0,
      ...(poll.goalRef ? { goalRef: poll.goalRef } : {}),
    });

    switch (poll.phase) {
      case "complete": {
        // 等待 session 空闲后再结算
        if (summary.running !== false) { flushLedger(); break; }
        // 检查 agent 是否标记了任务完成
        const taskComplete = typeof poll.output === "string" && (
          poll.output.includes("<!-- taskComplete: true -->") ||
          poll.output.includes("taskComplete: true") ||
          poll.output.toLowerCase().includes("taskcomplete")
        );
        const sResult = await lifecycle.settle(entry, "done", undefined, { output: poll.output, taskComplete });
        upsertEntry(entry.key, sResult.patch);
        flushLedger();
        const settled = findByKey(entry.key);
        if (settled && settled.status === "done" && !settled.cron) await archiveIfEnabled(settled);
        await callWebhook(entry, "done", undefined, "done");
        break;
      }

      case "blocked": {
        const maxBlocked = entry.maxBlockedResumes ?? engineConfig.maxBlockedResumes;
        const blockedCount = entry.blockedResumes ?? 0;
        if (blockedCount < maxBlocked) {
          try {
            const currentGoalRef = poll.goalRef ?? entry.goalRef;
            if (!currentGoalRef) break;
            const abResult = await lifecycle.antiBlock(entry);
            if (abResult.ok && abResult.patch) {
              upsertEntry(entry.key, abResult.patch);
              flushLedger();
            }
          } catch {
            const unreachable = lifecycle.handleUnreachable(entry, "blocked");
            if (unreachable.patch) { upsertEntry(entry.key, unreachable.patch); flushLedger(); }
          }
        } else {
          const sResult = await lifecycle.settle(entry, "failed", `超过最大反阻塞次数 (${maxBlocked})`);
          upsertEntry(entry.key, sResult.patch);
          flushLedger();
          await callWebhook(entry, "failed", `超过最大反阻塞次数 (${maxBlocked})`, "failed");
        }
        break;
      }

      case "active":
        if (summary.running === false) {
          // goal active 但 session 空闲 → 尝试 resume
          try {
            const newRef = await runner.resumeGoal(entry.sessionId, poll.goalRef ?? entry.goalRef);
            upsertEntry(entry.key, { goalRef: newRef, consecutiveUnknowns: 0 });
            flushLedger();
          } catch { /* 可能是正常状态变化 */ }
        }
        break;

      case "paused":
        // 被 DSH 暂停的 goal → 尝试恢复
        try {
          const newRef = await runner.resumeGoal(entry.sessionId, poll.goalRef ?? entry.goalRef);
          upsertEntry(entry.key, { goalRef: newRef, consecutiveUnknowns: 0 });
          flushLedger();
        } catch { /* 可能是正常状态变化 */ }
        break;

      default:
        if (poll.phase === "unknown") {
          const unreachable = lifecycle.handleUnreachable(entry, "unknown");
          if (unreachable.patch) { upsertEntry(entry.key, unreachable.patch); flushLedger(); }
        }
        break;
    }
  }

  return engine;
}
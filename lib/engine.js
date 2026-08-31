/**
 * QueueEngine 编排层 — 对齐 task-board host-service.ts 模式
 * POST API 是主入口，收件箱扫描是辅助
 * @module autoqueue/engine
 */

import {
  listTaskFiles, removeTaskFile, createRunDir, writeTaskFile, matchCron,
  safeReadReportFile,
} from "./files.js";
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
  AUTOQUEUE_PTC_UNATTENDED_PRESET,
  AUTOQUEUE_UNATTENDED_PRESET,
  createAutoqueueSessionId,
  createRunner,
  isAutoqueueSessionId,
  SessionLaunchError,
} from "./runner.js";

const POLL_INTERVAL_MS = 10_000;
const WEBHOOK_TIMEOUT_MS = 10_000;
const DNS_TIMEOUT_MS = 5_000;
const MAX_WEBHOOK_RESPONSE_BYTES = 64 * 1024;
const MAX_PROVIDER_RETRY_AFTER_MS = 24 * 60 * 60 * 1000;
const ISOLATION_OVERRIDE_FIELDS = ["model", "workspace", "agentPreset"];
const CLEAR_FOREGROUND_PAUSE = Object.freeze({
  _foregroundPausePending: false,
  _foregroundPaused: false,
  _foregroundCancelPending: false,
});

function hasIsolationOverride(value) {
  return value !== undefined && value !== null && value !== "";
}

function isolationOverrideError(field) {
  const err = new Error(`严格隔离模式不支持 ${field} 覆盖；autoqueue 必须继承 DSH 默认模型，并使用任务 cwd 与内置无人值守 preset`);
  err.code = "isolation-override-not-allowed";
  err.statusCode = 409;
  return err;
}

function assertNoIsolationOverrides(value) {
  for (const field of ISOLATION_OVERRIDE_FIELDS) {
    if (hasIsolationOverride(value?.[field])) throw isolationOverrideError(field);
  }
}

function isActiveSessionSummary(item) {
  if (item?.running === true) return true;
  return item?.projections?.values?.goal?.goal?.phase === "active";
}

function hasActiveForeignSession(sessions) {
  if (!sessions?.known || !Array.isArray(sessions.items)) return true;
  return sessions.items.some(item => (
    isActiveSessionSummary(item) && !isAutoqueueSessionId(item.sessionId)
  ));
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

function ipv4Octets(address) {
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

/** Reject non-public IPv4 space, including the ranges commonly usable for SSRF. */
function isUnsafeIpv4(address) {
  const octets = ipv4Octets(address);
  if (!octets) return true;
  const [a, b] = octets;
  return a === 0 ||                       // current network / unspecified
    a === 10 ||                          // RFC1918
    a === 127 ||                         // loopback
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) ||          // link-local
    (a === 172 && b >= 16 && b <= 31) || // RFC1918
    (a === 192 && b === 0) ||            // IETF protocol assignments
    (a === 192 && b === 168) ||          // RFC1918
    (a === 198 && (b === 18 || b === 19)) || // benchmark networks
    a >= 224;                            // multicast/reserved/broadcast
}

function isUnsafeIp(address) {
  const unbracketed = address.startsWith("[") && address.endsWith("]")
    ? address.slice(1, -1)
    : address;
  const normalized = unbracketed.toLowerCase().split("%")[0];
  const family = isIP(normalized);
  if (family === 4) return isUnsafeIpv4(normalized);
  if (family !== 6) return true;

  // Reject unspecified, loopback, IPv4-compatible/mapped/translated, ULA,
  // link-local/site-local and multicast addresses. DNS is checked for every
  // returned record, so a hostname with even one private answer is rejected.
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("::ffff:") || normalized.startsWith("::ffff:0:")) return true;
  if (normalized.startsWith("::")) return true;
  const hextets = ipv6Hextets(normalized);
  if (!hextets) return true;
  const [first, second, third, fourth, fifth, sixth] = hextets;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xffc0) === 0xfec0) return true; // deprecated site-local
  if ((first & 0xff00) === 0xff00) return true; // multicast
  // IPv6 transition mechanisms can smuggle an IPv4 destination past a
  // top-level IPv6 allow decision. Reject the standard NAT64 prefixes plus
  // 6to4 and Teredo instead of trying to recursively classify embedded bits.
  if (first === 0x0064 && second === 0xff9b &&
      ((third === 0 && fourth === 0 && fifth === 0 && sixth === 0) || third === 1)) return true;
  if (first === 0x2002) return true; // 2002::/16 6to4
  if (first === 0x2001 && second === 0) return true; // 2001:0000::/32 Teredo
  return false;
}

async function resolvePublicWebhookUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("invalid webhook URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("webhook protocol must be http or https");
  }
  if (url.username || url.password) throw new Error("webhook credentials are not allowed");

  const hostname = url.hostname.startsWith("[") && url.hostname.endsWith("]")
    ? url.hostname.slice(1, -1)
    : url.hostname;
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isUnsafeIp(hostname)) throw new Error("webhook target is not public");
    return { url, address: hostname, family: literalFamily };
  }

  const records = await withDeadline(
    lookup(hostname, { all: true, verbatim: true }),
    DNS_TIMEOUT_MS,
    "webhook DNS lookup",
  );
  if (!Array.isArray(records) || records.length === 0 || records.some(record => isUnsafeIp(record.address))) {
    throw new Error("webhook target is not public");
  }
  return { url, address: records[0].address, family: records[0].family };
}

/**
 * POST to the already-resolved public address. Pinning the socket destination
 * closes the DNS-rebinding window between validation and connection; Host and
 * TLS servername still identify the original public hostname.
 */
function postPinnedWebhook(target, body) {
  return new Promise((resolve, reject) => {
    const { url, address, family } = target;
    const hostname = url.hostname.startsWith("[") && url.hostname.endsWith("]")
      ? url.hostname.slice(1, -1)
      : url.hostname;
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const requestOptions = {
      protocol: url.protocol,
      hostname: address,
      family,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      method: "POST",
      path: `${url.pathname}${url.search}`,
      headers: {
        Host: url.host,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Connection: "close",
      },
      ...(url.protocol === "https:" && !isIP(hostname) ? { servername: hostname } : {}),
    };

    let settled = false;
    let req;
    let responseStream;
    let wallTimer;
    const finish = (value, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(wallTimer);
      if (error) reject(error);
      else resolve(value);
    };
    req = transport(requestOptions, response => {
      responseStream = response;
      let received = 0;
      response.on("data", chunk => {
        received += chunk.length;
        if (received > MAX_WEBHOOK_RESPONSE_BYTES) {
          response.destroy();
          finish(false);
        }
      });
      response.on("end", () => {
        const status = response.statusCode ?? 0;
        finish(status >= 200 && status < 300);
      });
      response.on("error", error => finish(false, error));
    });
    req.setTimeout(WEBHOOK_TIMEOUT_MS, () => {
      req.destroy(new Error(`webhook request timed out after ${WEBHOOK_TIMEOUT_MS}ms`));
    });
    req.on("error", error => finish(false, error));
    // request.setTimeout is only an inactivity bound. This timer is an
    // absolute wall-clock deadline, so a slow-drip response cannot pin a poll.
    wallTimer = setTimeout(() => {
      const error = new Error(`webhook request exceeded ${WEBHOOK_TIMEOUT_MS}ms wall-clock limit`);
      responseStream?.destroy(error);
      req.destroy(error);
      finish(false, error);
    }, WEBHOOK_TIMEOUT_MS);
    req.end(body);
  });
}

function releaseFailedRequest(requestId) {
  if (!requestId) return;
  releaseRequest(requestId);
  try { flushLedger(); } catch { /* preserve the original operation failure */ }
}

function rateLimitMetadata(error) {
  const candidates = [error, error?.details, error?.cause, error?.cause?.details].filter(Boolean);
  const code = candidates.map(candidate => candidate?.code)
    .find(value => typeof value === "string");
  const status = candidates.map(candidate => candidate?.statusCode ?? candidate?.status)
    .map(Number)
    .find(Number.isFinite);
  const providerRetryAfterMs = candidates.map(candidate => candidate?.providerRetryAfterMs)
    .map(Number)
    .find(value => Number.isFinite(value) && value >= 0);
  return {
    limited: code?.toUpperCase() === "RATE_LIMIT" || status === 429,
    providerRetryAfterMs: providerRetryAfterMs ?? 0,
  };
}

/**
 * 创建 QueueEngine 实例
 * @param {object} apiProxy - ctx.apiProxy
 * @param {object} [options]
 */
export function createEngine(apiProxy, options = {}) {
  assertNoIsolationOverrides(options);
  const runner = createRunner(apiProxy, options);
  const inFlight = new Set();
  const stopping = new Set();
  let disposed = false;
  // Persisted pre-admission markers are deliberately indistinguishable from
  // interrupted RPCs after restart. These process-local sets only suppress a
  // same-instance poll/stop race while the original calls are still pending.
  const goalAdmissionsInFlight = new Set();
  const promptAdmissionsInFlight = new Set();

  // 运行时配置（可被 API 修改）
  const engineConfig = {
    maxGoalRounds: options.maxGoalRounds ?? 40,
    maxBlockedResumes: options.maxBlockedResumes ?? 3,
    autoArchive: options.autoArchive ?? true,
    maxAttempts: options.maxAttempts ?? 3,
    taskTimeoutMs: options.taskTimeoutMs ?? 180 * 60 * 1000, // 3 小时，全局可配
    priority: options.priority ?? 5,
    webhook: options.webhook ?? null,
    queueDir: options.queueDir ?? null,
    defaultDeadline: options.defaultDeadline ?? null,
    enableNotifications: options.enableNotifications ?? false,
    unknownThreshold: options.unknownThreshold ?? 3,

    retryBackoffBaseMs: options.retryBackoffBaseMs ?? 30_000,  // 重试退避基数（默认 30s）
    retryBackoffMaxMs: options.retryBackoffMaxMs ?? 300_000,   // 退避上限（默认 5min）
  };

  const engine = {
    runner,

    isDisposed() {
      return disposed;
    },

    /**
     * Close the lifecycle gate immediately. Timers may still deliver a queued
     * callback and RPC promises cannot be aborted by rc.2, so every continuation
     * also re-checks this bit before starting or resuming remote work.
     */
    dispose() {
      disposed = true;
    },

    // 条件归档：任务级 autoArchive > 全局 autoArchive，列表隐藏 + DSH 会话归档
    async archiveIfEnabled(entry) {
      if (disposed) return false;
      const shouldArchive = entry.autoArchive ?? engineConfig.autoArchive;
      if (!shouldArchive) return true;
      const archived = await runner.archiveSessions(entry);
      if (!archived) return false;
      // A terminal task can be rerun while the archive RPC is pending. Never
      // let the old execution hide or archive the newly-owned generation.
      if (!engine._isCurrentEntry(entry)) return false;
      upsertEntry(entry.key, { archivedAt: new Date().toISOString() });
      return true;
    },

    // ─── 内部工具 ──────────────────────────────────────

    async callWebhook(entry, result, error, terminalStatus = result) {
      const url = entry.webhook ?? engineConfig.webhook;
      if (!url) return true;
      try {
        const target = await resolvePublicWebhookUrl(url);
        const body = JSON.stringify({
          key: entry.key,
          status: terminalStatus,
          result,
          error: error ?? null,
          attempts: entry.attempts,
          blockedResumes: entry.blockedResumes,
          finishedAt: new Date().toISOString(),
        });
        return await postPinnedWebhook(target, body);
      } catch {
        return false; // webhook 失败不阻塞任务结算
      }
    },

    _createAttemptWorkDir(key, attempt) {
      const suffix = crypto.randomUUID().slice(0, 8);
      const attemptSuffix = `-a${attempt}-${suffix}`;
      // files.validateKey caps keys at 200 UTF-16 code units. Truncate only
      // the directory label (never the ledger key) and keep a random suffix.
      const base = key.slice(0, Math.max(1, 200 - attemptSuffix.length));
      return createRunDir(`${base}${attemptSuffix}`);
    },

    _retryDelay(entry, error) {
      const currentBackoff = entry.retryBackoffMs ?? 0;
      const exponential = currentBackoff === 0
        ? engineConfig.retryBackoffBaseMs
        : Math.min(currentBackoff * 2, engineConfig.retryBackoffMaxMs);
      const { providerRetryAfterMs } = rateLimitMetadata(error);
      return Math.min(
        MAX_PROVIDER_RETRY_AFTER_MS,
        Math.max(exponential, providerRetryAfterMs),
      );
    },

    _deferRateLimited(entry, attemptBase, delayMs) {
      writeTaskFile(entry.key, entry.raw ?? entry.body ?? "");
      return upsertEntry(entry.key, {
        status: "pending",
        sessionId: null,
        goalRef: null,
        attempts: Math.max(0, attemptBase),
        retryBackoffMs: delayMs,
        nextRetryAt: Date.now() + delayMs,
        consecutiveUnknowns: 0,
        _launchPending: false,
        _launchReservedAt: null,
        _orphanCleanupPending: false,
        _orphanCleanupDeadline: null,
        _orphanCleanupAttempts: 0,
        _rateLimitPending: false,
        _rateLimitAttemptBase: null,
        _rateLimitDelayMs: null,
        _goalAdmissionUncertain: false,
        _goalContainmentConfirmed: null,
        _promptAdmissionUncertain: false,
        _promptContainmentConfirmed: null,
        _goalPhase: "rate-limited",
      });
    },

    async _containGoalAdmission(entry) {
      const current = engine._currentRunOwner(entry, { allowStopping: true });
      if (!current || current._goalAdmissionUncertain !== true) return false;
      // Claim containment synchronously before the first external await. This
      // generation bump invalidates an old goals.create continuation even when
      // cancelLaunch itself is delayed.
      const claim = upsertEntry(current.key, {
        _goalPhase: "goal-containment-attempt",
        _goalContainmentConfirmed: false,
      });
      flushLedger();
      let contained = false;
      try {
        contained = await runner.cancelLaunch(
          claim.sessionId,
          claim.goalRef,
          { missingIsSuccess: false },
        );
      } catch { /* permanent quarantine remains authoritative */ }
      const latest = findByKey(claim.key);
      if (latest?.status === "running" && latest.sessionId === claim.sessionId &&
          latest._goalAdmissionUncertain === true &&
          latest._generation === claim._generation) {
        upsertEntry(latest.key, {
          _goalPhase: "goal-admission-uncertain",
          _goalContainmentConfirmed: contained,
        });
        flushLedger();
      }
      return contained;
    },

    async _containPromptAdmission(entry) {
      const current = engine._currentRunOwner(entry, { allowStopping: true });
      if (!current || current._promptAdmissionUncertain !== true) return false;
      // Claim before awaiting cancellation so a stale launch success cannot
      // clear the quarantine while containment is in flight.
      const claim = upsertEntry(current.key, {
        _goalPhase: "prompt-containment-attempt",
        _promptContainmentConfirmed: false,
      });
      flushLedger();
      let contained = false;
      try {
        contained = await runner.cancelLaunch(
          claim.sessionId,
          claim.goalRef,
          { missingIsSuccess: false },
        );
      } catch { /* permanent quarantine remains authoritative */ }
      const latest = findByKey(claim.key);
      if (latest?.status === "running" && latest.sessionId === claim.sessionId &&
          latest._promptAdmissionUncertain === true &&
          latest._generation === claim._generation) {
        upsertEntry(latest.key, {
          _goalPhase: "prompt-admission-uncertain",
          _promptContainmentConfirmed: contained,
        });
        flushLedger();
      }
      return contained;
    },

    /** Return the current entry only while the same session still owns a run. */
    _currentRunOwner(entry, { allowStopping = false } = {}) {
      const current = findByKey(entry.key);
      return (!allowStopping && stopping.has(entry.key))
        ? null
        : current?.status === "running" && current.sessionId === entry.sessionId
        ? current
        : null;
    },

    /** Contain a launch/resume that crossed the lifecycle boundary. */
    async _containDisposedExecution(entry, sessionId, goalRef, attemptBase) {
      goalAdmissionsInFlight.delete(entry.key);
      promptAdmissionsInFlight.delete(entry.key);
      const owner = engine._currentRunOwner(entry, { allowStopping: true });
      if (!owner || owner.sessionId !== sessionId) return false;
      const claim = upsertEntry(owner.key, {
        goalRef: goalRef ?? owner.goalRef ?? null,
        _goalPhase: "disposed-containment-attempt",
      });
      flushLedger();
      let cancelled = false;
      try {
        cancelled = await runner.cancelLaunch(sessionId, goalRef ?? owner.goalRef ?? null, {
          missingIsSuccess: false,
        });
      } catch { /* retain ownership below */ }
      if (!engine._isCurrentEntry(claim)) return false;
      const current = findByKey(claim.key);
      if (!current || current.status !== "running" || current.sessionId !== sessionId) return false;
      if (!cancelled) {
        upsertEntry(current.key, {
          goalRef: goalRef ?? current.goalRef ?? null,
          _launchPending: true,
          _orphanCleanupPending: true,
          _orphanCleanupDeadline: null,
          _goalPhase: "disposed-containment-failed",
        });
        flushLedger();
        return false;
      }

      writeTaskFile(current.key, current.raw ?? current.body ?? "");
      upsertEntry(current.key, {
        status: "pending",
        sessionId: null,
        goalRef: null,
        attempts: Math.max(0, attemptBase ?? (current.attempts ?? 1) - 1),
        _launchPending: false,
        _launchReservedAt: null,
        _orphanCleanupPending: false,
        _orphanCleanupDeadline: null,
        _orphanCleanupAttempts: 0,
        _goalAdmissionUncertain: false,
        _goalContainmentConfirmed: null,
        _promptAdmissionUncertain: false,
        _promptContainmentConfirmed: null,
        _goalPhase: "disposed",
      });
      flushLedger();
      return true;
    },

    async _hostAllowsDispatch() {
      if (disposed) return false;
      const sessions = await runner.listSessions();
      if (disposed || !sessions.known) return false;
      return !hasActiveForeignSession(sessions);
    },

    /**
     * Pause one owned goal before cancelling its current turn. The pause ref
     * and marker are flushed first: after a crash, recovery may safely resume
     * that exact goal instead of admitting a replacement or prompting again.
     */
    async _yieldForForeground(entry, sessions) {
      if (disposed || stopping.has(entry.key)) return false;
      let current = engine._currentRunOwner(entry);
      if (!current || !isAutoqueueSessionId(current.sessionId)) return false;

      // Admission quarantine has stronger containment semantics (clear goal,
      // then cancel) and must remain authoritative even while the Host is busy.
      if (current._goalAdmissionUncertain) {
        if (!goalAdmissionsInFlight.has(current.key)) await engine._containGoalAdmission(current);
        return false;
      }
      if (current._promptAdmissionUncertain) {
        if (!promptAdmissionsInFlight.has(current.key)) await engine._containPromptAdmission(current);
        return false;
      }

      // The launch reservation exists before goal admission. Bump its CAS and
      // cancel the owned shell session so an in-flight beforeGoal hook cannot
      // admit work after foreground activity appeared.
      if (!current.goalRef) {
        const summary = sessions?.known
          ? sessions.items.find(item => item.sessionId === current.sessionId)
          : null;
        if (summary?.running === false && current._launchPending !== true) return true;
        const claim = upsertEntry(current.key, {
          _goalPhase: "foreground-launch-containment",
        });
        flushLedger();
        let cancelled = false;
        try {
          cancelled = await runner.cancelSession(claim.sessionId, { missingIsSuccess: false });
        } catch { /* preserve launch/orphan ownership for the next poll */ }
        if (!engine._isCurrentEntry(claim)) return false;
        upsertEntry(claim.key, {
          _goalPhase: cancelled
            ? "foreground-launch-contained"
            : "foreground-launch-containment-pending",
        });
        flushLedger();
        return cancelled;
      }

      if (current._foregroundPaused !== true) {
        // This durable intent closes the pause RPC uncertainty window. A failed
        // or timed-out pause stays marked and is retried/converged from history.
        current = upsertEntry(current.key, {
          _foregroundPausePending: true,
          _foregroundPaused: false,
          _foregroundCancelPending: false,
          _goalPhase: "foreground-pause-pending",
        });
        flushLedger();
        const pauseClaim = current;
        let pausedRef;
        try {
          pausedRef = await runner.pauseGoal(current.sessionId, current.goalRef);
        } catch {
          // Do not cancel an armed goal: pause-before-cancel is the invariant.
          // The pending marker survives and the 10s poll retries safely.
          return false;
        }
        if (!engine._isCurrentEntry(pauseClaim)) return false;
        current = engine._currentRunOwner(pauseClaim);
        if (!current) return false;
        current = upsertEntry(current.key, {
          goalRef: pausedRef,
          _foregroundPausePending: false,
          _foregroundPaused: true,
          _foregroundCancelPending: true,
          _goalPhase: "foreground-paused-cancel-pending",
        });
        // Required ordering: no sessions.cancel before the new paused ref and
        // ownership marker are durable.
        flushLedger();
      }

      const summary = sessions?.known
        ? sessions.items.find(item => item.sessionId === current.sessionId)
        : null;
      if (summary?.running === false) {
        upsertEntry(current.key, {
          _foregroundCancelPending: false,
          _goalPhase: "foreground-paused",
        });
        flushLedger();
        return true;
      }

      // `sessions.cancel` is cooperative and its success only acknowledges the
      // request. Keep cancelPending until a later authoritative list reports
      // running=false; retry while foreground/unknown Host state persists.
      if (current._foregroundCancelPending !== true) {
        current = upsertEntry(current.key, {
          _foregroundCancelPending: true,
          _goalPhase: "foreground-paused-cancel-pending",
        });
        flushLedger();
      }
      const cancelClaim = current;
      try {
        await runner.cancelSession(current.sessionId, { missingIsSuccess: false });
      } catch { /* the durable pending marker drives a retry */ }
      return engine._isCurrentEntry(cancelClaim);
    },

    /**
     * Resume a durably foreground-paused goal only after two known-idle Host
     * observations. No prompt is injected: rc.2 goals.resume queues the next
     * goal round itself.
     */
    async _resumeAfterForeground(entry, firstSessions) {
      if (disposed || stopping.has(entry.key) || hasActiveForeignSession(firstSessions)) return false;
      let current = engine._currentRunOwner(entry);
      if (!current || !isAutoqueueSessionId(current.sessionId)) return false;
      if (current._foregroundPausePending !== true && current._foregroundPaused !== true) return false;

      const firstSummary = firstSessions.items.find(item => item.sessionId === current.sessionId);
      if (!firstSummary || firstSummary.running !== false) {
        // A paused goal whose turn has not reached idle is never resumed. Retry
        // cooperative cancellation even though foreground may just have ended.
        return engine._yieldForForeground(current, firstSessions);
      }

      const poll = await runner.pollTask(current.sessionId);
      if (disposed) return false;
      current = engine._currentRunOwner(current);
      if (!current) return false;

      if (poll.phase === "complete") {
        current = upsertEntry(current.key, {
          ...(poll.goalRef ? { goalRef: poll.goalRef } : {}),
          ...CLEAR_FOREGROUND_PAUSE,
          _goalPhase: "complete",
        });
        flushLedger();
        await engine._settleExecution(current, "done");
        return true;
      }

      // A pause attempt can fail before mutation. If history proves the goal is
      // still active and idle, clear only the pending intent; normal dormant
      // handling may rearm it on a later poll.
      if (current._foregroundPaused !== true && poll.phase === "active") {
        upsertEntry(current.key, {
          ...(poll.goalRef ? { goalRef: poll.goalRef } : {}),
          ...CLEAR_FOREGROUND_PAUSE,
          _goalPhase: "active",
        });
        flushLedger();
        return true;
      }
      if (current._foregroundPaused !== true && ["paused", "blocked"].includes(poll.phase) && poll.goalRef) {
        current = upsertEntry(current.key, {
          goalRef: poll.goalRef,
          _foregroundPausePending: false,
          _foregroundPaused: true,
          _foregroundCancelPending: false,
          _goalPhase: "foreground-paused",
        });
        flushLedger();
      }
      if (current._foregroundPaused !== true || !["paused", "blocked", "active"].includes(poll.phase)) {
        return false;
      }

      // The second list happens after history, immediately before resume. Any
      // unknown shape/failure or newly-active foreign session fails closed.
      const secondSessions = await runner.listSessions();
      if (disposed || hasActiveForeignSession(secondSessions)) return false;
      const secondSummary = secondSessions.items.find(item => item.sessionId === current.sessionId);
      if (!secondSummary || secondSummary.running !== false) return false;

      let resumedRef;
      try {
        resumedRef = poll.phase === "active"
          ? (poll.goalRef ?? current.goalRef)
          : await runner.resumeGoal(current.sessionId, poll.goalRef ?? current.goalRef);
      } catch {
        // A stale/uncertain ref is already converged inside runner. Keep the
        // durable pause marker if no authoritative resume result is available.
        return false;
      }
      if (disposed) {
        await engine._containDisposedExecution(
          current,
          current.sessionId,
          resumedRef,
          current.attempts ?? 1,
        );
        return false;
      }
      const afterResume = engine._currentRunOwner(current);
      if (!afterResume) return false;
      upsertEntry(afterResume.key, {
        goalRef: resumedRef,
        consecutiveUnknowns: 0,
        ...CLEAR_FOREGROUND_PAUSE,
        _goalPhase: "active",
      });
      flushLedger();
      return true;
    },

    /**
     * Compare the ledger-owned per-entry CAS generation. upsertEntry always
     * increments it and callers cannot override it, while unrelated task
     * mutations leave it unchanged.
     */
    _isCurrentEntry(entry) {
      const current = findByKey(entry.key);
      return Boolean(current) &&
        Number.isSafeInteger(entry._generation) &&
        current._generation === entry._generation;
    },

    _closeCurrentExecution(entry, result, error) {
      const current = findByKey(entry.key) ?? entry;
      const executions = [...(current.executions ?? [])];
      for (let index = executions.length - 1; index >= 0; index--) {
        const record = executions[index];
        if (record.endedAt) continue;
        executions[index] = {
          ...record,
          endedAt: new Date().toISOString(),
          result,
          ...(error ? { error } : {}),
        };
        break;
      }
      return upsertEntry(current.key, { executions });
    },

    _rescheduleCron(entry) {
      writeTaskFile(entry.key, entry.raw ?? entry.body ?? "");
      return upsertEntry(entry.key, {
        status: "pending",
        sessionId: null,
        goalRef: null,
        consecutiveUnknowns: 0,
        attempts: 0,
        blockedResumes: 0,
        nextRetryAt: null,
        retryBackoffMs: 0,
        _deadlinePending: false,
        _launchPending: false,
        _launchReservedAt: null,
        _orphanCleanupPending: false,
        _orphanCleanupDeadline: null,
        _orphanCleanupAttempts: 0,
        _rateLimitPending: false,
        _rateLimitAttemptBase: null,
        _rateLimitDelayMs: null,
        _goalAdmissionUncertain: false,
        _goalContainmentConfirmed: null,
        _promptAdmissionUncertain: false,
        _promptContainmentConfirmed: null,
        _goalPhase: null,
      });
    },

    /** Complete one execution while keeping recurring plans alive. */
    async _settleExecution(entry, status, error, { writeReport = true } = {}) {
      if (disposed) return findByKey(entry.key);
      let current = engine._currentRunOwner(entry);
      if (!current) return findByKey(entry.key); // another action owns this run
      if (writeReport && current.workDir) {
        await runner.finalize(current, status, error);
        // finalize performs external/file I/O. A stop/rerun can complete while
        // it is pending, so reacquire the exact run owner before mutating the
        // execution record or terminal state.
        const afterFinalize = engine._currentRunOwner(current);
        if (!afterFinalize) return findByKey(entry.key);
        current = afterFinalize;
        if (disposed) return current;
      }
      current = engine._closeCurrentExecution(current, status, error);
      const webhookEntry = { ...current, status };

      if (current.cron) {
        engine._rescheduleCron(current);
      } else {
        current = upsertEntry(current.key, {
          status,
          sessionId: null,
          goalRef: null,
          consecutiveUnknowns: 0,
          _goalAdmissionUncertain: false,
          _goalContainmentConfirmed: null,
          _promptAdmissionUncertain: false,
          _promptContainmentConfirmed: null,
          _goalPhase: status,
        });
        await engine.archiveIfEnabled(current);
      }
      flushLedger();
      await engine.callWebhook(webhookEntry, status, error, status);
      engine.scanPending().catch(err => {
        console.error(`[autoqueue] ${entry.key} 结算后扫描失败:`, err.message);
      });
      return findByKey(entry.key);
    },

    async _recordUnreachable(entry, reason) {
      if (disposed || stopping.has(entry.key)) return false;
      const current = findByKey(entry.key);
      if (!current || current.status !== "running" || current.sessionId !== entry.sessionId) return false;
      const count = (current.consecutiveUnknowns ?? 0) + 1;
      const threshold = current.unknownThreshold ?? engineConfig.unknownThreshold;
      upsertEntry(current.key, { consecutiveUnknowns: count, _goalPhase: "unknown" });
      flushLedger();
      if (count < threshold) return false;

      const latest = findByKey(current.key);
      if (!latest || latest.status !== "running") return false;
      await engine.retryExecution(latest, reason);
      return true;
    },

    async _recordDormant(entry, goalRef) {
      if (disposed || stopping.has(entry.key)) return false;
      const current = findByKey(entry.key);
      if (!current || current.status !== "running" || current.sessionId !== entry.sessionId) return false;
      const count = (current.consecutiveUnknowns ?? 0) + 1;
      const threshold = current.unknownThreshold ?? engineConfig.unknownThreshold;
      upsertEntry(current.key, { consecutiveUnknowns: count, _goalPhase: "active" });
      flushLedger();
      if (count < threshold) return false;

      try {
        if (disposed || !await engine._hostAllowsDispatch()) return false;
        const newRef = await runner.resumeGoal(current.sessionId, goalRef ?? current.goalRef);
        if (disposed) {
          await engine._containDisposedExecution(current, current.sessionId, newRef, current.attempts ?? 1);
          return false;
        }
        const afterResume = engine._currentRunOwner(current);
        if (!afterResume) return false;
        upsertEntry(afterResume.key, { goalRef: newRef, consecutiveUnknowns: 0 });
        flushLedger();
        return true;
      } catch (err) {
        // A brief idle edge can report running=false while the goal is still
        // armed. That explicit RPC error is healthy, not a reason to rebuild.
        if ((err?.goalCode === "GOAL_INVALID_TRANSITION" || err?.code === "GOAL_INVALID_TRANSITION") && /already active and armed/i.test(err.message)) {
          upsertEntry(current.key, { consecutiveUnknowns: 0 });
          flushLedger();
          return true;
        }
        await engine.retryExecution(findByKey(current.key) ?? current, "session-dormant");
        return false;
      }
    },

    // ─── 快照 ──────────────────────────────────────────

    /** @returns {{ revision: number, tasks: LedgerEntry[], config: { maxConcurrent: number, webhook?: string|null }, metrics: object }} */
    snapshot(includeArchived = false) {
      const s = snapshot();
      const metricTasks = s.tasks.filter(t => !t.archivedAt);
      let tasks = includeArchived ? s.tasks : metricTasks;
      tasks = [...tasks].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      // 丰富运行时数据
      const enriched = tasks.map(t => {
        const enriched = { ...t };
        // 任务类型
        if (t.cron) enriched.taskType = 'cron';
        else if (t.schedule) enriched.taskType = 'schedule';
        else enriched.taskType = 'manual';
        // cron 任务：计算下次执行时间
        if (t.cron) {
          enriched.nextRunAt = getNextCronTime(t.cron);
        }
        // 运行中任务：暴露执行进度
        if (t.status === 'running' && t.executions?.length) {
          const lastExec = t.executions[t.executions.length - 1];
          if (lastExec?.startedAt) enriched.startedAt = lastExec.startedAt;
          if (t._currentRound != null) enriched.currentRound = t._currentRound;
          if (t._goalPhase) enriched.goalPhase = t._goalPhase;
          if (t._lastActivityTime != null) enriched.lastActivityTime = t._lastActivityTime;
        }
        if (t.status === 'running') {
          enriched.foregroundPaused = t._foregroundPaused === true;
        }
        // raw duplicates body and can be up to 2 MiB. Internal underscore
        // fields are ledger/runtime implementation details, not SSE state.
        delete enriched.raw;
        for (const field of Object.keys(enriched)) {
          if (field.startsWith("_")) delete enriched[field];
        }
        return enriched;
      });
      const now = Date.now();
      const done24h = metricTasks.filter(t => t.status === 'done' && t.updatedAt && (now - new Date(t.updatedAt).getTime()) < 86400000).length;
      const failed24h = metricTasks.filter(t => t.status === 'failed' && t.updatedAt && (now - new Date(t.updatedAt).getTime()) < 86400000).length;
      const total24h = done24h + failed24h;
      const metrics = {
        total: metricTasks.length,
        running: metricTasks.filter(t => t.status === 'running').length,
        pending: metricTasks.filter(t => t.status === 'pending').length,
        done24h,
        failed24h,
        successRate: total24h > 0 ? Math.round((done24h / total24h) * 100) : 0,
      };
      return { ...s, tasks: enriched, unreadCount: unreadCount(), metrics, config: { ...s.config, webhook: engineConfig.webhook, queueDir: engineConfig.queueDir, enableNotifications: engineConfig.enableNotifications, unknownThreshold: engineConfig.unknownThreshold } };
    },

    // ─── 运行时配置 ─────────────────────────────────────

    getConfig() {
      return { ...engineConfig };
    },

    setConfig(patch) {
      assertNoIsolationOverrides(patch);
      if (patch.maxGoalRounds != null) {
        engineConfig.maxGoalRounds = Math.max(1, Math.min(100, parseInt(patch.maxGoalRounds, 10)));
      }
      if (patch.maxBlockedResumes != null) {
        engineConfig.maxBlockedResumes = Math.max(0, Math.min(10, parseInt(patch.maxBlockedResumes, 10)));
      }
      if (patch.unknownThreshold != null) {
        engineConfig.unknownThreshold = Math.max(1, Math.min(10, parseInt(patch.unknownThreshold, 10)));
      }
      if (patch.maxAttempts != null) {
        engineConfig.maxAttempts = Math.max(1, Math.min(10, parseInt(patch.maxAttempts, 10)));
      }
      if (patch.taskTimeoutMs != null) {
        engineConfig.taskTimeoutMs = Math.max(600_000, Math.min(86_400_000, parseInt(patch.taskTimeoutMs, 10))); // 10分钟～24小时
      }
      if (patch.autoArchive !== undefined) {
        engineConfig.autoArchive = !!patch.autoArchive;
      }
      if (patch.webhook !== undefined) {
        engineConfig.webhook = patch.webhook || null;
      }
      if (patch.queueDir !== undefined) {
        const requestedQueueDir = patch.queueDir || null;
        if (requestedQueueDir !== engineConfig.queueDir) {
          throw new Error("queueDir 不能在运行时切换，请重启插件后生效");
        }
      }
      if (patch.enableNotifications !== undefined) {
        engineConfig.enableNotifications = !!patch.enableNotifications;
      }
      if (patch.priority != null) {
        engineConfig.priority = Math.max(1, Math.min(10, parseInt(patch.priority, 10)));
      }
      if (patch.defaultDeadline !== undefined) {
        engineConfig.defaultDeadline = patch.defaultDeadline || null;
      }
      if (patch.retryBackoffBaseMs != null) {
        engineConfig.retryBackoffBaseMs = Math.max(5_000, Math.min(600_000, parseInt(patch.retryBackoffBaseMs, 10)));
      }
      if (patch.retryBackoffMaxMs != null) {
        engineConfig.retryBackoffMaxMs = Math.max(10_000, Math.min(3_600_000, parseInt(patch.retryBackoffMaxMs, 10)));
      }
      return { ...engineConfig };
    },

    // ─── API 操作（主入口）──────────────────────────────

    /**
     * 通过 API 创建任务
     * @param {string} [requestId] - 去重用，不传则自动生成
     * @param {string} [key] - 任务标识；省略时自动生成
     * @param {string} content - Markdown 内容
     * @param {object} [opts]
     */
    createTask(requestId, key, content, opts = {}) {
      assertNoIsolationOverrides(opts);
      // HTTP 层去重：仅当调用方传了 requestId 时才校验
      let reserved = false;
      let wroteTaskFile = false;
      if (requestId) {
        const reservation = checkRequest(requestId, { kind: "create", key: key ?? null, content, opts });
        if (reservation === "inflight") {
          return { ok: false, key, error: "相同 requestId 的请求正在处理中" };
        }
        if (reservation === "completed" || reservation === false) {
          return { ok: false, key, error: "重复提交" };
        }
        reserved = reservation === "new" || reservation === true;
      }

      try {
        if (opts.schedule && opts.cron) throw new Error("schedule 和 cron 不能同时设置");
        // 自动生成 key：未提供时用时间戳兜底
        if (!key) key = `task-${formatTimestamp()}`;
        let resolvedKey = key;
        let attempt = 0;
        while (findByKey(resolvedKey)) {
          attempt++;
          resolvedKey = `${key}-${formatTimestamp()}`;
          if (attempt > 10) resolvedKey = `${key}-${Date.now()}`;
        }
        key = resolvedKey;

        // 优先级钳位
        const priority = opts.priority != null ? Math.max(1, Math.min(10, parseInt(opts.priority, 10))) : engineConfig.priority;

        // 组装文件内容：前面加调度声明
        const fileContent = buildFileContent(content, opts.schedule, opts.cron, opts.deadline);

        writeTaskFile(key, fileContent);
        wroteTaskFile = true;
        upsertEntry(key, {
          status: "pending",
          body: content,
          raw: fileContent,
          workspace: null,
          agentPreset: null,
          model: null,
          autoArchive: opts.autoArchive,
          maxGoalRounds: opts.maxGoalRounds,
          maxBlockedResumes: opts.maxBlockedResumes,
          timeoutMs: opts.timeoutMs,
          maxAttempts: opts.maxAttempts,
          schedule: opts.schedule,
          cron: opts.cron,
          deadline: opts.deadline,
          priority: priority,
          webhook: opts.webhook,
          enableNotifications: opts.enableNotifications,
        });

        if (reserved) {
          completeRequest(requestId);
          flushLedger();
        }

        // 立即尝试派发
        engine.scanPending().catch(err => {
          console.error(`[autoqueue] ${key} 创建后扫描失败:`, err.message);
        });
        return { ok: true, key };
      } catch (err) {
        // writeTaskFile precedes the ledger quota/CAS checks. Remove only the
        // file created by this synchronous create attempt when no entry was
        // committed, otherwise the scanner would repeatedly rediscover it.
        if (wroteTaskFile && key) {
          try {
            if (!findByKey(key)) removeTaskFile(key);
          } catch { /* preserve the original create failure */ }
        }
        if (reserved) releaseFailedRequest(requestId);
        throw err;
      }
    },

    /**
     * 通过 API 对任务执行动作
     * @param {string} requestId - 去重用
     * @param {string} action - stop | archive | delete | force-scan
     * @param {string} [key] - 任务标识
     * @param {object} [opts]
     * @returns {object}
     */
    async applyAction(requestId, action, key, opts = {}) {
      let reserved = false;
      if (requestId) {
        const reservation = checkRequest(requestId, { kind: "action", action, key: key ?? null, opts });
        if (reservation === "inflight") {
          return { ok: false, error: "相同 requestId 的请求正在处理中" };
        }
        if (reservation === "completed" || reservation === false) return { ok: true };
        reserved = reservation === "new" || reservation === true;
      }

      try {
        let result;
        switch (action) {
          case "stop":
            result = await engine.stopTask(key);
            break;
          case "archive":
            result = opts.keys && Array.isArray(opts.keys)
              ? await engine.archiveTasks(opts.keys)
              : await engine.archiveTask(key);
            break;
          case "restore":
            result = await engine.restoreTask(key);
            break;
          case "force-scan":
            await engine.scanPending();
            result = { ok: true };
            break;
          case "rerun": {
            const entry = findByKey(key);
            if (!entry) {
              result = { ok: false, error: "任务不存在" };
              break;
            }
            if (entry.archivedAt) {
              result = { ok: false, error: "任务已归档，请先恢复后再重跑" };
              break;
            }
            if (entry.status === "running") {
              result = { ok: false, error: "任务正在运行" };
              break;
            }
            // done 任务也允许重跑（结果可能已过时，用户需要重新执行）
            writeTaskFile(key, entry.raw ?? entry.body ?? "");
            upsertEntry(key, {
              status: "pending", workDir: null, sessionId: null, goalRef: null, consecutiveUnknowns: 0,
              attempts: 0,
              nextRetryAt: null, retryBackoffMs: 0,
              _goalAdmissionUncertain: false, _goalContainmentConfirmed: null,
              _promptAdmissionUncertain: false, _promptContainmentConfirmed: null,
              priority: entry.priority, webhook: entry.webhook,
              maxGoalRounds: entry.maxGoalRounds, maxBlockedResumes: entry.maxBlockedResumes, timeoutMs: entry.timeoutMs,
              enableNotifications: entry.enableNotifications,
            });
            flushLedger();
            await engine.scanPending();
            result = { ok: true };
            break;
          }
          case "set-concurrency":
            setConcurrency(opts.maxConcurrent ?? 1);
            result = { ok: true };
            break;
          case "update":
            result = engine.updateTask(key, opts);
            break;
          case "delete":
            result = engine.deleteTask(key);
            break;
          default:
            throw new Error(`未知 action: ${action}`);
        }

        if (reserved) {
          if (result?.ok === false) releaseFailedRequest(requestId);
          else {
            completeRequest(requestId);
            flushLedger();
          }
        }
        return result;
      } catch (err) {
        if (reserved) releaseFailedRequest(requestId);
        throw err;
      }
    },

    // ─── 收件箱扫描（辅助入口）──────────────────────────

    async scanPending() {
      if (disposed || this._scanning) return;
      this._scanning = true;
      try {
      const tasks = listTaskFiles();
      const maxConcurrent = getConcurrency();
      const current = runningCount();
      const available = maxConcurrent - current;
      if (available <= 0) return;
      if (tasks.length === 0) return;

      // Foreground work owns the Host. rc.2 exposes a trustworthy boolean
      // `running` in sessions.list; an RPC/shape failure is deliberately
      // indistinguishable from foreground activity and therefore yields.
      if (!await engine._hostAllowsDispatch()) return;

      // 按优先级排序（高优先先派发），默认 5
      tasks.sort((a, b) => {
        const pa = findByKey(a.key)?.priority ?? 5;
        const pb = findByKey(b.key)?.priority ?? 5;
        return pb - pa;
      });

      let dispatched = 0;
      for (const task of tasks) {
        if (disposed) break;
        if (dispatched >= available) break;
        if (inFlight.has(task.key)) continue;

        // 先解析账本项，cron 去重检查必须读取它，不能在声明前访问。
        let entry = findByKey(task.key);

        // 调度检查
        let skipDueToSchedule = false;
        if (task.schedule?.schedule) {
          const scheduledAt = new Date(task.schedule.schedule).getTime();
          if (Date.now() < scheduledAt) skipDueToSchedule = true;
        }
        if (!skipDueToSchedule && task.schedule?.cron) {
          if (!matchCron(task.schedule.cron)) skipDueToSchedule = true;
          else {
            const currentMinute = Math.floor(Date.now() / 60_000);
            if (entry?.lastCronDispatch === currentMinute) skipDueToSchedule = true;
          }
        }

        // 确保收件箱任务在账本中有记录（即使未到调度时间，也显示在看板中）
        if (!entry) {
          entry = {
            key: task.key,
            status: "pending",
            body: task.body,
            raw: task.raw,
            schedule: task.schedule?.schedule ?? null,
            cron: task.schedule?.cron ?? null,
            deadline: task.schedule?.deadline ?? null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            attempts: 0,
            blockedResumes: 0,
            executions: [],
            priority: engineConfig.priority ?? 5,
            agentPreset: null,
          };
          try {
            entry = upsertEntry(task.key, entry);
          } catch (err) {
            // One oversized/capacity-blocked inbox item must not starve later
            // tasks in the same scan pass.
            console.error(`[autoqueue] ${task.key} 无法写入账本:`, err.message);
            continue;
          }
        }

        if (skipDueToSchedule) continue;

        // 只有 pending 可派发；failed 必须经显式 rerun 回到 pending。
        if (entry && entry.status !== "pending") continue;
        // Goal/prompt admission 不确定是永久隔离态。即使账本被旧版本错误地
        // 回退到 pending，也绝不能从 inbox 启动 replacement。
        if (entry?._goalAdmissionUncertain || entry?._promptAdmissionUncertain) continue;
        // 已归档的任务不派发
        if (entry?.archivedAt) continue;

        // 退避检查：nextRetryAt 在未来 → 跳过（限流/断连后冷却）
        if (entry?.nextRetryAt && Date.now() < entry.nextRetryAt) continue;

        inFlight.add(task.key);
        dispatched++;
        engine._dispatch(task)
          .catch(err => console.error(`[autoqueue] ${task.key} 派发失败:`, err.message))
          .finally(() => { inFlight.delete(task.key); });
      }
    } finally { this._scanning = false; } },



    // ─── 模式解析 ──────────────────────────────────────

    /**
     * 根据任务内容自动判定执行模式
     * PTC 适合：步骤明确、可编程化的批量操作
     * unattended 适合：探索性、需要中途判断的任务
     * @param {string} content - 任务正文
     * @returns {"autoqueue-unattended-v2"|"autoqueue-ptc-unattended-v2"}
     */
    resolveMode(content) {
      const text = (content || "").toLowerCase();
      // PTC 特征：有编号步骤、批量文件操作、数据处理指令
      // 得分 ≥ 2 → ptc-unattended（程序化执行），否则 → unattended（探索性执行）
      const ptcPatterns = [
        // 结构化步骤
        /步骤\s*[1-9]/,
        /^\s*[0-9]+[.、)]/m,
        // 批量/循环/遍历
        /批量|遍历|循环|所有文件|逐一|逐行/,
        // 文件操作：读/写/创建/复制/移动/删除/下载
        /读取.*文件|写入.*文件|创建.*文件|复制.*到|移动.*到|删除.*文件|下载.*文件/,
        // 数据处理
        /json|yml|yaml|xml|csv|解析.*数据|提取.*数据|转换.*格式|生成.*文件/,
        // 统计计算
        /统计|汇总|计算.*数|合并|排序|过滤|筛选|分组/,
        // 系统命令 / 网络操作
        /git\s|curl\s|wget|ssh\s|npm\s|docker|pip\s|npx\s|pwsh\s|powershell/,
        // 代码生成 / 元数据操作
        /生成.*代码|编写.*脚本|创建.*函数|定义.*类|导入.*模块|require|import/,
        // 批量文件处理（文件扩展名 + 目录操作）
        /遍历.*目录|列出.*文件|查找.*文件|.*\.log|.*\.csv|.*\.json|.*\.yml|.*\.yaml/,
      ];
      const ptcScore = ptcPatterns.filter(p => p.test(text)).length;
      return ptcScore >= 2
        ? AUTOQUEUE_PTC_UNATTENDED_PRESET
        : AUTOQUEUE_UNATTENDED_PRESET;
    },

    // ─── 内部派发 ──────────────────────────────────────

    async _dispatch(task) {
      if (disposed) return;
      if (!await engine._hostAllowsDispatch()) return;
      let entry = findByKey(task.key);
      if (entry?._goalAdmissionUncertain || entry?._promptAdmissionUncertain) return;

      // Check dispatch limit to prevent cron tasks from flooding the queue
      const maxAttempts = entry?.maxAttempts ?? engineConfig.maxAttempts;
      if ((entry?.attempts ?? 0) >= maxAttempts) {
        const error = `max dispatch attempts reached (${maxAttempts})`;
        if (entry?.cron) {
          engine._rescheduleCron(entry);
        } else {
          upsertEntry(task.key, { status: "failed", sessionId: null, goalRef: null });
          removeTaskFile(task.key);
        }
        flushLedger();
        await engine.callWebhook({ ...entry, status: "failed" }, "failed", error, "failed");
        return;
      }

      // Only presets derived by the engine are admissible. Legacy custom
      // values remain readable in the ledger but are never executed.
      const effectivePreset = engine.resolveMode(entry?.body ?? task.body);

      const attemptBase = entry?.attempts ?? 0;
      const attemptNumber = attemptBase + 1;
      const previousBackoff = entry?.retryBackoffMs ?? 0;
      const workDir = engine._createAttemptWorkDir(task.key, attemptNumber);
      // Persist the exact remote id before runner.launch can issue
      // sessions.create. A crash can now be reconciled/cancelled by id instead
      // of losing ownership and starting a second agent.
      const reservedSessionId = createAutoqueueSessionId();
      entry = upsertEntry(task.key, {
        status: "running",
        workDir,
        sessionId: reservedSessionId,
        goalRef: null,
        agentPreset: effectivePreset,
        workspace: null,
        model: null,
        maxGoalRounds: entry?.maxGoalRounds ?? engineConfig.maxGoalRounds,
        attempts: attemptNumber,
        blockedResumes: 0,
        consecutiveUnknowns: 0,
        nextRetryAt: null,
        retryBackoffMs: previousBackoff,
        _deadlinePending: false,
        _launchPending: true,
        _launchReservedAt: Date.now(),
        _orphanCleanupPending: true,
        _orphanCleanupDeadline: Date.now() + Math.max(POLL_INTERVAL_MS, runner.rpcTimeoutMs),
        _orphanCleanupAttempts: 0,
        _rateLimitPending: false,
        _rateLimitAttemptBase: null,
        _rateLimitDelayMs: null,
        _goalAdmissionUncertain: false,
        _goalContainmentConfirmed: null,
        _promptAdmissionUncertain: false,
        _promptContainmentConfirmed: null,
        _goalPhase: "launch-pending",
        body: task.body,
        raw: task.raw,
        schedule: task.schedule?.schedule ?? entry?.schedule,
        ...(task.schedule?.cron ? { lastCronDispatch: Math.floor(Date.now() / 60_000) } : {}),
      });

      flushLedger();

      const execRecord = {
        id: crypto.randomUUID(),
        sessionId: reservedSessionId,
        attempt: entry.attempts,
        startedAt: new Date().toISOString(),
        workDir,
      };

      try {
        const { sessionId, goalRef } = await runner.launch(entry, {
          beforeGoal: async launchState => {
            if (disposed) {
              const lifecycleError = new Error("autoqueue engine disposed before goal admission");
              lifecycleError.code = "engine-disposed";
              throw lifecycleError;
            }
            if (!await engine._hostAllowsDispatch()) {
              const foregroundError = new Error("foreground session became active before goal admission");
              foregroundError.code = "foreground-active";
              throw foregroundError;
            }
            const current = engine._currentRunOwner(entry);
            if (!engine._isCurrentEntry(entry) || !current ||
                current.sessionId !== launchState.sessionId) {
              const ownershipError = new Error("任务在 goal 投递前已失去启动 ownership");
              ownershipError.code = "launch-owner-lost";
              throw ownershipError;
            }
            goalAdmissionsInFlight.add(task.key);
            entry = upsertEntry(task.key, {
              sessionId: launchState.sessionId,
              goalRef: null,
              _goalAdmissionUncertain: true,
              _goalContainmentConfirmed: false,
              _promptAdmissionUncertain: false,
              _promptContainmentConfirmed: null,
              _goalPhase: "goal-admission-pending",
            });
            flushLedger();
          },
          afterGoal: async launchState => {
            const current = engine._currentRunOwner(entry);
            if (!engine._isCurrentEntry(entry) || !current ||
                current.sessionId !== launchState.sessionId) {
              const ownershipError = new Error("任务在 goal 入场后已失去启动 ownership");
              ownershipError.code = "launch-owner-lost";
              throw ownershipError;
            }
            entry = upsertEntry(task.key, {
              sessionId: launchState.sessionId,
              goalRef: launchState.goalRef,
              _goalAdmissionUncertain: false,
              _goalContainmentConfirmed: null,
              _promptAdmissionUncertain: false,
              _promptContainmentConfirmed: null,
              _goalPhase: "goal-admitted",
            });
            // Persist the exact admitted ref before launch continuation can
            // publish success or lifecycle cleanup can cancel it.
            flushLedger();
            goalAdmissionsInFlight.delete(task.key);
            if (disposed) {
              const lifecycleError = new Error("autoqueue engine disposed after goal admission");
              lifecycleError.code = "engine-disposed";
              throw lifecycleError;
            }
          },
        });
        execRecord.sessionId = sessionId;
        if (!engine._isCurrentEntry(entry)) {
          // Another engine instance may have treated the durable goal marker
          // marker as an interrupted admission and contained this launch.
          // Never let the stale continuation clear that quarantine.
          goalAdmissionsInFlight.delete(task.key);
          promptAdmissionsInFlight.delete(task.key);
          return;
        }
        entry = upsertEntry(task.key, {
          sessionId,
          goalRef,
          retryBackoffMs: 0,
          _launchPending: false,
          _launchReservedAt: null,
          _orphanCleanupPending: false,
          _orphanCleanupDeadline: null,
          _orphanCleanupAttempts: 0,
          _rateLimitPending: false,
          _rateLimitAttemptBase: null,
          _rateLimitDelayMs: null,
          _goalAdmissionUncertain: false,
          _goalContainmentConfirmed: null,
          _promptAdmissionUncertain: false,
          _promptContainmentConfirmed: null,
          executions: [...(entry.executions ?? []), execRecord],
        });
        flushLedger();
        goalAdmissionsInFlight.delete(task.key);
        promptAdmissionsInFlight.delete(task.key);
        if (disposed) {
          await engine._containDisposedExecution(entry, sessionId, goalRef, attemptBase);
          return;
        }
        // 先持久化 sessionId 再删文件，防止崩溃丢任务
        // 检查是否在 launch 期间被 stop 了
        const current = findByKey(task.key);
        if (current && current.status !== "running") {
          const cancelled = await runner.cancelTask(sessionId, goalRef);
          if (!cancelled) {
            upsertEntry(task.key, { status: "running", sessionId, goalRef });
          } else {
            engine._closeCurrentExecution(current, current.status === "stopped" ? "stopped" : "failed", "launch lost task ownership");
            upsertEntry(task.key, { sessionId: null, goalRef: null });
          }
          flushLedger();
          return;
        }
        removeTaskFile(task.key);
      } catch (err) {
        const rateLimit = rateLimitMetadata(err);
        const rateLimitDelay = rateLimit.limited ? engine._retryDelay(entry, err) : null;
        const launchError = err instanceof SessionLaunchError && Boolean(err.sessionId);
        const goalUncertain = launchError && err.goalUncertain === true;
        const promptUncertain = launchError && err.promptUncertain === true;
        const admissionUncertain = goalUncertain || promptUncertain;
        const ownsLaunchGeneration = engine._isCurrentEntry(entry);
        let cleanupFailed = false;
        if (launchError) {
          execRecord.sessionId = err.sessionId;
          const owner = ownsLaunchGeneration ? engine._currentRunOwner(entry) : null;
          if (owner) {
            entry = upsertEntry(task.key, {
              sessionId: err.sessionId,
              goalRef: err.goalRef ?? owner.goalRef ?? null,
              _goalAdmissionUncertain: goalUncertain,
              _goalContainmentConfirmed: goalUncertain ? false : null,
              _promptAdmissionUncertain: promptUncertain,
              _promptContainmentConfirmed: promptUncertain ? false : null,
              _goalPhase: goalUncertain
                ? "goal-admission-uncertain"
                : (promptUncertain ? "prompt-admission-uncertain" : "cleanup-pending"),
            });
            flushLedger();
          }
          // Once a goal exists, cleanup must disarm it before cancelling the
          // turn. sessions.cancel alone preserves armed goal work.
          const cleaned = (err.goalRef || admissionUncertain)
            ? await runner.cancelLaunch(err.sessionId, err.goalRef, {
                missingIsSuccess: err.code !== "rpc-timeout" && !admissionUncertain,
              })
            : await runner.cancelSession(err.sessionId, {
                missingIsSuccess: err.code !== "rpc-timeout" && !admissionUncertain,
              });
          cleanupFailed = !cleaned;
        }
        // Explicit ok:false is now known-safe; a timeout/transport exception
        // remains uncertain after this point even if containment succeeded.
        goalAdmissionsInFlight.delete(task.key);
        promptAdmissionsInFlight.delete(task.key);
        if (!ownsLaunchGeneration) return;
        if (!engine._isCurrentEntry(entry)) return;
        const afterCleanup = engine._currentRunOwner(entry);
        if (!afterCleanup) return;
        entry = afterCleanup;
        if (disposed && !admissionUncertain && !cleanupFailed) {
          writeTaskFile(task.key, entry.raw ?? entry.body ?? "");
          upsertEntry(task.key, {
            status: "pending",
            sessionId: null,
            goalRef: null,
            attempts: Math.max(0, attemptBase),
            _launchPending: false,
            _launchReservedAt: null,
            _orphanCleanupPending: false,
            _orphanCleanupDeadline: null,
            _orphanCleanupAttempts: 0,
            _goalAdmissionUncertain: false,
            _goalContainmentConfirmed: null,
            _promptAdmissionUncertain: false,
            _promptContainmentConfirmed: null,
            _goalPhase: "disposed",
          });
          flushLedger();
          return;
        }
        execRecord.endedAt = new Date().toISOString();
        execRecord.result = "failed";
        execRecord.error = `${err.message}${cleanupFailed ? "; orphan session cleanup failed" : ""}`;
        entry = upsertEntry(task.key, {
          executions: [...(entry.executions ?? []), execRecord],
        });
        try { await runner.finalize(entry, "failed", execRecord.error); } catch { /* run dir may be unavailable */ }
        const afterFinalize = engine._currentRunOwner(entry);
        if (!afterFinalize) return;
        entry = afterFinalize;

        if (admissionUncertain) {
          // Permanent fail-closed quarantine. Cancellation can contain current
          // activity but cannot prove whether the goal or prompt was admitted;
          // never release ownership or launch a replacement automatically.
          upsertEntry(task.key, {
            status: "running",
            sessionId: execRecord.sessionId,
            goalRef: err.goalRef ?? entry.goalRef ?? null,
            consecutiveUnknowns: 0,
            _orphanCleanupPending: true,
            _orphanCleanupDeadline: null,
            _orphanCleanupAttempts: cleanupFailed ? 1 : 0,
            _launchPending: true,
            _rateLimitPending: false,
            _rateLimitAttemptBase: null,
            _rateLimitDelayMs: null,
            _goalAdmissionUncertain: goalUncertain,
            _goalContainmentConfirmed: goalUncertain ? !cleanupFailed : null,
            _promptAdmissionUncertain: promptUncertain,
            _promptContainmentConfirmed: promptUncertain ? !cleanupFailed : null,
            _goalPhase: goalUncertain
              ? "goal-admission-uncertain"
              : "prompt-admission-uncertain",
          });
          flushLedger();
          return;
        }

        if (cleanupFailed) {
          // Fail closed: keep ownership of the possibly-live orphan and let
          // bounded polling retry cancellation before any replacement starts.
          upsertEntry(task.key, {
            status: "running",
            sessionId: execRecord.sessionId,
            goalRef: err.goalRef ?? entry.goalRef ?? null,
            consecutiveUnknowns: 0,
            _orphanCleanupPending: true,
            _orphanCleanupDeadline: Date.now() + Math.max(POLL_INTERVAL_MS, runner.rpcTimeoutMs),
            _orphanCleanupAttempts: 1,
            _launchPending: true,
            _rateLimitPending: rateLimit.limited,
            _rateLimitAttemptBase: rateLimit.limited ? attemptBase : null,
            _rateLimitDelayMs: rateLimitDelay,
            _goalAdmissionUncertain: false,
            _goalContainmentConfirmed: null,
            _promptAdmissionUncertain: false,
            _promptContainmentConfirmed: null,
            _goalPhase: "cleanup-pending",
          });
          flushLedger();
          return;
        }

        if (rateLimit.limited) {
          engine._deferRateLimited(entry, attemptBase, rateLimitDelay);
          flushLedger();
          return;
        }

        if (entry.attempts < (entry.maxAttempts ?? engineConfig.maxAttempts)) {
          // 重试：回退到 pending，带退避延迟
          const nextDelay = engine._retryDelay(entry);
          const nextRetryAt = Date.now() + nextDelay;
          upsertEntry(task.key, {
            status: "pending",
            sessionId: null,
            goalRef: null,
            retryBackoffMs: nextDelay,
            nextRetryAt,
            _launchPending: false,
            _launchReservedAt: null,
            _orphanCleanupPending: false,
            _orphanCleanupDeadline: null,
            _orphanCleanupAttempts: 0,
            _goalAdmissionUncertain: false,
            _goalContainmentConfirmed: null,
            _promptAdmissionUncertain: false,
            _promptContainmentConfirmed: null,
          });
          flushLedger();
          // 不立即触发扫描，让定时器自然处理（退避期内会跳过）
        } else {
          const webhookEntry = { ...entry, status: "failed" };
          if (entry.cron) {
            engine._rescheduleCron(entry);
          } else {
            const terminal = upsertEntry(task.key, {
              status: "failed",
              sessionId: null,
              goalRef: null,
              _launchPending: false,
              _launchReservedAt: null,
              _orphanCleanupPending: false,
              _orphanCleanupDeadline: null,
              _orphanCleanupAttempts: 0,
              _goalAdmissionUncertain: false,
              _goalContainmentConfirmed: null,
              _promptAdmissionUncertain: false,
              _promptContainmentConfirmed: null,
            });
            removeTaskFile(task.key);
            await engine.archiveIfEnabled(terminal);
          }
          flushLedger();
          await engine.callWebhook(webhookEntry, "failed", execRecord.error, "failed");
        }
      }
    },

    // ─── 轮询运行中任务 ────────────────────────────────

    async pollRunning() {
      if (disposed || this._polling) return;
      this._polling = true;
      try {
        const entries = loadLedger();
        const running = entries.filter(e => e.status === "running" && e.sessionId);
        if (running.length === 0) return;

        // 一次调用拿到所有活跃 session，避免逐任务查询
        const sessions = await runner.listSessions();
        if (disposed) return;

        const foregroundUnsafe = hasActiveForeignSession(sessions);
        const jobs = [];
        for (const entry of running) {
          if (inFlight.has(entry.key)) continue;
          inFlight.add(entry.key);
          jobs.push((async () => {
            try {
              if (foregroundUnsafe) {
                await engine._yieldForForeground(entry, sessions);
              } else if (entry._foregroundPausePending === true || entry._foregroundPaused === true) {
                await engine._resumeAfterForeground(entry, sessions);
              } else {
                await engine._pollOne(entry, sessions);
              }
            } catch (err) {
              console.error(`[autoqueue] ${entry.key} 轮询失败:`, err.message);
            } finally {
              inFlight.delete(entry.key);
            }
          })());
        }
        await Promise.all(jobs);
      } finally { this._polling = false; }
    },

    /**
     * 轮询单个任务：session 存活 → 查 goal phase；session 消失 → 重试
     * @param {object} entry - 任务条目
     * @param {{known: boolean, items: Array}} sessions - listSessions 结果
     */
    async _pollOne(entry, sessions) {
      if (disposed || stopping.has(entry.key)) return;
      const latestAtStart = findByKey(entry.key);
      if (!latestAtStart || latestAtStart.status !== "running" || latestAtStart.sessionId !== entry.sessionId) return;
      entry = latestAtStart;
      if (entry._goalAdmissionUncertain) {
        if (!goalAdmissionsInFlight.has(entry.key)) {
          await engine._containGoalAdmission(entry);
        }
        return;
      }
      if (entry._promptAdmissionUncertain) {
        // In the live launch call this marker means "RPC in progress"; after
        // restart or an uncertain rejection it is a permanent quarantine.
        if (!promptAdmissionsInFlight.has(entry.key)) {
          await engine._containPromptAdmission(entry);
        }
        return;
      }
      const executions = entry.executions ?? [];
      const lastExec = executions[executions.length - 1];

      // ── 超时检查 ──────────────────────────────────
      const timeoutMs = entry.timeoutMs ?? engineConfig.taskTimeoutMs;
      if (lastExec && Date.now() - new Date(lastExec.startedAt).getTime() > timeoutMs) {
        await engine.retryExecution(entry, "timeout");
        return;
      }

      // ── deadline 检查 ──────────────────────────────
      const effectiveDeadline = entry.deadline ?? engineConfig.defaultDeadline;
      if (entry._deadlinePending || (effectiveDeadline && matchCron(effectiveDeadline))) {
        // Claim this cancellation before the first await. A concurrent launch
        // continuation must fail its beforeGoal/afterGoal generation CAS.
        entry = upsertEntry(entry.key, {
          _deadlinePending: true,
          _goalPhase: "deadline-containment-attempt",
        });
        flushLedger();
        const cancelClaim = entry;
        const cancelled = entry.goalRef
          ? await runner.cancelTask(entry.sessionId, entry.goalRef)
          : await runner.cancelSession(entry.sessionId, {
              missingIsSuccess: entry._orphanCleanupPending !== true,
            });
        if (!engine._isCurrentEntry(cancelClaim)) return;
        entry = findByKey(entry.key);
        if (entry._goalAdmissionUncertain || entry._promptAdmissionUncertain) return;
        if (!cancelled) {
          upsertEntry(entry.key, { _deadlinePending: true });
          flushLedger();
          return;
        }
        await engine._settleExecution(
          entry,
          "stopped",
          `截止时间到达 (deadline: ${effectiveDeadline})`,
        );
        return;
      }

      // ── session 存活检查 ───────────────────────────
      const sessionId = entry.sessionId;
      if (!sessions.known) {
        await engine._recordUnreachable(entry, "unknown");
        return;
      }
      const sessionSummary = sessions.items.find(s => s.sessionId === sessionId);
      if (!sessionSummary) {
        // 连续缺席达到阈值后先尝试 wakeup；失败才重建会话。
        await engine._recordUnreachable(entry, "session-gone");
        return;
      }
      if (entry._orphanCleanupPending) {
        await engine.retryExecution(entry, "orphan-cleanup");
        return;
      }

      // ── session 活着 → 查 goal phase ───────────────
      const poll = await runner.pollTask(sessionId);
      if (disposed) return;
      const afterPoll = engine._currentRunOwner(entry);
      if (!afterPoll) return;
      entry = upsertEntry(entry.key, {
        _currentRound: poll.totalMessages ?? 0,
        _goalPhase: poll.phase,
        _lastActivityTime: poll.lastActivityTime ?? 0,
        ...(poll.goalRef ? { goalRef: poll.goalRef } : {}),
      });
      switch (poll.phase) {
        case "complete": {
          await engine._settleExecution(findByKey(entry.key) ?? entry, "done");
          break;
        }

        case "blocked": {
          const maxBlocked = entry.maxBlockedResumes ?? engineConfig.maxBlockedResumes;
          const blockedCount = entry.blockedResumes ?? 0;
          if (blockedCount < maxBlocked) {
            try {
              // CAS 必须使用本轮 projection 的 revision；账本 ref 可能已陈旧。
              const currentGoalRef = poll.goalRef ?? findByKey(entry.key)?.goalRef;
              if (!currentGoalRef) throw new Error("blocked goal projection has no ref");
              if (disposed || !await engine._hostAllowsDispatch()) break;
              const newRef = await runner.antiBlock(entry.sessionId, currentGoalRef);
              if (disposed) {
                await engine._containDisposedExecution(entry, entry.sessionId, newRef, entry.attempts ?? 1);
                break;
              }
              const afterAntiBlock = engine._currentRunOwner(entry);
              if (!afterAntiBlock) break;
              upsertEntry(afterAntiBlock.key, {
                blockedResumes: blockedCount + 1,
                goalRef: newRef,
                consecutiveUnknowns: 0,
              });
              flushLedger();
            } catch {
              await engine.retryExecution(findByKey(entry.key) ?? entry, "blocked");
            }
          } else {
            await engine._settleExecution(
              findByKey(entry.key) ?? entry,
              "failed",
              `超过最大反阻塞次数 (${maxBlocked})`,
            );
          }
          break;
        }

        case "active":
          if (sessionSummary.running === false) {
            await engine._recordDormant(findByKey(entry.key) ?? entry, poll.goalRef);
            break;
          }
          if (entry.consecutiveUnknowns > 0 || poll.goalRef) {
            upsertEntry(entry.key, {
              consecutiveUnknowns: 0,
              ...(poll.goalRef ? { goalRef: poll.goalRef } : {}),
            });
            flushLedger();
          }
          break;
        case "running":
          if (entry.consecutiveUnknowns > 0 || poll.goalRef) {
            upsertEntry(entry.key, {
              consecutiveUnknowns: 0,
              ...(poll.goalRef ? { goalRef: poll.goalRef } : {}),
            });
            flushLedger();
          }
          break;
        case "paused":
          // Restart/history convergence: a crash may occur after rc.2 accepted
          // goals.pause but before the foreground marker was flushed. Adopt the
          // authoritative paused revision, then ensure the current turn reaches
          // idle before any future resume.
          if (poll.goalRef) {
            const pausedEntry = upsertEntry(entry.key, {
              goalRef: poll.goalRef,
              _foregroundPausePending: false,
              _foregroundPaused: true,
              _foregroundCancelPending: sessionSummary.running !== false,
              _goalPhase: sessionSummary.running === false
                ? "foreground-paused"
                : "foreground-paused-cancel-pending",
            });
            flushLedger();
            await engine._yieldForForeground(pausedEntry, sessions);
          }
          break;

        case "unknown":
        default: {
          const reason = poll.errorCode === "session-not-found" ? "session-gone" : "unknown";
          await engine._recordUnreachable(findByKey(entry.key) ?? entry, reason);
          break;
        }
      }
    },

    // ─── 统一重试 ──────────────────────────────────

    /**
     * 统一重试入口：取消旧 session → 创建新 session
     * 所有重试（blocked / stalled / session-gone / timeout / unknown）都走这里
     * @param {object} entry - 当前任务条目
     * @param {string} reason - 重试原因
     */
    async retryExecution(entry, reason) {
      if (disposed || stopping.has(entry.key)) return false;
      const latest = findByKey(entry.key);
      if (!latest || latest.status !== "running" || latest.sessionId !== entry.sessionId) return false;
      entry = latest;
      if (entry._goalAdmissionUncertain) {
        if (!goalAdmissionsInFlight.has(entry.key)) {
          await engine._containGoalAdmission(entry);
        }
        return false;
      }
      if (entry._promptAdmissionUncertain) {
        if (!promptAdmissionsInFlight.has(entry.key)) {
          await engine._containPromptAdmission(entry);
        }
        return false;
      }
      // Foreground-paused work has a single continuation path: double-idle
      // confirmation followed by goals.resume. Never wake, rebuild, or retry it.
      if (entry._foregroundPausePending === true || entry._foregroundPaused === true) return false;
      // Claim the retry generation before the first external await. Besides
      // preserving the existing pre-admission CAS invariant, this ensures an
      // old launch cannot admit a goal while sessions.list decides whether the
      // Host foreground owns execution.
      entry = upsertEntry(entry.key, { _goalPhase: "retry-containment-attempt" });
      flushLedger();
      const hostSessions = await runner.listSessions();
      if (disposed) return false;
      if (hasActiveForeignSession(hostSessions)) {
        await engine._yieldForForeground(entry, hostSessions);
        return false;
      }

      // 只有确认从 session 列表消失时才推送 wakeup。成功时持久化
      // resume 返回的新 revision，失败才进入销毁/重建流程。
      if (reason === "session-gone" && entry.sessionId && entry.goalRef) {
        try {
          if (!await engine._hostAllowsDispatch()) return false;
          const newRef = await runner.wakeup(entry.sessionId, entry.goalRef);
          if (disposed) {
            await engine._containDisposedExecution(entry, entry.sessionId, newRef, entry.attempts ?? 1);
            return false;
          }
          const afterWakeup = engine._currentRunOwner(entry);
          if (!afterWakeup) return false;
          upsertEntry(afterWakeup.key, {
            goalRef: newRef,
            consecutiveUnknowns: 0,
            nextRetryAt: null,
            retryBackoffMs: 0,
          });
          flushLedger();
          return true;
        } catch {
          // wakeup failed, fall through to a bounded full retry
        }
      }

      // 1. Cancel old session. Never create a replacement while cancellation
      // is unconfirmed, otherwise two agents could mutate the same task.
      if (entry.sessionId) {
        const orphanCleanup = entry._orphanCleanupPending === true;
        // A timed-out sessions.create keeps running underneath Promise.race.
        // session-not-found therefore cannot prove that the chosen id will
        // never be published later. Keep the task quarantined and probe with a
        // capped backoff until cancellation positively succeeds; never launch
        // a replacement merely because a cleanup deadline elapsed.
        if (orphanCleanup && reason !== "orphan-cleanup" &&
            Date.now() < (entry._orphanCleanupDeadline ?? 0)) {
          return false;
        }
        // Claim cleanup synchronously. This protects the pre-admission window
        // where _launchPending is durable but beforeGoal has not run yet.
        entry = upsertEntry(entry.key, { _goalPhase: "cleanup-containment-attempt" });
        flushLedger();
        const cancelClaim = entry;
        const cancelled = entry.goalRef
          ? await runner.cancelTask(entry.sessionId, entry.goalRef)
          : await runner.cancelSession(entry.sessionId, { missingIsSuccess: !orphanCleanup });
        if (!engine._isCurrentEntry(cancelClaim)) return false;
        entry = findByKey(entry.key);
        if (entry._goalAdmissionUncertain || entry._promptAdmissionUncertain) return false;
        if (!cancelled) {
          if (orphanCleanup) {
            const attempts = (entry._orphanCleanupAttempts ?? 0) + 1;
            const baseDelay = Math.max(POLL_INTERVAL_MS, runner.rpcTimeoutMs);
            const nextDelay = Math.min(baseDelay * (2 ** Math.min(attempts - 1, 4)), 5 * 60_000);
            upsertEntry(entry.key, {
              _orphanCleanupAttempts: attempts,
              _orphanCleanupDeadline: Date.now() + nextDelay,
              _goalPhase: "cleanup-pending",
            });
            flushLedger();
          }
          return false;
        }
        const stillOwned = findByKey(entry.key);
        if (!stillOwned || !engine._isCurrentEntry(entry) ||
            stillOwned.status !== "running" || stillOwned.sessionId !== entry.sessionId) return false;
        entry = upsertEntry(entry.key, {
          _launchPending: false,
          _launchReservedAt: null,
          _orphanCleanupPending: false,
          _orphanCleanupDeadline: null,
          _orphanCleanupAttempts: 0,
        });
        if (entry._rateLimitPending) {
          engine._deferRateLimited(
            entry,
            entry._rateLimitAttemptBase ?? Math.max(0, (entry.attempts ?? 1) - 1),
            entry._rateLimitDelayMs ?? engine._retryDelay(entry),
          );
          flushLedger();
          return false;
        }
      }

      if (disposed) {
        writeTaskFile(entry.key, entry.raw ?? entry.body ?? "");
        upsertEntry(entry.key, {
          status: "pending",
          sessionId: null,
          goalRef: null,
          _launchPending: false,
          _launchReservedAt: null,
          _orphanCleanupPending: false,
          _orphanCleanupDeadline: null,
          _orphanCleanupAttempts: 0,
          _goalAdmissionUncertain: false,
          _goalContainmentConfirmed: null,
          _promptAdmissionUncertain: false,
          _promptContainmentConfirmed: null,
          _goalPhase: "disposed",
        });
        flushLedger();
        return false;
      }

      const retryError = `执行重试 (${reason})`;
      try { await runner.finalize(entry, "failed", retryError); } catch { /* keep state recovery moving */ }
      const afterFinalize = engine._currentRunOwner(entry);
      if (!afterFinalize) return false;
      entry = afterFinalize;
      if (disposed) {
        entry = engine._closeCurrentExecution(entry, "failed", "engine disposed during retry containment");
        writeTaskFile(entry.key, entry.raw ?? entry.body ?? "");
        upsertEntry(entry.key, {
          status: "pending",
          sessionId: null,
          goalRef: null,
          _launchPending: false,
          _launchReservedAt: null,
          _orphanCleanupPending: false,
          _orphanCleanupDeadline: null,
          _orphanCleanupAttempts: 0,
          _goalAdmissionUncertain: false,
          _goalContainmentConfirmed: null,
          _promptAdmissionUncertain: false,
          _promptContainmentConfirmed: null,
          _goalPhase: "disposed",
        });
        flushLedger();
        return false;
      }
      entry = engine._closeCurrentExecution(entry, "failed", retryError);
      flushLedger();

      // 2. 检查重试次数
      const maxAttempts = entry.maxAttempts ?? engineConfig.maxAttempts;
      if ((entry.attempts ?? 0) >= maxAttempts) {
        await engine._settleExecution(
          entry,
          "failed",
          `超过最大重试次数 (${maxAttempts}), 最后原因: ${reason}`,
        );
        return false;
      }

      if (!await engine._hostAllowsDispatch()) {
        writeTaskFile(entry.key, entry.raw ?? entry.body ?? "");
        upsertEntry(entry.key, {
          status: "pending",
          sessionId: null,
          goalRef: null,
          _launchPending: false,
          _launchReservedAt: null,
          _orphanCleanupPending: false,
          _orphanCleanupDeadline: null,
          _orphanCleanupAttempts: 0,
          _goalAdmissionUncertain: false,
          _goalContainmentConfirmed: null,
          _promptAdmissionUncertain: false,
          _promptContainmentConfirmed: null,
          _goalPhase: disposed ? "disposed" : "foreground-yield",
        });
        flushLedger();
        return false;
      }

      // 3. 每次 attempt 使用独立运行目录，避免覆盖上一轮报告。
      const attempts = (entry.attempts ?? 0) + 1;
      const workDir = engine._createAttemptWorkDir(entry.key, attempts);
      const previousBackoff = entry.retryBackoffMs ?? 0;
      const reservedSessionId = createAutoqueueSessionId();
      // Persist both the inbox source and exact remote id before launch. On a
      // crash, reconcile keeps this run quarantined instead of mapping it back
      // to a second pending agent.
      writeTaskFile(entry.key, entry.raw ?? entry.body ?? "");
      let launchEntry = upsertEntry(entry.key, {
        status: "running",
        workDir,
        sessionId: reservedSessionId,
        goalRef: null,
        workspace: null,
        model: null,
        agentPreset: engine.resolveMode(entry.body),
        attempts,
        maxGoalRounds: entry.maxGoalRounds ?? engineConfig.maxGoalRounds,
        blockedResumes: 0,
        consecutiveUnknowns: 0,
        nextRetryAt: null,
        _deadlinePending: false,
        _launchPending: true,
        _launchReservedAt: Date.now(),
        _orphanCleanupPending: true,
        _orphanCleanupDeadline: Date.now() + Math.max(POLL_INTERVAL_MS, runner.rpcTimeoutMs),
        _orphanCleanupAttempts: 0,
        _rateLimitPending: false,
        _rateLimitAttemptBase: null,
        _rateLimitDelayMs: null,
        _goalAdmissionUncertain: false,
        _goalContainmentConfirmed: null,
        _promptAdmissionUncertain: false,
        _promptContainmentConfirmed: null,
        _goalPhase: "launch-pending",
      });
      const execRecord = {
        id: crypto.randomUUID(),
        sessionId: reservedSessionId,
        attempt: attempts,
        startedAt: new Date().toISOString(),
        workDir,
      };
      flushLedger();

      try {
        const { sessionId, goalRef } = await runner.launch(launchEntry, {
          beforeGoal: async launchState => {
            if (disposed) {
              const lifecycleError = new Error("autoqueue engine disposed before retry goal admission");
              lifecycleError.code = "engine-disposed";
              throw lifecycleError;
            }
            if (!await engine._hostAllowsDispatch()) {
              const foregroundError = new Error("foreground session became active before retry goal admission");
              foregroundError.code = "foreground-active";
              throw foregroundError;
            }
            const current = engine._currentRunOwner(launchEntry);
            if (!engine._isCurrentEntry(launchEntry) || !current ||
                current.sessionId !== launchState.sessionId) {
              const ownershipError = new Error("任务在 retry goal 投递前已失去启动 ownership");
              ownershipError.code = "launch-owner-lost";
              throw ownershipError;
            }
            goalAdmissionsInFlight.add(entry.key);
            launchEntry = upsertEntry(entry.key, {
              sessionId: launchState.sessionId,
              goalRef: null,
              _goalAdmissionUncertain: true,
              _goalContainmentConfirmed: false,
              _promptAdmissionUncertain: false,
              _promptContainmentConfirmed: null,
              _goalPhase: "goal-admission-pending",
            });
            flushLedger();
          },
          afterGoal: async launchState => {
            const current = engine._currentRunOwner(launchEntry);
            if (!engine._isCurrentEntry(launchEntry) || !current ||
                current.sessionId !== launchState.sessionId) {
              const ownershipError = new Error("任务在 retry goal 入场后已失去启动 ownership");
              ownershipError.code = "launch-owner-lost";
              throw ownershipError;
            }
            launchEntry = upsertEntry(entry.key, {
              sessionId: launchState.sessionId,
              goalRef: launchState.goalRef,
              _goalAdmissionUncertain: false,
              _goalContainmentConfirmed: null,
              _promptAdmissionUncertain: false,
              _promptContainmentConfirmed: null,
              _goalPhase: "goal-admitted",
            });
            flushLedger();
            goalAdmissionsInFlight.delete(entry.key);
            if (disposed) {
              const lifecycleError = new Error("autoqueue engine disposed after retry goal admission");
              lifecycleError.code = "engine-disposed";
              throw lifecycleError;
            }
          },
        });
        execRecord.sessionId = sessionId;
        if (!engine._isCurrentEntry(launchEntry)) {
          goalAdmissionsInFlight.delete(entry.key);
          promptAdmissionsInFlight.delete(entry.key);
          return false;
        }
        launchEntry = upsertEntry(entry.key, {
          sessionId,
          goalRef,
          attempts,
          executions: [...(launchEntry.executions ?? []), execRecord],
          consecutiveUnknowns: 0,
          nextRetryAt: null,
          retryBackoffMs: 0,
          _launchPending: false,
          _launchReservedAt: null,
          _orphanCleanupPending: false,
          _orphanCleanupDeadline: null,
          _orphanCleanupAttempts: 0,
          _rateLimitPending: false,
          _rateLimitAttemptBase: null,
          _rateLimitDelayMs: null,
          _goalAdmissionUncertain: false,
          _goalContainmentConfirmed: null,
          _promptAdmissionUncertain: false,
          _promptContainmentConfirmed: null,
        });
        flushLedger();
        goalAdmissionsInFlight.delete(entry.key);
        promptAdmissionsInFlight.delete(entry.key);

        if (disposed) {
          await engine._containDisposedExecution(launchEntry, sessionId, goalRef, attempts - 1);
          return false;
        }

        const current = findByKey(entry.key);
        if (current && current.status !== "running") {
          const cancelled = await runner.cancelTask(sessionId, goalRef);
          if (!cancelled) {
            upsertEntry(entry.key, { status: "running", sessionId, goalRef });
          } else {
            engine._closeCurrentExecution(current, current.status === "stopped" ? "stopped" : "failed", "retry launch lost task ownership");
            upsertEntry(entry.key, { sessionId: null, goalRef: null });
          }
          flushLedger();
          return false;
        }
        removeTaskFile(entry.key);
        return true;
      } catch (err) {
        const rateLimit = rateLimitMetadata(err);
        const rateLimitDelay = rateLimit.limited ? engine._retryDelay(launchEntry, err) : null;
        const launchError = err instanceof SessionLaunchError && Boolean(err.sessionId);
        const goalUncertain = launchError && err.goalUncertain === true;
        const promptUncertain = launchError && err.promptUncertain === true;
        const admissionUncertain = goalUncertain || promptUncertain;
        const ownsLaunchGeneration = engine._isCurrentEntry(launchEntry);
        let cleanupFailed = false;
        if (launchError) {
          execRecord.sessionId = err.sessionId;
          const owner = ownsLaunchGeneration ? engine._currentRunOwner(launchEntry) : null;
          if (owner) {
            launchEntry = upsertEntry(entry.key, {
              sessionId: err.sessionId,
              goalRef: err.goalRef ?? owner.goalRef ?? null,
              _goalAdmissionUncertain: goalUncertain,
              _goalContainmentConfirmed: goalUncertain ? false : null,
              _promptAdmissionUncertain: promptUncertain,
              _promptContainmentConfirmed: promptUncertain ? false : null,
              _goalPhase: goalUncertain
                ? "goal-admission-uncertain"
                : (promptUncertain ? "prompt-admission-uncertain" : "cleanup-pending"),
            });
            flushLedger();
          }
          const cleaned = (err.goalRef || admissionUncertain)
            ? await runner.cancelLaunch(err.sessionId, err.goalRef, {
                missingIsSuccess: err.code !== "rpc-timeout" && !admissionUncertain,
              })
            : await runner.cancelSession(err.sessionId, {
                missingIsSuccess: err.code !== "rpc-timeout" && !admissionUncertain,
              });
          cleanupFailed = !cleaned;
        }
        goalAdmissionsInFlight.delete(entry.key);
        promptAdmissionsInFlight.delete(entry.key);
        if (!ownsLaunchGeneration) return false;
        if (!engine._isCurrentEntry(launchEntry)) return false;
        if (disposed && !admissionUncertain && !cleanupFailed) {
          writeTaskFile(entry.key, launchEntry.raw ?? launchEntry.body ?? "");
          upsertEntry(entry.key, {
            status: "pending",
            sessionId: null,
            goalRef: null,
            attempts: Math.max(0, attempts - 1),
            _launchPending: false,
            _launchReservedAt: null,
            _orphanCleanupPending: false,
            _orphanCleanupDeadline: null,
            _orphanCleanupAttempts: 0,
            _goalAdmissionUncertain: false,
            _goalContainmentConfirmed: null,
            _promptAdmissionUncertain: false,
            _promptContainmentConfirmed: null,
            _goalPhase: "disposed",
          });
          flushLedger();
          return false;
        }
        execRecord.endedAt = new Date().toISOString();
        execRecord.result = "failed";
        execRecord.error = `${err.message}${cleanupFailed ? "; orphan session cleanup failed" : ""}`;
        launchEntry = upsertEntry(entry.key, {
          sessionId: (cleanupFailed || admissionUncertain) ? execRecord.sessionId : null,
          goalRef: promptUncertain ? (err.goalRef ?? launchEntry.goalRef ?? null) : null,
          executions: [...(launchEntry.executions ?? []), execRecord],
        });
        try { await runner.finalize(launchEntry, "failed", execRecord.error); } catch { /* run dir may be unavailable */ }
        const afterFailureFinalize = engine._currentRunOwner(launchEntry);
        if (!afterFailureFinalize) return false;
        launchEntry = afterFailureFinalize;

        if (admissionUncertain) {
          upsertEntry(entry.key, {
            status: "running",
            sessionId: execRecord.sessionId,
            goalRef: err.goalRef ?? launchEntry.goalRef ?? null,
            consecutiveUnknowns: 0,
            _orphanCleanupPending: true,
            _orphanCleanupDeadline: null,
            _orphanCleanupAttempts: cleanupFailed ? 1 : 0,
            _launchPending: true,
            _rateLimitPending: false,
            _rateLimitAttemptBase: null,
            _rateLimitDelayMs: null,
            _goalAdmissionUncertain: goalUncertain,
            _goalContainmentConfirmed: goalUncertain ? !cleanupFailed : null,
            _promptAdmissionUncertain: promptUncertain,
            _promptContainmentConfirmed: promptUncertain ? !cleanupFailed : null,
            _goalPhase: goalUncertain
              ? "goal-admission-uncertain"
              : "prompt-admission-uncertain",
          });
          flushLedger();
          return false;
        }

        if (cleanupFailed) {
          upsertEntry(entry.key, {
            status: "running",
            sessionId: execRecord.sessionId,
            goalRef: err.goalRef ?? launchEntry.goalRef ?? null,
            consecutiveUnknowns: 0,
            _orphanCleanupPending: true,
            _orphanCleanupDeadline: Date.now() + Math.max(POLL_INTERVAL_MS, runner.rpcTimeoutMs),
            _orphanCleanupAttempts: 1,
            _launchPending: true,
            _rateLimitPending: rateLimit.limited,
            _rateLimitAttemptBase: rateLimit.limited ? (attempts - 1) : null,
            _rateLimitDelayMs: rateLimitDelay,
            _goalAdmissionUncertain: false,
            _goalContainmentConfirmed: null,
            _promptAdmissionUncertain: false,
            _promptContainmentConfirmed: null,
            _goalPhase: "cleanup-pending",
          });
          flushLedger();
          return false;
        }

        if (rateLimit.limited) {
          engine._deferRateLimited(launchEntry, attempts - 1, rateLimitDelay);
          flushLedger();
          return false;
        }

        if (attempts >= (launchEntry.maxAttempts ?? engineConfig.maxAttempts)) {
          const webhookEntry = { ...launchEntry, status: "failed" };
          if (launchEntry.cron) {
            engine._rescheduleCron(launchEntry);
          } else {
            const terminal = upsertEntry(entry.key, {
              status: "failed",
              sessionId: null,
              goalRef: null,
              _launchPending: false,
              _launchReservedAt: null,
              _orphanCleanupPending: false,
              _orphanCleanupDeadline: null,
              _orphanCleanupAttempts: 0,
              _goalAdmissionUncertain: false,
              _goalContainmentConfirmed: null,
              _promptAdmissionUncertain: false,
              _promptContainmentConfirmed: null,
            });
            removeTaskFile(entry.key);
            await engine.archiveIfEnabled(terminal);
          }
          flushLedger();
          await engine.callWebhook(webhookEntry, "failed", execRecord.error, "failed");
          return false;
        }

        const nextDelay = engine._retryDelay({ ...launchEntry, retryBackoffMs: previousBackoff });
        writeTaskFile(entry.key, launchEntry.raw ?? launchEntry.body ?? "");
        upsertEntry(entry.key, {
          status: "pending",
          sessionId: null,
          goalRef: null,
          retryBackoffMs: nextDelay,
          nextRetryAt: Date.now() + nextDelay,
          _launchPending: false,
          _launchReservedAt: null,
          _orphanCleanupPending: false,
          _orphanCleanupDeadline: null,
          _orphanCleanupAttempts: 0,
          _goalAdmissionUncertain: false,
          _goalContainmentConfirmed: null,
          _promptAdmissionUncertain: false,
          _promptContainmentConfirmed: null,
        });
        flushLedger();
        return false;
      }
    },

    // ─── 任务操作 ──────────────────────────────────────

    async stopTask(key) {
      if (stopping.has(key)) return { ok: false, error: "任务正在停止，请稍后重试" };
      stopping.add(key);
      try {
        let entry = findByKey(key);
        if (!entry) return { ok: false, error: "任务不存在" };
        if (entry.status === "stopped" || entry.status === "done") return { ok: false, error: "任务已终止" };
        if (entry._goalAdmissionUncertain) {
          if (goalAdmissionsInFlight.has(key)) {
            return { ok: false, error: "goal 正在投递，请等待投递结果后重试停止" };
          }
          await engine._containGoalAdmission(entry);
          return {
            ok: false,
            error: "goal 投递结果不确定，任务已永久隔离；停止不会释放 ownership 或启动 replacement",
          };
        }
        if (entry._promptAdmissionUncertain) {
          if (promptAdmissionsInFlight.has(key)) {
            return { ok: false, error: "prompt 正在投递，请等待投递结果后重试停止" };
          }
          await engine._containPromptAdmission(entry);
          return {
            ok: false,
            error: "prompt 投递结果不确定，任务已永久隔离；停止不会释放 ownership 或启动 replacement",
          };
        }
        if (entry.status === "running" && !entry.sessionId) {
          return { ok: false, error: "任务正在启动，请稍后重试停止" };
        }
        if (entry.sessionId) {
          entry = upsertEntry(key, { _goalPhase: "stop-containment-attempt" });
          flushLedger();
          const cancelClaim = entry;
          const cancelled = entry.goalRef
            ? await runner.cancelTask(entry.sessionId, entry.goalRef)
            : await runner.cancelSession(entry.sessionId, {
              missingIsSuccess: entry._orphanCleanupPending !== true,
            });
          if (!engine._isCurrentEntry(cancelClaim)) {
            return { ok: false, error: "停止期间任务状态已变化，请刷新后重试" };
          }
          entry = findByKey(key);
          if (entry._goalAdmissionUncertain || entry._promptAdmissionUncertain) {
            return { ok: false, error: "停止期间检测到 admission 隔离，未释放任务 ownership" };
          }
          if (!cancelled) {
            return { ok: false, error: "停止失败：DSH 会话取消失败，请重试" };
          }
          const stillOwned = findByKey(key);
          if (!stillOwned || !engine._isCurrentEntry(entry) ||
              stillOwned.status !== "running" || stillOwned.sessionId !== entry.sessionId) {
            return { ok: false, error: "任务状态已变化，请刷新后重试" };
          }
          entry = stillOwned;
        }
        if (entry.workDir) {
          try { await runner.finalize(entry, "stopped", "用户手动停止"); } catch { /* state transition still succeeds */ }
          const latest = findByKey(key);
          const afterFinalize = entry.status === "running"
            ? (latest?.status === "running" && latest.sessionId === entry.sessionId ? latest : null)
            : (latest === entry ? entry : null);
          if (!afterFinalize) {
            return { ok: false, error: "停止结算期间任务状态已变化，请刷新后重试" };
          }
          entry = afterFinalize;
        }
        entry = engine._closeCurrentExecution(entry, "stopped", "用户手动停止");
        removeTaskFile(key);
        upsertEntry(key, {
          status: "stopped",
          sessionId: null,
          goalRef: null,
          _launchPending: false,
          _launchReservedAt: null,
          _orphanCleanupPending: false,
          _orphanCleanupDeadline: null,
          _orphanCleanupAttempts: 0,
          _rateLimitPending: false,
          _rateLimitAttemptBase: null,
          _rateLimitDelayMs: null,
          _goalAdmissionUncertain: false,
          _goalContainmentConfirmed: null,
          _promptAdmissionUncertain: false,
          _promptContainmentConfirmed: null,
        });
        flushLedger();
        await engine.callWebhook({ ...entry, status: "stopped" }, "stopped", "用户手动停止", "stopped");
        return { ok: true };
      } finally {
        stopping.delete(key);
      }
    },

    async archiveTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.status === "running") return { ok: false, error: "运行中的任务不能归档" };
      if (entry.archivedAt) return { ok: false, error: "任务已归档" };
      // 同步归档 DSH 会话
      const archived = await runner.archiveSessions(entry);
      if (!archived) return { ok: false, error: "归档失败：至少一个 DSH 会话未归档，请重试" };
      if (!engine._isCurrentEntry(entry)) {
        return { ok: false, error: "归档期间任务状态已变化，请刷新后重试" };
      }
      removeTaskFile(key);
      upsertEntry(key, { archivedAt: new Date().toISOString() });
      flushLedger();
      return { ok: true };
    },

    /** 批量归档 */
    async archiveTasks(keys) {
      const results = [];
      for (const k of keys) {
        const entry = findByKey(k);
        if (!entry) { results.push({ key: k, ok: false, error: "任务不存在" }); continue; }
        if (entry.status === "running") { results.push({ key: k, ok: false, error: "运行中" }); continue; }
        if (entry.archivedAt) { results.push({ key: k, ok: true }); continue; }
        const archived = await runner.archiveSessions(entry);
        if (!archived) { results.push({ key: k, ok: false, error: "DSH 会话归档失败" }); continue; }
        if (!engine._isCurrentEntry(entry)) {
          results.push({ key: k, ok: false, error: "归档期间任务状态已变化" });
          continue;
        }
        removeTaskFile(k);
        upsertEntry(k, { archivedAt: new Date().toISOString() });
        results.push({ key: k, ok: true });
      }
      flushLedger();
      const allOk = results.every(r => r.ok);
      return { ok: allOk, results };
    },

    async restoreTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (!entry.archivedAt) return { ok: false, error: "任务未归档" };
      if (entry.status === "pending") {
        // pending 归档会移除 inbox 文件；恢复时必须重建，否则永远不会派发。
        writeTaskFile(key, entry.raw ?? entry.body ?? "");
      }
      upsertEntry(key, { archivedAt: null });
      flushLedger();
      if (entry.status === "pending") await engine.scanPending();
      return { ok: true };
    },

    deleteTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.status !== "pending") return { ok: false, error: "只能删除待执行的任务，已执行的任务请使用归档" };
      removeTaskFile(key);
      removeEntry(key);
      flushLedger();
      return { ok: true };
    },

    updateTask(key, patch) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.archivedAt) return { ok: false, error: "已归档任务不能修改，请先恢复" };
      if (entry.status !== "pending") return { ok: false, error: "只能修改待执行任务" };
      if (patch.schedule && patch.cron) return { ok: false, error: "schedule 和 cron 不能同时设置" };
      try {
        assertNoIsolationOverrides(patch);
      } catch (err) {
        return { ok: false, error: err.message, code: err.code };
      }

      const updates = {};

      // 统一计算 raw 文件内容，避免重复写盘
      const newContent = patch.content !== undefined ? patch.content : entry.body;
      let newSchedule = patch.schedule !== undefined ? patch.schedule : entry.schedule;
      let newCron = patch.cron !== undefined ? patch.cron : entry.cron;
      const newDeadline = patch.deadline !== undefined ? patch.deadline : entry.deadline;

      // 调度模式互斥：切到 schedule 时清旧 cron，反之亦然。
      if (patch.schedule) newCron = null;
      if (patch.cron) newSchedule = null;

      if (patch.content !== undefined) updates.body = patch.content;
      if (patch.schedule !== undefined || (patch.cron && entry.schedule)) updates.schedule = newSchedule || null;
      if (patch.cron !== undefined || (patch.schedule && entry.cron)) updates.cron = newCron || null;
      if (patch.deadline !== undefined) updates.deadline = patch.deadline;

      const raw = buildFileContent(newContent, newSchedule, newCron, newDeadline);
      updates.raw = raw;
      if (patch.maxGoalRounds !== undefined) updates.maxGoalRounds = patch.maxGoalRounds;
      if (patch.maxBlockedResumes !== undefined) updates.maxBlockedResumes = patch.maxBlockedResumes;
      if (patch.timeoutMs !== undefined) updates.timeoutMs = patch.timeoutMs;
      if (patch.priority !== undefined) updates.priority = Math.max(1, Math.min(10, parseInt(patch.priority, 10)));
      if (patch.webhook !== undefined) updates.webhook = patch.webhook;
      if (patch.workspace !== undefined) updates.workspace = null;
      if (patch.model !== undefined) updates.model = null;
      if (patch.agentPreset !== undefined) updates.agentPreset = null;
      if (patch.autoArchive !== undefined) updates.autoArchive = !!patch.autoArchive;
      if (patch.enableNotifications !== undefined) updates.enableNotifications = !!patch.enableNotifications;
      if (patch.maxAttempts !== undefined) updates.maxAttempts = patch.maxAttempts;

      const previousRaw = entry.raw ?? buildFileContent(
        entry.body ?? "",
        entry.schedule,
        entry.cron,
        entry.deadline,
      );
      writeTaskFile(key, raw);
      try {
        upsertEntry(key, updates);
      } catch (err) {
        // Restore the old inbox source if a ledger quota/schema check rejects
        // the update after its atomic file write.
        try { writeTaskFile(key, previousRaw); } catch { /* surface original ledger error */ }
        throw err;
      }
      flushLedger();
      return { ok: true, key };
    },

    // ─── 生命周期 ──────────────────────────────────────

    /** 启动轮询定时器 */
    startPolling(timer) {
      return timer.interval(() => {
        if (disposed) return;
        engine.pollRunning().catch(err => {
          console.error("[autoqueue] pollRunning 失败:", err.message);
        });
      }, POLL_INTERVAL_MS);
    },

    /** 启动收件箱扫描定时器 */
    startScanning(timer, intervalMs = 15_000) {
      return timer.interval(() => {
        if (disposed) return;
        engine.scanPending().catch(err => {
          console.error("[autoqueue] scanPending 失败:", err.message);
        });
      }, intervalMs);
    },

    // ─── 任务详情 ──────────────────────────────────────

    getTaskDetail(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };

      const detail = {
        key: entry.key,
        status: entry.status,
        workDir: entry.workDir,
        sessionId: entry.sessionId,
        goalRef: entry.goalRef,
        attempts: entry.attempts,
        blockedResumes: entry.blockedResumes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        archivedAt: entry.archivedAt,
        body: entry.body ?? "",
        schedule: entry.schedule,
        cron: entry.cron,
        deadline: entry.deadline,
        maxGoalRounds: entry.maxGoalRounds,
        maxBlockedResumes: entry.maxBlockedResumes,
        timeoutMs: entry.timeoutMs,
        priority: entry.priority,
        webhook: entry.webhook,
        workspace: entry.workspace,
        agentPreset: entry.agentPreset,
        model: entry.model,
        autoArchive: entry.autoArchive,
        enableNotifications: entry.enableNotifications,
        maxAttempts: entry.maxAttempts,
        foregroundPaused: entry._foregroundPaused === true,
        executions: entry.executions ?? [],
        reports: {},
      };

      // 读取运行目录的报告
      if (entry.workDir) {
        for (const [field, fileName] of [
          ["goal", ".目标.md"],
          ["result", ".结果.md"],
          ["report", "执行报告.md"],
        ]) {
          try {
            detail.reports[field] = safeReadReportFile(entry.workDir, fileName);
          } catch { /* 单个缺失/不安全报告不影响其他报告 */ }
        }
      }

      return { ok: true, task: detail };
    },
  };

  return engine;
}

// ─── key 自动生成辅助 ──────────────────────────────────

/**
 * 计算 cron 表达式下一次触发时间
 * @param {string} expr - 5 字段 cron 表达式
 * @returns {string|null} ISO 时间字符串
 */
let cronNextCacheMinute = -1;
const cronNextCache = new Map();

function getNextCronTime(expr) {
  if (!expr || !expr.trim()) return null;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const now = new Date();
  const minuteBucket = Math.floor(now.getTime() / 60_000);
  if (cronNextCacheMinute !== minuteBucket) {
    cronNextCacheMinute = minuteBucket;
    cronNextCache.clear();
  }
  if (cronNextCache.has(expr)) return cronNextCache.get(expr);

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
    cronNextCache.set(expr, null);
    return null;
  }

  // Walk calendar days, then only the explicitly admissible hour/minute
  // combinations. A full Gregorian leap window keeps Feb 29 schedules
  // discoverable while impossible dates cost ~1,466 cheap day checks rather
  // than millions of minute-by-minute iterations.
  const afterNow = now.getTime();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
        if (candidate.getTime() <= afterNow || !matchCron(expr, candidate)) continue;
        const result = candidate.toISOString();
        cronNextCache.set(expr, result);
        return result;
      }
    }
  }
  cronNextCache.set(expr, null);
  return null;
}

function matchCronField(field, value) {
  if (field === "*") return true;
  if (field.includes(",")) return field.split(",").some(f => matchCronField(f.trim(), value));
  if (field.startsWith("*/")) { const step = parseInt(field.slice(2), 10); return step > 0 && value % step === 0; }
  if (field.includes("-")) { const [lo, hi] = field.split("-").map(Number); return value >= lo && value <= hi; }
  return parseInt(field, 10) === value;
}

/**
 * 紧凑时间戳 YYYYMMDD-HHmmss
 * @returns {string}
 */
function formatTimestamp() {
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
function buildFileContent(content, schedule, cron, deadline) {
  let fc = content;
  if (schedule) fc = `<!-- schedule: ${schedule} -->\n${fc}`;
  if (cron) fc = `<!-- cron: ${cron} -->\n${fc}`;
  if (deadline) fc = `<!-- deadline: ${deadline} -->\n${fc}`;
  return fc;
}

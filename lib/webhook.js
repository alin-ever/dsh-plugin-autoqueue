/**
 * Webhook/DNS/IP 工具 — 对齐 task-board host-routes.ts 的 webhook 安全模式
 * 包含 DNS 解析、IP 安全检测、SSRF 防护、webhook 发送
 * @module autoqueue/webhook
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { releaseRequest, flushLedger } from "./ledger.js";

const WEBHOOK_TIMEOUT_MS = 10_000;
const DNS_TIMEOUT_MS = 5_000;
const MAX_WEBHOOK_RESPONSE_BYTES = 64 * 1024;

// ─── 超时工具 ──────────────────────────────────────────

/**
 * Race a promise with a wall-clock timeout.
 * @param {Promise} promise
 * @param {number} timeoutMs
 * @param {string} label
 * @returns {Promise}
 */
export async function withDeadline(promise, timeoutMs, label) {
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

// ─── IP 解析 ───────────────────────────────────────────

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

// ─── IP 安全检测 ───────────────────────────────────────

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

/**
 * Reject non-public IP addresses, including IPv4/IPv6 private ranges,
 * loopback, link-local, multicast, ULA, and IPv6 transition mechanisms
 * that can smuggle private IPv4 destinations.
 * @param {string} address
 * @returns {boolean}
 */
export function isUnsafeIp(address) {
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

// ─── Webhook 发送 ──────────────────────────────────────

/**
 * Resolve a webhook URL to a public IP address, rejecting private/internal
 * targets. This prevents SSRF and DNS rebinding attacks.
 * @param {string} rawUrl
 * @returns {Promise<{url: URL, address: string, family: number}>}
 */
export async function resolvePublicWebhookUrl(rawUrl) {
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
 * @param {{url: URL, address: string, family: number}} target
 * @param {string} body
 * @returns {Promise<boolean>}
 */
export function postPinnedWebhook(target, body) {
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

// ─── 释放失败的请求 ────────────────────────────────────

/**
 * Release a request reservation and flush the ledger.
 * Used when a dispatch request fails before goal admission.
 * @param {string} requestId
 */
export function releaseFailedRequest(requestId) {
  if (!requestId) return;
  releaseRequest(requestId);
  try { flushLedger(); } catch { /* preserve the original operation failure */ }
}

// ─── 速率限制元数据 ────────────────────────────────────

/**
 * Extract rate-limit metadata from a Host API error.
 * @param {Error} error
 * @returns {{ limited: boolean, providerRetryAfterMs: number }}
 */
export function rateLimitMetadata(error) {
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

// ─── 执行记录合并 ──────────────────────────────────────

/**
 * Merge an execution record into an array, matching by id.
 * Updates the existing record if found, otherwise appends.
 * @param {Array} executions
 * @param {object} record
 * @returns {Array}
 */
export function mergeExecutionRecord(executions, record) {
  const next = [...(executions ?? [])];
  const index = next.findIndex(candidate => candidate?.id === record.id);
  if (index >= 0) next[index] = { ...next[index], ...record };
  else next.push(record);
  return next;
}
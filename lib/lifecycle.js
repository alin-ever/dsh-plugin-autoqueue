/**
 * 生命周期 — 怎么执行
 * 派发/重试/反阻塞/结算/正文更新
 * 参考 Temporal Workflow + Activity 模式
 * @module autoqueue/lifecycle
 */

import { createAutoqueueSessionId } from "./runner.js";
import { createRunDir } from "./files.js";
import { transition, entryActions, exitActions } from "./state-machine.js";
import crypto from "node:crypto";

// ─── 常量 ──────────────────────────────────────────────

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_BASE_MS = 30_000;
const RETRY_BACKOFF_MAX_MS = 300_000;
const MAX_PROVIDER_RETRY_AFTER_MS = 24 * 60 * 60 * 1000;

// ─── 限流检测 ──────────────────────────────────────────

function rateLimitMetadata(error) {
  const candidates = [error, error?.details, error?.cause, error?.cause?.details].filter(Boolean);
  const code = candidates.map(c => c?.code).find(v => typeof v === "string");
  const status = candidates.map(c => c?.statusCode ?? c?.status).map(Number).find(Number.isFinite);
  const providerRetryAfterMs = candidates.map(c => c?.providerRetryAfterMs).map(Number)
    .find(v => Number.isFinite(v) && v >= 0);
  return {
    limited: code?.toUpperCase() === "RATE_LIMIT" || status === 429,
    providerRetryAfterMs: providerRetryAfterMs ?? 0,
  };
}

// ─── 重试退避 ──────────────────────────────────────────

function retryDelay(entry, error) {
  const currentBackoff = entry.retryBackoffMs ?? 0;
  const exponential = currentBackoff === 0
    ? RETRY_BACKOFF_BASE_MS
    : Math.min(currentBackoff * 2, RETRY_BACKOFF_MAX_MS);
  const { providerRetryAfterMs } = rateLimitMetadata(error);
  return Math.min(
    MAX_PROVIDER_RETRY_AFTER_MS,
    Math.max(exponential, providerRetryAfterMs),
  );
}

// ─── 创建生命周期管理器 ────────────────────────────────

/**
 * @param {object} runner - DSH RPC 调用层
 * @param {object} stateMachine - 状态机
 * @param {object} scheduler - 调度器
 * @param {object} [options]
 * @param {number} [options.maxGoalRounds]
 * @param {number} [options.taskTimeoutMs]
 * @param {number} [options.maxAttempts]
 */
export function createLifecycle(runner, stateMachine, scheduler, options = {}) {
  const maxGoalRounds = options.maxGoalRounds ?? 40;
  const taskTimeoutMs = options.taskTimeoutMs ?? 180 * 60 * 1000;
  const maxAttempts = options.maxAttempts ?? 3;

  /**
   * 派发任务：创建 session + goal
   * @param {object} entry - 任务条目
   * @param {object} task - 任务文件信息
   * @param {Function} [onBeforeGoal] - goal 创建前的回调
   * @param {Function} [onAfterGoal] - goal 创建后的回调
   * @returns {Promise<{sessionId: string, goalRef: object, phase: object}|{error: string, phase: object}>}
   */
  async function dispatch(entry, task, onBeforeGoal, onAfterGoal) {
    try {
      // 1. 创建 workDir 和 sessionId
      const workDir = createWorkDir(entry.key, entry.attempts + 1);
      const sessionId = createAutoqueueSessionId();

      // 2. 持久化 running 状态
      const phase = { execution: "dispatching", cancellation: null };
      const entryPatch = {
        status: "running",
        workDir,
        sessionId,
        phase,
        attempts: entry.attempts + 1,
        _launchPending: true,
      };

      // 3. 调用 runner.launch
      const result = await runner.launch({
        key: entry.key,
        body: task.body ?? entry.body,
        workDir,
        sessionId,
        agentPreset: entry.agentPreset,
        maxGoalRounds: entry.maxGoalRounds ?? maxGoalRounds,
      }, {
        beforeGoal: async (state) => {
          // 持久化 admission marker
          if (onBeforeGoal) await onBeforeGoal(state, entryPatch);
        },
        afterGoal: async (state) => {
          if (onAfterGoal) await onAfterGoal(state);
        },
      });

      // 4. 成功
      const activePhase = { execution: "active", cancellation: null };
      return {
        sessionId: result.sessionId,
        goalRef: result.goalRef,
        phase: activePhase,
        patch: {
          phase: activePhase,
          sessionId: result.sessionId,
          goalRef: result.goalRef,
          _launchPending: false,
          _admissionUncertain: false,
        },
      };
    } catch (err) {
      // 处理启动失败
      const rateLimit = rateLimitMetadata(err);
      if (rateLimit.limited) {
        return {
          error: "rate-limited",
          phase: { execution: "idle", cancellation: null },
          patch: { retryBackoffMs: retryDelay(entry, err), nextRetryAt: Date.now() + retryDelay(entry, err) },
        };
      }

      // 明确失败 → 可重试
      return {
        error: err.message,
        phase: { execution: "idle", cancellation: null },
        patch: { retryBackoffMs: retryDelay(entry, err), nextRetryAt: Date.now() + retryDelay(entry, err) },
      };
    }
  }

  /**
   * 处理阻塞：注入 steering + resume goal
   * @param {object} entry
   * @returns {Promise<{ok: boolean, phase: object, goalRef?: object}>}
   */
  async function antiBlock(entry) {
    try {
      if (!entry.sessionId || !entry.goalRef) {
        return { ok: false, phase: entry.phase, error: "no session or goal ref" };
      }
      const newRef = await runner.antiBlock(entry.sessionId, entry.goalRef);
      const activePhase = { execution: "active", cancellation: null };
      return {
        ok: true,
        phase: activePhase,
        goalRef: newRef,
        patch: {
          phase: activePhase,
          goalRef: newRef,
          blockedResumes: (entry.blockedResumes ?? 0) + 1,
        },
      };
    } catch (err) {
      return { ok: false, phase: entry.phase, error: err.message };
    }
  }

  /**
   * 结算任务
   * @param {object} entry
   * @param {"done"|"failed"|"stopped"} status
   * @param {string} [error]
   * @param {object} [options]
   * @param {string} [options.output] - agent 的最后输出
   * @param {boolean} [options.taskComplete] - 循环任务是否完成
   * @returns {Promise<{patch: object}>}
   */
  async function settle(entry, status, error, options = {}) {
    const patch = {
      status,
      sessionId: null,
      goalRef: null,
      phase: { execution: "idle", cancellation: null },
      consecutiveUnknowns: 0,
      _goalPhase: status,
    };

    // 写结果文件
    try {
      if (entry.workDir) {
        await runner.finalize(entry, status, error, options.output);
      }
    } catch { /* best effort */ }

    // 处理循环任务的正文更新
    if (entry.cron) {
      if (options.taskComplete) {
        // agent 说任务已完成 → terminal
        patch.cron = null;
        patch.nextRunAt = null;
      } else {
        // 继续调度
        const nextRunAt = scheduler.calculateNextRun(entry);
        patch.nextRunAt = nextRunAt ?? 0;
        patch.status = "pending";

        // 更新任务正文（追加本次执行摘要）
        if (entry.raw && options.output) {
          const summary = extractSummary(options.output);
          if (summary) {
            const updatedBody = appendToTaskBody(entry.raw, summary);
            patch.raw = updatedBody;
            patch.body = updatedBody;
          }
        }
      }
    }

    return { patch };
  }

  /**
   * 处理重试
   * @param {object} entry
   * @param {string} reason
   * @param {object} [options]
   * @param {boolean} [options.cancellationConfirmed]
   * @returns {{patch: object, shouldRetry: boolean}}
   */
  function retry(entry, reason, options = {}) {
    const attempts = entry.attempts ?? 0;
    const maxAttempt = entry.maxAttempts ?? maxAttempts;

    if (attempts >= maxAttempt) {
      // 达到最大重试次数
      return {
        shouldRetry: false,
        patch: {
          status: "failed",
          sessionId: null,
          goalRef: null,
          phase: { execution: "idle", cancellation: null },
          _goalPhase: "failed",
        },
      };
    }

    // 可以重试：回退到 pending，带退避
    const delay = retryDelay(entry);
    return {
      shouldRetry: true,
      patch: {
        status: "pending",
        sessionId: null,
        goalRef: null,
        phase: { execution: "idle", cancellation: null },
        retryBackoffMs: delay,
        nextRetryAt: Date.now() + delay,
        consecutiveUnknowns: 0,
      },
    };
  }

  /**
   * 处理 session 不可达
   * @param {object} entry
   * @param {"unknown"|"session-gone"} reason
   * @returns {{patch: object, shouldRetry: boolean}}
   */
  function handleUnreachable(entry, reason) {
    const count = (entry.consecutiveUnknowns ?? 0) + 1;
    const threshold = entry.unknownThreshold ?? 3;

    if (count < threshold) {
      return {
        shouldRetry: false,
        patch: { consecutiveUnknowns: count, phase: { ...entry.phase, execution: "active" } },
      };
    }

    // 达到阈值，走重试
    return retry(entry, reason);
  }

  /**
   * 检查是否超时
   * @param {object} entry
   * @returns {boolean}
   */
  function isTimeout(entry) {
    const timeout = entry.timeoutMs ?? taskTimeoutMs;
    const lastExec = entry.executions?.[entry.executions.length - 1];
    if (!lastExec?.startedAt) return false;
    return Date.now() - new Date(lastExec.startedAt).getTime() > timeout;
  }

  return {
    dispatch,
    antiBlock,
    settle,
    retry,
    handleUnreachable,
    isTimeout,
  };
}

// ─── 辅助函数 ──────────────────────────────────────────

/**
 * 创建 workDir
 * @param {string} key
 * @param {number} attempt
 * @returns {string}
 */
function createWorkDir(key, attempt) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const attemptSuffix = `-a${attempt}-${suffix}`;
  const base = key.slice(0, Math.max(1, 200 - attemptSuffix.length));
  return createRunDir(`${base}${attemptSuffix}`);
}

/**
 * 从 agent 输出中提取执行摘要
 * @param {string} output
 * @returns {string|null}
 */
function extractSummary(output) {
  if (!output || !output.trim()) return null;
  // 取前 500 字符作为摘要
  return output.trim().slice(0, 500);
}

/**
 * 在任务正文中追加执行摘要
 * @param {string} rawBody
 * @param {string} summary
 * @returns {string}
 */
function appendToTaskBody(rawBody, summary) {
  const now = new Date().toISOString();
  const entry = `\n\n---\n**上次执行 (${now})**\n${summary}`;
  return rawBody + entry;
}


/**
 * 会话守护 — 用户显式托管后的普通会话自动守护
 * 不操作 autoqueue-session-*，不写 ledger，不持久化。
 * 干预策略比普通任务更宽松、更温和。
 * @module autoqueue/session-guard
 */

import {
  extractFailureFacts,
  extractToolCalls,
  extractAssistantMessages,
  SessionTracker,
} from "./task-intelligence.js";
import { logger } from "./logger.js";

const DEFAULT_POLL_INTERVAL_MS = 10_000;
const DEFAULT_BLOCKED_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_MAX_BLOCKED_RESUMES = 2;
const NUDGE_COOLDOWN_MS = 60_000;

// 普通会话的空转检测阈值更宽松
const NORMAL_SESSION_TRACKER_OPTS = {
  toolRepeatThreshold: 6,
  textRepeatThreshold: 6,
  shortCountThreshold: 12,
};

function buildUserMessage(text) {
  return {
    content: [{ type: "text", text }],
    source: { kind: "plugin", plugin: "autoqueue", form: "notice", summary: "session-guard" },
  };
}

function assertNormalSession(sessionId) {
  if (typeof sessionId !== "string" || !sessionId) {
    const err = new Error("无效的 session ID");
    err.code = "invalid-session-id";
    throw err;
  }
  if (sessionId.startsWith("autoqueue-session-")) {
    const err = new Error("不能守护 autoqueue 自有会话");
    err.code = "session-owned-by-autoqueue";
    throw err;
  }
}

function resolveGoalRef(goal) {
  if (goal?.id && Number.isInteger(goal?.revision)) {
    return { id: goal.id, revision: goal.revision };
  }
  return null;
}

/**
 * 创建 SessionGuard 实例
 * @param {object} services - DSH 服务对象 { agents, goals, sessionProjections }
 * @param {object} [options]
 */
export function createSessionGuard(services, options = {}) {
  const { agents, goals, sessionProjections } = services;

  const guarded = new Map(); // sessionId -> { config, state, tracker }
  let disposed = false;
  let pollScheduled = false;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  function getAgent(sessionId) {
    try {
      return agents.get(sessionId);
    } catch (err) {
      const wrapped = new Error(`会话 ${sessionId} 不存在: ${err?.message || "未知错误"}`);
      wrapped.code = "session-not-found";
      throw wrapped;
    }
  }

  async function pollOne(sessionId, entry) {
    if (disposed) return;

    let agent;
    try {
      agent = getAgent(sessionId);
    } catch {
      // session 已终止，自动释放
      guarded.delete(sessionId);
      logger.info(`[session-guard] ${sessionId} 已终止，自动释放守护`);
      return;
    }

    const projection = sessionProjections.snapshot(agent.session, ["goal"]);
    const goalProjection = projection.values?.goal;
    const goal = goalProjection?.goal;
    const phase = goal?.phase || "unknown";
    const goalRef = resolveGoalRef(goal);

    const historyEvents = Array.isArray(agent.session.log) ? agent.session.log : [];
    const now = Date.now();

    // 更新空转追踪器
    if (entry.config.enableSpinDetection) {
      const toolCalls = extractToolCalls(historyEvents);
      const assistantMessages = extractAssistantMessages(historyEvents);
      entry.tracker.feed(toolCalls, assistantMessages);
    }
    const loop = entry.tracker.checkLoop();

    // ─── blocked 超时处理 ──────────────────────────────
    if (phase === "blocked" && entry.config.enableAntiBlock) {
      if (!entry.state.blockedAt) {
        entry.state.blockedAt = now;
      } else if (now - entry.state.blockedAt > entry.config.blockedTimeoutMs) {
        if (entry.state.blockedResumes < entry.config.maxBlockedResumes && goalRef) {
          try {
            await goals.resume(agent, goalRef);
            entry.state.blockedResumes++;
            entry.state.blockedAt = now; // 重置计时
            logger.info(`[session-guard] ${sessionId} blocked 超时，已自动 resume（第 ${entry.state.blockedResumes} 次）`);
          } catch (err) {
            logger.warn(`[session-guard] ${sessionId} resume 失败:`, err.message);
          }
        } else if (entry.state.blockedResumes >= entry.config.maxBlockedResumes) {
          // 超过上限，温和通知用户
          try {
            await agent.steer(buildUserMessage(
              `[SYSTEM — 会话守护通知]\n\n当前会话已多次尝试自动恢复但仍处于阻塞状态。您可能需要手动检查或重新描述需求。`
            ));
            logger.info(`[session-guard] ${sessionId} 反阻塞次数已达上限，已通知用户`);
          } catch { /* best effort */ }
          // 重置计数，避免反复通知
          entry.state.blockedResumes = 0;
          entry.state.blockedAt = now;
        }
      }
    } else {
      entry.state.blockedAt = null;
      if (phase !== "blocked") entry.state.blockedResumes = 0;
    }

    // ─── 空转提示 ────────────────────────────────────
    if (loop.stuck && entry.config.nudgeOnSpin) {
      const lastNudge = entry.state.lastNudgeAt || 0;
      if (now - lastNudge > NUDGE_COOLDOWN_MS) {
        try {
          const prompt = `[SYSTEM — 会话守护提示]\n\n检测到当前操作可能陷入重复模式。请检查之前的工具调用结果，如果已失败或返回了相同结果，请换一种方式继续。`;
          await agent.steer(buildUserMessage(prompt));
          entry.state.lastNudgeAt = now;
          logger.info(`[session-guard] ${sessionId} 检测到空转（${loop.type}），已注入提示`);
        } catch { /* best effort */ }
      }
    }
  }

  async function doPoll() {
    if (disposed || guarded.size === 0) return;
    for (const [sessionId, entry] of guarded) {
      // entry 存在即启用，无 enabled 字段
      try {
        await pollOne(sessionId, entry);
      } catch (err) {
        logger.error(`[session-guard] ${sessionId} 轮询失败:`, err.message);
      }
    }
  }

  function schedulePoll() {
    if (disposed || pollScheduled || guarded.size === 0) return;
    pollScheduled = true;
    queueMicrotask(async () => {
      pollScheduled = false;
      if (disposed) return;
      try {
        await doPoll();
      } catch (err) {
        logger.error("[session-guard] poll 失败:", err.message);
      }
    });
  }

  return {
    /**
     * 开启守护
     * @param {string} sessionId
     * @param {object} [userConfig]
     */
    guard(sessionId, userConfig = {}) {
      assertNormalSession(sessionId);
      try {
        getAgent(sessionId);
      } catch (err) {
        throw new Error(`无法守护不存在的会话: ${err.message}`);
      }

      const config = {
        blockedTimeoutMs: userConfig.blockedTimeoutMs ?? DEFAULT_BLOCKED_TIMEOUT_MS,
        enableAntiBlock: userConfig.enableAntiBlock ?? true,
        enableSpinDetection: userConfig.enableSpinDetection ?? true,
        maxBlockedResumes: userConfig.maxBlockedResumes ?? DEFAULT_MAX_BLOCKED_RESUMES,
        nudgeOnSpin: userConfig.nudgeOnSpin ?? true,
      };

      guarded.set(sessionId, {
        config,
        state: {
          blockedAt: null,
          blockedResumes: 0,
          lastNudgeAt: 0,
        },
        tracker: new SessionTracker(NORMAL_SESSION_TRACKER_OPTS),
      });

      schedulePoll();

      return { ok: true, sessionId, guarded: true, config };
    },

    /**
     * 请求立即轮询一次
     */
    requestPoll() {
      if (disposed) return false;
      schedulePoll();
      return true;
    },

    /**
     * 启动定时轮询
     * @param {object} timer - DSH timer 服务
     */
    startPolling(timer) {
      return timer.interval(() => {
        if (disposed || guarded.size === 0) return;
        this.requestPoll();
      }, pollIntervalMs);
    },

    isDisposed() { return disposed; },

    dispose() {
      disposed = true;
      guarded.clear();
    },
  };
}

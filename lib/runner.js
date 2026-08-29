/**
 * 会话驱动 — 所有 apiProxy 调用集中在此
 * 核心差异：goals + antiBlock（task-board 用 turn/end 判定）
 * @module autoqueue/runner
 */

import { ensureRunDir, writeTaskCopy, writeGoalSnapshot, writeResult } from "./files.js";

const DEFAULT_MAX_GOAL_ROUNDS = 40;
const DEFAULT_MAX_BLOCKED_RESUMES = 3;
const TASK_TIMEOUT_MS = 90 * 60 * 1000;

// ─── RPC 辅助 ──────────────────────────────────────────

function rpcId() {
  return `autoqueue-${crypto.randomUUID()}`;
}

function request(payload) {
  return { rpcId: rpcId(), payload };
}

function failure(error) {
  return new Error(`${error.code}: ${error.message}`);
}

// ─── Prompt 构建 ───────────────────────────────────────

function buildQueuePrompt(objective, body) {
  return `## 最终目标

${objective}

## 任务全文

${body}`;
}

function buildAntiBlockPrompt() {
  return `[SYSTEM — 反阻塞唤醒]

⚠️ 重要：先调用 get_goal 检查当前 goal 状态，确认你真的卡住了再继续。

如果 goal 已经完成或接近完成，直接调用 update_goal(action:'complete') 标记完成，不要执行下面的步骤。

只有当 get_goal 返回 phase='blocked' 或 truly stuck 时，才执行以下步骤：

1. 回顾你已完成的工作
2. 分析刚才卡住的原因
3. 如果确实无法解决，将该部分记录到《GAP.md》，然后继续做其他部分
4. 如果能解决，提出至少两种不同的新方案，选择最可行的立即执行

你有以下可用资源：
- 文件系统读写
- Shell 命令执行
- 网络搜索（如果可用）
- 子 agent 并行处理

换一种方法，或者记录 GAP 后继续。不要停下来。`;
}

// ─── Runner 工厂 ───────────────────────────────────────

/**
 * 创建 Runner 实例
 * @param {object} apiProxy - ctx.apiProxy
 * @param {object} [options]
 */
export function createRunner(apiProxy, options = {}) {
  const maxGoalRounds = options.maxGoalRounds ?? DEFAULT_MAX_GOAL_ROUNDS;
  const maxBlockedResumes = options.maxBlockedResumes ?? DEFAULT_MAX_BLOCKED_RESUMES;
  const taskTimeoutMs = options.taskTimeoutMs ?? TASK_TIMEOUT_MS;

  return {
    /**
     * 启动任务：创建会话 → 重命名 → 投递 prompt → 挂 goal
     * 对齐 task-board HostExecutionRunner.launch() 模式
     * @param {import('./ledger.js').LedgerEntry} entry
     * @returns {Promise<{sessionId: string, goalRef: {id: string, revision: number}, workspaceId?: string}>}
     */
    async launch(entry) {
      ensureRunDir(entry.workDir);
      writeTaskCopy(entry.workDir, entry.body);

      // 隔离：如果没有指定 workspace，为每个任务创建独立工作区
      let workspaceId = entry.workspace;
      if (!workspaceId) {
        try {
          const wsRes = await apiProxy.workspace.create(request({ path: entry.workDir }));
          if (wsRes.result.ok) workspaceId = wsRes.result.value.workspace.workspaceId;
        } catch { /* 创建失败不阻塞，使用默认工作区 */ }
      }

      // 创建会话
      const createRes = await apiProxy.sessions.create(request({
        ...(workspaceId ? { workspaceId } : {}),
        ...(entry.agentPreset ? { agentPreset: entry.agentPreset } : {}),
        ...(entry.model ? { model: entry.model } : {}),
      }));
      if (!createRes.result.ok) throw failure(createRes.result.error);
      const { sessionId } = createRes.result.value;

      try {
        // 重命名
        const renameRes = await apiProxy.sessions.rename(request({ sessionId, title: entry.key }));
        if (!renameRes.result.ok) throw failure(renameRes.result.error);

        // 投递无人值守 prompt
        const objective = entry.body.split("\n")[0]?.replace(/^#+\s*/, "") || entry.key;
        const promptText = buildQueuePrompt(objective, entry.body);
        const promptRes = await apiProxy.sessions.prompt(request({
          sessionId,
          mode: "queue",
          content: [{ type: "text", text: promptText }],
        }));
        if (!promptRes.result.ok) throw failure(promptRes.result.error);

        // 创建 goal
        const goalRounds = entry.maxGoalRounds ?? maxGoalRounds;
        const goalRes = await apiProxy.goals.create(request({
          sessionId,
          objective,
          maxGoalRounds: goalRounds,
        }));
        if (!goalRes.result.ok) throw failure(goalRes.result.error);
        const goalRef = goalRes.result.value.ref;

        return { sessionId, goalRef, workspaceId };
      } catch (err) {
        // 启动失败但 session 已创建 — 返回 sessionId 让调用方记录
        throw new SessionLaunchError(sessionId, err);
      }
    },

    /**
     * 轮询会话状态：通过 sessions.history 的 projections.goal 判断
     * @param {string} sessionId
     * @returns {Promise<{phase: string, goalRef?: {id: string, revision: number}, roundsStarted?: number}>}
     */
    async pollTask(sessionId) {
      const res = await apiProxy.sessions.history(request({ sessionId, maxMessages: 1 }));
      if (!res.result.ok) return { phase: "unknown" };
      const { projections } = res.result.value;
      const goal = projections?.values?.goal;
      if (!goal) return { phase: "unknown" };
      return { phase: goal.goal.phase, goalRef: goal.goal, roundsStarted: goal.roundsStarted };
    },

    /**
     * 列出所有活跃 session：用于判断 session 是否还活着
     * @returns {Promise<{known: boolean, items: Array<{sessionId: string, running: boolean}>}>}
     */
    async listSessions() {
      try {
        const res = await apiProxy.sessions.list(request({}));
        return res.result.ok ? {
          known: true,
          items: res.result.value.items,
        } : { known: false, items: [] };
      } catch {
        return { known: false, items: [] };
      }
    },

    /**
     * 反阻塞：steering 注入 + resume goal
     * @param {string} sessionId
     * @param {{id: string, revision: number}} goalRef
     * @returns {Promise<{id: string, revision: number}>}
     */
    async antiBlock(sessionId, goalRef) {
      // 注入 steering 指令
      await apiProxy.sessions.prompt(request({
        sessionId,
        mode: "steer",
        content: [{ type: "text", text: buildAntiBlockPrompt() }],
      }));

      // 重新激活 goal
      const resumeRes = await apiProxy.goals.resume(request({ sessionId, ref: goalRef }));
      if (!resumeRes.result.ok) throw failure(resumeRes.result.error);
      return resumeRes.result.value.ref;
    },

    /**
     * 唤醒：重启后发 queue prompt + resume goal 重新激活
     * @param {string} sessionId
     * @param {{id: string, revision: number}} goalRef
     */
    async wakeup(sessionId, goalRef) {
      await apiProxy.sessions.prompt(request({
        sessionId,
        mode: "queue",
        content: [{ type: "text", text: "[SYSTEM] Host 重启，请继续执行未完成的任务。" }],
      }));
      await apiProxy.goals.resume(request({ sessionId, ref: goalRef }));
    },

    /**
     * 结算：写报告 → 归档会话
     * @param {import('./ledger.js').LedgerEntry} entry
     * @param {"done"|"failed"} result
     * @param {string} [error]
     */
    async finalize(entry, result, error) {
      const now = new Date().toISOString();
      writeGoalSnapshot(entry.workDir, `目标: ${entry.body.split("\n")[0]}\n结果: ${result}\n时间: ${now}`);
      writeResult(entry.workDir, JSON.stringify({ result, error: error ?? null, attempts: entry.attempts, blockedResumes: entry.blockedResumes, finishedAt: now }, null, 2));
    },

    /**
     * 取消任务：clear goal → cancel session
     * @param {string} sessionId
     * @param {{id: string, revision: number}} goalRef
     */
    async cancelTask(sessionId, goalRef) {
      try {
        await apiProxy.goals.clear(request({ sessionId, ref: goalRef }));
      } catch { /* goal 可能已不存在 */ }
      try {
        await apiProxy.sessions.cancel(request({ sessionId }));
      } catch { /* 会话可能已结束 */ }
    },

    /**
     * 清理孤儿 session（无 goal）
     * @param {string} sessionId
     */
    async cancelSession(sessionId) {
      try {
        await apiProxy.sessions.cancel(request({ sessionId }));
      } catch { /* 会话可能已结束 */ }
    },

    /**
     * 归档任务的所有会话
     * @param {import('./ledger.js').LedgerEntry} entry
     */
    async archiveSessions(entry) {
      const ids = new Set();
      for (const exec of entry.executions) {
        if (exec.sessionId) ids.add(exec.sessionId);
      }
      if (entry.sessionId) ids.add(entry.sessionId);
      for (const sid of ids) {
        try { await apiProxy.workspace.archiveSession(request({ sessionId: sid })); } catch {}
      }
    },

    maxBlockedResumes,
    taskTimeoutMs,
  };
}

// ─── 错误类型 ──────────────────────────────────────────

/**
 * 启动失败但已创建 session 的错误
 */
export class SessionLaunchError extends Error {
  /**
   * @param {string} sessionId
   * @param {unknown} cause
   */
  constructor(sessionId, cause) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(`execution session ${sessionId} failed during launch: ${msg}`);
    this.name = "SessionLaunchError";
    this.sessionId = sessionId;
  }
}

// antiBlock is now called by engine._pollOne for the blocked case.
// wakeup is available for restart recovery when reconcileInterrupted detects
// a session that may still be alive.
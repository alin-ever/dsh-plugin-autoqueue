/**
 * 会话驱动 — 所有 apiProxy 调用集中在此
 * 核心差异：goals + antiBlock（task-board 用 turn/end 判定）
 * @module autoqueue/runner
 */

import { ensureRunDir, writeTaskCopy, writeReport, writeGoalSnapshot, writeResult } from "./files.js";

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
  return `[SYSTEM — 无人值守执行纪律]

你正在以无人值守模式执行一个任务。以下规则必须严格遵守：

1. **不要提问**：没有人会回答你。遇到不确定的事情，自己做最优判断，继续执行。
2. **先自己解决**：遇到困难先查文档、搜索、换方案。不要停下来。
3. **记录 GAP**：如果某个子任务确实无法完成（权限不足、缺少依赖、客观上不可能），
   不要放弃整个任务。将无法完成的部分记录到《GAP.md》，格式：
   - 子任务描述
   - 尝试过的方法
   - 为什么无法完成
   - 建议的替代方案
   然后继续完成其他部分。
4. **产出报告**：任务完成后写入《执行报告.md》，包含：
   - 任务目标
   - 完成情况（哪些完成了，哪些是 GAP）
   - 执行步骤摘要
   - 关键发现
   - 最终输出
5. **自评完成**：所有能做的部分都做完后，将目标标记为 complete。
   有 GAP ≠ 失败，只要尽了最大努力，有 GAP 的 complete 也是完成任务。

---

## 最终目标

${objective}

## 任务全文

${body}`;
}

function buildAntiBlockPrompt() {
  return `[SYSTEM — 反阻塞唤醒]

你刚才卡住了，但这不是终点。请执行以下步骤：

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

export function createRunner(apiProxy, options = {}) {
  const maxGoalRounds = options.maxGoalRounds ?? DEFAULT_MAX_GOAL_ROUNDS;
  const maxBlockedResumes = options.maxBlockedResumes ?? DEFAULT_MAX_BLOCKED_RESUMES;
  const taskTimeoutMs = options.taskTimeoutMs ?? TASK_TIMEOUT_MS;

  return {
    /**
     * 启动任务：创建会话 → 重命名 → 投递 prompt → 挂 goal
     * @param {import('./ledger.js').LedgerEntry} entry
     * @returns {Promise<{sessionId: string, goalRef: {id: string, revision: number}, workspaceId?: string}>}
     */
    async launch(entry) {
      ensureRunDir(entry.workDir);
      writeTaskCopy(entry.workDir, entry.body);

      let workspaceId = entry.workspace;
      if (!workspaceId) {
        try {
          const wsRes = await apiProxy.workspace.create(request({ path: entry.workDir }));
          if (wsRes.result.ok) workspaceId = wsRes.result.value.workspace.workspaceId;
        } catch { /* 创建失败不阻塞，使用默认工作区 */ }
      }

      const createRes = await apiProxy.sessions.create(request({
        ...(workspaceId ? { workspaceId } : {}),
        ...(entry.agentPreset ? { agentPreset: entry.agentPreset } : {}),
      }));
      if (!createRes.result.ok) throw failure(createRes.result.error);
      const { sessionId } = createRes.result.value;

      try {
        const renameRes = await apiProxy.sessions.rename(request({ sessionId, title: entry.key }));
        if (!renameRes.result.ok) throw failure(renameRes.result.error);

        const objective = entry.body.split("\n")[0]?.replace(/^#+\s*/, "") || entry.key;
        const promptText = buildQueuePrompt(objective, entry.body);
        const promptRes = await apiProxy.sessions.prompt(request({ sessionId, mode: "queue", prompt: promptText }));
        if (!promptRes.result.ok) throw failure(promptRes.result.error);

        const goalRes = await apiProxy.goals.create(request({ sessionId, objective, maxRounds: entry.maxGoalRounds }));
        if (!goalRes.result.ok) throw failure(goalRes.result.error);
        const { id: goalId, revision: goalRevision } = goalRes.result.value;

        return { sessionId, goalRef: { id: goalId, revision: goalRevision }, workspaceId };
      } catch (err) {
        runner.cancelSession(sessionId).catch(() => {});
        throw err;
      }
    },

    /**
     * 轮询任务状态
     * @param {import('./ledger.js').LedgerEntry} entry
     * @returns {Promise<{phase: string} | null>}
     */
    async pollTask(entry) {
      if (!entry.sessionId) return null;
      try {
        const res = await apiProxy.goals.get(request({ sessionId: entry.sessionId }));
        if (!res.result.ok) return null;
        return res.result.value;
      } catch { return null; }
    },

    /**
     * 反阻塞：steering + resume goal
     * @param {import('./ledger.js').LedgerEntry} entry
     */
    async antiBlock(entry) {
      if (!entry.sessionId || !entry.goalRef) return;
      try {
        await apiProxy.sessions.prompt(request({
          sessionId: entry.sessionId,
          mode: "steer",
          prompt: buildAntiBlockPrompt(),
        }));
        await apiProxy.goals.resume(request({ sessionId: entry.sessionId, ref: entry.goalRef }));
      } catch (err) {
        console.error(`[autoqueue] antiBlock failed for ${entry.key}:`, err);
      }
    },

    /**
     * 唤醒：用于 reconcileInterrupted 场景
     * @param {string} sessionId
     * @param {{id: string, revision: number} | null} goalRef
     */
    async wakeup(sessionId, goalRef) {
      if (!sessionId) return;
      try {
        await apiProxy.sessions.prompt(request({
          sessionId,
          mode: "queue",
          prompt: "系统恢复：请继续执行你的任务。",
        }));
        if (goalRef) {
          await apiProxy.goals.resume(request({ sessionId, ref: goalRef }));
        }
      } catch (err) {
        console.error(`[autoqueue] wakeup failed for ${sessionId}:`, err);
      }
    },

    /**
     * 结算：写报告 + 清理运行目录
     * @param {import('./ledger.js').LedgerEntry} entry
     * @param {"done" | "failed" | "stopped"} result
     * @param {string} [error]
     */
    async finalize(entry, result, error) {
      if (entry.workDir) {
        const exec = entry.executions[entry.executions.length - 1];
        if (exec && exec.result === "done") {
          try {
            const reportPath = join(entry.workDir, "执行报告.md");
            if (existsSync(reportPath)) {
              // 报告已存在，无需额外写入
            }
          } catch { /* 忽略 */ }
        }
      }
    },

    /**
     * 取消任务：清理 goal + 取消 session
     * @param {string} sessionId
     * @param {{id: string, revision: number} | null} goalRef
     */
    async cancelTask(sessionId, goalRef) {
      try {
        if (goalRef) {
          await apiProxy.goals.clear(request({ sessionId, ref: goalRef }));
        }
      } catch { /* goal 可能已不存在 */ }
      try {
        await apiProxy.sessions.cancel(request({ sessionId }));
      } catch { /* session 可能已不存在 */ }
    },

    /**
     * 取消单个 session
     * @param {string} sessionId
     */
    async cancelSession(sessionId) {
      try { await apiProxy.sessions.cancel(request({ sessionId })); } catch {}
    },

    /**
     * 归档会话
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

    /**
     * 检查是否超时
     * @param {string} startedAt
     * @returns {boolean}
     */
    isTimeout(startedAt) {
      return Date.now() - new Date(startedAt).getTime() > taskTimeoutMs;
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
/**
 * QueueEngine 编排层 — 对齐 task-board host-service.ts 模式
 * POST API 是主入口，收件箱扫描是辅助
 * @module autoqueue/engine
 */

import { listTaskFiles, removeTaskFile, createRunDir, writeTaskFile, matchCron } from "./files.js";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  loadLedger, snapshot, findByKey, upsertEntry,
  getConcurrency, setConcurrency, runningCount, checkRequest, flushLedger, removeEntry, unreadCount,
} from "./ledger.js";
import { createRunner, SessionLaunchError } from "./runner.js";

const POLL_INTERVAL_MS = 10_000;

/**
 * 创建 QueueEngine 实例
 * @param {object} apiProxy - ctx.apiProxy
 * @param {object} [options]
 */
export function createEngine(apiProxy, options = {}) {
  const runner = createRunner(apiProxy, options);
  const inFlight = new Set();

  // 运行时配置（可被 API 修改）
  const engineConfig = {
    maxGoalRounds: options.maxGoalRounds ?? 40,
    maxBlockedResumes: options.maxBlockedResumes ?? 3,
    autoArchive: options.autoArchive ?? false,
    stallThreshold: options.stallThreshold ?? 10,
    unknownThreshold: options.unknownThreshold ?? 3,
    maxAttempts: options.maxAttempts ?? 3,
    agentPreset: options.agentPreset ?? null,
    priority: options.priority ?? 5,
    webhook: options.webhook ?? null,
    workspace: options.workspace ?? null,
    queueDir: options.queueDir ?? null,
    defaultDeadline: options.defaultDeadline ?? null,
    enableNotifications: options.enableNotifications ?? true,
  };

  const engine = {
    runner,

    // 条件归档：任务级 autoArchive > 全局 autoArchive，列表隐藏 + DSH 会话归档
    async archiveIfEnabled(entry) {
      const shouldArchive = entry.autoArchive ?? engineConfig.autoArchive;
      if (!shouldArchive) return;
      try { await runner.archiveSessions(entry); } catch {}
      upsertEntry(entry.key, { archivedAt: new Date().toISOString() });
    },

    // ─── 内部工具 ──────────────────────────────────────

    async callWebhook(entry, result, error) {
      const url = entry.webhook ?? engineConfig.webhook;
      if (!url) return;
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: entry.key,
            status: entry.status,
            result,
            error: error ?? null,
            attempts: entry.attempts,
            blockedResumes: entry.blockedResumes,
            finishedAt: new Date().toISOString(),
          }),
        });
      } catch { /* webhook 失败不阻塞 */ }
    },

    // ─── 快照 ──────────────────────────────────────────

    /** @returns {{ revision: number, tasks: LedgerEntry[], config: { maxConcurrent: number, webhook?: string|null } }} */
    snapshot(includeArchived = false) {
      const s = snapshot();
      let tasks = includeArchived ? s.tasks : s.tasks.filter(t => !t.archivedAt);
      tasks = [...tasks].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      return { ...s, tasks, unreadCount: unreadCount(), config: { ...s.config, webhook: engineConfig.webhook, queueDir: engineConfig.queueDir, workspace: engineConfig.workspace, enableNotifications: engineConfig.enableNotifications } };
    },

    // ─── 运行时配置 ─────────────────────────────────────

    getConfig() {
      return { ...engineConfig };
    },

    setConfig(patch) {
      if (patch.maxGoalRounds != null) {
        engineConfig.maxGoalRounds = Math.max(1, Math.min(100, parseInt(patch.maxGoalRounds, 10)));
      }
      if (patch.maxBlockedResumes != null) {
        engineConfig.maxBlockedResumes = Math.max(0, Math.min(10, parseInt(patch.maxBlockedResumes, 10)));
      }
      if (patch.stallThreshold != null) {
        engineConfig.stallThreshold = Math.max(1, Math.min(100, parseInt(patch.stallThreshold, 10)));
      }
      if (patch.unknownThreshold != null) {
        engineConfig.unknownThreshold = Math.max(1, Math.min(100, parseInt(patch.unknownThreshold, 10)));
      }
      if (patch.maxAttempts != null) {
        engineConfig.maxAttempts = Math.max(1, Math.min(10, parseInt(patch.maxAttempts, 10)));
      }
      if (patch.autoArchive !== undefined) {
        engineConfig.autoArchive = !!patch.autoArchive;
      }
      if (patch.webhook !== undefined) {
        engineConfig.webhook = patch.webhook || null;
      }
      if (patch.workspace !== undefined) {
        engineConfig.workspace = patch.workspace || null;
      }
      if (patch.queueDir !== undefined) {
        engineConfig.queueDir = patch.queueDir || null;
      }
      if (patch.enableNotifications !== undefined) {
        engineConfig.enableNotifications = !!patch.enableNotifications;
      }
      if (patch.agentPreset !== undefined) {
        engineConfig.agentPreset = patch.agentPreset || null;
      }
      if (patch.priority != null) {
        engineConfig.priority = Math.max(1, Math.min(10, parseInt(patch.priority, 10)));
      }
      if (patch.defaultDeadline !== undefined) {
        engineConfig.defaultDeadline = patch.defaultDeadline || null;
      }
      return { ...engineConfig };
    },

    // ─── API 操作（主入口）──────────────────────────────

    /**
     * 通过 API 创建任务
     * @param {string} [requestId] - 去重用，不传则自动生成
     * @param {string} key - 任务标识
     * @param {string} content - Markdown 内容
     * @param {object} [opts]
     */
    createTask(requestId, key, content, opts = {}) {
      // HTTP 层去重：仅当调用方传了 requestId 时才校验
      if (requestId && !checkRequest(requestId, { kind: "create", key, content })) return { ok: false, key, error: "重复提交" };

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
      upsertEntry(key, {
        status: "pending",
        body: content,
        raw: fileContent,
        workspace: opts.workspace ?? engineConfig.workspace,
        agentPreset: opts.agentPreset ?? engineConfig.agentPreset,
        autoArchive: opts.autoArchive,
        maxGoalRounds: opts.maxGoalRounds,
        maxBlockedResumes: opts.maxBlockedResumes,
        timeoutMs: opts.timeoutMs,
        stallThreshold: opts.stallThreshold,
        unknownThreshold: opts.unknownThreshold,
        maxAttempts: opts.maxAttempts,
        schedule: opts.schedule,
        cron: opts.cron,
        deadline: opts.deadline,
        priority: priority,
        webhook: opts.webhook,
        enableNotifications: opts.enableNotifications,
      });

      // 立即尝试派发
      engine.scanPending();
      return { ok: true, key };
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
      if (!checkRequest(requestId, { kind: "action", action, key })) return { ok: true };

      const entries = loadLedger();
      switch (action) {
        case "stop":
          return engine.stopTask(key);
        case "archive":
          if (opts.keys && Array.isArray(opts.keys)) {
            return await engine.archiveTasks(opts.keys);
          }
          return await engine.archiveTask(key);
        case "restore":
          return await engine.restoreTask(key);
        case "force-scan":
          engine.scanPending();
          return { ok: true };
        case "rerun": {
          const entry = findByKey(key);
          if (!entry) return { ok: false, error: "任务不存在" };
          if (entry.status === "running") return { ok: false, error: "任务正在运行" };
          // done 任务也允许重跑（结果可能已过时，用户需要重新执行）
          writeTaskFile(key, entry.raw ?? entry.body ?? "");
          upsertEntry(key, {
            status: "pending", sessionId: null, goalRef: null, consecutiveUnknowns: 0,
            attempts: 0, consecutiveActive: 0, lastRoundCount: 0,
            priority: entry.priority, webhook: entry.webhook,
            maxGoalRounds: entry.maxGoalRounds, maxBlockedResumes: entry.maxBlockedResumes, timeoutMs: entry.timeoutMs,
            enableNotifications: entry.enableNotifications,
          });
          flushLedger();
          await engine.scanPending();
          return { ok: true };
        }
        case "set-concurrency":
          setConcurrency(opts.maxConcurrent ?? 1);
          return { ok: true };
        case "update":
          return engine.updateTask(key, opts);
        case "delete":
          return engine.deleteTask(key);
        default:
          throw new Error(`未知 action: ${action}`);
      }
    },

    // ─── 收件箱扫描（辅助入口）──────────────────────────

    async scanPending() {
      if (this._scanning) return;
      this._scanning = true;
      try {
      const tasks = listTaskFiles();
      const maxConcurrent = getConcurrency();
      const current = runningCount();
      const available = maxConcurrent - current;
      if (available <= 0) return;

      // 按优先级排序（高优先先派发），默认 5
      tasks.sort((a, b) => {
        const pa = findByKey(a.key)?.priority ?? 5;
        const pb = findByKey(b.key)?.priority ?? 5;
        return pb - pa;
      });

      let dispatched = 0;
      for (const task of tasks) {
        if (dispatched >= available) break;
        if (inFlight.has(task.key)) continue;

        // 调度检查
        if (task.schedule?.schedule) {
          const scheduledAt = new Date(task.schedule.schedule).getTime();
          if (Date.now() < scheduledAt) continue;
        }
        if (task.schedule?.cron) {
          if (!matchCron(task.schedule.cron)) continue;
        }

        let entry = findByKey(task.key);
        // 已存在且非 pending/failed → 跳过
        if (entry && entry.status !== "pending" && entry.status !== "failed") continue;

        inFlight.add(task.key);
        dispatched++;
        engine._dispatch(task).finally(() => { inFlight.delete(task.key); });
      }
    } finally { this._scanning = false; } },

    // ─── 内部派发 ──────────────────────────────────────

    async _dispatch(task) {
      let entry = findByKey(task.key);

      const workDir = entry?.workDir ?? createRunDir(task.key);
      entry = upsertEntry(task.key, {
        status: "running",
        workDir,
        sessionId: null,
        goalRef: null,
        attempts: (entry?.attempts ?? 0) + 1,
        consecutiveActive: 0,
        lastRoundCount: 0,
        body: task.body,
        raw: task.raw,
        schedule: task.schedule?.schedule ?? entry?.schedule,
      });

      flushLedger();

      const execRecord = {
        id: crypto.randomUUID(),
        sessionId: null,
        attempt: entry.attempts,
        startedAt: new Date().toISOString(),
      };

      try {
        const { sessionId, goalRef, workspaceId } = await runner.launch(entry);
        // ⚠️ 仅在会话创建成功后才删除收件箱文件，防止进程崩溃导致任务丢失
        removeTaskFile(task.key);
        entry = upsertEntry(task.key, { sessionId, goalRef, ...(workspaceId ? { workspace: workspaceId } : {}) });
        execRecord.sessionId = sessionId;
        entry.executions.push(execRecord);
        flushLedger();
      } catch (err) {
        if (err instanceof SessionLaunchError && err.sessionId) {
          execRecord.sessionId = err.sessionId;
          entry = upsertEntry(task.key, { sessionId: err.sessionId });
          // 清理孤儿 session：session 已创建但 goal 未挂载
          runner.cancelSession(err.sessionId).catch(() => {});
        }
        execRecord.endedAt = new Date().toISOString();
        execRecord.result = "failed";
        execRecord.error = err.message;
        if (!entry.executions) entry.executions = [];
        entry.executions.push(execRecord);

        if (entry.attempts < (entry.maxAttempts ?? engineConfig.maxAttempts)) {
          // 重试：回退到 pending，立即触发扫描重新派发
          // 收件箱文件未被删除（现在在 launch 成功后删除），无需还原
          upsertEntry(task.key, { status: "pending", sessionId: null, goalRef: null });
          flushLedger();
          engine.scanPending();
        } else {
          upsertEntry(task.key, { status: "failed", sessionId: null, goalRef: null });
          flushLedger();
        }
      }
    },

    // ─── 轮询运行中任务 ────────────────────────────────

    async pollRunning() {
      if (this._polling) return;
      this._polling = true;
      try {
        const entries = loadLedger();
        const running = entries.filter(e => e.status === "running" && e.sessionId);
        if (running.length === 0) return;

        // 一次调用拿到所有活跃 session，避免逐任务查询
        const sessions = await runner.listSessions();
        if (!sessions.known) return; // API 异常，跳过本轮

        for (const entry of running) {
          if (inFlight.has(entry.key)) continue;
          inFlight.add(entry.key);
          try { await engine._pollOne(entry, sessions); }
          finally { inFlight.delete(entry.key); }
        }
      } finally { this._polling = false; }
    },

    /**
     * 轮询单个任务：session 存活 → 查 goal phase；session 消失 → 重试
     * @param {object} entry - 任务条目
     * @param {{known: boolean, items: Array}} sessions - listSessions 结果
     */
    async _pollOne(entry, sessions) {
      const lastExec = entry.executions[entry.executions.length - 1];

      // ── 超时检查 ──────────────────────────────────
      const timeoutMs = entry.timeoutMs ?? runner.taskTimeoutMs;
      if (lastExec && Date.now() - new Date(lastExec.startedAt).getTime() > timeoutMs) {
        await engine.retryExecution(entry, "timeout");
        return;
      }

      // ── deadline 检查 ──────────────────────────────
      const effectiveDeadline = entry.deadline ?? engineConfig.defaultDeadline;
      if (effectiveDeadline && matchCron(effectiveDeadline)) {
        await runner.cancelTask(entry.sessionId, entry.goalRef);
        await runner.finalize(entry, "stopped", `截止时间到达 (deadline: ${effectiveDeadline})`);
        await engine.archiveIfEnabled(entry);
        upsertEntry(entry.key, { status: "stopped", sessionId: null, goalRef: null });
        if (lastExec) { lastExec.endedAt = new Date().toISOString(); lastExec.result = "stopped"; lastExec.error = `deadline: ${effectiveDeadline}`; }
        flushLedger();
        engine.callWebhook(entry, "stopped", `deadline: ${effectiveDeadline}`);
        engine.scanPending();
        return;
      }

      // ── session 存活检查 ───────────────────────────
      const sessionId = entry.sessionId;
      const sessionAlive = sessions.items.some(s => s.sessionId === sessionId);

      if (!sessionAlive) {
        // session 不在 DSH 的活跃列表里 → 进程崩溃/被取消 → 重试
        await engine.retryExecution(entry, "session-gone");
        return;
      }

      // ── session 活着 → 查 goal phase ───────────────
      const poll = await runner.pollTask(sessionId);

      switch (poll.phase) {
        case "complete": {
          await runner.finalize(entry, "done");
          await engine.archiveIfEnabled(entry);
          upsertEntry(entry.key, { status: "done", sessionId: null, goalRef: null, consecutiveUnknowns: 0, consecutiveActive: 0 });
          if (lastExec) { lastExec.endedAt = new Date().toISOString(); lastExec.result = "done"; }
          flushLedger();
          engine.callWebhook(entry, "done");
          engine.scanPending();
          break;
        }

        case "blocked": {
          // agent 主动标记无法继续 → 反阻塞：steering + resume
          const maxBlocked = entry.maxBlockedResumes ?? engineConfig.maxBlockedResumes;
          const blockedCount = entry.blockedResumes ?? 0;
          if (blockedCount < maxBlocked) {
            try {
              const newRef = await runner.antiBlock(entry.sessionId, entry.goalRef);
              upsertEntry(entry.key, {
                blockedResumes: blockedCount + 1,
                goalRef: newRef,
                consecutiveUnknowns: 0,
                consecutiveActive: 0,
              });
              flushLedger();
            } catch (err) {
              // antiBlock 失败（如 session 已不存在）→ 回退到重启
              await engine.retryExecution(entry, "blocked");
            }
          } else {
            // 超过最大反阻塞次数 → 标记失败
            await runner.finalize(entry, "failed", `超过最大反阻塞次数 (${maxBlocked})`);
            await engine.archiveIfEnabled(entry);
            const lastExec = entry.executions[entry.executions.length - 1];
            if (lastExec) { lastExec.endedAt = new Date().toISOString(); lastExec.result = "failed"; lastExec.error = "超过最大反阻塞次数"; }
            upsertEntry(entry.key, { status: "failed", sessionId: null, goalRef: null, consecutiveUnknowns: 0, consecutiveActive: 0, blockedResumes: blockedCount });
            flushLedger();
            engine.callWebhook(entry, "failed", "超过最大反阻塞次数");
            engine.scanPending();
          }
          break;
        }

        case "active":
        case "running":
        case "paused":
          // 重置连续失败计数
          if (entry.consecutiveUnknowns > 0) {
            upsertEntry(entry.key, { consecutiveUnknowns: 0 });
          }

          // 通过 roundsStarted 是否增长判断 agent 是否真的在推进
          {
            const lastRounds = entry.lastRoundCount ?? 0;
            const currentRounds = poll.roundsStarted ?? 0;

            if (currentRounds > lastRounds) {
              // agent 在推进工作，重置停滞计数器
              upsertEntry(entry.key, { consecutiveActive: 0, lastRoundCount: currentRounds });
            } else {
              // rounds 没增长，agent 可能卡住了
              const stalled = (entry.consecutiveActive ?? 0) + 1;
              const stallThreshold = entry.stallThreshold ?? engineConfig.stallThreshold;
              if (stalled >= stallThreshold) {
                await engine.retryExecution(entry, "stalled");
              } else {
                upsertEntry(entry.key, { consecutiveActive: stalled });
              }
            }
          }
          flushLedger();
          break;

        case "unknown":
        default: {
          // 无 goal 或 API 异常 → 累计后重试
          const fails = (entry.consecutiveUnknowns ?? 0) + 1;
          if (fails >= (entry.unknownThreshold ?? engineConfig.unknownThreshold)) {
            await engine.retryExecution(entry, "unknown");
          } else {
            upsertEntry(entry.key, { consecutiveUnknowns: fails });
            flushLedger();
          }
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
      // 1. 取消旧 session
      if (entry.sessionId) {
        if (entry.goalRef) {
          await runner.cancelTask(entry.sessionId, entry.goalRef);
        } else {
          await runner.cancelSession(entry.sessionId);
        }
      }

      // 2. 检查重试次数（与 _dispatch 一致：先检查当前值，再自增）
      const maxAttempts = entry.maxAttempts ?? engineConfig.maxAttempts;
      if ((entry.attempts ?? 0) >= maxAttempts) {
        await runner.finalize(entry, "failed", `超过最大重试次数 (${maxAttempts}), 最后原因: ${reason}`);
        await engine.archiveIfEnabled(entry);
        upsertEntry(entry.key, { status: "failed", sessionId: null, goalRef: null, consecutiveUnknowns: 0, consecutiveActive: 0 });
        const lastExec = entry.executions[entry.executions.length - 1];
        if (lastExec) { lastExec.endedAt = new Date().toISOString(); lastExec.result = "failed"; lastExec.error = `超过最大重试次数 (${reason})`; }
        flushLedger();
        engine.callWebhook(entry, "failed", `超过最大重试次数: ${reason}`);
        engine.scanPending();
        return;
      }
      const attempts = (entry.attempts ?? 0) + 1;

      // 3. 创建新 session
      try {
        const { sessionId, goalRef, workspaceId } = await runner.launch(entry);
        upsertEntry(entry.key, {
          sessionId,
          goalRef,
          ...(workspaceId ? { workspace: workspaceId } : {}),
          attempts,
          consecutiveActive: 0,
          consecutiveUnknowns: 0,
          lastRoundCount: 0,
        });
        flushLedger();
      } catch (err) {
        // 启动失败 → 写回收件箱，立即触发扫描重新派发
        writeTaskFile(entry.key, entry.raw ?? entry.body ?? "");
        upsertEntry(entry.key, { status: "pending", sessionId: null, goalRef: null, attempts });
        flushLedger();
        engine.scanPending();
      }
    },

    // ─── 任务操作 ──────────────────────────────────────

    async stopTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.status === "stopped" || entry.status === "done") return { ok: false, error: "任务已终止" };
      if (entry.sessionId && entry.goalRef) {
        await runner.cancelTask(entry.sessionId, entry.goalRef);
      }
      removeTaskFile(key);
      upsertEntry(key, { status: "stopped", sessionId: null, goalRef: null });
      const exec = entry.executions[entry.executions.length - 1];
      if (exec && !exec.endedAt) { exec.endedAt = new Date().toISOString(); exec.result = "stopped"; }
      flushLedger();
      return { ok: true };
    },

    async archiveTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.status === "running") return { ok: false, error: "运行中的任务不能归档" };
      if (entry.archivedAt) return { ok: false, error: "任务已归档" };
      // 同步归档 DSH 会话
      await runner.archiveSessions(entry);
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
        await runner.archiveSessions(entry);
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
      upsertEntry(key, { archivedAt: null });
      flushLedger();
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
      if (entry.status === "running") return { ok: false, error: "运行中的任务不能修改" };

      const updates = {};

      // 统一计算 raw 文件内容，避免重复写盘
      const newContent = patch.content !== undefined ? patch.content : entry.body;
      const newSchedule = patch.schedule !== undefined ? patch.schedule : entry.schedule;
      const newCron = patch.cron !== undefined ? patch.cron : entry.cron;
      const newDeadline = patch.deadline !== undefined ? patch.deadline : entry.deadline;

      if (patch.content !== undefined) updates.body = patch.content;
      if (patch.schedule !== undefined) updates.schedule = patch.schedule;
      if (patch.cron !== undefined) updates.cron = patch.cron;
      if (patch.deadline !== undefined) updates.deadline = patch.deadline;

      const raw = buildFileContent(newContent, newSchedule, newCron, newDeadline);
      updates.raw = raw;
      writeTaskFile(key, raw);
      if (patch.maxGoalRounds !== undefined) updates.maxGoalRounds = patch.maxGoalRounds;
      if (patch.maxBlockedResumes !== undefined) updates.maxBlockedResumes = patch.maxBlockedResumes;
      if (patch.timeoutMs !== undefined) updates.timeoutMs = patch.timeoutMs;
      if (patch.priority !== undefined) updates.priority = Math.max(1, Math.min(10, parseInt(patch.priority, 10)));
      if (patch.webhook !== undefined) updates.webhook = patch.webhook;
      if (patch.workspace !== undefined) updates.workspace = patch.workspace;
      if (patch.agentPreset !== undefined) updates.agentPreset = patch.agentPreset;
      if (patch.autoArchive !== undefined) updates.autoArchive = !!patch.autoArchive;
      if (patch.enableNotifications !== undefined) updates.enableNotifications = !!patch.enableNotifications;
      if (patch.stallThreshold !== undefined) updates.stallThreshold = patch.stallThreshold;
      if (patch.unknownThreshold !== undefined) updates.unknownThreshold = patch.unknownThreshold;
      if (patch.maxAttempts !== undefined) updates.maxAttempts = patch.maxAttempts;

      upsertEntry(key, updates);
      flushLedger();
      return { ok: true, key };
    },

    // ─── 生命周期 ──────────────────────────────────────

    /** 启动轮询定时器 */
    startPolling(timer) {
      return timer.interval(() => {
        engine.pollRunning().catch(err => {
          console.error("[autoqueue] pollRunning 失败:", err.message);
        });
      }, POLL_INTERVAL_MS);
    },

    /** 启动收件箱扫描定时器 */
    startScanning(timer, intervalMs = 15_000) {
      return timer.interval(() => {
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
        autoArchive: entry.autoArchive,
        enableNotifications: entry.enableNotifications,
        stallThreshold: entry.stallThreshold,
        unknownThreshold: entry.unknownThreshold,
        maxAttempts: entry.maxAttempts,
        executions: entry.executions ?? [],
        reports: {},
      };

      // 读取运行目录的报告
      if (entry.workDir) {
        try {
          const goalPath = join(entry.workDir, ".目标.md");
          const resultPath = join(entry.workDir, ".结果.md");
          const reportPath = join(entry.workDir, "执行报告.md");
          if (existsSync(goalPath)) detail.reports.goal = readFileSync(goalPath, "utf8");
          if (existsSync(resultPath)) detail.reports.result = readFileSync(resultPath, "utf8");
          if (existsSync(reportPath)) detail.reports.report = readFileSync(reportPath, "utf8");
        } catch { /* 文件读取失败不阻塞 */ }
      }

      return { ok: true, task: detail };
    },
  };

  return engine;
}

// ─── key 自动生成辅助 ──────────────────────────────────

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
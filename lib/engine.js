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
  getConcurrency, setConcurrency, runningCount, checkRequest, flushLedger, removeEntry,
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
      const tasks = includeArchived ? s.tasks : s.tasks.filter(t => !t.archivedAt);
      return { ...s, tasks, config: { ...s.config, webhook: engineConfig.webhook, queueDir: engineConfig.queueDir, workspace: engineConfig.workspace } };
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

      const entries = loadLedger();
      const existing = findByKey(key);
      if (existing) {
        return {
          ok: false,
          key,
          error: "任务已存在",
          existing: {
            status: existing.status,
            cron: existing.cron,
            schedule: existing.schedule,
            body: (existing.body ?? "").slice(0, 200),
            createdAt: existing.createdAt,
          },
        };
      }

      // 优先级钳位
      const priority = opts.priority != null ? Math.max(1, Math.min(10, parseInt(opts.priority, 10))) : engineConfig.priority;

      // 组装文件内容：前面加调度声明
      let fileContent = content;
      if (opts.schedule) fileContent = `<!-- schedule: ${opts.schedule} -->\n${fileContent}`;
      if (opts.cron) fileContent = `<!-- cron: ${opts.cron} -->\n${fileContent}`;
      if (opts.deadline) fileContent = `<!-- deadline: ${opts.deadline} -->\n${fileContent}`;

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
          if (entry.status === "done") return { ok: false, error: "已完成的任务无需重跑" };
          writeTaskFile(key, entry.raw ?? entry.body ?? "");
          upsertEntry(key, {
            status: "pending", sessionId: null, goalRef: null, consecutiveUnknowns: 0,
            attempts: 0, blockedResumes: 0,
            priority: entry.priority, webhook: entry.webhook,
            maxGoalRounds: entry.maxGoalRounds, maxBlockedResumes: entry.maxBlockedResumes, timeoutMs: entry.timeoutMs,
          });
          flushLedger();
          engine.scanPending();
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
      const tasks = listTaskFiles();
      const maxConcurrent = getConcurrency();
      const current = runningCount();
      const available = maxConcurrent - current;
      if (available <= 0) return;

      // 按优先级排序（高优先先派发），默认 5
      const entries = loadLedger();
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
    },

    // ─── 内部派发 ──────────────────────────────────────

    async _dispatch(task) {
      const entries = loadLedger();
      let entry = findByKey(task.key);

      const workDir = entry?.workDir ?? createRunDir(task.key);
      entry = upsertEntry(task.key, {
        status: "running",
        workDir,
        sessionId: null,
        goalRef: null,
        attempts: (entry?.attempts ?? 0) + 1,
        blockedResumes: 0,
        body: task.body,
        raw: task.raw,
        schedule: task.schedule?.schedule ?? entry?.schedule,
      });

      removeTaskFile(task.key);
      flushLedger();

      const execRecord = {
        id: crypto.randomUUID(),
        sessionId: null,
        attempt: entry.attempts,
        startedAt: new Date().toISOString(),
      };

      try {
        const { sessionId, goalRef, workspaceId } = await runner.launch(entry);
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
        entry.executions.push(execRecord);

        if (entry.attempts < (entry.maxAttempts ?? engineConfig.maxAttempts)) {
          // 重试：还原收件箱，回退到 pending，下次扫描自动重派发
          writeTaskFile(task.key, task.raw);
          upsertEntry(task.key, { status: "pending", sessionId: null, goalRef: null });
        } else {
          upsertEntry(task.key, { status: "failed", sessionId: null, goalRef: null });
        }
        flushLedger();
      }
    },

    // ─── 轮询运行中任务 ────────────────────────────────

    async pollRunning() {
      const entries = loadLedger();
      const running = entries.filter(e => e.status === "running" && e.sessionId);
      for (const entry of running) {
        if (inFlight.has(entry.key)) continue;
        inFlight.add(entry.key);
        try { await engine._pollOne(entry); }
        finally { inFlight.delete(entry.key); }
      }
    },

    async _pollOne(entry) {
      const lastExec = entry.executions[entry.executions.length - 1];

      // 唤醒：重启后首次轮询，发 prompt + resume goal 重新激活
      if (entry.wakeupNeeded) {
        try {
          await runner.wakeup(entry.sessionId, entry.goalRef);
          upsertEntry(entry.key, { wakeupNeeded: false });
          flushLedger();
        } catch {
          // 唤醒失败不阻塞，由后续 poll 的 consecutiveUnknowns 兜底
        }
      }

      // 超时检查（任务级优先）
      const timeoutMs = entry.timeoutMs ?? runner.taskTimeoutMs;
      if (lastExec && Date.now() - new Date(lastExec.startedAt).getTime() > timeoutMs) {
        await runner.cancelTask(entry.sessionId, entry.goalRef);
        await runner.finalize(entry, "failed", "任务超时");
        await engine.archiveIfEnabled(entry);
        upsertEntry(entry.key, { status: "failed", sessionId: null, goalRef: null });
        if (lastExec) {
          lastExec.endedAt = new Date().toISOString();
          lastExec.result = "failed";
          lastExec.error = "任务超时";
        }
        flushLedger();
        engine.callWebhook(entry, "failed", "任务超时");
        engine.scanPending();
        return;
      }

      // deadline 检查（任务级优先，fallback 到全局 defaultDeadline）
      const effectiveDeadline = entry.deadline ?? engineConfig.defaultDeadline;
      if (effectiveDeadline && matchCron(effectiveDeadline)) {
        await runner.cancelTask(entry.sessionId, entry.goalRef);
        await runner.finalize(entry, "stopped", `截止时间到达 (deadline: ${effectiveDeadline})`);
        await engine.archiveIfEnabled(entry);
        upsertEntry(entry.key, { status: "stopped", sessionId: null, goalRef: null });
        if (lastExec) {
          lastExec.endedAt = new Date().toISOString();
          lastExec.result = "stopped";
          lastExec.error = `截止时间到达 (deadline: ${effectiveDeadline})`;
        }
        flushLedger();
        engine.callWebhook(entry, "stopped", `截止时间到达 (deadline: ${effectiveDeadline})`);
        engine.scanPending();
        return;
      }

      const poll = await runner.pollTask(entry.sessionId);

      switch (poll.phase) {
        case "complete": {
          await runner.finalize(entry, "done");
          await engine.archiveIfEnabled(entry);
          upsertEntry(entry.key, { status: "done", sessionId: null, goalRef: null, consecutiveUnknowns: 0, consecutiveActive: 0 });
          const exec = entry.executions[entry.executions.length - 1];
          if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "done"; }
          flushLedger();

          engine.callWebhook(entry, "done");
          engine.scanPending();
          break;
        }
        case "blocked": {
          const maxResumes = entry.maxBlockedResumes ?? runner.maxBlockedResumes;
          if (entry.blockedResumes < maxResumes) {
            const newRef = await runner.antiBlock(entry.sessionId, poll.goalRef);
            upsertEntry(entry.key, { goalRef: newRef, blockedResumes: entry.blockedResumes + 1, consecutiveUnknowns: 0, consecutiveActive: 0 });
            flushLedger();
          } else {
            await runner.cancelTask(entry.sessionId, poll.goalRef);
            await runner.finalize(entry, "failed", `反阻塞超过上限 (${maxResumes} 次)`);
            await engine.archiveIfEnabled(entry);
            upsertEntry(entry.key, { status: "failed", sessionId: null, goalRef: null, consecutiveUnknowns: 0 });
            const exec = entry.executions[entry.executions.length - 1];
            if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "failed"; exec.error = "反阻塞超过上限"; }
            flushLedger();
            engine.callWebhook(entry, "failed", `反阻塞超过上限 (${maxResumes} 次)`);
            engine.scanPending();
          }
          break;
        }
        case "active":
        case "running":
          // 恢复正常，重置连续失败计数
          if (entry.consecutiveUnknowns > 0) {
            upsertEntry(entry.key, { consecutiveUnknowns: 0 });
          }

          // 停滞检测：连续 N 轮仍为 active/running，发 steering 催促
          {
            const stalled = (entry.consecutiveActive ?? 0) + 1;
            if (stalled >= (entry.stallThreshold ?? engineConfig.stallThreshold)) {
              try {
                await runner.antiBlock(entry.sessionId, entry.goalRef ?? poll.goalRef);
                upsertEntry(entry.key, { consecutiveActive: 0, blockedResumes: entry.blockedResumes + 1 });
              } catch {
                upsertEntry(entry.key, { consecutiveActive: stalled });
              }
            } else {
              upsertEntry(entry.key, { consecutiveActive: stalled });
            }
          }
          flushLedger();
          break;
        case "unknown":
        default: {
          // session 不可达：累计连续失败次数，超过阈值则判定失败
          const fails = (entry.consecutiveUnknowns ?? 0) + 1;
          if (fails >= (entry.unknownThreshold ?? engineConfig.unknownThreshold)) {
            await runner.finalize(entry, "failed", `会话不可达（连续 ${entry.unknownThreshold ?? engineConfig.unknownThreshold} 次轮询失败）`);
            await engine.archiveIfEnabled(entry);
            upsertEntry(entry.key, { status: "failed", sessionId: null, goalRef: null, consecutiveUnknowns: 0 });
            const exec = entry.executions[entry.executions.length - 1];
            if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "failed"; exec.error = "会话不可达"; }
            flushLedger();
            engine.callWebhook(entry, "failed", `会话不可达（连续 ${entry.unknownThreshold ?? engineConfig.unknownThreshold} 次轮询失败）`);
            engine.scanPending();
          } else {
            upsertEntry(entry.key, { consecutiveUnknowns: fails });
            flushLedger();
          }
          break;
        }
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
      return { ok: true, results };
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

      if (patch.content !== undefined) {
        updates.body = patch.content;
        let fc = patch.content;
        if (patch.schedule ?? entry.schedule) fc = "<!-- schedule: " + (patch.schedule ?? entry.schedule) + " -->\n" + fc;
        if (patch.cron ?? entry.cron) fc = "<!-- cron: " + (patch.cron ?? entry.cron) + " -->\n" + fc;
        if (patch.deadline ?? entry.deadline) fc = "<!-- deadline: " + (patch.deadline ?? entry.deadline) + " -->\n" + fc;
        updates.raw = fc;
        writeTaskFile(key, fc);
      }
      if (patch.schedule !== undefined) {
        updates.schedule = patch.schedule;
        let fc = patch.content ?? entry.body;
        if (patch.schedule) fc = "<!-- schedule: " + patch.schedule + " -->\n" + fc;
        if (patch.cron ?? entry.cron) fc = "<!-- cron: " + (patch.cron ?? entry.cron) + " -->\n" + fc;
        if (patch.deadline ?? entry.deadline) fc = "<!-- deadline: " + (patch.deadline ?? entry.deadline) + " -->\n" + fc;
        updates.raw = fc;
        writeTaskFile(key, fc);
      }
      if (patch.cron !== undefined) {
        updates.cron = patch.cron;
        let fc = patch.content ?? entry.body;
        if (patch.schedule ?? entry.schedule) fc = "<!-- schedule: " + (patch.schedule ?? entry.schedule) + " -->\n" + fc;
        if (patch.cron) fc = "<!-- cron: " + patch.cron + " -->\n" + fc;
        if (patch.deadline ?? entry.deadline) fc = "<!-- deadline: " + (patch.deadline ?? entry.deadline) + " -->\n" + fc;
        updates.raw = fc;
        writeTaskFile(key, fc);
      }
      if (patch.deadline !== undefined) {
        updates.deadline = patch.deadline;
        let fc = patch.content ?? entry.body;
        if (patch.schedule ?? entry.schedule) fc = "<!-- schedule: " + (patch.schedule ?? entry.schedule) + " -->\n" + fc;
        if (patch.cron ?? entry.cron) fc = "<!-- cron: " + (patch.cron ?? entry.cron) + " -->\n" + fc;
        if (patch.deadline) fc = "<!-- deadline: " + patch.deadline + " -->\n" + fc;
        updates.raw = fc;
        writeTaskFile(key, fc);
      }
      if (patch.maxGoalRounds !== undefined) updates.maxGoalRounds = patch.maxGoalRounds;
      if (patch.maxBlockedResumes !== undefined) updates.maxBlockedResumes = patch.maxBlockedResumes;
      if (patch.timeoutMs !== undefined) updates.timeoutMs = patch.timeoutMs;
      if (patch.priority !== undefined) updates.priority = Math.max(1, Math.min(10, parseInt(patch.priority, 10)));
      if (patch.webhook !== undefined) updates.webhook = patch.webhook;
      if (patch.workspace !== undefined) updates.workspace = patch.workspace;
      if (patch.agentPreset !== undefined) updates.agentPreset = patch.agentPreset;
      if (patch.autoArchive !== undefined) updates.autoArchive = !!patch.autoArchive;
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

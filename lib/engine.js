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
const TASK_TIMEOUT_MS = 90 * 60 * 1000;
const MAX_CONCURRENT_CAP = 8;

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
        engineConfig.unknownThreshold = Math.max(1, Math.min(20, parseInt(patch.unknownThreshold, 10)));
      }
      if (patch.maxAttempts != null) {
        engineConfig.maxAttempts = Math.max(1, Math.min(10, parseInt(patch.maxAttempts, 10)));
      }
      if (patch.webhook != null) {
        engineConfig.webhook = typeof patch.webhook === "string" ? patch.webhook : null;
      }
      if (patch.workspace != null) {
        engineConfig.workspace = typeof patch.workspace === "string" ? patch.workspace : null;
      }
      if (patch.queueDir != null) {
        engineConfig.queueDir = typeof patch.queueDir === "string" ? patch.queueDir : null;
      }
      if (patch.defaultDeadline != null) {
        engineConfig.defaultDeadline = typeof patch.defaultDeadline === "string" ? patch.defaultDeadline : null;
      }
    },

    // ─── 派发与轮询 ────────────────────────────────────

    async applyAction(action, requestId) {
      const { kind, key, ...opts } = action;
      if (!kind || !key) return { ok: false, error: "缺少 kind 或 key" };

      switch (kind) {
        case "stop": {
          if (!checkRequest(requestId, action)) return { ok: false, error: "重复请求" };
          const result = await engine.stopTask(key);
          flushLedger();
          return result;
        }
        case "archive": {
          if (!checkRequest(requestId, action)) return { ok: false, error: "重复请求" };
          const result = await engine.archiveTask(key);
          flushLedger();
          return result;
        }
        case "restore": {
          if (!checkRequest(requestId, action)) return { ok: false, error: "重复请求" };
          const result = await engine.restoreTask(key);
          flushLedger();
          return result;
        }
        case "delete": {
          if (!checkRequest(requestId, action)) return { ok: false, error: "重复请求" };
          const result = await engine.deleteTask(key);
          flushLedger();
          return result;
        }
        case "rerun": {
          if (!checkRequest(requestId, action)) return { ok: false, error: "重复请求" };
          const result = await engine.rerunTask(key);
          flushLedger();
          return result;
        }
        case "update": {
          if (!checkRequest(requestId, action)) return { ok: false, error: "重复请求" };
          const result = await engine.updateTask(key, opts);
          flushLedger();
          return result;
        }
        case "force-scan": {
          if (!checkRequest(requestId, action)) return { ok: false, error: "重复请求" };
          engine.scanPending();
          return { ok: true };
        }
        case "set-concurrency": {
          if (!checkRequest(requestId, action)) return { ok: false, error: "重复请求" };
          const c = parseInt(opts.value, 10);
          if (isNaN(c) || c < 1 || c > MAX_CONCURRENT_CAP) return { ok: false, error: `并发数必须在 1-${MAX_CONCURRENT_CAP} 之间` };
          setConcurrency(c);
          flushLedger();
          return { ok: true };
        }
        default:
          return { ok: false, error: "未知动作: " + kind };
      }
    },

    async createTask(requestId, opts) {
      if (!checkRequest(requestId, opts)) return { ok: false, error: "重复请求" };

      const content = String(opts.content ?? "");
      const key = String(opts.key ?? "");
      if (key.length === 0) return { ok: false, error: "key 不能为空" };
      if (key.length > 256) return { ok: false, error: "key 不能超过 256 字符" };
      if (content.length > 2 * 1024 * 1024) return { ok: false, error: "content 不能超过 2MB" };

      const entry = findByKey(key);
      const isUpdate = !!entry;

      const schedule = parseSchedule(content);
      const body = stripSchedule(content);

      const patch = {
        status: "pending",
        sessionId: null,
        goalRef: null,
        workDir: null,
        attempts: 0,
        blockedResumes: 0,
        executions: [],
        body,
        raw: content,
        schedule: schedule.schedule ?? null,
        cron: schedule.cron ?? null,
        deadline: schedule.deadline ?? null,
        priority: opts.priority ?? engineConfig.priority,
        webhook: opts.webhook ?? engineConfig.webhook,
        workspace: opts.workspace ?? engineConfig.workspace,
        agentPreset: opts.agentPreset ?? engineConfig.agentPreset,
        maxGoalRounds: opts.maxGoalRounds ?? engineConfig.maxGoalRounds,
        maxBlockedResumes: opts.maxBlockedResumes ?? engineConfig.maxBlockedResumes,
        timeoutMs: opts.timeoutMs ?? TASK_TIMEOUT_MS,
        autoArchive: opts.autoArchive ?? engineConfig.autoArchive,
        stallThreshold: opts.stallThreshold ?? engineConfig.stallThreshold,
        unknownThreshold: opts.unknownThreshold ?? engineConfig.unknownThreshold,
        maxAttempts: opts.maxAttempts ?? engineConfig.maxAttempts,
      };

      if (isUpdate) {
        upsertEntry(key, patch);
      } else {
        upsertEntry(key, patch);
        writeTaskFile(key, content);
      }

      flushLedger();

      if (!opts.schedule && !opts.cron) {
        engine.scanPending();
      }

      return {
        ok: true,
        key,
        existing: isUpdate,
        status: "pending",
      };
    },

    async startScanning(timer, intervalMs) {
      function tick() { engine.scanPending(); }
      tick();
      return timer.interval(tick, intervalMs);
    },

    async startPolling(timer) {
      function tick() { engine.pollRunning(); }
      return timer.interval(tick, POLL_INTERVAL_MS);
    },

    async scanPending() {
      try {
        const tasks = listTaskFiles();
        const entries = loadLedger();
        let dispatched = 0;
        const available = getConcurrency() - runningCount();

        const sorted = tasks.sort((a, b) => {
          const pa = findByKey(a.key)?.priority ?? engineConfig.priority;
          const pb = findByKey(b.key)?.priority ?? engineConfig.priority;
          return (pb ?? 5) - (pa ?? 5);
        });

        for (const task of sorted) {
          if (dispatched >= available) break;
          if (inFlight.has(task.key)) continue;

          if (task.schedule?.schedule) {
            const scheduledAt = new Date(task.schedule.schedule).getTime();
            if (Date.now() < scheduledAt) continue;
          }
          if (task.schedule?.cron) {
            if (!matchCron(task.schedule.cron)) continue;
          }

          let entry = findByKey(task.key);
          if (entry && entry.status !== "pending" && entry.status !== "failed") continue;

          inFlight.add(task.key);
          dispatched++;
          engine._dispatch(task).finally(() => { inFlight.delete(task.key); });
        }
      } catch (err) {
        console.error("[autoqueue] scan error:", err);
      }
    },

    async pollRunning() {
      try {
        const entries = loadLedger();
        const running = entries.filter(e => e.status === "running" && e.sessionId);
        for (const entry of running) {
          if (inFlight.has(entry.key)) continue;
          inFlight.add(entry.key);
          try { await engine._pollOne(entry); }
          finally { inFlight.delete(entry.key); }
        }
      } catch (err) {
        console.error("[autoqueue] poll error:", err);
      }
    },

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

      const execRecord = {
        id: crypto.randomUUID(),
        sessionId: null,
        attempt: entry.attempts,
        startedAt: new Date().toISOString(),
      };

      try {
        const launched = await runner.launch(entry);
        execRecord.sessionId = launched.sessionId;
        entry = upsertEntry(task.key, {
          sessionId: launched.sessionId,
          goalRef: launched.goalRef,
        });
        entry.executions.push(execRecord);
        flushLedger();
      } catch (err) {
        if (err instanceof SessionLaunchError && err.sessionId) {
          execRecord.sessionId = err.sessionId;
          entry = upsertEntry(task.key, { sessionId: err.sessionId });
          runner.cancelSession(err.sessionId).catch(() => {});
        }
        execRecord.endedAt = new Date().toISOString();
        execRecord.result = "failed";
        execRecord.error = err.message;
        entry.executions.push(execRecord);

        const maxAttempts = entry.maxAttempts ?? engineConfig.maxAttempts;
        if (entry.attempts < maxAttempts) {
          upsertEntry(task.key, { status: "failed" });
          flushLedger();
        } else {
          await engine._finalize(task.key, "failed", "启动失败: " + err.message);
        }
      }
    },

    async _pollOne(entry) {
      try {
        const proj = await runner.pollTask(entry);
        if (!proj) return;

        if (entry.wakeupNeeded) {
          try {
            await runner.wakeup(entry.sessionId, entry.goalRef);
            upsertEntry(entry.key, { wakeupNeeded: false });
            flushLedger();
          } catch { /* 唤醒失败不阻塞 */ }
        }

        const timeoutMs = entry.timeoutMs ?? TASK_TIMEOUT_MS;
        if (runner.isTimeout(entry.executions[entry.executions.length - 1]?.startedAt)) {
          await runner.cancelTask(entry.sessionId, entry.goalRef);
          const exec = entry.executions[entry.executions.length - 1];
          if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "failed"; exec.error = "任务超时"; }
          await engine._finalize(entry.key, "failed", "任务超时");
          return;
        }

        const effectiveDeadline = entry.deadline ?? engineConfig.defaultDeadline;
        if (effectiveDeadline && matchCron(effectiveDeadline)) {
          await runner.cancelTask(entry.sessionId, entry.goalRef);
          const exec = entry.executions[entry.executions.length - 1];
          if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "stopped"; exec.error = "已达截止时间"; }
          await engine._finalize(entry.key, "stopped", "已达截止时间");
          return;
        }

        switch (proj.phase) {
          case "complete": {
            const exec = entry.executions[entry.executions.length - 1];
            if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "done"; }
            await engine._finalize(entry.key, "done", null);
            await engine.archiveIfEnabled(entry);
            break;
          }
          case "blocked": {
            if (entry.blockedResumes < (entry.maxBlockedResumes ?? engineConfig.maxBlockedResumes)) {
              await runner.antiBlock(entry);
              entry = findByKey(entry.key);
              upsertEntry(entry.key, { blockedResumes: (entry.blockedResumes ?? 0) + 1 });
              flushLedger();
            } else {
              const exec = entry.executions[entry.executions.length - 1];
              if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "failed"; exec.error = "反阻塞次数用尽"; }
              await engine._finalize(entry.key, "failed", "反阻塞次数用尽");
            }
            break;
          }
          case "active":
          case "running": {
            const lastExec = entry.executions[entry.executions.length - 1];
            if (lastExec && Date.now() - new Date(lastExec.startedAt).getTime() > timeoutMs) {
              await runner.cancelTask(entry.sessionId, entry.goalRef);
              const exec = entry.executions[entry.executions.length - 1];
              if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "failed"; exec.error = "任务超时"; }
              await engine._finalize(entry.key, "failed", "任务超时");
            } else if (lastExec) {
              lastExec.endedAt = new Date().toISOString();
              lastExec.result = "running";
              upsertEntry(entry.key, { consecutiveActive: (entry.consecutiveActive ?? 0) + 1 });
            }
            break;
          }
          case "unknown": {
            const consecutiveUnknowns = (entry.consecutiveUnknowns ?? 0) + 1;
            if (consecutiveUnknowns >= (entry.unknownThreshold ?? engineConfig.unknownThreshold)) {
              await runner.cancelTask(entry.sessionId, entry.goalRef);
              const exec = entry.executions[entry.executions.length - 1];
              if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "failed"; exec.error = "轮询失败次数过多"; }
              await engine._finalize(entry.key, "failed", "轮询失败次数过多");
            } else {
              upsertEntry(entry.key, { consecutiveUnknowns });
            }
            break;
          }
        }
      } catch (err) {
        console.error(`[autoqueue] poll error for ${entry.key}:`, err);
        const exec = entry.executions[entry.executions.length - 1];
        if (exec) { exec.endedAt = new Date().toISOString(); exec.result = "failed"; exec.error = String(err); }
        await engine._finalize(entry.key, "failed", String(err));
      }
    },

    async _finalize(key, result, error) {
      const entry = findByKey(key);
      if (!entry) return;

      if (result === "done" && entry.workDir) {
        try {
          const reportPath = join(entry.workDir, "执行报告.md");
          if (existsSync(reportPath)) {
            const report = readFileSync(reportPath, "utf8");
            entry.reports = entry.reports ?? {};
            entry.reports.report = report;
          }
        } catch { /* 报告读取失败不阻塞 */ }
      }

      upsertEntry(key, {
        status: result,
        sessionId: result === "done" ? null : entry.sessionId,
        goalRef: result === "done" ? null : entry.goalRef,
      });
      flushLedger();
      await engine.callWebhook(entry, result, error);
    },

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
      if (entry.status === "running") return { ok: false, error: "运行中的任务不能归档，请先 stop" };
      try { await runner.archiveSessions(entry); } catch {}
      upsertEntry(key, { archivedAt: new Date().toISOString() });
      flushLedger();
      return { ok: true };
    },

    async restoreTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (!entry.archivedAt) return { ok: false, error: "任务未归档" };
      upsertEntry(key, { archivedAt: null });
      flushLedger();
      return { ok: true };
    },

    async deleteTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.status !== "pending") return { ok: false, error: "只能删除待执行的任务，已执行的任务请使用归档" };
      removeTaskFile(key);
      removeEntry(key);
      flushLedger();
      return { ok: true };
    },

    async updateTask(key, patch) {
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

    async rerunTask(key) {
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
      return { ok: true, key };
    },

    getOptions() {
      return { agents: [], workspaces: [] };
    },

    taskDetail(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };

      const detail = { ...entry, reports: {} };

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

// ─── 调度解析辅助 ───────────────────────────────────────

function parseSchedule(raw) {
  const result = {};
  const lines = raw.split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*<!--\s*(schedule|cron|deadline):\s*(.+?)\s*-->\s*$/);
    if (m) result[m[1]] = m[2].trim();
  }
  return result;
}

function stripSchedule(raw) {
  return raw.replace(/^<!--\s*(schedule|cron|deadline):\s*.+?\s*-->\s*/gm, "").trim();
}
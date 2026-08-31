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
    maxGoalRounds: options.maxGoalRounds ?? 60, // 长任务需要更多轮数
    maxBlockedResumes: options.maxBlockedResumes ?? 3,
    autoArchive: options.autoArchive ?? false,
    maxAttempts: options.maxAttempts ?? 3,
    taskTimeoutMs: options.taskTimeoutMs ?? 180 * 60 * 1000, // 3 小时，全局可配
    agentPreset: options.agentPreset ?? null,
    model: options.model ?? null,
    priority: options.priority ?? 5,
    webhook: options.webhook ?? null,
    workspace: options.workspace ?? null,
    queueDir: options.queueDir ?? null,
    defaultDeadline: options.defaultDeadline ?? null,
    enableNotifications: options.enableNotifications ?? true,
    unknownThreshold: options.unknownThreshold ?? 3,

    retryBackoffBaseMs: options.retryBackoffBaseMs ?? 30_000,  // 重试退避基数（默认 30s）
    retryBackoffMaxMs: options.retryBackoffMaxMs ?? 300_000,   // 退避上限（默认 5min）
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
      return { ...s, tasks, unreadCount: unreadCount(), config: { ...s.config, webhook: engineConfig.webhook, queueDir: engineConfig.queueDir, workspace: engineConfig.workspace, enableNotifications: engineConfig.enableNotifications, unknownThreshold: engineConfig.unknownThreshold } };
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
      if (patch.workspace !== undefined) {
        engineConfig.workspace = patch.workspace || null;
      }
      if (patch.agentPreset !== undefined) {
        engineConfig.agentPreset = patch.agentPreset || null;
      }
      if (patch.model !== undefined) {
        engineConfig.model = patch.model || null;
      }

      if (patch.queueDir !== undefined) {
        engineConfig.queueDir = patch.queueDir || null;
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
        model: opts.model ?? engineConfig.model,
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
            attempts: 0,
            nextRetryAt: null, retryBackoffMs: 0,
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
        let entry = findByKey(task.key);
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
            agentPreset: engineConfig.agentPreset,
          };
          upsertEntry(task.key, entry);
        }

        if (skipDueToSchedule) continue;

        // 已存在且非 pending/failed → 跳过
        if (entry && entry.status !== "pending" && entry.status !== "failed") continue;
        // 已归档的任务不派发
        if (entry?.archivedAt) continue;

        // 退避检查：nextRetryAt 在未来 → 跳过（限流/断连后冷却）
        if (entry?.nextRetryAt && Date.now() < entry.nextRetryAt) continue;

        inFlight.add(task.key);
        dispatched++;
        engine._dispatch(task).finally(() => { inFlight.delete(task.key); });
      }
    } finally { this._scanning = false; } },



    // ─── 模式解析 ──────────────────────────────────────

    /**
     * 根据任务内容自动判定执行模式
     * PTC 适合：步骤明确、可编程化的批量操作
     * unattended 适合：探索性、需要中途判断的任务
     * @param {string} content - 任务正文
     * @returns {"unattended"|"ptc-unattended"}
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
      return ptcScore >= 2 ? "ptc-unattended" : "unattended";
    },

    // ─── 内部派发 ──────────────────────────────────────

    async _dispatch(task) {
      let entry = findByKey(task.key);

      // Check dispatch limit to prevent cron tasks from flooding the queue
      const maxAttempts = entry?.maxAttempts ?? engineConfig.maxAttempts;
      if ((entry?.attempts ?? 0) >= maxAttempts) {
        if (entry?.cron) {
          // cron 任务：失败后重写文件，保留定时计划，等下一轮自动触发
          writeTaskFile(task.key, entry.raw ?? task.raw ?? "");
          upsertEntry(task.key, {
            status: "pending", sessionId: null, goalRef: null,
            attempts: 0, blockedResumes: 0, lastCronDispatch: null,
          });
          flushLedger();
          engine.callWebhook(entry, "failed", "max dispatch attempts reached (" + maxAttempts + "), cron task rescheduled");
        } else {
          upsertEntry(task.key, { status: "failed", sessionId: null, goalRef: null });
          removeTaskFile(task.key);
          flushLedger();
          engine.callWebhook(entry, "failed", "max dispatch attempts reached (" + maxAttempts + ")");
        }
        return;
      }

      // 用户指定了 preset 就用用户的，否则自动判定
      let effectivePreset = entry?.agentPreset;
      if (!effectivePreset) {
        effectivePreset = engine.resolveMode(entry?.body ?? task.body);
      }

      const workDir = entry?.workDir ?? createRunDir(task.key);
      entry = upsertEntry(task.key, {
        status: "running",
        workDir,
        sessionId: null,
        goalRef: null,
        agentPreset: effectivePreset,
        attempts: (entry?.attempts ?? 0) + 1,
        nextRetryAt: null,
        retryBackoffMs: 0,
        body: task.body,
        raw: task.raw,
        schedule: task.schedule?.schedule ?? entry?.schedule,
        ...(task.schedule?.cron ? { lastCronDispatch: Math.floor(Date.now() / 60_000) } : {}),
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
        execRecord.sessionId = sessionId;
        entry = upsertEntry(task.key, { sessionId, goalRef, ...(workspaceId ? { workspace: workspaceId } : {}) });
        entry.executions.push(execRecord);
        flushLedger();
        // 先持久化 sessionId 再删文件，防止崩溃丢任务
        // 检查是否在 launch 期间被 stop 了
        const current = findByKey(task.key);
        if (current && current.status !== "running") {
          await runner.cancelTask(sessionId, goalRef);
          return;
        }
        removeTaskFile(task.key);
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
          // 重试：回退到 pending，带退避延迟
          const backoffBase = engineConfig.retryBackoffBaseMs;
          const backoffMax = engineConfig.retryBackoffMaxMs;
          const currentBackoff = entry.retryBackoffMs ?? 0;
          const nextDelay = currentBackoff === 0
            ? backoffBase
            : Math.min(currentBackoff * 2, backoffMax);
          const nextRetryAt = Date.now() + nextDelay;
          upsertEntry(task.key, { status: "pending", sessionId: null, goalRef: null, retryBackoffMs: nextDelay, nextRetryAt });
          flushLedger();
          // 不立即触发扫描，让定时器自然处理（退避期内会跳过）
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
      const timeoutMs = entry.timeoutMs ?? engineConfig.taskTimeoutMs;
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
        // session 不在 DSH 活跃列表里 → 不做判断
        // 可能只是 API 暂时不可见，也可能真死了 — 无法区分，不动
        // 靠超时兜底：3 小时 timeout 自然会触发重试
        return;
      }

      // ── session 活着 → 查 goal phase ───────────────
      const poll = await runner.pollTask(sessionId);
      switch (poll.phase) {
        case "complete": {
          await runner.finalize(entry, "done");
          if (lastExec) { lastExec.endedAt = new Date().toISOString(); lastExec.result = "done"; }

          if (entry.cron) {
            // cron task: re-write inbox file, reset for next cycle
            // each cron cycle is independent, reset attempts for fresh counting
            writeTaskFile(entry.key, entry.raw ?? entry.body ?? "");
            upsertEntry(entry.key, {
              status: "pending",
              sessionId: null,
              goalRef: null,
              consecutiveUnknowns: 0,
              attempts: 0,
              blockedResumes: 0,
            });
          } else {
            // 一次性任务：正常归档
            await engine.archiveIfEnabled(entry);
            upsertEntry(entry.key, { status: "done", sessionId: null, goalRef: null, consecutiveUnknowns: 0 });
          }
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
            upsertEntry(entry.key, { status: "failed", sessionId: null, goalRef: null, consecutiveUnknowns: 0, blockedResumes: blockedCount });
            flushLedger();
            engine.callWebhook(entry, "failed", "超过最大反阻塞次数");
            engine.scanPending();
          }
          break;
        }

        case "active":
        case "running":
        case "paused":
          if (entry.consecutiveUnknowns > 0) {
            upsertEntry(entry.key, { consecutiveUnknowns: 0 });
            flushLedger();
          }
          break;

        case "unknown":
        default: {
          // session 活着（已通过 sessionAlive 检查）→ "unknown" 很可能是
          // rate limit / API 瞬态错误，不要累计重试，避免误发 wakeup 消息
          // 只记录日志，等待下一轮自然恢复
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
      // Transient failures (timeout/disconnect/session temp unavailable)
      // try wakeup first before destroying and recreating the session
      const transientReasons = ["session-gone"]; // 只在确认 session 消失时推送，不猜测
      if (transientReasons.includes(reason) && entry.sessionId && entry.goalRef) {
        try {
          await runner.wakeup(entry.sessionId, entry.goalRef);
          upsertEntry(entry.key, { consecutiveUnknowns: 0, nextRetryAt: null, retryBackoffMs: 0 });
          flushLedger();
          return;
        } catch {
          // wakeup failed, fall through to full retry
        }
      }

      // 1. Cancel old session
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
        upsertEntry(entry.key, { status: "failed", sessionId: null, goalRef: null, consecutiveUnknowns: 0 });
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
        const execRecord = {
          id: crypto.randomUUID(),
          sessionId,
          attempt: attempts,
          startedAt: new Date().toISOString(),
        };
        upsertEntry(entry.key, {
          sessionId,
          goalRef,
          ...(workspaceId ? { workspace: workspaceId } : {}),
          attempts,
          consecutiveUnknowns: 0,
          nextRetryAt: null,
          retryBackoffMs: 0,
        });
        flushLedger();

        // 追加执行记录（必须在 flushLedger 之后，确保 entry 已持久化）
        const refreshed = findByKey(entry.key);
        if (refreshed) {
          if (!refreshed.executions) refreshed.executions = [];
          refreshed.executions.push(execRecord);
          flushLedger();
        }
      } catch (err) {
        // 启动失败 → 退避重试：设 nextRetryAt 让扫描跳过，不消耗 attempts
        const backoffBase = engineConfig.retryBackoffBaseMs;
        const backoffMax = engineConfig.retryBackoffMaxMs;
        const currentBackoff = entry.retryBackoffMs ?? 0;
        const nextDelay = currentBackoff === 0
          ? backoffBase
          : Math.min(currentBackoff * 2, backoffMax);
        const nextRetryAt = Date.now() + nextDelay;

        writeTaskFile(entry.key, entry.raw ?? entry.body ?? "");
        upsertEntry(entry.key, {
          status: "pending",
          sessionId: null,
          goalRef: null,
          // 不递增 attempts，避免限流时快速耗尽重试次数
          retryBackoffMs: nextDelay,
          nextRetryAt,
        });
        flushLedger();
        // 不立即触发 scanPending，等退避时间到后由定时器自然扫描
      }
    },

    // ─── 任务操作 ──────────────────────────────────────

    async stopTask(key) {
      const entry = findByKey(key);
      if (!entry) return { ok: false, error: "任务不存在" };
      if (entry.status === "stopped" || entry.status === "done") return { ok: false, error: "任务已终止" };
      if (entry.sessionId && entry.goalRef) {
        const cancelled = await runner.cancelTask(entry.sessionId, entry.goalRef);
        if (!cancelled) {
          return { ok: false, error: "停止失败：DSH 会话取消失败，请重试" };
        }
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
        await runner.archiveSessions(entry);
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
      if (patch.agentPreset !== undefined) {
        updates.agentPreset = patch.agentPreset;
      } else if (patch.content !== undefined) {
        // 内容变更时自动重估执行模式
        updates.agentPreset = engine.resolveMode(patch.content);
      }
      if (patch.autoArchive !== undefined) updates.autoArchive = !!patch.autoArchive;
      if (patch.enableNotifications !== undefined) updates.enableNotifications = !!patch.enableNotifications;
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
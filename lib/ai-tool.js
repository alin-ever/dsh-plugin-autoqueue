/**
 * autoqueue AI 调度层
 * 薄客户端：所有调用透传到 HTTP API 层，不直接访问 engine
 * HTTP 层是唯一入口，校验/清洗/格式化只写一次
 * @module autoqueue/ai-tool
 */

import { defineTool } from "@deepseek-ai/dsh-tools";

const DEFAULT_BASE_URL = "http://127.0.0.1:3080";
const DEFAULT_API_TIMEOUT_MS = 15_000;

// Product-facing names are natural-language discovery metadata. Keep the
// machine protocol stable under the autoqueue_* namespace so an alias never
// creates a second control surface or a second set of tools.
export const AUTOQUEUE_PRODUCT_NAME = "任务队列";
export const AUTOQUEUE_NATURAL_LANGUAGE_ALIASES = Object.freeze(["老登"]);

export const AUTOQUEUE_AI_TOOL_NAMES = Object.freeze([
  "autoqueue_create_task",
  "autoqueue_list_tasks",
  "autoqueue_get_task",
  "autoqueue_update_task",
  "autoqueue_stop_task",
  "autoqueue_archive_task",
  "autoqueue_batch_archive",
  "autoqueue_restore_task",
  "autoqueue_delete_task",
  "autoqueue_rerun_task",
  "autoqueue_mark_read",
  "autoqueue_get_options",
  "autoqueue_get_config",
  "autoqueue_update_config",
  "autoqueue_force_scan",
  "autoqueue_set_concurrency",
]);

function createApiClient(baseUrl, apiToken) {
  const configured = String(baseUrl || DEFAULT_BASE_URL).trim();
  // Validate once during plugin setup, before registering a broken tool set.
  const parsed = new URL(configured);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("autoqueue baseUrl must use http or https");
  }
  if (parsed.username || parsed.password) {
    throw new Error("autoqueue baseUrl must not contain credentials");
  }
  if (parsed.search || parsed.hash) {
    throw new Error("autoqueue baseUrl must not contain a query or fragment");
  }
  const root = parsed.href.replace(/\/+$/, "");

  return async function apiRequest(path, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(
      `autoqueue HTTP request timed out after ${DEFAULT_API_TIMEOUT_MS}ms`,
    )), DEFAULT_API_TIMEOUT_MS);
    timer.unref?.();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (apiToken) headers.set("Authorization", `Bearer ${apiToken}`);

    try {
      const response = await fetch(`${root}${path}`, { ...init, headers, signal: controller.signal });
      const contentType = response.headers.get("content-type") ?? "";
      if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
        throw new Error(`autoqueue HTTP ${response.status} returned non-JSON content`);
      }
      let body;
      try {
        body = await response.json();
      } catch (error) {
        throw new Error(`autoqueue HTTP ${response.status} returned invalid JSON`, { cause: error });
      }
      if (!response.ok) {
        const detail = body && typeof body.error === "string" ? `: ${body.error}` : "";
        throw new Error(`autoqueue HTTP ${response.status}${detail}`);
      }
      return body;
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * 注册 AI 调度工具和系统提示
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {string} [baseUrl] - HTTP API 基地址，默认 http://127.0.0.1:3080
 * @param {string|null} [apiToken] - 远程 HTTP API Bearer token
 */
export function registerAiTool(ctx, baseUrl = DEFAULT_BASE_URL, apiToken = null) {
  const apiRequest = createApiClient(baseUrl, apiToken);
  // ─── 系统提示 ──────────────────────────────────────────
  ctx.systemPrompt.section({
    name: "tool:autoqueue",
    order: 200,
    text: `You have access to ${AUTOQUEUE_PRODUCT_NAME} (Task Queue) tools for managing unattended background tasks. `
      + `Users may also call ${AUTOQUEUE_PRODUCT_NAME} “${AUTOQUEUE_NATURAL_LANGUAGE_ALIASES.join("”, “")}”; treat those aliases as requests for the same autoqueue tools. `
      + "Aliases are natural-language discovery only and never change the machine tool names. "
      + `Available tools: ${AUTOQUEUE_AI_TOOL_NAMES.map(name => `\`${name}\``).join(", ")}. `
      + "Use these when the user asks to schedule, query, or modify background tasks. "
      + "Provide a concise `key` summarizing the task in the user's language (e.g. \"日报\" or \"代码审查\"). "
      + "If omitted, a timestamp-based key is used. "
      + "Before creating a task, ask for any missing details (what to do, where to look, output format).\n\n"
      + "Scheduling: use `schedule` (ISO 8601) for one-time execution, `cron` (5-field) for recurring. "
      + "Common cron: daily 08:00 = \"0 8 * * *\", every 30min = \"*/30 * * * *\", hourly = \"0 * * * *\", "
      + "weekdays 08:00 = \"0 8 * * 1-5\", every Monday 08:00 = \"0 8 * * 1\", "
      + "08:00 & 20:00 daily = \"0 8,20 * * *\", 1st of month 08:00 = \"0 8 1 * *\". "
      + "Use `deadline` (5-field cron) to set a cutoff time after which a running task is force-stopped. "
      + "Use `autoqueue_delete_task` only for pending tasks; use `autoqueue_archive_task` for executed tasks.",
  });

  registerCreateTask(ctx, apiRequest);
  registerListTasks(ctx, apiRequest);
  registerGetTask(ctx, apiRequest);
  registerUpdateTask(ctx, apiRequest);
  registerStopTask(ctx, apiRequest);
  registerArchiveTask(ctx, apiRequest);
  registerBatchArchive(ctx, apiRequest);
  registerRestoreTask(ctx, apiRequest);
  registerDeleteTask(ctx, apiRequest);
  registerRerunTask(ctx, apiRequest);
  registerMarkRead(ctx, apiRequest);
  registerGetOptions(ctx, apiRequest);
  registerGetConfig(ctx, apiRequest);
  registerUpdateConfig(ctx, apiRequest);
  registerForceScan(ctx, apiRequest);
  registerSetConcurrency(ctx, apiRequest);
}

// ─── 渲染辅助 ────────────────────────────────────────────

const STATUS_LABEL = {
  pending: "⏳ 待执行",
  running: "🔄 运行中",
  done: "✅ 已完成",
  failed: "❌ 失败",
  stopped: "⏹️ 已停止",
  interrupted: "⚠️ 中断",
};

function cronToHuman(cron) {
  if (!cron) return "";
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dom, month, dow] = parts;

  const time = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;

  // 每天
  if (dom === "*" && month === "*" && dow === "*") return `每天 ${time}`;
  // 工作日
  if (dom === "*" && month === "*" && dow === "1-5") return `工作日 ${time}`;
  // 每周特定日
  const DOW_MAP = { 0: "日", 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六" };
  if (dom === "*" && month === "*" && /^\d$/.test(dow) && DOW_MAP[dow]) {
    return `每周${DOW_MAP[dow]} ${time}`;
  }
  // 每月特定日
  if (/^\d+$/.test(dom) && month === "*" && dow === "*") return `每月${parseInt(dom, 10)}日 ${time}`;
  // 间隔
  if (min.startsWith("*/")) return `每${min.slice(2)}分钟`;

  return cron; // fallback
}

function scheduleSummary(task) {
  if (task.cron) return cronToHuman(task.cron);
  if (task.schedule) return `定时: ${task.schedule}`;
  return "手动触发";
}

function taskFirstLine(task) {
  const body = task.body || "";
  const line = body.split("\n")[0]?.replace(/^#+\s*/, "").trim();
  return line || task.key;
}

function configDigest(task) {
  const parts = [];
  if (task.autoArchive) parts.push("自动归档");
  if (task.timeoutMs) parts.push(`超时 ${Math.round(task.timeoutMs / 60000)} 分钟`);
  if (task.deadline) parts.push(`截止 ${cronToHuman(task.deadline)}`);
  if (task.maxGoalRounds) parts.push(`最多 ${task.maxGoalRounds} 轮`);
  if (task.priority && task.priority !== 5) parts.push(`优先级 ${task.priority}`);
  return parts.length ? parts.join(" · ") : "";
}

// ─── 工具注册函数 ────────────────────────────────────────

function registerCreateTask(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_create_task",
    description: `Create a task in ${AUTOQUEUE_PRODUCT_NAME} (also called ${AUTOQUEUE_NATURAL_LANGUAGE_ALIASES.join(", ")}) for unattended AI execution. Provide a concise \`key\` summarizing the task in the user's language (e.g. "日报" or "代码审查"). If omitted, a timestamp-based key is used.`,
    parameters: {
      key: { type: "string", description: "Concise task identifier in the user's language (e.g. \"日报\" or \"代码审查\"). Provide a meaningful summary of the task. If omitted, a timestamp-based key is used." },
      content: { type: "string", required: true, description: "Task content in Markdown" },
      priority: { type: "integer", description: "Task priority 1-10. Default 5." },
      schedule: { type: "string", description: "ISO 8601 one-time execution time. Example: \"2026-09-01T08:00:00Z\". Runs once at that time." },
      cron: { type: "string", description: "Cron expression for recurring execution (5 fields: minute hour day month weekday). Examples: \"0 8 * * *\" = daily 08:00, \"0 8 * * 1-5\" = weekdays 08:00, \"0 8 * * 1\" = every Monday 08:00, \"*/30 * * * *\" = every 30 minutes, \"0 * * * *\" = hourly, \"0 8,20 * * *\" = 08:00 and 20:00 daily, \"0 8 1 * *\" = 1st of each month 08:00." },
      webhook: { type: "string", description: "Webhook URL called on completion or failure" },
      maxGoalRounds: { type: "integer", description: "Maximum goal continuation rounds. Default 40, range 1-100." },
      maxBlockedResumes: { type: "integer", description: "Maximum anti-block resumes (steering + goal resume). Default 3, range 0-10. When exceeded, the task is marked failed. Distinct from maxAttempts (session restart limit)." },
      timeoutMs: { type: "integer", description: "Task timeout in milliseconds. Default 180 minutes." },
      autoArchive: { type: "boolean", description: "Auto-archive on completion. Default follows global config." },
      maxAttempts: { type: "integer", description: "Dispatch retry limit. Default 3." },
      deadline: { type: "string", description: "Cron expression for force-stop deadline. When matched, a running task is stopped. Example: \"0 21 * * *\" = stop at 21:00 daily. Task-level overrides global defaultDeadline." },
      enableNotifications: { type: "boolean", description: "Enable a browser notification when the task reaches a terminal state. Default follows global config." },
    },
    async execute(args) {
      const body = {
        requestId: `ai-${crypto.randomUUID()}`,
        key: args.key,
        content: args.content,
      };
      // 只传显式提供的可选参数，避免把 undefined 传给 HTTP 层
      for (const opt of ["priority", "schedule", "cron",
        "webhook", "maxGoalRounds", "maxBlockedResumes",
        "timeoutMs", "autoArchive", "maxAttempts", "deadline", "enableNotifications"]) {
        if (args[opt] !== undefined) body[opt] = args[opt];
      }
      return apiRequest("/api/queue/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          key: { type: "string" },
          error: { type: "string" },
        },
      },
      render: (args, value) => {
        if (value.ok) {
          const schedule = args.cron ? cronToHuman(args.cron) : args.schedule ? `定时: ${args.schedule}` : "手动触发";
          const cfg = [];
          if (args.autoArchive) cfg.push("自动归档");
          if (args.timeoutMs) cfg.push(`超时 ${Math.round(args.timeoutMs / 60000)} 分钟`);
          if (args.maxGoalRounds) cfg.push(`最多 ${args.maxGoalRounds} 轮`);
          return [{ type: "text", text: `✅ 已创建任务 \`${value.key}\`\n   调度: ${schedule}${cfg.length ? "\n   " + cfg.join(" · ") : ""}` }];
        }
        return [{ type: "text", text: `创建失败: ${value.error || "未知错误"}` }];
      },
    },
    presentCall: (args) => ({ card: "generic", title: `创建任务: ${args.key}`, kind: "create", detail: args.cron ? cronToHuman(args.cron) : args.schedule ? `定时: ${args.schedule}` : "手动" }),
  }));
}

function registerListTasks(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_list_tasks",
    description: `List all tasks in ${AUTOQUEUE_PRODUCT_NAME} (also called ${AUTOQUEUE_NATURAL_LANGUAGE_ALIASES.join(", ")}), optionally including archived tasks.`,
    parameters: {
      includeArchived: { type: "boolean", description: "Include archived tasks. Default false." },
    },
    async execute(args) {
      const qs = args.includeArchived ? "?archived=1&compact=1" : "?compact=1";
      const value = await apiRequest(`/api/queue/state${qs}`);
      return {
        ...value,
        tasks: Array.isArray(value?.tasks)
          ? value.tasks.map(task => {
              const { model: _hostGlobalModel, ...safeTask } = task ?? {};
              return safeTask;
            })
          : [],
      };
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          revision: { type: "number" },
          tasks: { type: "json" },
          config: { type: "json" },
          metrics: { type: "json" },
          unreadCount: { type: "number" },
          runtime: {
            type: "object",
            additionalProperties: true,
            properties: {
              monitorMode: { type: "string" },
              watchdogMs: { type: "number" },
              lastPollAt: { type: "json" },
              lastScanAt: { type: "json" },
              lastNativeEventAt: { type: "json" },
              lastNativeEventSource: { type: "json" },
              foregroundGate: { type: "string" },
              sessionListKnown: { type: "boolean" },
            },
          },
        },
      },
      render: (_args, value) => {
        const runtime = value.runtime && typeof value.runtime === "object" ? value.runtime : null;
        const runtimeLine = runtime
          ? `\n\n运行监控: ${runtime.monitorMode || "未声明"} · 前台门 ${runtime.foregroundGate || "unknown"}`
          : "";
        if (!value.tasks || value.tasks.length === 0) {
          return [{ type: "text", text: `队列中没有任务。${runtimeLine}` }];
        }
        const lines = value.tasks.map(t => {
          const status = t.stopPending === true
            ? "⏳ 停止收口中"
            : (t.foregroundPaused === true ? "⏸️ 前台让行" : (STATUS_LABEL[t.status] ?? t.status));
          const schedule = scheduleSummary(t);
          const title = taskFirstLine(t);
          return `${status} \`${t.key}\` — ${schedule} — ${title}`;
        });
        return [{ type: "text", text: `队列中有 ${value.tasks.length} 个任务:\n\n${lines.join("\n")}${runtimeLine}` }];
      },
    },
    presentCall: () => ({ card: "generic", title: "查看任务队列", kind: "query" }),
  }));
}

function registerGetTask(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_get_task",
    description: "Get detailed information about a specific task.",
    parameters: {
      key: { type: "string", required: true, description: "Task key to look up" },
    },
    async execute(args) {
      const body = await apiRequest(`/api/queue/detail?key=${encodeURIComponent(args.key)}`);
      // HTTP API 返回 { ok, task: {...} }，拆包后返回
      if (body.ok && body.task) {
        const task = { ...body.task };
        delete task.model;
        // 过滤掉 null 值，避免 schema 校验失败
        for (const key of Object.keys(task)) {
          if (task[key] === null) delete task[key];
        }
        return { ok: true, ...task };
      }
      return body;
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          ok: { type: "boolean" },
          error: { type: "string" },
          key: { type: "string" },
          status: { type: "string", enum: ["pending", "running", "done", "failed", "stopped", "interrupted"] },
          body: { type: "string" },
          schedule: { type: "string" },
          cron: { type: "string" },
          deadline: { type: "string" },

          attempts: { type: "number" },
          blockedResumes: { type: "number" },
          priority: { type: "number" },
          timeoutMs: { type: "number" },
          maxGoalRounds: { type: "number" },
          maxBlockedResumes: { type: "number" },
          autoArchive: { type: "boolean" },
          webhook: { type: "string" },
          workspace: { type: "string" },
          agentPreset: { type: "string" },
          maxAttempts: { type: "number" },
          enableNotifications: { type: "boolean" },
          foregroundPaused: { type: "boolean" },
          stopPending: { type: "boolean" },
          taskType: { type: "string", enum: ["manual", "schedule", "cron"] },
          nextRunAt: { type: "string" },
          currentRound: { type: "number" },
          goalPhase: { type: "string" },
          lastActivityTime: { type: "number" },
          lastSessionId: { type: "string" },
          lastError: { type: "string" },
          readAt: { type: "string" },
          sessionId: { type: "string" },
          goalRef: { type: "object", additionalProperties: true },
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
          archivedAt: { type: "string" },
          executions: { type: "array" },
          reports: { type: "object", additionalProperties: false, properties: { goal: { type: "string" }, result: { type: "string" }, report: { type: "string" } } },
        },
      },
      render: (_args, value) => {
        if (value.error && !value.ok) return [{ type: "text", text: `查询失败: ${value.error}` }];

        const status = value.stopPending === true
          ? "⏳ 停止收口中"
          : (value.foregroundPaused === true ? "⏸️ 前台让行" : (STATUS_LABEL[value.status] ?? value.status));
        const schedule = scheduleSummary(value);
        const cfg = configDigest(value);
        const title = taskFirstLine(value);

        const sections = [
          `📋 \`${value.key}\``,
          `   ${title}`,
          "",
          `   ${status}`,
          `   调度: ${schedule}`,
        ];
        if (cfg) sections.push(`   ${cfg}`);
        if (value.goalPhase || value.currentRound != null) {
          sections.push(`   运行态: ${value.goalPhase || "未声明"}${value.currentRound != null ? ` · 第 ${value.currentRound} 轮` : ""}`);
        }
        if (value.lastError) sections.push(`   最近错误: ${value.lastError}`);
        if (value.lastSessionId) sections.push(`   最近会话: ${value.lastSessionId}`);
        if (value.executions?.length) {
          const last = value.executions[value.executions.length - 1];
          sections.push(`   已执行 ${value.executions.length} 次` + (last.result ? `（最近: ${last.result}）` : ""));
        }
        if (value.createdAt) sections.push(`   创建于: ${value.createdAt}`);

        return [{ type: "text", text: sections.join("\n") }];
      },
    },
    presentCall: (args) => ({ card: "generic", title: `查看任务: ${args.key}`, kind: "query" }),
  }));
}

function registerUpdateTask(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_update_task",
    description: "Update an existing task's configuration or content. Only pending tasks can be updated.",
    parameters: {
      key: { type: "string", required: true, description: "Task key to update" },
      content: { type: "string", description: "New task content in Markdown" },
      cron: { type: "string", description: "New cron expression (5 fields: minute hour day month weekday). Examples: \"0 8 * * *\" = daily 08:00, \"*/30 * * * *\" = every 30 minutes. Set to empty string to clear." },
      schedule: { type: "string", description: "New ISO 8601 one-time execution time. Example: \"2026-09-01T08:00:00Z\". Set to empty string to clear." },
      priority: { type: "integer", description: "New priority 1-10" },
      autoArchive: { type: "boolean", description: "New auto-archive setting" },
      maxGoalRounds: { oneOf: [{ type: "integer" }, { type: "null" }], description: "New max goal rounds; null restores the global default." },
      maxBlockedResumes: { oneOf: [{ type: "integer" }, { type: "null" }], description: "New maximum anti-block resumes, range 0-10; null restores the global default." },
      timeoutMs: { oneOf: [{ type: "integer" }, { type: "null" }], description: "New timeout in milliseconds; null restores the global default." },
      deadline: { type: "string", description: "New deadline cron expression. Set to empty string to clear." },
      webhook: { type: "string", description: "New webhook URL. Set to empty string to clear." },
      enableNotifications: { type: "boolean", description: "Enable or disable the terminal-state browser notification." },
      maxAttempts: { oneOf: [{ type: "integer" }, { type: "null" }], description: "New dispatch retry limit, range 1-10; null restores the global default." },
    },
    async execute(args) {
      const patch = {};
      for (const opt of ["content", "cron", "schedule", "priority",
        "autoArchive", "maxGoalRounds", "maxBlockedResumes", "timeoutMs", "deadline",
        "webhook", "enableNotifications", "maxAttempts"]) {
        if (args[opt] !== undefined) patch[opt] = args[opt];
      }
      const body = {
        requestId: `ai-${crypto.randomUUID()}`,
        action: { kind: "update", key: args.key, ...patch },
      };
      return apiRequest("/api/queue/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          key: { type: "string" },
          error: { type: "string" },
        },
      },
      render: (args, value) => {
        if (value.ok) {
          const changes = [];
          for (const f of ["content", "cron", "schedule", "priority", "autoArchive", "maxGoalRounds", "maxBlockedResumes", "timeoutMs", "deadline", "webhook", "enableNotifications", "maxAttempts"]) {
            if (args[f] !== undefined) changes.push(f);
          }
          const detail = changes.length ? `（${changes.join("、")}）` : "";
          return [{ type: "text", text: `✅ 已更新任务 \`${value.key}\` ${detail}`.trim() }];
        }
        return [{ type: "text", text: `更新失败: ${value.error}` }];
      },
    },
    presentCall: (args) => ({ card: "generic", title: `更新任务: ${args.key}`, kind: "update" }),
  }));
}

// ─── 通用 action 工具工厂 ────────────────────────────────

function registerActionTool(ctx, apiRequest, {
  name, description, kind, verb, noun,
  confirm = true, params = {},
}) {
  const allParams = {
    key: { type: "string", required: true, description: "Task key" },
    ...params,
  };
  ctx.tools.register(defineTool({
    name,
    description,
    parameters: allParams,
    async execute(args) {
      const body = {
        requestId: `ai-${crypto.randomUUID()}`,
        action: { kind, key: args.key },
      };
      // 附加可选参数
      for (const p of Object.keys(params)) {
        if (args[p] !== undefined) body.action[p] = args[p];
      }
      return apiRequest("/api/queue/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          key: { type: "string" },
          error: { type: "string" },
          accepted: { type: "boolean" },
          pending: { type: "boolean" },
        },
      },
      render: (args, value) => {
        if (value.ok && kind === "stop" && value.pending) {
          return [{ type: "text", text: `✅ 停止指令已提交 \`${value.key ?? args.key}\`，正在等待 DSH 权威 idle 确认` }];
        }
        if (value.ok) return [{ type: "text", text: `✅ 已${verb}任务 \`${value.key ?? args.key}\`` }];
        return [{ type: "text", text: `${noun}失败: ${value.error}` }];
      },
    },
    presentCall: (args) => ({ card: "generic", title: `${noun}: ${args.key}`, kind }),
  }));
}

function registerStopTask(ctx, apiRequest) {
  registerActionTool(ctx, apiRequest, {
    name: "autoqueue_stop_task",
    description: "Submit an asynchronous stop for a running task. Pending tasks must be deleted instead. Ownership is retained until DSH authoritatively reports the owned session idle.",
    kind: "stop", verb: "停止", noun: "停止",
  });
}

function registerArchiveTask(ctx, apiRequest) {
  registerActionTool(ctx, apiRequest, {
    name: "autoqueue_archive_task",
    description: "Archive a task (hide from list, archive DSH sessions).",
    kind: "archive", verb: "归档", noun: "归档",
  });
}

function registerBatchArchive(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_batch_archive",
    description: "Archive multiple non-running tasks in one request. Each task has an independent result.",
    parameters: {
      keys: {
        type: "array",
        required: true,
        items: { type: "string" },
        description: "Unique task keys to archive, between 1 and 100 items.",
      },
    },
    async execute(args) {
      return apiRequest("/api/queue/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: `ai-${crypto.randomUUID()}`,
          action: { kind: "archive", keys: args.keys },
        }),
      });
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          results: { type: "array", required: true },
          error: { type: "string" },
        },
      },
      render: (_args, value) => {
        const results = Array.isArray(value.results) ? value.results : [];
        const succeeded = results.filter(result => result?.ok).length;
        const failed = results.length - succeeded;
        return [{ type: "text", text: `批量归档完成：成功 ${succeeded}，失败 ${failed}` }];
      },
    },
    presentCall: args => ({ card: "generic", title: `批量归档 ${args.keys?.length ?? 0} 个任务`, kind: "archive" }),
  }));
}

function registerRestoreTask(ctx, apiRequest) {
  registerActionTool(ctx, apiRequest, {
    name: "autoqueue_restore_task",
    description: "Restore an archived task back to the active list.",
    kind: "restore", verb: "还原", noun: "还原",
  });
}

function registerDeleteTask(ctx, apiRequest) {
  registerActionTool(ctx, apiRequest, {
    name: "autoqueue_delete_task",
    description: "Permanently delete a pending task. Only pending (not yet executed) tasks can be deleted. Use archive for executed tasks.",
    kind: "delete", verb: "删除", noun: "删除",
  });
}

function registerRerunTask(ctx, apiRequest) {
  registerActionTool(ctx, apiRequest, {
    name: "autoqueue_rerun_task",
    description: "Re-run a completed, failed, stopped, interrupted, or pending task.",
    kind: "rerun", verb: "重新执行", noun: "重新执行",
  });
}

function registerMarkRead(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_mark_read",
    description: "Mark a task as read or unread. When a completed task is viewed, mark it as read so it no longer shows as unread.",
    parameters: {
      key: { type: "string", required: true, description: "Task key to mark" },
      read: { type: "boolean", description: "true = mark as read (default), false = mark as unread" },
    },
    async execute(args) {
      return apiRequest("/api/queue/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: args.key, read: args.read !== false }),
      });
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          key: { type: "string" },
          unreadCount: { type: "number" },
          error: { type: "string" },
        },
      },
      render: (_args, value) => {
        if (value.ok) {
          const unread = value.unreadCount ?? 0;
          const msg = unread > 0 ? `（剩余 ${unread} 个未读）` : "（全部已读）";
          return [{ type: "text", text: `✅ 已标记任务 \`${value.key}\` ${_args.read !== false ? "已读" : "未读"} ${msg}` }];
        }
        return [{ type: "text", text: `标记失败: ${value.error}` }];
      },
    },
    presentCall: (args) => ({ card: "generic", title: `标记任务: ${args.key}`, kind: "update" }),
  }));
}

function registerGetOptions(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_get_options",
    description: "Read strict-isolation execution options. Workspace, model, and arbitrary preset overrides are intentionally locked so queue work cannot mutate Host selection state.",
    parameters: {},
    async execute() {
      const value = await apiRequest("/api/queue/options");
      // These are Host control-plane catalogs. Keep a stable response shape
      // for external AI callers, but never forward Host values even if a
      // misconfigured/up-level endpoint returns them.
      return {
        workspaces: [],
        presets: [],
        models: [],
        isolation: value?.isolation ?? { strict: true },
      };
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          workspaces: { type: "array", required: true },
          presets: { type: "array", required: true },
          models: { type: "array", required: true },
          isolation: { type: "object", required: true, additionalProperties: true },
        },
      },
      render: (_args, value) => [{
        type: "text",
        text: "严格隔离已启用：工作区、模型和任意 Agent 预设覆盖已锁定。",
      }],
    },
    presentCall: () => ({ card: "generic", title: "查看 autoqueue 可用选项", kind: "query" }),
  }));
}

const AI_CONFIG_FIELDS = Object.freeze([
  "maxGoalRounds",
  "maxBlockedResumes",
  "unknownThreshold",
  "maxAttempts",
  "taskTimeoutMs",
  "autoArchive",
  "webhook",
  "enableNotifications",
  "priority",
  "defaultDeadline",
  "retryBackoffBaseMs",
  "retryBackoffMaxMs",
]);
const AI_CONFIG_OUTPUT_FIELDS = Object.freeze(["maxConcurrent", "queueDir", ...AI_CONFIG_FIELDS]);

function safeAiConfig(value) {
  const result = {};
  for (const field of AI_CONFIG_OUTPUT_FIELDS) {
    if (value?.[field] !== undefined) result[field] = value[field];
  }
  return result;
}

function registerGetConfig(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_get_config",
    description: "Read the current runtime queue configuration. Security credentials and Host-global model settings are never returned.",
    parameters: {},
    async execute() {
      const [config, state] = await Promise.all([
        apiRequest("/api/queue/config"),
        apiRequest("/api/queue/state?compact=1"),
      ]);
      return safeAiConfig({ ...config, maxConcurrent: state?.config?.maxConcurrent });
    },
    output: {
      schema: { type: "object", additionalProperties: true, properties: {} },
      render: (_args, value) => [{ type: "text", text: `当前并发和执行策略配置：\n${JSON.stringify(value, null, 2)}` }],
    },
    presentCall: () => ({ card: "generic", title: "查看 autoqueue 配置", kind: "query" }),
  }));
}

function registerUpdateConfig(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_update_config",
    description: "Update runtime queue defaults. This cannot change queueDir, authentication, allowed hosts, workspace, Agent preset, or the DSH Host-global model.",
    parameters: {
      maxGoalRounds: { type: "integer", description: "Default goal round limit, 1-100." },
      maxBlockedResumes: { type: "integer", description: "Default anti-block resume limit, 0-10." },
      unknownThreshold: { type: "integer", description: "Consecutive unknown polls before recovery, 1-10." },
      maxAttempts: { type: "integer", description: "Default dispatch retry limit, 1-10." },
      taskTimeoutMs: { type: "integer", description: "Default task timeout in milliseconds, 600000-86400000." },
      autoArchive: { type: "boolean", description: "Default automatic archive setting." },
      webhook: { type: "string", description: "Default webhook URL. Set to empty string to clear." },
      enableNotifications: { type: "boolean", description: "Default terminal-state browser notification setting." },
      priority: { type: "integer", description: "Default priority, 1-10." },
      defaultDeadline: { type: "string", description: "Default five-field deadline cron. Set to empty string to clear." },
      retryBackoffBaseMs: { type: "integer", description: "Retry backoff base in milliseconds, 5000-600000." },
      retryBackoffMaxMs: { type: "integer", description: "Retry backoff ceiling in milliseconds, 10000-3600000." },
    },
    async execute(args) {
      const patch = {};
      for (const field of AI_CONFIG_FIELDS) {
        if (args[field] !== undefined) patch[field] = args[field];
      }
      return safeAiConfig(await apiRequest("/api/queue/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }));
    },
    output: {
      schema: { type: "object", additionalProperties: true, properties: {} },
      render: (args) => [{
        type: "text",
        text: `✅ 已更新 autoqueue 配置：${Object.keys(args).join("、") || "无变更"}`,
      }],
    },
    presentCall: () => ({ card: "generic", title: "更新 autoqueue 配置", kind: "update" }),
  }));
}

function registerForceScan(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_force_scan",
    description: "Scan the Markdown inbox immediately instead of waiting for the periodic scanner.",
    parameters: {},
    async execute() {
      return apiRequest("/api/queue/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: `ai-${crypto.randomUUID()}`,
          action: { kind: "force-scan" },
        }),
      });
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { ok: { type: "boolean", required: true }, error: { type: "string" } },
      },
      render: (_args, value) => [{
        type: "text",
        text: value.ok ? "✅ 已扫描 autoqueue 收件箱" : `扫描收件箱失败: ${value.error}`,
      }],
    },
    presentCall: () => ({ card: "generic", title: "立即扫描 autoqueue 收件箱", kind: "update" }),
  }));
}

function registerSetConcurrency(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_set_concurrency",
    description: "Set the maximum number of concurrently running queue tasks.",
    parameters: {
      maxConcurrent: { type: "integer", required: true, description: "Concurrency limit, 1-8." },
    },
    async execute(args) {
      return apiRequest("/api/queue/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: `ai-${crypto.randomUUID()}`,
          action: { kind: "set-concurrency", maxConcurrent: args.maxConcurrent },
        }),
      });
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { ok: { type: "boolean", required: true }, error: { type: "string" } },
      },
      render: (args, value) => [{
        type: "text",
        text: value.ok ? `✅ 最大并发数已设为 ${args.maxConcurrent}` : `设置并发数失败: ${value.error}`,
      }],
    },
    presentCall: args => ({ card: "generic", title: `设置并发数：${args.maxConcurrent}`, kind: "update" }),
  }));
}

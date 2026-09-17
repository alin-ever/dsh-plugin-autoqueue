/**
 * autoqueue AI 调度层
 * 薄客户端：所有调用透传到 HTTP API 层，不直接访问 engine
 * HTTP 层是唯一入口，校验/清洗/格式化只写一次
 * @module autoqueue/ai-tool
 */

import { defineTool } from "@deepseek-ai/dsh-tools";
import { KEY_VALIDATION_DESCRIPTION } from "./files.js";
import crypto from "node:crypto";

const DEFAULT_BASE_URL = "http://127.0.0.1:3080";
const DEFAULT_API_TIMEOUT_MS = 15_000;

// Product-facing names are natural-language discovery metadata. Keep the
// machine protocol stable under the autoqueue_* namespace so an alias never
// creates a second control surface or a second set of tools.
export const AUTOQUEUE_PRODUCT_NAME = "任务队列";
export const AUTOQUEUE_NATURAL_LANGUAGE_ALIASES = Object.freeze(["队列", "AQ"]);

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
  "autoqueue_list_templates",
  "autoqueue_get_template",
  "autoqueue_guard_session",
  "autoqueue_list_models",
  "autoqueue_restart_dsh",
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
      const text = await response.text();
      let body;
      const contentType = response.headers.get("content-type") ?? "";
      const isJson = /^application\/json(?:\s*;|$)/i.test(contentType);
      if (isJson && text) {
        try {
          body = JSON.parse(text);
        } catch {
          // 响应声明为 JSON 但解析失败，继续用文本当错误信息
        }
      }
      if (!response.ok) {
        const detail = body && typeof body.error === "string"
          ? `: ${body.error}`
          : (text ? `: ${text.slice(0, 200)}` : "");
        throw new Error(`autoqueue HTTP ${response.status}${detail}`);
      }
      if (!isJson) {
        throw new Error(`autoqueue HTTP ${response.status} returned non-JSON content: ${text.slice(0, 200)}`);
      }
      if (body === undefined) {
        // 再尝试解析一次（可能是空响应但 Content-Type 正确）
        try {
          body = JSON.parse(text || "{}");
        } catch (error) {
          throw new Error(`autoqueue HTTP ${response.status} returned invalid JSON`, { cause: error });
        }
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
    text: `You have access to ${AUTOQUEUE_PRODUCT_NAME} tools for managing unattended background tasks. `
      + `Users may also call it "${AUTOQUEUE_NATURAL_LANGUAGE_ALIASES.join('", "')}". `
      + `Available tools: ${AUTOQUEUE_AI_TOOL_NAMES.map(name => `\`${name}\``).join(", ")}. `
      + "Use these when the user asks to schedule, query, or modify background tasks. "
      + "Provide a concise `key` summarizing the task (e.g. \"日报\" or \"代码审查\"). "
      + `The key validation: ${KEY_VALIDATION_DESCRIPTION}. `
      + "Before creating a task, ask for any missing details.\n\n"
      + "Scheduling: `cron` for recurring, `deadline` for force-stop cutoff. "
      + "Use `autoqueue_delete_task` only for pending tasks; use `autoqueue_archive_task` for executed tasks.\n\n"
      + "Session guard (non-autoqueue sessions only): use `autoqueue_guard_session` when the user wants automatic recovery for a normal session. "
      + "Guard cannot be used inside autoqueue unattended sessions.",
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
  registerListTemplates(ctx, apiRequest);
  registerListModels(ctx);
  registerSessionGuardTools(ctx, apiRequest);
  registerRestartDsh(ctx, apiRequest);

  protectOwnedAgentsFromQueueTools(ctx);
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

  // 每分钟
  if (min === "*" && hour === "*" && dom === "*" && month === "*" && dow === "*") return "每分钟";
  // 每 N 分钟
  if (min.indexOf("*/") === 0 && hour === "*" && dom === "*" && month === "*" && dow === "*") return `每${min.slice(2)}分钟`;

  const time = `${hour !== "*" ? hour.padStart(2, "0") : "*"}:${min !== "*" ? min.padStart(2, "0") : "*"}`;

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
  if (task.schedule) return `定时 ${task.schedule}`;
  return "即时执行";
}

function taskFirstLine(task) {
  const body = task.body || "";
  const line = body.split("\n")[0]?.replace(/^#+\s*/, "").trim();
  return line || task.key;
}

function configDigest(task) {
  const parts = [];
  if (task.timeoutMs) parts.push(`超时 ${Math.round(task.timeoutMs / 60000)} 分钟`);
  if (task.deadline) parts.push(`截止 ${cronToHuman(task.deadline)}`);
  if (task.maxGoalRounds) parts.push(`最多 ${task.maxGoalRounds} 轮`);
  if (task.priority && task.priority !== 5) parts.push(`优先级 ${task.priority}`);
  return parts.length ? parts.join(" · ") : "";
}

// ─── 工具注册函数 ────────────────────────────────────────

/**
 * 从 session log 中读取最新的 model/selection 事件，获取当前模型配置。
 * DSH 切换模型后，模型信息通常以事件形式追加到 session log，而不是更新 header。
 */
function isValidLlmProvider(provider) {
  return typeof provider === "string" && provider.length > 0 && !provider.startsWith("persist-");
}

function resolveModelFromSessionLog(session) {
  if (!session) return null;
  const logs = session.log ?? session.events ?? [];
  if (!Array.isArray(logs) || !logs.length) return null;
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i];
    if (entry?.type === "model/selection" || entry?.type === "model/selection-changed") {
      const data = entry.data ?? entry;
      const provider = data?.provider ?? data?.modelProvider ?? null;
      const model = data?.model ?? data?.modelId ?? null;
      if (isValidLlmProvider(provider) && model) return { provider, model };
    }
  }
  return null;
}

function registerCreateTask(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_create_task",
    description: `Create an unattended background task. Use when the user asks to schedule, queue, or run something later.`,
    parameters: {
      key: { type: "string", description: "Concise task identifier (e.g. \"日报\" or \"代码审查\"). " + KEY_VALIDATION_DESCRIPTION + "." },
      content: { type: "string", description: "Task content in Markdown. Do NOT embed cron/schedule/deadline here; use top-level parameters. Required unless `template` is provided." },
      template: { type: "string", description: "Template name from the built-in library. Suggested cron/deadline/priority are applied unless overridden. Call `autoqueue_list_templates` to discover names." },
      title: { type: "string", description: "Session title. Auto-generated from content if omitted." },
      priority: { type: "integer", description: "Task priority 1-10. Default 5." },
      cron: { type: "string", description: "Cron expression for recurring execution (5 fields: minute hour day month weekday). Pass this as a top-level parameter; do NOT embed it inside `content`. Examples: \"0 8 * * *\" = daily 08:00, \"0 8 * * 1-5\" = weekdays 08:00, \"0 8 * * 1\" = every Monday 08:00, \"*/30 * * * *\" = every 30 minutes, \"0 * * * *\" = hourly, \"0 8,20 * * *\" = 08:00 and 20:00 daily, \"0 8 1 * *\" = 1st of each month 08:00." },
      schedule: { type: "string", description: "ISO 8601 timestamp for one-time execution (e.g. \"2026-09-15T08:00:00Z\"). Mutually exclusive with `cron`." },
      webhook: { type: "string", description: "Webhook URL called on completion or failure" },
      maxGoalRounds: { type: "integer", description: "Maximum goal continuation rounds. Default 40, range 1-100." },
      maxBlockedResumes: { type: "integer", description: "Maximum anti-block resumes. Default 3, range 0-10. Distinct from maxAttempts." },
      timeoutMs: { type: "integer", description: "Task timeout in milliseconds. Default 180 minutes." },
      maxAttempts: { type: "integer", description: "Dispatch retry limit. Default 3." },
      deadline: { type: "string", description: "5-field cron for force-stop deadline. Example: \"0 21 * * *\" = stop at 21:00 daily." },
      provider: { type: "string", description: "AI provider to use. Inherits from current session if omitted." },
      model: { type: "string", description: "AI model to use. Inherits from current session if omitted." },
      cwd: { type: "string", description: "Working directory. Inherits from current session if omitted." },
      sandbox: { type: "string", description: "Sandbox mode (e.g. danger-full-access, work-read). Inherits from current session if omitted." },
    },
    async execute(args, exec) {
      let taskContent = args.content;
      let templateDefaults = {};

      if (args.template) {
        const tmpl = await apiRequest(`/api/queue/templates?name=${encodeURIComponent(args.template)}`);
        if (tmpl?.error) {
          throw new Error(`模板 "${args.template}" 不存在或无法读取: ${tmpl.error}`);
        }
        if (!tmpl?.body) {
          throw new Error(`模板 "${args.template}" 没有内容体。`);
        }
        // content 显式提供时优先覆盖模板 body，否则用模板 body
        taskContent = taskContent || tmpl.body;
        // 收集模板的建议配置，后续会被显式参数覆盖
        if (tmpl.suggestedCron) templateDefaults.cron = tmpl.suggestedCron;
        if (tmpl.suggestedDeadline) templateDefaults.deadline = tmpl.suggestedDeadline;
        if (tmpl.suggestedPriority !== undefined) templateDefaults.priority = tmpl.suggestedPriority;
      }

      if (!taskContent || typeof taskContent !== "string" || taskContent.trim() === "") {
        throw new Error("创建任务需要 `content` 或 `template` 参数。请提供任务内容，或选择一个模板名称。");
      }

      const body = {
        requestId: `ai-${crypto.randomUUID()}`,
        key: args.key,
        content: taskContent,
      };
      // 捕获发起任务的当前会话上下文：会话 ID 必须始终继承
      const sourceSession = exec?.agent?.session;
      const sourceAgent = exec?.agent;
      if (sourceSession) {
        body.sourceSessionId = sourceSession.id;
      }
      // cwd：AI 显式指定优先，否则继承当前会话
      if (args.cwd !== undefined && args.cwd !== "") {
        body.cwd = args.cwd;
      } else if (sourceSession?.header?.cwd) {
        body.cwd = sourceSession.header.cwd;
      }
      // sandbox：AI 显式指定优先，否则自动捕获当前会话
      if (args.sandbox !== undefined && args.sandbox !== "") {
        body.sandbox = args.sandbox;
      } else if (sourceSession) {
        try {
          // 通过插件 Cordis ctx 获取 sandboxPolicy；agent.ctx 不是公开 API
          const sandboxPolicy = ctx.get?.("sandboxPolicy");
          if (sandboxPolicy) {
            body.sandbox = sandboxPolicy.resolve({ session: sourceSession }).mode;
          }
        } catch { /* 忽略 */ }
      }
      // provider/model：AI 显式指定优先，否则从 session log 中的最新 model/selection 事件捕获
      const modelFromLog = resolveModelFromSessionLog(sourceSession);
      if (args.provider !== undefined && args.provider !== "" && isValidLlmProvider(args.provider)) {
        body.provider = args.provider;
      } else {
        const capturedProvider = modelFromLog?.provider
          ?? (isValidLlmProvider(sourceAgent?.options?.provider) ? sourceAgent.options.provider : undefined)
          ?? (isValidLlmProvider(sourceAgent?.provider) ? sourceAgent.provider : undefined)
          ?? (isValidLlmProvider(sourceSession?.provider) ? sourceSession.provider : undefined)
          ?? (isValidLlmProvider(sourceSession?.header?.provider) ? sourceSession.header.provider : undefined);
        if (capturedProvider) body.provider = capturedProvider;
      }
      if (args.model !== undefined && args.model !== "") {
        body.model = args.model;
      } else {
        const capturedModel = modelFromLog?.model
          ?? sourceAgent?.options?.model
          ?? sourceAgent?.model
          ?? sourceSession?.model
          ?? sourceSession?.header?.model;
        if (capturedModel) body.model = capturedModel;
      }
      // 先应用模板建议值，再用显式参数覆盖
      for (const opt of ["title", "priority", "cron", "schedule",
        "webhook", "maxGoalRounds", "maxBlockedResumes",
        "timeoutMs", "maxAttempts", "deadline"]) {
        if (args[opt] !== undefined) {
          body[opt] = args[opt];
        } else if (templateDefaults[opt] !== undefined) {
          body[opt] = templateDefaults[opt];
        }
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
          const scheduleInfo = args.cron ? cronToHuman(args.cron) : (args.schedule ? `定时 ${args.schedule}` : "即时执行");
          const cfg = [];
          if (args.timeoutMs) cfg.push(`超时 ${Math.round(args.timeoutMs / 60000)} 分钟`);
          if (args.maxGoalRounds) cfg.push(`最多 ${args.maxGoalRounds} 轮`);
          return [{ type: "text", text: `✅ 已创建任务 \`${value.key}\`\n   调度: ${scheduleInfo}${cfg.length ? "\n   " + cfg.join(" · ") : ""}` }];
        }
        return [{ type: "text", text: `创建失败: ${value.error || "未知错误"}` }];
      },
    },
    presentCall: (args) => ({ card: "generic", title: `创建任务: ${args.key}`, kind: "create", detail: args.cron ? cronToHuman(args.cron) : (args.schedule ? `定时 ${args.schedule}` : "即时") }),
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
        tasks: Array.isArray(value?.tasks) ? value.tasks : [],
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
    description: "Get full task details including history, errors, and reports. Use to inspect a task's state or output.",
    parameters: {
      key: { type: "string", required: true, description: "Task key to look up" },
    },
    async execute(args) {
      const body = await apiRequest(`/api/queue/detail?key=${encodeURIComponent(args.key)}`);
      // HTTP API 返回 { ok, task: {...} }，拆包后返回
      if (body.ok && body.task) {
        const task = { ...body.task };
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
          cron: { type: "string" },
          deadline: { type: "string" },

          attempts: { type: "number" },
          blockedResumes: { type: "number" },
          priority: { type: "number" },
          timeoutMs: { type: "number" },
          maxGoalRounds: { type: "number" },
          maxBlockedResumes: { type: "number" },
          webhook: { type: "string" },
          maxAttempts: { type: "number" },
          foregroundPaused: { type: "boolean" },
          stopPending: { type: "boolean" },
          taskType: { type: "string", enum: ["manual", "cron"] },
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
    description: "Update a pending task's configuration or content.",
    parameters: {
      key: { type: "string", required: true, description: "Task key to update" },
      content: { type: "string", description: "New task content in Markdown. Do NOT include cron/schedule/deadline declarations here; use the dedicated `cron`, `schedule`, or `deadline` parameter instead." },
      cron: { type: "string", description: "New cron expression (5 fields: minute hour day month weekday). Pass this as a top-level parameter; do NOT embed it inside `content`. Examples: \"0 8 * * *\" = daily 08:00, \"*/30 * * * *\" = every 30 minutes. Set to empty string to clear." },
      schedule: { type: "string", description: "New ISO 8601 one-time schedule timestamp. Set to empty string to clear. Mutually exclusive with `cron`." },
      priority: { type: "integer", description: "New priority 1-10" },
      maxGoalRounds: { oneOf: [{ type: "integer" }, { type: "null" }], description: "New max goal rounds; null restores the global default." },
      maxBlockedResumes: { oneOf: [{ type: "integer" }, { type: "null" }], description: "New maximum anti-block resumes, range 0-10; null restores the global default." },
      timeoutMs: { oneOf: [{ type: "integer" }, { type: "null" }], description: "New timeout in milliseconds; null restores the global default." },
      deadline: { type: "string", description: "New deadline cron expression. Set to empty string to clear." },
      webhook: { type: "string", description: "New webhook URL. Set to empty string to clear." },
      maxAttempts: { oneOf: [{ type: "integer" }, { type: "null" }], description: "New dispatch retry limit, range 1-10; null restores the global default." },
      provider: { type: "string", description: "New LLM provider." },
      model: { type: "string", description: "New LLM model name." },
    },
    async execute(args) {
      const patch = {};
      for (const opt of ["content", "cron", "schedule",
        "priority", "maxGoalRounds", "maxBlockedResumes", "timeoutMs", "deadline",
        "webhook", "maxAttempts", "provider", "model"]) {
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
          for (const f of ["content", "cron", "priority", "maxGoalRounds", "maxBlockedResumes", "timeoutMs", "deadline", "webhook", "maxAttempts"]) {
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
    description: "Permanently delete a task. Only pending, failed, or stopped tasks can be deleted. Running tasks must be stopped first; use archive for completed tasks you want to hide.",
    kind: "delete", verb: "删除", noun: "删除",
  });
}

function registerRerunTask(ctx, apiRequest) {
  registerActionTool(ctx, apiRequest, {
    name: "autoqueue_rerun_task",
    description: "Re-run a completed, failed, stopped, or interrupted task. The task is re-queued for execution with its original content.",
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
    description: "Read execution options and available models. Workspaces and presets are locked.",
    parameters: {},
    async execute() {
      const value = await apiRequest("/api/queue/options");
      // Workspaces and presets are strictly locked; models are read-only
      // discovery and allowed for task-level override.
      return {
        workspaces: [],
        presets: [],
        models: Array.isArray(value?.models) ? value.models : [],
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
        text: "严格隔离已启用：工作区和任意 Agent 预设覆盖已锁定；provider 与 model 允许任务级覆盖。",
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
  "webhook",
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
    description: "Update runtime queue defaults. Cannot change queueDir, auth, workspace, preset, or Host model.",
    parameters: {
      maxGoalRounds: { type: "integer", description: "Default goal round limit, 1-100." },
      maxBlockedResumes: { type: "integer", description: "Default anti-block resume limit, 0-10." },
      unknownThreshold: { type: "integer", description: "Consecutive unknown polls before recovery, 1-10." },
      maxAttempts: { type: "integer", description: "Default dispatch retry limit, 1-10." },
      taskTimeoutMs: { type: "integer", description: "Default task timeout in milliseconds, 600000-86400000." },
      webhook: { type: "string", description: "Default webhook URL. Set to empty string to clear." },
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

// ─── 模板库工具 ──────────────────────────────────────────

function registerListTemplates(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_list_templates",
    description: `List available task templates. Call this when the user wants to create a task from a template.`,
    parameters: {
      category: { type: "string", description: "Filter by category (e.g. \"日常\")." },
    },
    async execute(args) {
      const value = await apiRequest("/api/queue/templates");
      const templates = value?.templates ?? [];
      if (args.category) {
        return { templates: templates.filter(t => t.category === args.category) };
      }
      return { templates };
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          templates: { type: "array", required: true },
        },
      },
      render: (_args, value) => {
        const templates = value?.templates ?? [];
        if (!templates.length) return [{ type: "text", text: "模板库为空。" }];
        const lines = templates.map(t => {
          const cron = t.suggestedCron ? ` \`(${t.suggestedCron})\`` : "";
          return `📋 **${t.name}**${cron} — ${t.description}`;
        });
        return [{ type: "text", text: `可用模板:\n\n${lines.join("\n")}\n\n使用 autoqueue_get_template 获取模板详情。` }];
      },
    },
    presentCall: () => ({ card: "generic", title: "查看任务模板", kind: "query" }),
  }));

  ctx.tools.register(defineTool({
    name: "autoqueue_get_template",
    description: `Get a template's full body and suggested scheduling by name.`,
    parameters: {
      name: { type: "string", required: true, description: "Template name (e.g. \"每日工作汇总\")." },
    },
    async execute(args) {
      const value = await apiRequest(`/api/queue/templates?name=${encodeURIComponent(args.name)}`);
      if (value?.error) return value;
      return {
        name: value.name,
        description: value.description,
        category: value.category,
        suggestedCron: value.suggestedCron,
        suggestedDeadline: value.suggestedDeadline,
        suggestedPriority: value.suggestedPriority,
        body: value.body,
      };
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          suggestedCron: { type: "string" },
          suggestedDeadline: { type: "string" },
          suggestedPriority: { type: "string" },
          body: { type: "string" },
          error: { type: "string" },
        },
      },
      render: (args, value) => {
        if (value.error) return [{ type: "text", text: `获取模板失败: ${value.error}` }];
        const scheduling = [];
        if (value.suggestedCron) scheduling.push(`推荐 cron: \`${value.suggestedCron}\``);
        if (value.suggestedDeadline) scheduling.push(`推荐截止时间: \`${value.suggestedDeadline}\``);
        if (value.suggestedPriority) scheduling.push(`推荐优先级: ${value.suggestedPriority}`);
        const schedulingText = scheduling.length ? `\n\n${scheduling.join("\n")}` : "";
        return [{ type: "text", text: `📋 **${value.name}**\n\n${value.description}${schedulingText}\n\n---\n${value.body}\n\n---\n\n将以上内容作为 content 传给 autoqueue_create_task 创建任务。` }];
      },
    },
    presentCall: args => ({ card: "generic", title: `获取模板: ${args.name}`, kind: "query" }),
  }));
}

// ─── 模型列表工具 ────────────────────────────────────────

function registerListModels(ctx) {
  ctx.tools.register(defineTool({
    name: "autoqueue_list_models",
    description: "List available AI providers and models for task creation.",
    parameters: {},
    async execute(_args, exec) {
      const llm = ctx.llm ?? exec?.agent?.ctx?.llm;
      if (!llm) {
        return { providers: [], models: [], note: "LLM service not available in this context." };
      }
      try {
        const providers = llm.listConfigurableProviders ? llm.listConfigurableProviders() : [];
        if (!Array.isArray(providers)) {
          return { providers: [], models: [], note: "LLM provider list returned non-array." };
        }
        const modelList = [];
        for (const p of providers) {
          if (!p || !p.provider) continue;
          try {
            const providerModels = await llm.listModels(p.provider);
            if (!Array.isArray(providerModels)) continue;
            modelList.push({
              provider: p.provider,
              providerName: p.displayName || p.provider,
              models: providerModels.map(m => ({
                id: m.id,
                name: m.name,
                description: m.description,
              })),
            });
          } catch {
            modelList.push({
              provider: p.provider,
              providerName: p.displayName || p.provider,
              models: [],
              error: "Failed to list models for this provider",
            });
          }
        }
        return { providers: providers.map(p => ({ id: p.provider, name: p.displayName || p.provider })), models: modelList };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          providers: { type: "array" },
          models: { type: "array" },
          note: { type: "string" },
          error: { type: "string" },
        },
      },
      render: (_args, value) => {
        if (value.error) return [{ type: "text", text: `获取模型列表失败: ${value.error}` }];
        const models = value.models ?? [];
        if (!models.length) return [{ type: "text", text: "暂无可用的模型列表。" }];
        const lines = [];
        for (const group of models) {
          lines.push(`\n**${group.providerName} (${group.provider})**`);
          if (group.models.length) {
            for (const m of group.models) {
              lines.push(`  - ${m.name} \`${m.id}\`${m.description ? ` — ${m.description}` : ""}`);
            }
          } else {
            lines.push("  (无可用模型)");
          }
        }
        return [{ type: "text", text: `可用模型列表:\n${lines.join("\n")}\n\n使用 autoqueue_create_task 的 provider 和 model 参数指定模型。` }];
      },
    },
    presentCall: () => ({ card: "generic", title: "查看可用模型", kind: "query" }),
  }));
}

// ─── 会话守护工具 ────────────────────────────────────────

function registerSessionGuardTools(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_guard_session",
    description: "Enable anti-block and spin-detection guard for a normal (non-autoqueue) DSH session.",
    parameters: {
      sessionId: { type: "string", required: true, description: "DSH session ID to guard. Must not be an autoqueue-session-* ID." },
      blockedTimeoutMs: { type: "integer", description: "How long (ms) a blocked goal waits before auto-resume. Default 300000 (5 minutes)." },
      enableAntiBlock: { type: "boolean", description: "Enable auto-resume for blocked goals. Default true." },
      enableSpinDetection: { type: "boolean", description: "Enable loop/spin detection. Default true." },
      nudgeOnSpin: { type: "boolean", description: "Inject a recovery hint when a loop is detected. Default true." },
      maxBlockedResumes: { type: "integer", description: "Max auto-resume attempts before notifying the user. Default 2." },
    },
    async execute(args) {
      const body = {
        requestId: `ai-${crypto.randomUUID()}`,
        action: "guard",
        sessionId: args.sessionId,
      };
      const config = {};
      if (args.blockedTimeoutMs !== undefined) config.blockedTimeoutMs = args.blockedTimeoutMs;
      if (args.enableAntiBlock !== undefined) config.enableAntiBlock = args.enableAntiBlock;
      if (args.enableSpinDetection !== undefined) config.enableSpinDetection = args.enableSpinDetection;
      if (args.nudgeOnSpin !== undefined) config.nudgeOnSpin = args.nudgeOnSpin;
      if (args.maxBlockedResumes !== undefined) config.maxBlockedResumes = args.maxBlockedResumes;
      if (Object.keys(config).length > 0) body.config = config;
      return apiRequest("/api/queue/guard", {
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
          ok: { type: "boolean" },
          sessionId: { type: "string" },
          guarded: { type: "boolean" },
          config: { type: "object", additionalProperties: true },
          error: { type: "string" },
        },
      },
      render: (_args, value) => {
        if (value.error && !value.ok) return [{ type: "text", text: `开启守护失败: ${value.error}` }];
        const cfg = value.config ? `\n   配置: ${JSON.stringify(value.config)}` : "";
        return [{ type: "text", text: `✅ 已开启会话守护 \`${value.sessionId}\`${cfg}` }];
      },
    },
    presentCall: args => ({ card: "generic", title: `开启守护: ${args.sessionId}`, kind: "update" }),
  }));

}

// ─── 重启 DSH ────────────────────────────────────────────

function registerRestartDsh(ctx, apiRequest) {
  ctx.tools.register(defineTool({
    name: "autoqueue_restart_dsh",
    description: "Restart the DSH host process. Only available from local sessions.",
    parameters: {},
    async execute() {
      return apiRequest("/api/queue/restart", { method: "POST" });
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { ok: { type: "boolean", required: true }, pid: { type: "integer" }, helperPid: { type: "integer" }, logOut: { type: "string" }, logErr: { type: "string" } },
      },
      render: (_args, value) => [{
        type: "text",
        text: value.ok
          ? `✅ DSH 重启已安排 (PID ${value.pid}, helper ${value.helperPid})。新进程将在旧进程终止后启动。`
          : `重启失败: ${value.error || "未知错误"}`,
      }],
    },
    presentCall: () => ({ card: "generic", title: "重启 DSH", kind: "update" }),
  }));
}

// ─── 自有 Agent 工具隔离 ──────────────────────────────────

const OWNED_SESSION_PREFIX = "autoqueue-session-";
const isOwnedSession = (id) => typeof id === "string" && id.startsWith(OWNED_SESSION_PREFIX);

/**
 * Prevent autoqueue-session-* owned agents from calling queue-control tools.
 * Two layers:
 *   1. Scope restriction — deny visibility of all queue-control tools for owned agents.
 *   2. Monotonic guard — intercept any execution bypass at the ToolRuntime level.
 */
export function protectOwnedAgentsFromQueueTools(ctx) {
  // Layer 1: deny visibility for autoqueue-session-* agents
  ctx.on("agent/created", ({ agent }) => {
    if (!isOwnedSession(agent?.id)) return;
    try {
      agent.ctx.tools.restrict({ deny: [...AUTOQUEUE_AI_TOOL_NAMES] });
    } catch {
      // If restrict fails (e.g. agent scope not ready), the guard layer still catches
    }
  });

  // Layer 2: monotonic execution guard
  ctx.tools.guard((exec) => {
    if (isOwnedSession(exec?.agent?.id) && AUTOQUEUE_AI_TOOL_NAMES.includes(exec?.name)) {
      return `此操作在当前无人值守任务会话中不可用。队列任务的管理（创建、修改、删除等）请在普通 Host 会话或通过 Web 看板 http://127.0.0.1:3080 进行。`;
    }
  });
}

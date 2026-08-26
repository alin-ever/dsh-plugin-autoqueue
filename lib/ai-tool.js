/**
 * autoqueue AI 调度层
 * 薄客户端：所有调用透传到 HTTP API 层，不直接访问 engine
 * HTTP 层是唯一入口，校验/清洗/格式化只写一次
 * @module autoqueue/ai-tool
 */

import { defineTool } from "@deepseek-ai/dsh-tools";

const DEFAULT_BASE_URL = "http://127.0.0.1:3080";

/**
 * 注册 AI 调度工具和系统提示
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {string} [baseUrl] - HTTP API 基地址，默认 http://127.0.0.1:3080
 */
export function registerAiTool(ctx, baseUrl = DEFAULT_BASE_URL) {
  ctx.systemPrompt.section({
    name: "tool:autoqueue",
    order: 200,
    text: "You have access to autoqueue tools for managing unattended background tasks. "
      + "Available tools: `autoqueue_create_task`, `autoqueue_list_tasks`, `autoqueue_get_task`, `autoqueue_update_task`, "
      + "`autoqueue_stop_task`, `autoqueue_archive_task`, `autoqueue_restore_task`, `autoqueue_delete_task`, `autoqueue_rerun_task`. "
      + "Use these when the user asks to schedule, query, or modify background tasks. "
      + "Do NOT ask the user for a key — infer it from their request. "
      + "Before creating a task, ask for any missing details (what to do, where to look, output format). "
      + "If a task already exists, show the user what it does and ask whether to replace or use a different key.\n\n"
      + "Scheduling: use `schedule` (ISO 8601) for one-time execution, `cron` (5-field) for recurring. "
      + "Common cron: daily 08:00 = \"0 8 * * *\", every 30min = \"*/30 * * * *\", hourly = \"0 * * * *\", "
      + "weekdays 08:00 = \"0 8 * * 1-5\", every Monday 08:00 = \"0 8 * * 1\", "
      + "08:00 & 20:00 daily = \"0 8,20 * * *\", 1st of month 08:00 = \"0 8 1 * *\". "
      + "Use `deadline` (5-field cron) to set a cutoff time after which a running task is force-stopped. "
      + "Use `autoqueue_delete_task` only for pending tasks; use `autoqueue_archive_task` for executed tasks.",
  });

  registerCreateTask(ctx, baseUrl);
  registerListTasks(ctx, baseUrl);
  registerGetTask(ctx, baseUrl);
  registerUpdateTask(ctx, baseUrl);
  registerStopTask(ctx, baseUrl);
  registerArchiveTask(ctx, baseUrl);
  registerRestoreTask(ctx, baseUrl);
  registerDeleteTask(ctx, baseUrl);
  registerRerunTask(ctx, baseUrl);
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

  if (dom === "*" && month === "*" && dow === "*") return `每天 ${time}`;
  if (dom === "*" && month === "*" && dow === "1-5") return `工作日 ${time}`;
  const DOW_MAP = { 0: "日", 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六" };
  if (dom === "*" && month === "*" && /^\d$/.test(dow) && DOW_MAP[dow]) {
    return `每周${DOW_MAP[dow]} ${time}`;
  }
  if (/^\d+$/.test(dom) && month === "*" && dow === "*") return `每月${parseInt(dom, 10)}日 ${time}`;
  if (min.startsWith("*/")) return `每${min.slice(2)}分钟`;

  return cron;
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
  if (task.timeoutMs) parts.push(`超时 ${Math.round(task.timeoutMs / 60000)}分`);
  if (task.cron) parts.push(`cron ${task.cron}`);
  if (task.webhook) parts.push("webhook");
  return parts.join(" | ") || "—";
}

// ─── 工具注册 ────────────────────────────────────────────

function createTool(ctx, baseUrl, toolSpec) {
  return defineTool(ctx, {
    name: toolSpec.name,
    description: toolSpec.description,
    input: toolSpec.schema?.input ?? { type: "object", properties: {} },
    output: toolSpec.schema?.output ?? {
      type: "object",
      additionalProperties: false,
      properties: { ok: { type: "boolean", required: true }, key: { type: "string" }, error: { type: "string" } },
    },
    handler: toolSpec.handler,
  });
}

function registerActionTool(ctx, baseUrl, { name, description, kind, verb, noun }) {
  createTool(ctx, baseUrl, {
    name,
    description,
    schema: {
      input: { type: "object", properties: { key: { type: "string" } }, required: ["key"] },
      output: {
        type: "object",
        additionalProperties: false,
        properties: { ok: { type: "boolean", required: true }, key: { type: "string" }, error: { type: "string" } },
      },
    },
    handler: async (args) => {
      const res = await fetch(`${baseUrl}/api/queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          action: { kind, key: args.key },
        }),
      });
      return await res.json();
    },
  });
}

function registerCreateTask(ctx, baseUrl) {
  createTool(ctx, baseUrl, {
    name: "autoqueue_create_task",
    description: "Create a new unattended background task.",
    schema: {
      input: {
        type: "object",
        properties: {
          key: { type: "string", description: "Task identifier, unique" },
          content: { type: "string", description: "Task body in Markdown (≤2MB)" },
          priority: { type: "integer", minimum: 1, maximum: 10, description: "Priority 1-10 (default 5)" },
          schedule: { type: "string", description: "ISO 8601 one-time schedule" },
          cron: { type: "string", description: "5-field cron for recurring execution" },
          deadline: { type: "string", description: "5-field cron deadline" },
          webhook: { type: "string", description: "Callback URL on completion/failure" },
          workspace: { type: "string", description: "DSH workspace ID" },
          agentPreset: { type: "string", description: "Agent preset name" },
          maxGoalRounds: { type: "integer", description: "Max goal rounds (default 40)" },
          maxBlockedResumes: { type: "integer", description: "Max anti-block resumes (default 3)" },
          timeoutMs: { type: "integer", description: "Task timeout in ms (default 90min)" },
          autoArchive: { type: "boolean", description: "Auto-archive on completion" },
          maxAttempts: { type: "integer", description: "Retry attempts (default 3)" },
        },
        required: ["key", "content"],
      },
      output: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          key: { type: "string" },
          error: { type: "string" },
          existing: { type: "json" },
        },
      },
    },
    handler: async (args) => {
      const res = await fetch(`${baseUrl}/api/queue/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          ...args,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "创建任务失败");
      return data;
    },
  });
}

function registerListTasks(ctx, baseUrl) {
  createTool(ctx, baseUrl, {
    name: "autoqueue_list_tasks",
    description: "List all background tasks (with optional archived filter).",
    schema: {
      input: {
        type: "object",
        properties: {
          archived: { type: "boolean", description: "Include archived tasks" },
          status: { type: "string", description: "Filter by status" },
        },
      },
      output: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          tasks: { type: "array" },
          config: { type: "json" },
        },
      },
    },
    handler: async (args) => {
      const params = new URLSearchParams();
      if (args.archived) params.set("archived", "1");
      if (args.status) params.set("status", args.status);
      const res = await fetch(`${baseUrl}/api/queue/state?${params}`);
      return await res.json();
    },
  });
}

function registerGetTask(ctx, baseUrl) {
  createTool(ctx, baseUrl, {
    name: "autoqueue_get_task",
    description: "Get detailed information about a specific background task.",
    schema: {
      input: {
        type: "object",
        properties: { key: { type: "string", description: "Task key" } },
        required: ["key"],
      },
      output: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          task: { type: "json" },
          error: { type: "string" },
        },
      },
    },
    handler: async (args) => {
      const res = await fetch(`${baseUrl}/api/queue/detail?key=${encodeURIComponent(args.key)}`);
      return await res.json();
    },
  });
}

function registerUpdateTask(ctx, baseUrl) {
  createTool(ctx, baseUrl, {
    name: "autoqueue_update_task",
    description: "Update a task's content or configuration. Only works for non-running tasks.",
    schema: {
      input: {
        type: "object",
        properties: {
          key: { type: "string", description: "Task key" },
          content: { type: "string", description: "New task body" },
          priority: { type: "integer", description: "Priority 1-10" },
          schedule: { type: "string", description: "ISO 8601 schedule" },
          cron: { type: "string", description: "Cron expression" },
          deadline: { type: "string", description: "Deadline cron" },
          webhook: { type: "string", description: "Callback URL" },
          autoArchive: { type: "boolean", description: "Auto-archive on completion" },
        },
        required: ["key"],
      },
      output: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          key: { type: "string" },
          error: { type: "string" },
        },
      },
    },
    handler: async (args) => {
      const { key, ...patch } = args;
      const res = await fetch(`${baseUrl}/api/queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: `tool-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          action: { kind: "update", key, ...patch },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "更新任务失败");
      return data;
    },
  });
}

function registerStopTask(ctx, baseUrl) {
  registerActionTool(ctx, baseUrl, {
    name: "autoqueue_stop_task",
    description: "Stop a running task.",
    kind: "stop", verb: "停止", noun: "停止",
  });
}

function registerArchiveTask(ctx, baseUrl) {
  registerActionTool(ctx, baseUrl, {
    name: "autoqueue_archive_task",
    description: "Archive a task (hide from list, archive DSH sessions).",
    kind: "archive", verb: "归档", noun: "归档",
  });
}

function registerRestoreTask(ctx, baseUrl) {
  registerActionTool(ctx, baseUrl, {
    name: "autoqueue_restore_task",
    description: "Restore an archived task back to the active list.",
    kind: "restore", verb: "还原", noun: "还原",
  });
}

function registerDeleteTask(ctx, baseUrl) {
  registerActionTool(ctx, baseUrl, {
    name: "autoqueue_delete_task",
    description: "Permanently delete a pending task. Only pending (not yet executed) tasks can be deleted. Use archive for executed tasks.",
    kind: "delete", verb: "删除", noun: "删除",
  });
}

function registerRerunTask(ctx, baseUrl) {
  registerActionTool(ctx, baseUrl, {
    name: "autoqueue_rerun_task",
    description: "Re-run a failed or stopped task.",
    kind: "rerun", verb: "重新执行", noun: "重新执行",
  });
}
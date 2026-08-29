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
  // ─── 系统提示 ──────────────────────────────────────────
  ctx.systemPrompt.section({
    name: "tool:autoqueue",
    order: 200,
    text: "You have access to autoqueue tools for managing unattended background tasks. "
      + "Available tools: `autoqueue_create_task`, `autoqueue_list_tasks`, `autoqueue_get_task`, `autoqueue_update_task`, "
      + "`autoqueue_stop_task`, `autoqueue_archive_task`, `autoqueue_restore_task`, `autoqueue_delete_task`, `autoqueue_rerun_task`. "
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

  registerCreateTask(ctx, baseUrl);
  registerListTasks(ctx, baseUrl);
  registerGetTask(ctx, baseUrl);
  registerUpdateTask(ctx, baseUrl);
  registerStopTask(ctx, baseUrl);
  registerArchiveTask(ctx, baseUrl);
  registerRestoreTask(ctx, baseUrl);
  registerDeleteTask(ctx, baseUrl);
  registerRerunTask(ctx, baseUrl);
  registerMarkRead(ctx, baseUrl);
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

function registerCreateTask(ctx, baseUrl) {
  ctx.tools.register(defineTool({
    name: "autoqueue_create_task",
    description: "Create a task in the autoqueue for unattended AI execution. Provide a concise `key` summarizing the task in the user's language (e.g. \"日报\" or \"代码审查\"). If omitted, a timestamp-based key is used.",
    parameters: {
      key: { type: "string", description: "Concise task identifier in the user's language (e.g. \"日报\" or \"代码审查\"). Provide a meaningful summary of the task. If omitted, a timestamp-based key is used." },
      content: { type: "string", required: true, description: "Task content in Markdown" },
      priority: { type: "number", description: "Task priority 1-10. Default 5." },
      schedule: { type: "string", description: "ISO 8601 one-time execution time. Example: \"2026-09-01T08:00:00Z\". Runs once at that time." },
      cron: { type: "string", description: "Cron expression for recurring execution (5 fields: minute hour day month weekday). Examples: \"0 8 * * *\" = daily 08:00, \"0 8 * * 1-5\" = weekdays 08:00, \"0 8 * * 1\" = every Monday 08:00, \"*/30 * * * *\" = every 30 minutes, \"0 * * * *\" = hourly, \"0 8,20 * * *\" = 08:00 and 20:00 daily, \"0 8 1 * *\" = 1st of each month 08:00." },
      webhook: { type: "string", description: "Webhook URL called on completion or failure" },
      workspace: { type: "string", description: "Workspace name to run the task in" },
      model: { type: "string", description: "Model override for execution. If not set, uses the current session model. Examples: deepseek-v4-pro, deepseek-v4-flash." },
      agentPreset: { type: "string", description: "Agent preset to use for execution. If not set, auto-detects based on task content. Use any available preset (unattended, ptc-unattended, code, standard, or custom)." },
      maxGoalRounds: { type: "number", description: "Maximum goal continuation rounds. Default 40, range 1-100." },
      maxBlockedResumes: { type: "number", description: "Maximum anti-block resumes (steering + goal resume). Default 3, range 0-10. When exceeded, the task is marked failed. Distinct from maxAttempts (session restart limit)." },
      timeoutMs: { type: "number", description: "Task timeout in milliseconds. Default 30 minutes." },
      autoArchive: { type: "boolean", description: "Auto-archive on completion. Default follows global config." },
      stallThreshold: { type: "number", description: "Consecutive active polls before anti-block. Default 10." },
      unknownThreshold: { type: "number", description: "Consecutive unknown polls before failure. Default 3." },
      maxAttempts: { type: "number", description: "Dispatch retry limit. Default 3." },
      deadline: { type: "string", description: "Cron expression for force-stop deadline. When matched, a running task is stopped. Example: \"0 21 * * *\" = stop at 21:00 daily. Task-level overrides global defaultDeadline." },
    },
    async execute(args) {
      const body = {
        requestId: `ai-${crypto.randomUUID()}`,
        key: args.key,
        content: args.content,
      };
      // 只传显式提供的可选参数，避免把 undefined 传给 HTTP 层
      for (const opt of ["priority", "schedule", "cron",
        "webhook", "workspace", "agentPreset", "model", "maxGoalRounds", "maxBlockedResumes",
        "timeoutMs", "autoArchive", "stallThreshold", "unknownThreshold", "maxAttempts", "deadline"]) {
        if (args[opt] !== undefined) body[opt] = args[opt];
      }
      const res = await fetch(`${baseUrl}/api/queue/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          ok: { type: "boolean", required: true },
          key: { type: "string" },
          error: { type: "string" },
          existing: { type: "json" },
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
        if (value.existing) {
          const e = value.existing;
          return [{ type: "text", text: `⚠️ 任务 \`${value.key}\` 已存在\n   状态: ${e.status}，创建于 ${e.createdAt}\n   内容: ${e.body}\n\n是否换个 key 或 update？` }];
        }
        return [{ type: "text", text: `创建失败: ${value.error || "未知错误"}` }];
      },
    },
    presentCall: (args) => ({ card: "generic", title: `创建任务: ${args.key}`, kind: "create", detail: args.cron ? cronToHuman(args.cron) : args.schedule ? `定时: ${args.schedule}` : "手动" }),
  }));
}

function registerListTasks(ctx, baseUrl) {
  ctx.tools.register(defineTool({
    name: "autoqueue_list_tasks",
    description: "List all tasks in the autoqueue, optionally including archived tasks.",
    parameters: {
      includeArchived: { type: "boolean", description: "Include archived tasks. Default false." },
    },
    async execute(args) {
      const qs = args.includeArchived ? "?archived=1" : "";
      const res = await fetch(`${baseUrl}/api/queue/state${qs}`);
      return res.json();
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          revision: { type: "number" },
          tasks: { type: "json" },
          config: { type: "json" },
        },
      },
      render: (_args, value) => {
        if (!value.tasks || value.tasks.length === 0) return [{ type: "text", text: "队列中没有任务。" }];
        const lines = value.tasks.map(t => {
          const status = STATUS_LABEL[t.status] ?? t.status;
          const schedule = scheduleSummary(t);
          const title = taskFirstLine(t);
          return `${status} \`${t.key}\` — ${schedule} — ${title}`;
        });
        return [{ type: "text", text: `队列中有 ${value.tasks.length} 个任务:\n\n${lines.join("\n")}` }];
      },
    },
    presentCall: () => ({ card: "generic", title: "查看任务队列", kind: "query" }),
  }));
}

function registerGetTask(ctx, baseUrl) {
  ctx.tools.register(defineTool({
    name: "autoqueue_get_task",
    description: "Get detailed information about a specific task.",
    parameters: {
      key: { type: "string", required: true, description: "Task key to look up" },
    },
    async execute(args) {
      const res = await fetch(`${baseUrl}/api/queue/detail?key=${encodeURIComponent(args.key)}`);
      const body = await res.json();
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
          createdAt: { type: "string" },
          updatedAt: { type: "string" },
          archivedAt: { type: "string" },
          executions: { type: "array" },
          reports: { type: "object", additionalProperties: false, properties: { goal: { type: "string" }, result: { type: "string" }, report: { type: "string" } } },
        },
      },
      render: (_args, value) => {
        if (value.error && !value.ok) return [{ type: "text", text: `查询失败: ${value.error}` }];

        const status = STATUS_LABEL[value.status] ?? value.status;
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

function registerUpdateTask(ctx, baseUrl) {
  ctx.tools.register(defineTool({
    name: "autoqueue_update_task",
    description: "Update an existing task's configuration or content. Only pending tasks can be updated.",
    parameters: {
      key: { type: "string", required: true, description: "Task key to update" },
      content: { type: "string", description: "New task content in Markdown" },
      cron: { type: "string", description: "New cron expression (5 fields: minute hour day month weekday). Examples: \"0 8 * * *\" = daily 08:00, \"*/30 * * * *\" = every 30 minutes." },
      schedule: { type: "string", description: "New ISO 8601 one-time execution time. Example: \"2026-09-01T08:00:00Z\"." },
      priority: { type: "number", description: "New priority 1-10" },
      autoArchive: { type: "boolean", description: "New auto-archive setting" },
      maxGoalRounds: { type: "number", description: "New max goal rounds" },
      timeoutMs: { type: "number", description: "New timeout in milliseconds" },
      deadline: { type: "string", description: "New deadline cron expression. Set to empty string to clear." },
    },
    async execute(args) {
      const patch = {};
      for (const opt of ["content", "cron", "schedule", "priority",
        "autoArchive", "maxGoalRounds", "timeoutMs", "deadline"]) {
        if (args[opt] !== undefined) patch[opt] = args[opt];
      }
      const body = {
        requestId: `ai-${crypto.randomUUID()}`,
        action: { kind: "update", key: args.key, ...patch },
      };
      const res = await fetch(`${baseUrl}/api/queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
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
          for (const f of ["content", "cron", "schedule", "priority", "autoArchive", "maxGoalRounds", "timeoutMs", "deadline"]) {
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

function registerActionTool(ctx, baseUrl, {
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
      const res = await fetch(`${baseUrl}/api/queue/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
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
      render: (_args, value) => {
        if (value.ok) return [{ type: "text", text: `✅ 已${verb}任务 \`${value.key}\`` }];
        return [{ type: "text", text: `${noun}失败: ${value.error}` }];
      },
    },
    presentCall: (args) => ({ card: "generic", title: `${noun}: ${args.key}`, kind }),
  }));
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

function registerMarkRead(ctx, baseUrl) {
  ctx.tools.register(defineTool({
    name: "autoqueue_mark_read",
    description: "Mark a task as read or unread. When a completed task is viewed, mark it as read so it no longer shows as unread.",
    parameters: {
      key: { type: "string", required: true, description: "Task key to mark" },
      read: { type: "boolean", description: "true = mark as read (default), false = mark as unread" },
    },
    async execute(args) {
      const res = await fetch(`${baseUrl}/api/queue/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: args.key, read: args.read !== false }),
      });
      return res.json();
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
/**
 * autoqueue 插件入口 — 无人值守任务队列
 * 对齐 task-board host-service.ts 的轮询模式
 * @module autoqueue
 */

import { mkdirSync } from "node:fs";
import { createEngine } from "./engine.js";
import { getTasksDir, getQueueDir, setQueueDir } from "./files.js";
import { flushLedger, getConcurrency, setConcurrency } from "./ledger.js";
import { registerAiTool } from "./ai-tool.js";

export const name = "autoqueue";
export const inject = ["apiProxy", "webServer", "timer", "tools", "systemPrompt"];

/**
 * 插件装载
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {object} [config]
 */
export function apply(ctx, config = {}) {
  if (config.queueDir) setQueueDir(config.queueDir);
  const engine = createEngine(ctx.apiProxy, config);
  const scanIntervalMs = config.scanIntervalMs ?? 15_000;

  // AI 调度层：注册工具 + 系统提示（通过 HTTP API 透传，不直接访问 engine）
  registerAiTool(ctx, config.baseUrl ?? "http://127.0.0.1:3080");

  // 默认工作区：自动创建，所有任务共享
  if (!config.workspace) {
    const defaultDir = config.queueDir || getQueueDir();
    ctx.apiProxy.workspace.create({ rpcId: "autoqueue-init", payload: { path: defaultDir } })
      .then(wsRes => {
        if (wsRes.result.ok) {
          engine.setConfig({ workspace: wsRes.result.value.workspace.workspaceId });
        }
      })
      .catch(() => {});
  }

  // 配置文件中的默认并发数，仅在首次启动时生效
  if (config.maxConcurrent && getConcurrency() === 2) {
    setConcurrency(config.maxConcurrent);
  }

  ctx.effect(() => {
    mkdirSync(getTasksDir(), { recursive: true });

    const scanTimer = engine.startScanning(ctx.timer, scanIntervalMs);
    const pollTimer = engine.startPolling(ctx.timer);

    const routeDisposers = registerRoutes(ctx, engine);

    return () => {
      scanTimer();
      pollTimer();
      for (const dispose of routeDisposers) dispose();
    };
  });
}

// ─── 路由注册 ──────────────────────────────────────────

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function jsonReply(res, code, body) {
  const buf = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": buf.length,
  });
  res.end(buf);
}

function registerRoutes(ctx, engine) {
  const disposers = [];

  // GET /api/queue/state — 快照（对齐 task-board /api/task-board/state）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/state",
    handler: (req, res) => {
      try {
        const url = new URL(req.url, "http://localhost");
        const includeArchived = url.searchParams.get("archived") === "1";
        jsonReply(res, 200, engine.snapshot(includeArchived));
      } catch (err) {
        jsonReply(res, 500, { error: String(err) });
      }
    },
  }));

  // POST /api/queue/action — 动作信封（对齐 task-board /api/task-board/action）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/action",
    handler: async (req, res) => {
      try {
        const body = await readJsonBody(req);
        const { requestId, action } = body;

        if (!requestId || typeof requestId !== "string" || requestId.length > 256) {
          jsonReply(res, 400, { error: "缺少或无效的 requestId" });
          return;
        }
        if (!action || typeof action !== "object" || typeof action.kind !== "string") {
          jsonReply(res, 400, { error: "缺少或无效的 action" });
          return;
        }

        const result = await engine.applyAction(requestId, action.kind, action.key, action);
        flushLedger();
        jsonReply(res, 200, result);
      } catch (err) {
        jsonReply(res, 400, { error: String(err) });
      }
    },
  }));

  // POST /api/queue/task — 创建任务（对齐 task-board action create）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/task",
    handler: async (req, res) => {
      try {
        const body = await readJsonBody(req);
        const { requestId, key, content, workspace, agentPreset, schedule, cron, deadline, maxGoalRounds, maxBlockedResumes, timeoutMs, priority, webhook, autoArchive, stallThreshold, unknownThreshold, maxAttempts } = body;

        if (!requestId || typeof requestId !== "string") {
          jsonReply(res, 400, { error: "缺少 requestId" });
          return;
        }
        if (!key || !content) {
          jsonReply(res, 400, { error: "缺少 key 或 content" });
          return;
        }
        if (content.length > 2 * 1024 * 1024) {
          jsonReply(res, 413, { error: "内容超过 2MB 限制" });
          return;
        }

        const result = engine.createTask(requestId, key, content, { workspace, agentPreset, schedule, cron, deadline, maxGoalRounds, maxBlockedResumes, timeoutMs, priority, webhook, autoArchive, stallThreshold, unknownThreshold, maxAttempts });
        flushLedger();
        jsonReply(res, result.ok ? 200 : 409, result);
      } catch (err) {
        jsonReply(res, 400, { error: String(err) });
      }
    },
  }));

  // GET /api/queue/config — 运行时配置
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/config",
    handler: async (req, res) => {
      try {
        if (req.method === "GET") {
          jsonReply(res, 200, engine.getConfig());
        } else if (req.method === "POST") {
          const body = await readJsonBody(req);
          jsonReply(res, 200, engine.setConfig(body));
        } else {
          jsonReply(res, 405, { error: "Method Not Allowed" });
        }
      } catch (err) {
        jsonReply(res, 500, { error: String(err) });
      }
    },
  }));

  // GET /api/queue/options — 工作区和预设列表
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/options",
    handler: async (_req, res) => {
      try {
        const rpcId = `autoqueue-${crypto.randomUUID()}`;
        const [wsRes, presetRes] = await Promise.all([
          ctx.apiProxy.workspace.list({ rpcId, payload: {} }),
          ctx.apiProxy.agentPresets.list({ rpcId, payload: {} }),
        ]);
        jsonReply(res, 200, {
          workspaces: wsRes.result.ok ? wsRes.result.value.items : [],
          presets: presetRes.result.ok ? presetRes.result.value.presets : [],
        });
      } catch (err) {
        jsonReply(res, 500, { error: String(err) });
      }
    },
  }));

  // GET /api/queue/detail?key=xxx — 任务详情（含报告）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/detail",
    handler: (req, res) => {
      try {
        const url = new URL(req.url, "http://localhost");
        const key = url.searchParams.get("key");
        if (!key) { jsonReply(res, 400, { error: "缺少 key" }); return; }
        jsonReply(res, 200, engine.getTaskDetail(key));
      } catch (err) {
        jsonReply(res, 500, { error: String(err) });
      }
    },
  }));

  // GET /api/queue/events — SSE 推送（对齐 task-board /api/task-board/events）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/events",
    handler: (req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });

      const pushSnapshot = () => {
        try {
          const snap = engine.snapshot();
          res.write(`data: ${JSON.stringify(snap)}\n\n`);
        } catch { /* 连接已断开 */ }
      };

      pushSnapshot();
      const pushTimer = ctx.timer.interval(pushSnapshot, 10_000);

      const heartbeat = ctx.timer.interval(() => {
        try { res.write(": heartbeat\n\n"); } catch { /* 连接已断开 */ }
      }, 25_000);

      req.on("close", () => { heartbeat(); pushTimer(); });
    },
  }));

  return disposers;
}
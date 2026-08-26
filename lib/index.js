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

export function apply(ctx, config = {}) {
  if (config.queueDir) setQueueDir(config.queueDir);
  const engine = createEngine(ctx.apiProxy, config);
  const scanIntervalMs = config.scanIntervalMs ?? 15_000;

  registerAiTool(ctx, config.baseUrl ?? "http://127.0.0.1:3080");

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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function jsonReply(res, code, body) {
  const buf = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": buf.length });
  res.end(buf);
}

function registerRoutes(ctx, engine) {
  const disposers = [];

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/api/queue/state", handler: (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      jsonReply(res, 200, engine.snapshot(url.searchParams.get("archived") === "1"));
    } catch (err) { jsonReply(res, 500, { error: String(err) }); }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/api/queue/action", handler: async (req, res) => {
    try {
      const { requestId, action } = await readJsonBody(req);
      if (!requestId || typeof requestId !== "string" || requestId.length > 256) return jsonReply(res, 400, { error: "缺少或无效的 requestId" });
      if (!action || typeof action !== "object") return jsonReply(res, 400, { error: "缺少或无效的 action" });
      if (!checkRequest(requestId, action)) return jsonReply(res, 409, { error: "重复请求" });
      const result = await engine.applyAction(action, requestId);
      jsonReply(res, result.ok ? 200 : 400, result);
    } catch (err) { jsonReply(res, 500, { error: String(err) }); }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/api/queue/task", handler: async (req, res) => {
    try {
      const { requestId, ...opts } = await readJsonBody(req);
      if (!requestId || typeof requestId !== "string") return jsonReply(res, 400, { error: "缺少 requestId" });
      if (!opts.key || typeof opts.key !== "string") return jsonReply(res, 400, { error: "缺少 key" });
      if (!opts.content) return jsonReply(res, 400, { error: "缺少 content" });
      const result = await engine.createTask(requestId, opts);
      jsonReply(res, result.ok ? 201 : 400, result);
    } catch (err) { jsonReply(res, 500, { error: String(err) }); }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/api/queue/detail", handler: (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const key = url.searchParams.get("key");
      if (!key) return jsonReply(res, 400, { error: "缺少 key 参数" });
      jsonReply(res, 200, engine.taskDetail(key));
    } catch (err) { jsonReply(res, 500, { error: String(err) }); }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/api/queue/options", handler: (req, res) => {
    try { jsonReply(res, 200, engine.getOptions()); }
    catch (err) { jsonReply(res, 500, { error: String(err) }); }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/api/queue/config", handler: async (req, res) => {
    try {
      if (req.method === "GET") { jsonReply(res, 200, engine.getConfig()); }
      else {
        const body = await readJsonBody(req);
        engine.setConfig(body);
        flushLedger();
        jsonReply(res, 200, { ok: true });
      }
    } catch (err) { jsonReply(res, 500, { error: String(err) }); }
  }}));

  disposers.push(ctx.webServer.register({ kind: "exact", path: "/api/queue/events", handler: (req, res) => {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
    const pushSnapshot = () => { try { res.write(`data: ${JSON.stringify(engine.snapshot())}\n\n`); } catch {} };
    const pushTimer = ctx.timer.interval(pushSnapshot, 10_000);
    const heartbeat = ctx.timer.interval(() => { try { res.write(": heartbeat\n\n"); } catch {} }, 25_000);
    req.on("close", () => { heartbeat(); pushTimer(); });
    pushSnapshot();
  }}));

  return disposers;
}

import { checkRequest } from "./ledger.js";
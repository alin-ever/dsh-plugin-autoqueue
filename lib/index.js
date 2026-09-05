/**
 * autoqueue 插件入口 — 无人值守任务队列
 * 对齐 task-board host-service.ts 的轮询模式
 * @module autoqueue
 */

import { timingSafeEqual } from "node:crypto";
import { rename, unlink, writeFile } from "node:fs/promises";
import { effectiveSandboxMode, setSandboxMode } from "@deepseek-ai/dsh-sandbox-policy";
import { effectiveApprovalPolicy, setApprovalPolicy } from "@deepseek-ai/dsh-user-approval";
import { createEngine } from "./engine-v2.js";
import {
  getTasksDir, setQueueDir, validateKey, KEY_PATTERN, KEY_VALIDATION_DESCRIPTION,
  validateCronExpression,
  ensurePrivateDir, MAX_TASK_CONTENT_BYTES, MAX_TASK_FILE_BYTES,
} from "./files.js";
import {
  initializeLedger, flushLedger, getConcurrency, setConcurrency,
  markRead, markUnread, unreadCount,
} from "./ledger.js";
import {
  AUTOQUEUE_AI_TOOL_NAMES,
  AUTOQUEUE_NATURAL_LANGUAGE_ALIASES,
  AUTOQUEUE_PRODUCT_NAME,
  registerAiTool,
} from "./ai-tool.js";
import {
  AUTOQUEUE_UNATTENDED_PRESET,
  isAutoqueueSessionId,
} from "./runner.js";

export const name = "autoqueue";
export const inject = ["apiProxy", "webServer", "timer", "tools", "systemPrompt", "agentPresets", "sessions"];

/**
 * 插件装载
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {object} [config]
 */
export function apply(ctx, config = {}) {
  if (config.queueDir) setQueueDir(config.queueDir);
  // 必须在 setQueueDir 之后显式加载，损坏账本会 fail-closed 阻止插件启动。
  initializeLedger();
  const engine = createEngine(ctx.apiProxy, {
    ...config,
    // Never accept a caller supplied preparation callback. This same-process
    // boundary is the only place where rc.2 exposes durable per-session
    // sandbox/approval state, and it must run before goals.create or any
    // continuation admits work.
    prepareSession: ({ sessionId, sourceSessionId }) => {
      return pinOwnedSessionApprovalPolicy(ctx.sessions, sessionId, sourceSessionId);
    },
  });
  const scanIntervalMs = config.scanIntervalMs ?? 15_000;
  const security = createSecurityPolicy(config);

  // 始终注入系统提示，让 Host 会话中的 AI 知道 autoqueue 存在。
  // AI 工具默认注入，让 AI 可以直接操作队列。设置 enableHostAiTools: false 可关闭。
  ctx.systemPrompt.section({
    name: "autoqueue:discovery",
    order: 300,
    text: `${AUTOQUEUE_PRODUCT_NAME}（无人值守任务队列）已在此 DSH 实例中运行。`
      + `用户可以通过 Web 看板或 HTTP API 管理后台任务。`
      + `用户可能称呼它为"${AUTOQUEUE_NATURAL_LANGUAGE_ALIASES.join('"、"')}"。`
      + `当用户提到这些名称时，请告知他们任务队列已就绪，`
      + `可以使用 Web 界面（当前页面左侧导航）查看和管理任务，`
      + `或通过 \`POST /api/queue/task\` 丢 .md 文件到收件箱让 AI 自动执行。`,
  });

  // AI 工具默认注入，可通过 enableHostAiTools: false 显式关闭。
  if (config.enableHostAiTools !== false) {
    registerAiTool(ctx, config.baseUrl ?? "http://127.0.0.1:3080", security.token);
  }

  // 配置文件中的默认并发数，仅在首次启动时生效
  if (config.maxConcurrent && getConcurrency() === 1) {
    setConcurrency(config.maxConcurrent);
  }

  ctx.effect(async () => {
    // 两个 preset 使用插件命名空间。若同名内容不带 ownership marker，
    // 启动直接失败，绝不覆盖用户或其他插件的 preset。
    await ensureOwnedPreset(ctx, "standard", AUTOQUEUE_UNATTENDED_PRESET, "AutoQueue 无人值守模式");
    ensurePrivateDir(getTasksDir());

    const scanTimer = engine.startScanning(ctx.timer, scanIntervalMs);
    const pollTimer = engine.startPolling(ctx.timer);
    const runtimeEventDisposer = registerRuntimePollEvents(ctx, engine);

    const routeDisposers = registerRoutes(ctx, engine, security);

    return () => {
      runtimeEventDisposer();
      engine.dispose();
      scanTimer();
      pollTimer();
      for (const dispose of routeDisposers) dispose();
    };
  });
}

/**
 * Bridge rc.2 native runtime edges into the engine's coalescing dirty latch.
 * These listeners deliberately do not read or mutate the ledger, sessions, or
 * goals: pollRunning remains the single authoritative convergence path and its
 * 10-second watchdog remains active as a missed-event fallback.
 */
export function registerRuntimePollEvents(ctx, engine) {
  if (!ctx || typeof ctx.on !== "function") {
    throw new TypeError("autoqueue runtime events require ctx.on");
  }
  if (!engine || typeof engine.requestRuntimePoll !== "function") {
    throw new TypeError("autoqueue runtime events require engine.requestRuntimePoll");
  }
  if (typeof engine.requestPendingScan !== "function") {
    throw new TypeError("autoqueue runtime events require engine.requestPendingScan");
  }

  const disposers = [];
  try {
    // Every ordinary-agent status edge matters: foreign running requests fast
    // cooperative yield; foreign idle and owned idle request fast resume or
    // terminal-output convergence.
    disposers.push(ctx.on("agent/status", ({ status } = {}) => {
      if (status === "running" || status === "idle") engine.requestRuntimePoll("agent/status");
      if (status === "idle") engine.requestPendingScan();
    }));
    // A foreign goal change does not control queue state. Owned goal changes
    // (complete/blocked/pause revisions) need an immediate authoritative read.
    disposers.push(ctx.on("goal/changed", ({ agent } = {}) => {
      if (isAutoqueueSessionId(agent?.id)) engine.requestRuntimePoll("goal/changed");
    }));
    // Disposal of an owned session drives unreachable recovery; disposal of a
    // foreign session can make foreground resume safe before the watchdog.
    disposers.push(ctx.on("session/disposed", session => {
      if (typeof session?.id === "string") {
        engine.requestRuntimePoll("session/disposed");
        engine.requestPendingScan();
      }
    }));
  } catch (error) {
    for (const dispose of disposers.reverse()) dispose?.();
    throw error;
  }

  let active = true;
  return () => {
    if (!active) return;
    active = false;
    for (const dispose of disposers.reverse()) dispose?.();
  };
}

/**
 * Pin and durably verify both execution policies of exactly one owned queue
 * session. A missing/mismatched session fails closed before goal admission or
 * any continuation. The legacy export name is retained for plugin consumers.
 *
 * @param {import('@deepseek-ai/dsh-session').SessionStore} sessions
 * @param {string} sessionId
 * @param {string} [sourceSessionId] - 可选，发起任务的源会话 ID，用于继承其审批策略
 */
export async function pinOwnedSessionApprovalPolicy(sessions, sessionId, sourceSessionId) {
  if (!isAutoqueueSessionId(sessionId)) {
    const err = new Error(`session-policy: session-not-owned: ${JSON.stringify(sessionId)}`);
    err.code = "session-not-owned";
    throw err;
  }
  if (!sessions || typeof sessions.get !== "function" || typeof sessions.flush !== "function") {
    const err = new Error("session-policy: DSH session store is unavailable");
    err.code = "session-store-unavailable";
    throw err;
  }
  const session = sessions.get(sessionId);
  if (!session || session.id !== sessionId) {
    const err = new Error(`session-policy: owned session ${JSON.stringify(sessionId)} is unavailable`);
    err.code = "session-not-found";
    throw err;
  }

  if (effectiveSandboxMode(session.events) !== "danger-full-access") {
    setSandboxMode(session, "danger-full-access");
  }

  // 无人值守任务始终使用 "never" 审批策略。同步设置 permission/preset 事件，
  // 使 UI 正确显示 "Full access" 而非 "Custom"（derive 匹配不到预设时会回退到 Custom）。
  if (effectiveApprovalPolicy(session.events) !== "never") {
    setApprovalPolicy(session, "never");
  }
  // 确保 permission/preset 与实际的 sandbox+approval 组合一致
  const lastPreset = session.events.findLast(e => e.type === "permission/preset")?.data?.preset;
  if (lastPreset !== "danger-full-access") {
    session.append("permission/preset", { preset: "danger-full-access" });
  }
  await sessions.flush(session);
  if (effectiveSandboxMode(session.events) !== "danger-full-access") {
    const err = new Error(`sandbox-policy: failed to verify danger-full-access for ${JSON.stringify(sessionId)}`);
    err.code = "sandbox-policy-unverified";
    throw err;
  }
  if (effectiveApprovalPolicy(session.events) !== "never") {
    const err = new Error(`approval-policy: failed to verify never for ${JSON.stringify(sessionId)}`);
    err.code = "approval-policy-unverified";
    throw err;
  }
}

// ─── 路由注册 ──────────────────────────────────────────

const MAX_SMALL_JSON_BYTES = 64 * 1024;
// JSON.stringify 会转义引号、反斜线和换行；给 2MB 正文保留最多约 2 倍封装空间。
const MAX_TASK_JSON_BYTES = MAX_TASK_FILE_BYTES * 2 + 128 * 1024;
const MAX_REQUEST_ID_LENGTH = 128;

const AUTOQUEUE_API_VERSION = "1.0.0";
const AUTOQUEUE_PLUGIN_VERSION = "0.3.0";

function capabilitiesDocument(security) {
  return {
    name: "autoqueue",
    displayName: AUTOQUEUE_PRODUCT_NAME,
    aliases: [...AUTOQUEUE_NATURAL_LANGUAGE_ALIASES],
    pluginVersion: AUTOQUEUE_PLUGIN_VERSION,
    apiVersion: AUTOQUEUE_API_VERSION,
    dshCompatibility: ">=0.1.1-rc.2 <0.1.2",
    basePath: "/api/queue",
    openapi: "/api/autoqueue/openapi.json",
    authentication: {
      schemes: ["Authorization: Bearer <token>", "X-Autoqueue-Token: <token>"],
      tokenValuesReturned: false,
      loopbackDirectAccess: security?.token ? false : true,
      loopbackDirectAccessDescription: security?.token
        ? "Disabled because a configured token is required for every request, including loopback."
        : "Allowed only when both the peer address and Host header are loopback; remote access remains disabled until a token is configured.",
      remoteTokenRequired: true,
    },
    features: {
      unattendedExecution: true,
      markdownInbox: true,
      scheduling: ["immediate", "cron", "deadline"],
      antiBlock: true,
      retries: true,
      webhook: true,
      serverSentEvents: true,
      batchArchive: true,
      readTracking: true,
      externalAiHttpApi: true,
      strictHostIsolation: true,
      foregroundPreemption: true,
      nativeRuntimeMonitoring: true,
      sessionSandboxMode: "workspace-write",
      sessionApprovalPolicy: "never",
      taskModelSelection: false,
      taskWorkspaceSelection: false,
      taskPresetSelection: false,
      hostAiToolsDefaultEnabled: false,
    },
    limits: {
      taskContentBytes: MAX_TASK_CONTENT_BYTES,
      taskKeyCharacters: 200,
      requestIdCharacters: MAX_REQUEST_ID_LENGTH,
      batchArchiveTasks: 100,
      maxConcurrent: 8,
      sseConnections: 8,
    },
    resources: {
      state: "/api/queue/state",
      task: "/api/queue/task",
      action: "/api/queue/action",
      detail: "/api/queue/detail",
      options: "/api/queue/options",
      config: "/api/queue/config",
      markRead: "/api/queue/mark-read",
      events: "/api/queue/events",
    },
    aiTools: [...AUTOQUEUE_AI_TOOL_NAMES],
    aiToolRegistration: {
      defaultEnabled: false,
      optInConfig: "enableHostAiTools",
      reason: "Disabled by default so ordinary DSH sessions keep their original tool catalog and prompt surface.",
    },
  };
}

function openApiDocument() {
  const nullableString = { type: ["string", "null"] };
  const taskPolicyProperties = {
    priority: { type: "integer", minimum: 1, maximum: 10, default: 5 },
    cron: { type: ["string", "null"], description: "Five-field cron expression." },
    deadline: { type: ["string", "null"], description: "Five-field force-stop cron expression." },
    webhook: { ...nullableString, format: "uri", maxLength: 2048 },
    maxGoalRounds: { type: "integer", minimum: 1, maximum: 100 },
    maxBlockedResumes: { type: "integer", minimum: 0, maximum: 10 },
    timeoutMs: { type: "integer", minimum: 600000, maximum: 86400000 },
    autoArchive: { type: "boolean" },
    enableNotifications: { type: "boolean" },
    maxAttempts: { type: "integer", minimum: 1, maximum: 10 },
  };
  const updatePolicyProperties = {
    ...taskPolicyProperties,
    cron: { type: ["string", "null"], description: "New five-field cron; empty string or null clears it." },
    deadline: { type: ["string", "null"], description: "New force-stop cron; empty string or null clears it." },
    webhook: { ...nullableString, format: "uri", maxLength: 2048, description: "New webhook URL; empty string or null clears it." },
    maxGoalRounds: { type: ["integer", "null"], minimum: 1, maximum: 100, description: "null restores the global default." },
    maxBlockedResumes: { type: ["integer", "null"], minimum: 0, maximum: 10, description: "null restores the global default." },
    timeoutMs: { type: ["integer", "null"], minimum: 600000, maximum: 86400000, description: "null restores the global default." },
    maxAttempts: { type: ["integer", "null"], minimum: 1, maximum: 10, description: "null restores the global default." },
  };
  const configProperties = {
    maxGoalRounds: { type: "integer", minimum: 1, maximum: 100 },
    maxBlockedResumes: { type: "integer", minimum: 0, maximum: 10 },
    unknownThreshold: { type: "integer", minimum: 1, maximum: 10 },
    maxAttempts: { type: "integer", minimum: 1, maximum: 10 },
    taskTimeoutMs: { type: "integer", minimum: 600000, maximum: 86400000 },
    autoArchive: { type: "boolean" },
    webhook: { ...nullableString, format: "uri", maxLength: 2048 },
    enableNotifications: { type: "boolean" },
    priority: { type: "integer", minimum: 1, maximum: 10 },
    defaultDeadline: { ...nullableString, description: "Five-field deadline cron expression." },
    retryBackoffBaseMs: { type: "integer", minimum: 5000, maximum: 600000 },
    retryBackoffMaxMs: { type: "integer", minimum: 10000, maximum: 3600000 },
  };
  const jsonResponse = schema => ({
    description: "Successful JSON response.",
    content: { "application/json": { schema } },
  });
  const errorResponses = {
    "400": { $ref: "#/components/responses/Error" },
    "401": { $ref: "#/components/responses/Error" },
    "403": { $ref: "#/components/responses/Error" },
    "409": { $ref: "#/components/responses/Error" },
    "413": { $ref: "#/components/responses/Error" },
    "503": { $ref: "#/components/responses/Error" },
  };
  const postBody = schema => ({
    required: true,
    content: { "application/json": { schema } },
  });

  return {
    openapi: "3.1.0",
    info: {
      title: `${AUTOQUEUE_PRODUCT_NAME} HTTP API`,
      version: AUTOQUEUE_API_VERSION,
      description: "Authenticated API for strictly isolated DSH unattended tasks. Workspace, model, and arbitrary preset overrides are intentionally unavailable because rc.2 cannot isolate those Host selection controls.",
      "x-natural-language-aliases": [...AUTOQUEUE_NATURAL_LANGUAGE_ALIASES],
    },
    servers: [{ url: "/", description: "Current DSH Host" }],
    security: [{ BearerAuth: [] }, { AutoqueueToken: [] }],
    tags: [
      { name: "Queue" },
      { name: "Configuration" },
      { name: "Discovery" },
    ],
    paths: {
      "/api/queue/state": {
        get: {
          tags: ["Queue"],
          operationId: "listAutoqueueTasks",
          summary: "Get a queue snapshot",
          parameters: [
            { name: "archived", in: "query", schema: { type: "string", enum: ["0", "1"] } },
            { name: "compact", in: "query", schema: { type: "string", enum: ["0", "1"] }, description: "Drop task bodies and execution arrays; recommended for AI list calls." },
          ],
          responses: {
            "200": jsonResponse({ $ref: "#/components/schemas/QueueSnapshot" }),
            ...errorResponses,
          },
        },
      },
      "/api/queue/task": {
        post: {
          tags: ["Queue"],
          operationId: "createAutoqueueTask",
          summary: "Create an unattended task",
          requestBody: postBody({ $ref: "#/components/schemas/CreateTaskRequest" }),
          responses: {
            "200": jsonResponse({ $ref: "#/components/schemas/MutationResult" }),
            ...errorResponses,
          },
        },
      },
      "/api/queue/action": {
        post: {
          tags: ["Queue"],
          operationId: "applyAutoqueueAction",
          summary: "Stop, archive, restore, delete, rerun, update, scan, or set concurrency",
          description: "stop accepts only running tasks and returns accepted=true,pending=true. Ownership is retained until clear/cancel is accepted and two authoritative sessions.list observations report the owned session idle or absent. Delete pending tasks instead.",
          requestBody: postBody({ $ref: "#/components/schemas/ActionRequest" }),
          responses: {
            "200": jsonResponse({ type: "object", additionalProperties: true }),
            ...errorResponses,
          },
        },
      },
      "/api/queue/detail": {
        get: {
          tags: ["Queue"],
          operationId: "getAutoqueueTask",
          summary: "Get task details, reports, and execution history",
          parameters: [{ name: "key", in: "query", required: true, schema: { type: "string", pattern: KEY_PATTERN, maxLength: 200 } }],
          responses: {
            "200": jsonResponse({ type: "object", additionalProperties: true }),
            ...errorResponses,
          },
        },
      },
      "/api/queue/options": {
        get: {
          tags: ["Discovery"],
          operationId: "getAutoqueueOptions",
          summary: "Read strict-isolation option locks",
          responses: {
            "200": jsonResponse({ $ref: "#/components/schemas/Options" }),
            ...errorResponses,
          },
        },
      },
      "/api/queue/config": {
        get: {
          tags: ["Configuration"],
          operationId: "getAutoqueueConfig",
          summary: "Read runtime defaults",
          responses: {
            "200": jsonResponse({ $ref: "#/components/schemas/Config" }),
            ...errorResponses,
          },
        },
        post: {
          tags: ["Configuration"],
          operationId: "updateAutoqueueConfig",
          summary: "Update runtime defaults",
          requestBody: postBody({ $ref: "#/components/schemas/ConfigPatch" }),
          responses: {
            "200": jsonResponse({ $ref: "#/components/schemas/Config" }),
            ...errorResponses,
          },
        },
      },
      "/api/queue/mark-read": {
        post: {
          tags: ["Queue"],
          operationId: "markAutoqueueTaskRead",
          summary: "Mark a task read or unread",
          requestBody: postBody({
            type: "object",
            additionalProperties: false,
            required: ["key"],
            properties: { key: { type: "string" }, read: { type: "boolean", default: true } },
          }),
          responses: {
            "200": jsonResponse({ type: "object", additionalProperties: false, required: ["ok", "key", "unreadCount"], properties: { ok: { type: "boolean" }, key: { type: "string" }, unreadCount: { type: "integer" } } }),
            ...errorResponses,
          },
        },
      },
      "/api/queue/events": {
        get: {
          tags: ["Queue"],
          operationId: "streamAutoqueueEvents",
          summary: "Stream compact queue snapshots over SSE",
          parameters: [{ name: "archived", in: "query", schema: { type: "string", enum: ["0", "1"] } }],
          responses: { "200": { description: "Server-Sent Event stream.", content: { "text/event-stream": { schema: { type: "string" } } } }, ...errorResponses },
        },
      },
      "/api/autoqueue/capabilities": {
        get: {
          tags: ["Discovery"],
          operationId: "getAutoqueueCapabilities",
          summary: "Discover API resources and registered AI tools",
          responses: { "200": jsonResponse({ type: "object", additionalProperties: true }), ...errorResponses },
        },
      },
      "/api/autoqueue/openapi.json": {
        get: {
          tags: ["Discovery"],
          operationId: "getAutoqueueOpenApi",
          summary: "Get this OpenAPI 3.1 document",
          responses: { "200": jsonResponse({ type: "object", additionalProperties: true }), ...errorResponses },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer" },
        AutoqueueToken: { type: "apiKey", in: "header", name: "X-Autoqueue-Token" },
      },
      responses: {
        Error: {
          description: "JSON error response.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
      schemas: {
        Error: {
          type: "object",
          additionalProperties: false,
          required: ["error"],
          properties: { error: { type: "string" } },
        },
        MutationResult: {
          type: "object",
          additionalProperties: false,
          required: ["ok"],
          properties: {
            ok: { type: "boolean" },
            key: { type: "string" },
            error: { type: "string" },
            accepted: { type: "boolean", description: "The asynchronous stop intent was durably accepted." },
            pending: { type: "boolean", description: "The task still owns its DSH session while authoritative idle reconciliation is pending." },
          },
        },
        CreateTaskRequest: {
          type: "object",
          additionalProperties: false,
          required: ["requestId", "content"],
          properties: {
            requestId: { type: "string", minLength: 1, maxLength: MAX_REQUEST_ID_LENGTH },
            key: { type: "string", pattern: KEY_PATTERN, minLength: 1, maxLength: 200 },
            content: { type: "string", minLength: 1, maxLength: MAX_TASK_CONTENT_BYTES },
            ...taskPolicyProperties,
          },
        },
        UpdateAction: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "key"],
          properties: {
            kind: { const: "update" },
            key: { type: "string", pattern: KEY_PATTERN, minLength: 1, maxLength: 200 },
            content: { type: "string", minLength: 1, maxLength: MAX_TASK_CONTENT_BYTES },
            ...updatePolicyProperties,
          },
        },
        ActionRequest: {
          type: "object",
          additionalProperties: false,
          required: ["requestId", "action"],
          properties: {
            requestId: { type: "string", minLength: 1, maxLength: MAX_REQUEST_ID_LENGTH },
            action: {
              oneOf: [
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "key"],
                  properties: { kind: { type: "string", enum: ["stop", "archive", "restore", "delete", "rerun"] }, key: { type: "string" } },
                },
                {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "keys"],
                  properties: { kind: { const: "archive" }, keys: { type: "array", minItems: 1, maxItems: 100, uniqueItems: true, items: { type: "string" } } },
                },
                { $ref: "#/components/schemas/UpdateAction" },
                { type: "object", additionalProperties: false, required: ["kind"], properties: { kind: { const: "force-scan" } } },
                { type: "object", additionalProperties: false, required: ["kind", "maxConcurrent"], properties: { kind: { const: "set-concurrency" }, maxConcurrent: { type: "integer", minimum: 1, maximum: 8 } } },
              ],
            },
          },
        },
        TaskSummary: {
          type: "object",
          additionalProperties: true,
          required: ["key", "status"],
          properties: {
            key: { type: "string" },
            status: { type: "string", enum: ["pending", "running", "done", "failed", "stopped", "interrupted"] },
            summary: { type: "string" },
            lastSessionId: { type: ["string", "null"] },
            taskType: { type: "string", enum: ["manual", "cron"] },
            nextRunAt: { type: ["string", "null"], format: "date-time" },
            currentRound: { type: ["integer", "null"] },
            goalPhase: { type: ["string", "null"] },
            lastActivityTime: { type: ["integer", "null"] },
            lastError: { type: ["string", "null"] },
            readAt: { type: ["string", "null"], format: "date-time" },
            stopPending: { type: "boolean" },
            attempts: { type: "integer" },
            blockedResumes: { type: "integer" },
            foregroundPaused: { type: "boolean", description: "True while an owned goal is durably paused so a DSH foreground session has priority." },
            ...taskPolicyProperties,
          },
        },
        QueueSnapshot: {
          type: "object",
          additionalProperties: true,
          required: ["revision", "tasks", "config", "runtime"],
          properties: {
            revision: { type: "integer" },
            tasks: { type: "array", items: { $ref: "#/components/schemas/TaskSummary" } },
            config: { type: "object", additionalProperties: true },
            metrics: { type: "object", additionalProperties: true },
            unreadCount: { type: "integer" },
            runtime: { $ref: "#/components/schemas/RuntimeMonitor" },
          },
        },
        RuntimeMonitor: {
          type: "object",
          additionalProperties: false,
          required: ["monitorMode", "watchdogMs", "lastPollAt", "lastScanAt", "lastNativeEventAt", "lastNativeEventSource", "foregroundGate", "sessionListKnown"],
          properties: {
            monitorMode: { const: "native-events+authoritative-reconcile" },
            watchdogMs: { type: "integer", minimum: 1 },
            lastPollAt: { type: ["string", "null"], format: "date-time" },
            lastScanAt: { type: ["string", "null"], format: "date-time" },
            lastNativeEventAt: { type: ["string", "null"], format: "date-time" },
            lastNativeEventSource: { type: ["string", "null"] },
            foregroundGate: { type: "string", enum: ["open", "busy", "unknown"] },
            sessionListKnown: { type: "boolean" },
          },
        },
        Options: {
          type: "object",
          additionalProperties: true,
          required: ["workspaces", "presets", "models", "isolation"],
          properties: {
            workspaces: { type: "array", items: { type: "object", additionalProperties: true } },
            presets: { type: "array", items: { type: "object", additionalProperties: true } },
            models: { type: "array", items: { type: "object", additionalProperties: true } },
            isolation: {
              type: "object",
              additionalProperties: false,
              required: ["strict", "overridesLocked", "reason"],
              properties: {
                strict: { const: true },
                overridesLocked: { type: "array", items: { type: "string", enum: ["workspace", "agentPreset"] } },
                reason: { type: "string" },
              },
            },
          },
        },
        Config: {
          type: "object",
          additionalProperties: false,
          properties: {
            ...configProperties,
            queueDir: { type: ["string", "null"], readOnly: true, description: "Startup-only queue root." },
          },
        },
        ConfigPatch: { type: "object", additionalProperties: false, minProperties: 1, properties: configProperties },
      },
    },
  };
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function readJsonBody(req, maxBytes = MAX_SMALL_JSON_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const contentLength = Number(req.headers["content-length"]);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      req.resume();
      reject(new HttpError(413, "请求体超过大小限制"));
      return;
    }
    req.on("data", c => {
      if (settled) return;
      size += c.length;
      if (size > maxBytes) {
        settled = true;
        chunks.length = 0;
        req.resume();
        reject(new HttpError(413, "请求体超过大小限制"));
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        let buf = Buffer.concat(chunks);
        // 防御性处理 UTF-8 BOM (EF BB BF)，Windows 工具可能写入 BOM
        if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
          buf = buf.subarray(3);
        }
        resolve(JSON.parse(buf.toString("utf8")));
      } catch (e) {
        reject(new HttpError(400, `无效的 JSON: ${e.message}`));
      }
    });
    req.on("error", err => {
      if (settled) return;
      settled = true;
      reject(new HttpError(400, `读取请求体失败: ${err.message}`));
    });
  });
}

function jsonReply(res, code, body) {
  const buf = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": buf.length,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(buf);
}

function errorReply(res, err, fallback = 500) {
  const status = err?.code === "ledger-capacity"
    ? 507
    : (Number.isSafeInteger(err?.statusCode) ? err.statusCode : fallback);
  jsonReply(res, status, { error: err?.message || String(err) });
}

function createSecurityPolicy(config) {
  const configured = Array.isArray(config.allowedHosts)
    ? config.allowedHosts
    : typeof config.allowedHosts === "string"
      ? config.allowedHosts.split(",")
      : [];
  const allowedHosts = ["localhost", "127.0.0.1", "[::1]", "::1", ...configured]
    .map(parseAllowedHost)
    .filter(Boolean);
  const token = typeof config.apiToken === "string" && config.apiToken
    ? config.apiToken
    : process.env.DSH_AUTOQUEUE_TOKEN || process.env.AUTOQUEUE_API_TOKEN || null;
  return { allowedHosts, token };
}

function parseAllowedHost(input) {
  if (typeof input !== "string" || !input.trim() || input.length > 255) return null;
  try {
    const value = input.includes("://") ? input.trim() : `http://${input.trim()}`;
    const parsed = new URL(value);
    if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) return null;
    return { hostname: parsed.hostname.toLowerCase().replace(/^\[|\]$/g, ""), port: parsed.port || null };
  } catch { return null; }
}

function parseRequestHost(req) {
  const raw = req.headers.host;
  if (typeof raw !== "string" || !raw || raw.length > 255 || /[\s,@/\\]/.test(raw)) return null;
  return parseAllowedHost(raw);
}

function hostAllowed(host, policy) {
  return !!host && policy.allowedHosts.some(allowed =>
    allowed.hostname === host.hostname && (!allowed.port || allowed.port === host.port));
}

function isLoopbackAddress(address) {
  if (typeof address !== "string") return false;
  const normalized = address.toLowerCase().replace(/^::ffff:/, "");
  return normalized === "::1" || normalized === "127.0.0.1" || normalized.startsWith("127.");
}

function isLoopbackHostname(hostname) {
  if (typeof hostname !== "string") return false;
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || isLoopbackAddress(normalized);
}

function sameOrigin(origin, host) {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (hostname !== host.hostname) return false;
    if (parsed.port === (host.port || "")) return true;
    const defaultPort = parsed.protocol === "https:" ? "443" : "80";
    return (parsed.port || defaultPort) === (host.port || defaultPort);
  } catch { return false; }
}

function extractToken(req) {
  const direct = req.headers["x-autoqueue-token"];
  if (typeof direct === "string") return direct;
  const authorization = req.headers.authorization;
  if (typeof authorization !== "string") return null;
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearer) return bearer[1];
  const basic = authorization.match(/^Basic\s+(.+)$/i);
  if (basic) {
    try {
      const decoded = Buffer.from(basic[1], "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator >= 0) return decoded.slice(separator + 1);
    } catch { return null; }
  }
  return null;
}

function tokenMatches(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const left = Buffer.from(actual, "utf8");
  const right = Buffer.from(expected, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function authorizeRequest(req, res, policy) {
  const host = parseRequestHost(req);
  if (!hostAllowed(host, policy)) {
    jsonReply(res, 403, { error: "Host 未获允许；远程部署请配置 allowedHosts" });
    return false;
  }
  const origin = req.headers.origin;
  if (origin !== undefined && (typeof origin !== "string" || !sameOrigin(origin, host))) {
    jsonReply(res, 403, { error: "拒绝跨站请求" });
    return false;
  }
  // Origin is a CSRF signal, not an identity signal: arbitrary HTTP clients
  // can forge it. Only a direct loopback connection addressed to a loopback
  // Host is zero-config. This also prevents a reverse proxy whose peer is
  // 127.0.0.1 from accidentally bypassing authentication for a public Host.
  // Once a token is configured it defines an explicit strict-auth mode for
  // every request, including localhost. A same-host reverse proxy can make
  // both peer and Host appear loopback, which is indistinguishable from a
  // direct local request at this layer.
  if (policy.token) {
    if (tokenMatches(extractToken(req), policy.token)) return true;
    res.setHeader("WWW-Authenticate", 'Bearer realm="autoqueue"');
    jsonReply(res, 401, { error: "请求需要有效的 API token" });
    return false;
  }
  const directLoopback = isLoopbackAddress(req.socket?.remoteAddress) && isLoopbackHostname(host.hostname);
  if (directLoopback) return true;
  res.setHeader("WWW-Authenticate", 'Bearer realm="autoqueue"');
  jsonReply(res, 401, { error: "远程请求已禁用；请在插件启动配置中设置 apiToken" });
  return false;
}

function guardRequest(req, res, policy, methods, jsonBody = false) {
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    jsonReply(res, 405, { error: "Method Not Allowed" });
    return false;
  }
  if (!authorizeRequest(req, res, policy)) return false;
  if (jsonBody) {
    const contentType = req.headers["content-type"];
    if (typeof contentType !== "string" || !/^application\/json(?:\s*;[^\r\n]*)?$/i.test(contentType)) {
      jsonReply(res, 415, { error: "Content-Type 必须是 application/json" });
      return false;
    }
  }
  return true;
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, `${label} 必须是对象`);
  return value;
}

function rejectUnknownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new HttpError(400, `${label} 包含未知字段: ${key}`);
  }
}

function validateRequestId(requestId) {
  if (typeof requestId !== "string" || !requestId.trim() || requestId.length > MAX_REQUEST_ID_LENGTH || /[\u0000-\u001f\u007f]/.test(requestId)) {
    throw new HttpError(400, `requestId 必须是 1-${MAX_REQUEST_ID_LENGTH} 个字符的字符串`);
  }
}

function validateContent(content, required = true) {
  if (content === undefined && !required) return;
  if (typeof content !== "string" || (required && !content.trim())) throw new HttpError(400, "content 必须是非空字符串");
  if (Buffer.byteLength(content, "utf8") > MAX_TASK_CONTENT_BYTES) throw new HttpError(413, "content 超过 2MB 限制");
}

function validateInteger(value, name, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new HttpError(400, `${name} 必须是 ${min}-${max} 的整数`);
}

function validateBoolean(value, name) {
  if (typeof value !== "boolean") throw new HttpError(400, `${name} 必须是布尔值`);
}

function validateString(value, name, maxLength = 512, nullable = false) {
  if (nullable && value === null) return;
  if (typeof value !== "string" || value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new HttpError(400, `${name} 必须是长度不超过 ${maxLength} 的字符串${nullable ? "或 null" : ""}`);
  }
}

function validateWebhook(value, name = "webhook", nullable = true) {
  if (nullable && (value === null || value === "")) return;
  validateString(value, name, 2048, false);
  let parsed;
  try { parsed = new URL(value); } catch { throw new HttpError(400, `${name} 必须是有效 URL`); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new HttpError(400, `${name} 仅支持 http/https`);
  if (parsed.username || parsed.password) throw new HttpError(400, `${name} 不允许在 URL 中携带凭据`);
}

function validateOptionalCron(value, name, allowClear = false) {
  if (allowClear && (value === null || value === "")) return;
  try { validateCronExpression(value, name); } catch (err) { throw new HttpError(400, err.message); }
}

const TASK_FIELDS = new Set([
  "requestId", "key", "content", "title", "cron", "deadline",
  "maxGoalRounds", "maxBlockedResumes", "timeoutMs", "priority", "webhook", "autoArchive",
  "enableNotifications", "maxAttempts", "cwd", "sourceSessionId", "provider", "model",
]);

function validateTaskBody(body) {
  requireObject(body, "请求体");
  rejectUnknownKeys(body, TASK_FIELDS, "任务请求");
  validateRequestId(body.requestId);
  validateContent(body.content);
  if (body.key !== undefined && body.key !== null && body.key !== "") {
    try { validateKey(body.key); } catch (err) { throw new HttpError(400, err.message); }
  }
  if (body.cron !== undefined && body.cron !== null) validateOptionalCron(body.cron, "cron");
  if (body.deadline !== undefined && body.deadline !== null) validateOptionalCron(body.deadline, "deadline");
  if (body.maxGoalRounds !== undefined) validateInteger(body.maxGoalRounds, "maxGoalRounds", 1, 100);
  if (body.maxBlockedResumes !== undefined) validateInteger(body.maxBlockedResumes, "maxBlockedResumes", 0, 10);
  if (body.timeoutMs !== undefined) validateInteger(body.timeoutMs, "timeoutMs", 600_000, 86_400_000);
  if (body.priority !== undefined) validateInteger(body.priority, "priority", 1, 10);
  if (body.maxAttempts !== undefined) validateInteger(body.maxAttempts, "maxAttempts", 1, 10);
  if (body.webhook !== undefined) validateWebhook(body.webhook);
  if (body.autoArchive !== undefined) validateBoolean(body.autoArchive, "autoArchive");
  if (body.enableNotifications !== undefined) validateBoolean(body.enableNotifications, "enableNotifications");
}

const UPDATE_FIELDS = new Set([
  "kind", "key", "content", "title", "cron", "deadline", "maxGoalRounds", "maxBlockedResumes",
  "timeoutMs", "priority", "webhook", "autoArchive", "enableNotifications", "maxAttempts",
  "provider", "model",
]);

function validateUpdateAction(action) {
  rejectUnknownKeys(action, UPDATE_FIELDS, "update action");
  const changed = Object.keys(action).filter(key => key !== "kind" && key !== "key");
  if (!changed.length) throw new HttpError(400, "update action 没有可更新字段");
  if (action.content !== undefined) validateContent(action.content);
  if (action.cron !== undefined) validateOptionalCron(action.cron, "cron", true);
  if (action.deadline !== undefined) validateOptionalCron(action.deadline, "deadline", true);
  if (action.maxGoalRounds !== undefined && action.maxGoalRounds !== null) validateInteger(action.maxGoalRounds, "maxGoalRounds", 1, 100);
  if (action.maxBlockedResumes !== undefined && action.maxBlockedResumes !== null) validateInteger(action.maxBlockedResumes, "maxBlockedResumes", 0, 10);
  if (action.timeoutMs !== undefined && action.timeoutMs !== null) validateInteger(action.timeoutMs, "timeoutMs", 600_000, 86_400_000);
  if (action.priority !== undefined) validateInteger(action.priority, "priority", 1, 10);
  if (action.maxAttempts !== undefined && action.maxAttempts !== null) validateInteger(action.maxAttempts, "maxAttempts", 1, 10);
  if (action.webhook !== undefined) validateWebhook(action.webhook);
  if (action.autoArchive !== undefined) validateBoolean(action.autoArchive, "autoArchive");
  if (action.enableNotifications !== undefined) validateBoolean(action.enableNotifications, "enableNotifications");
}

function validateActionBody(body) {
  requireObject(body, "请求体");
  rejectUnknownKeys(body, new Set(["requestId", "action"]), "action 请求");
  validateRequestId(body.requestId);
  const action = requireObject(body.action, "action");
  if (typeof action.kind !== "string") throw new HttpError(400, "缺少或无效的 action.kind");
  const keyedKinds = new Set(["stop", "archive", "restore", "delete", "rerun", "update"]);
  const simpleKinds = new Set(["stop", "restore", "delete", "rerun"]);
  if (![...keyedKinds, "force-scan", "set-concurrency"].includes(action.kind)) throw new HttpError(400, `未知 action: ${action.kind}`);
  if (action.kind === "update") validateUpdateAction(action);
  else if (simpleKinds.has(action.kind)) rejectUnknownKeys(action, new Set(["kind", "key"]), `${action.kind} action`);
  else if (action.kind === "archive") rejectUnknownKeys(action, new Set(["kind", "key", "keys"]), "archive action");
  else if (action.kind === "force-scan") rejectUnknownKeys(action, new Set(["kind", "key"]), "force-scan action");
  else rejectUnknownKeys(action, new Set(["kind", "key", "maxConcurrent"]), "set-concurrency action");

  if (keyedKinds.has(action.kind)) {
    if (action.kind === "archive" && action.keys !== undefined && !Array.isArray(action.keys)) {
      throw new HttpError(400, "keys 必须是数组");
    }
    if (action.kind === "archive" && Array.isArray(action.keys)) {
      if (!action.keys.length || action.keys.length > 100) throw new HttpError(400, "keys 数量必须是 1-100");
      const unique = new Set();
      for (const key of action.keys) {
        try { validateKey(key); } catch (err) { throw new HttpError(400, err.message); }
        if (unique.has(key)) throw new HttpError(400, `keys 包含重复任务: ${key}`);
        unique.add(key);
      }
    } else {
      try { validateKey(action.key); } catch (err) { throw new HttpError(400, err.message); }
    }
  }
  if (action.kind === "set-concurrency") validateInteger(action.maxConcurrent, "maxConcurrent", 1, 8);
}

const CONFIG_FIELDS = new Set([
  "maxGoalRounds", "maxBlockedResumes", "unknownThreshold", "maxAttempts", "taskTimeoutMs", "autoArchive",
  "webhook", "queueDir", "enableNotifications", "enableHostAiTools", "priority", "defaultDeadline",
  "retryBackoffBaseMs", "retryBackoffMaxMs",
]);

function validateConfigPatch(body) {
  requireObject(body, "配置");
  rejectUnknownKeys(body, CONFIG_FIELDS, "配置");
  if (Object.hasOwn(body, "queueDir")) throw new HttpError(409, "queueDir 只能在插件启动配置中设置，运行时热切换已被拒绝");
  if (Object.hasOwn(body, "enableHostAiTools")) throw new HttpError(409, "enableHostAiTools 只能在插件启动配置中设置，运行时热切换已被拒绝");
  if (body.maxGoalRounds !== undefined) validateInteger(body.maxGoalRounds, "maxGoalRounds", 1, 100);
  if (body.maxBlockedResumes !== undefined) validateInteger(body.maxBlockedResumes, "maxBlockedResumes", 0, 10);
  if (body.unknownThreshold !== undefined) validateInteger(body.unknownThreshold, "unknownThreshold", 1, 10);
  if (body.maxAttempts !== undefined) validateInteger(body.maxAttempts, "maxAttempts", 1, 10);
  if (body.taskTimeoutMs !== undefined) validateInteger(body.taskTimeoutMs, "taskTimeoutMs", 600_000, 86_400_000);
  if (body.priority !== undefined) validateInteger(body.priority, "priority", 1, 10);
  if (body.retryBackoffBaseMs !== undefined) validateInteger(body.retryBackoffBaseMs, "retryBackoffBaseMs", 5_000, 600_000);
  if (body.retryBackoffMaxMs !== undefined) validateInteger(body.retryBackoffMaxMs, "retryBackoffMaxMs", 10_000, 3_600_000);
  if (body.autoArchive !== undefined) validateBoolean(body.autoArchive, "autoArchive");
  if (body.enableNotifications !== undefined) validateBoolean(body.enableNotifications, "enableNotifications");
  if (body.webhook !== undefined) validateWebhook(body.webhook);
  if (body.defaultDeadline !== undefined) validateOptionalCron(body.defaultDeadline, "defaultDeadline", true);
}

function registerRoutes(ctx, engine, security) {
  const disposers = [];
  const sseClients = new Set();
  const MAX_SSE_CONNECTIONS = 8;
  const SSE_BACKPRESSURE_TIMEOUT_MS = 30_000;

  function compactSseSnapshot(includeArchived) {
    const snap = engine.snapshot(includeArchived);
    return {
      ...snap,
      tasks: snap.tasks.map(task => {
        const compact = {
          ...task,
          summary: String(task.body ?? "").split("\n")[0]?.replace(/^#+\s*/, "").trim().slice(0, 240) || task.key,
        };
        delete compact.body;
        delete compact.executions;
        return compact;
      }),
    };
  }

  function removeSseClient(client, end = false) {
    if (client.closed) return;
    client.closed = true;
    sseClients.delete(client);
    client.res.off?.("drain", client.onDrain);
    if (end) {
      try { client.res.end(); } catch { /* already closed */ }
    }
  }

  function writeSseFrame(client, frame) {
    if (client.closed) return false;
    if (client.blockedAt) {
      if (Date.now() - client.blockedAt >= SSE_BACKPRESSURE_TIMEOUT_MS) removeSseClient(client, true);
      return false;
    }
    try {
      if (client.res.write(frame) === false) client.blockedAt = Date.now();
      return true;
    } catch {
      removeSseClient(client);
      return false;
    }
  }

  const snapshotTimer = ctx.timer.interval(() => {
    const now = Date.now();
    for (const client of [...sseClients]) {
      if (client.blockedAt && now - client.blockedAt >= SSE_BACKPRESSURE_TIMEOUT_MS) {
        removeSseClient(client, true);
      }
    }
    for (const includeArchived of [false, true]) {
      const clients = [...sseClients].filter(client => !client.closed && client.includeArchived === includeArchived && !client.blockedAt);
      if (!clients.length) continue;
      let frame;
      try { frame = `data: ${JSON.stringify(compactSseSnapshot(includeArchived))}\n\n`; } catch { continue; }
      for (const client of clients) writeSseFrame(client, frame);
    }
  }, 10_000);
  const heartbeatTimer = ctx.timer.interval(() => {
    for (const client of [...sseClients]) writeSseFrame(client, ": heartbeat\n\n");
  }, 25_000);
  disposers.push(() => {
    snapshotTimer();
    heartbeatTimer();
    for (const client of [...sseClients]) removeSseClient(client, true);
  });

  // Machine-readable discovery endpoints. They describe authentication but
  // never include configured credentials or other secret values.
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/autoqueue/capabilities",
    handler: (req, res) => {
      if (!guardRequest(req, res, security, ["GET"])) return;
      jsonReply(res, 200, capabilitiesDocument(security));
    },
  }));
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/autoqueue/openapi.json",
    handler: (req, res) => {
      if (!guardRequest(req, res, security, ["GET"])) return;
      jsonReply(res, 200, openApiDocument());
    },
  }));

  // GET /api/queue/state — 快照（对齐 task-board /api/task-board/state）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/state",
    handler: (req, res) => {
      if (!guardRequest(req, res, security, ["GET"])) return;
      try {
        const url = new URL(req.url, "http://localhost");
        const archived = url.searchParams.get("archived");
        if (archived !== null && archived !== "0" && archived !== "1") throw new HttpError(400, "archived 只能是 0 或 1");
        const compact = url.searchParams.get("compact");
        if (compact !== null && compact !== "0" && compact !== "1") throw new HttpError(400, "compact 只能是 0 或 1");
        const includeArchived = archived === "1";
        jsonReply(res, 200, compact === "1"
          ? compactSseSnapshot(includeArchived)
          : engine.snapshot(includeArchived));
      } catch (err) {
        errorReply(res, err);
      }
    },
  }));

  // POST /api/queue/action — 动作信封（对齐 task-board /api/task-board/action）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/action",
    handler: async (req, res) => {
      if (!guardRequest(req, res, security, ["POST"], true)) return;
      try {
        const body = await readJsonBody(req, MAX_TASK_JSON_BYTES);
        validateActionBody(body);
        const { requestId, action } = body;
        const result = await engine.applyAction(requestId, action.kind, action.key, action);
        flushLedger();
        jsonReply(res, 200, result);
      } catch (err) {
        errorReply(res, err, 400);
      }
    },
  }));

  // POST /api/queue/task — 创建任务（对齐 task-board action create）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/task",
    handler: async (req, res) => {
      if (!guardRequest(req, res, security, ["POST"], true)) return;
      try {
        const body = await readJsonBody(req, MAX_TASK_JSON_BYTES);
        validateTaskBody(body);
        const { requestId, key, content, title, cron, deadline, maxGoalRounds, maxBlockedResumes, timeoutMs, priority, webhook, autoArchive, enableNotifications, maxAttempts, cwd, sourceSessionId, provider, model } = body;

        const result = engine.createTask(requestId, key, content, { title, cron, deadline, maxGoalRounds, maxBlockedResumes, timeoutMs, priority, webhook, autoArchive, enableNotifications, maxAttempts, cwd, sourceSessionId, provider, model });
        flushLedger();
        jsonReply(res, result.ok ? 200 : 409, result);
      } catch (err) {
        errorReply(res, err, 400);
      }
    },
  }));

  // GET /api/queue/config — 运行时配置
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/config",
    handler: async (req, res) => {
      if (!guardRequest(req, res, security, ["GET", "POST"], req.method === "POST")) return;
      try {
        if (req.method === "GET") {
          jsonReply(res, 200, engine.getConfig());
        } else {
          const body = await readJsonBody(req, MAX_SMALL_JSON_BYTES);
          validateConfigPatch(body);
          jsonReply(res, 200, engine.setConfig(body));
        }
      } catch (err) {
        errorReply(res, err);
      }
    },
  }));

  // GET /api/queue/options — 严格隔离约束。不读取宿主工作区、模型或预设，
  // 避免一个纯展示请求对 DSH 主进程施加 RPC 负载或泄露宿主状态。
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/options",
    handler: async (req, res) => {
      if (!guardRequest(req, res, security, ["GET"])) return;
      jsonReply(res, 200, {
        workspaces: [],
        presets: [],
        models: [],
        isolation: {
          strict: true,
          overridesLocked: ["workspace", "agentPreset"],
          reason: "AutoQueue uses a task-local cwd, versioned owned preset, and the Host default model without mutating Host selection state.",
        },
      });
    },
  }));

  // GET /api/queue/detail?key=xxx — 任务详情（含报告）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/detail",
    handler: (req, res) => {
      if (!guardRequest(req, res, security, ["GET"])) return;
      try {
        const url = new URL(req.url, "http://localhost");
        const key = url.searchParams.get("key");
        try { validateKey(key); } catch (err) { throw new HttpError(400, err.message); }
        jsonReply(res, 200, engine.getTaskDetail(key));
      } catch (err) {
        errorReply(res, err);
      }
    },
  }));

  // POST /api/queue/mark-read — 标记任务已读/未读
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/mark-read",
    handler: async (req, res) => {
      if (!guardRequest(req, res, security, ["POST"], true)) return;
      try {
        const body = await readJsonBody(req, MAX_SMALL_JSON_BYTES);
        requireObject(body, "请求体");
        rejectUnknownKeys(body, new Set(["key", "read"]), "mark-read 请求");
        const { key, read } = body;
        try { validateKey(key); } catch (err) { throw new HttpError(400, err.message); }
        if (read !== undefined) validateBoolean(read, "read");
        const ok = read !== false ? markRead(key) : markUnread(key);
        flushLedger();
        jsonReply(res, 200, { ok, key, unreadCount: unreadCount() });
      } catch (err) {
        errorReply(res, err);
      }
    },
  }));

  // GET /api/queue/events — SSE 推送（对齐 task-board /api/task-board/events）
  disposers.push(ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/events",
    handler: (req, res) => {
      if (!guardRequest(req, res, security, ["GET"])) return;
      if (sseClients.size >= MAX_SSE_CONNECTIONS) {
        errorReply(res, new HttpError(503, "SSE 连接数已达上限"));
        return;
      }
      let includeArchived = false;
      try {
        const url = new URL(req.url, "http://localhost");
        const archived = url.searchParams.get("archived");
        if (archived !== null && archived !== "0" && archived !== "1") throw new HttpError(400, "archived 只能是 0 或 1");
        includeArchived = archived === "1";
      } catch (err) {
        errorReply(res, err, 400);
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Content-Type-Options": "nosniff",
      });

      const client = {
        res,
        includeArchived,
        blockedAt: 0,
        closed: false,
        onDrain: null,
      };
      client.onDrain = () => { client.blockedAt = 0; };
      res.on?.("drain", client.onDrain);
      sseClients.add(client);
      try {
        writeSseFrame(client, `data: ${JSON.stringify(compactSseSnapshot(includeArchived))}\n\n`);
      } catch {
        removeSseClient(client, true);
      }
      req.on("close", () => removeSseClient(client));
    },
  }));

  return disposers;
}

// ─── 预设自动创建 ──────────────────────────────────────

/**
 * 无人值守纪律模板：自动注入到 agent 的 persona 中
 * 让 agent 在无人值守模式下不提问、自主决策、记录 GAP
 */
const UNATTENDED_MARKER = "[autoqueue:unattended-discipline:v2]";
const UNATTENDED_DISABLED_TOOL_IDS = Object.freeze([
  "tool-ask-user",
  "tool-jobs",
  "tool-subagent-control",
  "tool-subagent-list-agents",
  "tool-subagent",
  "tool-subagent-fork",
  "tool-subagent-codex",
  "tool-subagent-claude-code",
  "tool-workflow",
  "tool-ralph",
]);
const UNATTENDED_SHELL_TOOL_IDS = Object.freeze(["tool-bash", "tool-pwsh"]);
const UNATTENDED_DISCIPLINE = `

      ${UNATTENDED_MARKER}
      ## Unattended Discipline

      You are executing a task in unattended mode. The following rules are MANDATORY:

      1. **Do not ask questions.** No one will answer you. When uncertain, make the best judgment and continue executing.
      2. **Solve problems yourself first.** When stuck, consult documentation, search the web, or try alternative approaches. Do not stop.
      3. **Record GAPs.** If a subtask truly cannot be completed (permission denied, missing dependencies, objectively impossible), do not abandon the entire task. Record the unfinished part in a GAP.md file with this format:
         - Subtask description
         - Methods attempted
         - Why it could not be completed
         - Suggested alternatives
         Then continue with the remaining parts.
      4. **Produce a report.** When the task completes, write a report file containing:
         - Task objective
         - Completion status (what was done, what are GAPs)
         - Execution steps summary
         - Key findings
         - Final output
      5. **Self-evaluate completion.** Mark the goal as complete when everything that can be done has been done. Having GAPs does not equal failure — as long as you tried your best, a complete with GAPs is still completing the task.
      6. **Never request approval.** Do not ask for sandbox escalation and never set sandbox_permissions=require_escalated. If an operation is denied, record the limitation as a GAP and continue with safe alternatives.
      7. **Stay in the owned foreground turn.** Never launch detached, daemon, background-job, workflow, Ralph, or child-agent work. Every command must finish inside the current turn so the Host can preempt this queue session safely.
      8. **Focus on the task.** Only process the deliverables explicitly required by the task content. Form a minimal completion checklist first; every tool call must directly advance one checklist item.
      9. **Do not access other queue data.** Never read or call other AutoQueue tasks, the queue ledger, the queue HTTP API, \~/.dsh\, trash, credentials, past run records, or unrelated sessions. Do not inspect other repositories or worktrees unless the task explicitly specifies them.
      10. **Diagnostic limit.** When blocked, at most two diagnostic tool calls, each using a different method strictly within the task scope. If still stuck, record the GAP and continue with the remaining requirements. If nothing remains, conclude with the available evidence.
      11. **Complete immediately.** As soon as the checklist is fully satisfied, output the result and mark the goal as complete. Do not continue searching, reviewing, optimizing, browsing the web, or comparing alternatives. Only browse the web if the task explicitly requires it or the deliverable depends on irreplaceable external facts.
      12. **不要创建新的循环调度任务。** 你正在执行的任务已经由队列调度器管理。如果任务内容提到时间间隔（如"每2分钟"），那是队列的 cron 调度描述，不是让你创建新的循环任务。直接执行任务内容即可。一次性定时任务和手动任务是允许的。
`;

/**
 * Ensure the owned preset exists with the latest unattended discipline.
 * On every startup, the preset is synced with the current UNATTENDED_DISCIPLINE.
 * Foreign presets (without our ownership marker) are rejected.
 */
export async function ensureOwnedPreset(ctx, sourceId, targetId, name) {
  const agentPresets = ctx.agentPresets ?? ctx.get?.("agentPresets");
  if (!agentPresets) {
    throw new Error("AutoQueue requires the DSH agentPresets service");
  }

  let presets = await agentPresets.list();
  let preset = presets.find(item => item.id === targetId);
  const existed = Boolean(preset);
  if (!preset) {
    await agentPresets.copy(sourceId, targetId, name);
    presets = await agentPresets.list();
    preset = presets.find(item => item.id === targetId);
    if (!preset) throw new Error(`AutoQueue preset ${targetId} was not created`);
  }

  const content = await agentPresets.read(targetId);
  if (existed && !content.includes(UNATTENDED_MARKER)) {
    throw new Error(`Refusing to overwrite foreign preset ${targetId}`);
  }
  const disciplined = injectUnattendedDiscipline(content);
  if (disciplined === content && hasCompleteUnattendedDiscipline(content)) {
    return; // 已经是最新，无需写入
  }
  if (!preset.path) throw new Error(`Preset ${targetId} has no writable path`);
  const temporaryPath = `${preset.path}.autoqueue-${process.pid}-${Date.now()}.tmp`;
  try {
    await writeFile(temporaryPath, disciplined, { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, preset.path);
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
  const persisted = await agentPresets.read(targetId);
  if (persisted !== disciplined || !hasCompleteUnattendedDiscipline(persisted)) {
    throw new Error(`Preset ${targetId} failed exact persistence verification`);
  }
}

function findPresetItem(lines, id) {
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([ \t]*)- id:[ \t]*([^# \t]+)[ \t]*$/);
    if (!match || match[2] !== id) continue;
    const indent = match[1];
    let end = index + 1;
    while (end < lines.length) {
      const line = lines[end];
      if (line.trim() === "") { end += 1; continue; }
      const nextIndent = line.match(/^[ \t]*/)?.[0] ?? "";
      if (nextIndent.length <= indent.length) break;
      end += 1;
    }
    return { start: index, end, indent };
  }
  return null;
}

function directPresetField(lines, id, field) {
  const item = findPresetItem(lines, id);
  if (!item) return null;
  const prefix = item.indent + "  ";
  for (let index = item.start + 1; index < item.end; index += 1) {
    const line = lines[index];
    if (!line.startsWith(prefix) || line.startsWith(prefix + " ") || line.startsWith(prefix + "\t")) continue;
    const match = line.trim().match(new RegExp(`^${field}\\s*:\\s*(.*)$`));
    if (match) return match[1];
  }
  return null;
}

function normalizeDirectPresetField(lines, id, field, value) {
  const item = findPresetItem(lines, id);
  if (!item) return false;
  const prefix = item.indent + "  ";
  for (let index = item.start + 1; index < item.end; index += 1) {
    const line = lines[index];
    if (!line.startsWith(prefix) || line.startsWith(prefix + " ") || line.startsWith(prefix + "\t")) continue;
    if (new RegExp(`^${field}\\s*:`).test(line.trim())) {
      lines[index] = `${prefix}${field}: ${value}`;
      return true;
    }
  }
  lines.splice(item.start + 1, 0, `${prefix}${field}: ${value}`);
  return true;
}

function normalizePresetConfigBoolean(lines, id, field, value) {
  let item = findPresetItem(lines, id);
  if (!item) return false;
  const directPrefix = item.indent + "  ";
  let configIndex = -1;
  for (let index = item.start + 1; index < item.end; index += 1) {
    if (lines[index] === directPrefix + "config:") { configIndex = index; break; }
    if (lines[index].startsWith(directPrefix + "config:")) return false;
  }
  if (configIndex < 0) {
    lines.splice(item.end, 0, directPrefix + "config:", directPrefix + `  ${field}: ${value}`);
    return true;
  }

  item = findPresetItem(lines, id);
  const fieldPrefix = directPrefix + "  ";
  let insertAt = configIndex + 1;
  for (let index = configIndex + 1; index < item.end; index += 1) {
    const line = lines[index];
    if (line.trim() === "") { insertAt = index + 1; continue; }
    const indent = line.match(/^[ \t]*/)?.[0] ?? "";
    if (indent.length <= directPrefix.length) break;
    insertAt = index + 1;
    if (indent === fieldPrefix && new RegExp(`^${field}\\s*:`).test(line.trim())) {
      lines[index] = `${fieldPrefix}${field}: ${value}`;
      return true;
    }
  }
  lines.splice(insertAt, 0, `${fieldPrefix}${field}: ${value}`);
  return true;
}

function presetConfigBoolean(lines, id, field) {
  const item = findPresetItem(lines, id);
  if (!item) return null;
  const directPrefix = item.indent + "  ";
  const configIndex = lines.findIndex((line, index) => (
    index > item.start && index < item.end && line === directPrefix + "config:"
  ));
  if (configIndex < 0) return null;
  const fieldPrefix = directPrefix + "  ";
  for (let index = configIndex + 1; index < item.end; index += 1) {
    const line = lines[index];
    if (line.trim() === "") continue;
    const indent = line.match(/^[ \t]*/)?.[0] ?? "";
    if (indent.length <= directPrefix.length) break;
    if (indent === fieldPrefix) {
      const match = line.trim().match(new RegExp(`^${field}\\s*:\\s*(.*)$`));
      if (match) return match[1];
    }
  }
  return null;
}

function hasCompleteUnattendedDiscipline(content) {
  if (typeof content !== "string") return false;
  if (content.split(UNATTENDED_MARKER).length - 1 !== 1) return false;
  if (!content.includes("## Unattended Discipline")) return false;
  if (!content.includes("**Do not ask questions.**")) return false;
  if (!content.includes("**Never request approval.**")) return false;
  if (!content.includes("**Stay in the owned foreground turn.**")) return false;

  const lines = content.split("\n");
  if (UNATTENDED_DISABLED_TOOL_IDS.some(id => directPresetField(lines, id, "disabled") !== "true")) return false;
  if (UNATTENDED_SHELL_TOOL_IDS.some(id => presetConfigBoolean(lines, id, "enableRunInBackground") !== "false")) return false;
  return true;
}

/**
 * 注入无人值守纪律到 agent.cordis.yml 文本中
 * @param {string} content - 原始 YAML 文本
 * @returns {string} 修改后的 YAML 文本
 */
export function injectUnattendedDiscipline(content) {
  let result = content;

  // 1. Replace persona text: find the text: block scalar and append discipline
  // Matches common YAML block scalars: |, >, |-, >-, |+, >+
  let lines = result.split('\n');
  let hasDiscipline = result.includes(UNATTENDED_MARKER);
  if (!hasDiscipline) {
    // 兼容旧版本已经注入、但尚无 marker 的预设：补 marker，不重复追加正文。
    const legacyIndex = lines.findIndex(line => line.trim() === "## Unattended Discipline");
    if (legacyIndex >= 0) {
      const indent = lines[legacyIndex].match(/^\s*/)?.[0] ?? "";
      lines.splice(legacyIndex, 0, indent + UNATTENDED_MARKER);
      hasDiscipline = true;
    }
  }

  if (!hasDiscipline) {
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\s*)text:\s*([|>][+\-]?|[+\-][|>]?)\s*$/);
      if (!m) continue;
      const baseIndent = m[1];

      // Collect all indented lines belonging to this block scalar
      let blockEnd = i + 1;
      while (blockEnd < lines.length) {
        const next = lines[blockEnd];
        if (next.trim() === '') { blockEnd++; continue; }
        if (next.startsWith(baseIndent + '  ')) { blockEnd++; continue; }
        break;
      }

      // Use |- (literal block, strip trailing newlines) for consistent formatting
      lines[i] = baseIndent + 'text: |-';

      const disciplineLines = UNATTENDED_DISCIPLINE.split('\n');
      for (const dl of disciplineLines) {
        lines.splice(blockEnd, 0, dl === '' ? '' : baseIndent + '  ' + dl.trimStart());
        blockEnd++;
      }
      break;
    }
  }

  // 2. Disable every high-fanout or human-interaction tool. Child sessions
  // and detached jobs do not carry our owned session id, so the queue cannot
  // safely preempt or clean them when a Host foreground session starts.
  for (const id of UNATTENDED_DISABLED_TOOL_IDS) {
    normalizeDirectPresetField(lines, id, "disabled", "true");
  }

  // 3. Keep shell execution foreground-bound as well. Disabling tool-jobs
  // alone is insufficient because bash/pwsh expose run_in_background directly.
  for (const id of UNATTENDED_SHELL_TOOL_IDS) {
    normalizePresetConfigBoolean(lines, id, "enableRunInBackground", "false");
  }

  return lines.join('\n');
}

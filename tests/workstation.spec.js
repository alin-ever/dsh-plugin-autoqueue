import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const VISUAL_DIR = resolve("test-results/visual");

function task(overrides = {}) {
  return {
    key: "safe-job",
    status: "pending",
    body: "# Safe job\n\nRun without disturbing the foreground session.",
    summary: "Run without disturbing the foreground session",
    priority: 5,
    taskType: "manual",
    attempts: 0,
    blockedResumes: 0,
    createdAt: "2026-08-31T08:00:00.000Z",
    updatedAt: "2026-08-31T08:00:00.000Z",
    archivedAt: null,
    executions: [],
    ...overrides,
  };
}

function defaultConfig() {
  return {
    maxConcurrent: 2,
    maxGoalRounds: 77,
    maxBlockedResumes: 7,
    autoArchive: false,
    unknownThreshold: 9,
    taskTimeoutMs: 7_200_000,
    maxAttempts: 8,
    defaultDeadline: "0 22 * * *",
    webhook: "https://example.test/hook",
    queueDir: "/srv/queue/tasks",
    enableNotifications: true,
    priority: 6,
    retryBackoffBaseMs: 45_000,
    retryBackoffMaxMs: 1_200_000,
  };
}

function metricsFor(tasks) {
  const active = tasks.filter((item) => !item.archivedAt);
  const done = active.filter((item) => item.status === "done").length;
  const failed = active.filter((item) => item.status === "failed").length;
  return {
    total: active.length,
    running: active.filter((item) => item.status === "running").length,
    pending: active.filter((item) => item.status === "pending").length,
    done24h: done,
    failed24h: failed,
    successRate: done + failed ? Math.round(done / (done + failed) * 100) : 0,
  };
}

async function mockApi(page, setup = {}) {
  const model = {
    revision: setup.revision || 1,
    tasks: (setup.tasks || [task()]).map((item) => ({ ...item })),
    stateConfig: { maxConcurrent: 2, ...(setup.stateConfig || {}) },
    config: { ...defaultConfig(), ...(setup.config || {}) },
    options: setup.options || {
      workspaces: [], presets: [], models: [],
      isolation: {
        strict: true,
        overridesLocked: ["workspace", "agentPreset", "model"],
        reason: "Task-local cwd and versioned owned preset",
      },
    },
    capabilities: setup.capabilities || {
      name: "autoqueue",
      displayName: "任务队列",
      aliases: ["老登"],
      apiVersion: "1.0.0",
      pluginVersion: "0.3.0",
      dshCompatibility: ">=0.1.1-rc.2 <0.1.2",
      basePath: "/api/queue",
      openapi: "/api/autoqueue/openapi.json",
      authentication: {
        schemes: ["Authorization: Bearer <token>", "X-Autoqueue-Token: <token>"],
        tokenValuesReturned: false,
        loopbackDirectAccess: false,
        remoteTokenRequired: true,
      },
      features: {
        unattendedExecution: true,
        scheduling: ["immediate", "schedule", "cron", "deadline"],
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
        sessionSandboxMode: "danger-full-access",
        sessionApprovalPolicy: "never",
        hostAiToolsDefaultEnabled: false,
      },
      limits: { taskContentBytes: 2_000_000, batchArchiveTasks: 100, maxConcurrent: 8, sseConnections: 8 },
      resources: {
        state: "/api/queue/state", task: "/api/queue/task", action: "/api/queue/action",
        detail: "/api/queue/detail", options: "/api/queue/options", config: "/api/queue/config",
        markRead: "/api/queue/mark-read", events: "/api/queue/events",
      },
      aiTools: Array.from({ length: 16 }, (_, index) => "autoqueue_tool_" + String(index + 1)),
      aiToolRegistration: { defaultEnabled: false, optInConfig: "enableHostAiTools" },
    },
    stateUrls: [],
    configPatches: [],
    createdTasks: [],
    actions: [],
    markReadRequests: [],
    stateRequests: 0,
  };

  await page.route("**/api/autoqueue/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/capabilities")) {
      if (setup.capabilitiesFailure) {
        await route.fulfill({ status: setup.capabilitiesFailure.status || 503, json: { error: setup.capabilitiesFailure.message || "capabilities unavailable" } });
      } else {
        await route.fulfill({ json: model.capabilities });
      }
      return;
    }
    await route.fulfill({ status: 404, json: { error: "unmocked discovery route" } });
  });

  await page.route("**/api/queue/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith("/state")) {
      model.stateRequests += 1;
      model.stateUrls.push(url.search);
      if (setup.stateFailureAfter && model.stateRequests > setup.stateFailureAfter) {
        await route.fulfill({ status: 503, json: { error: setup.stateFailureMessage || "state refresh unavailable" } });
        return;
      }
      await route.fulfill({ json: {
        revision: model.revision,
        tasks: model.tasks,
        config: model.stateConfig,
        metrics: setup.metrics || metricsFor(model.tasks),
        ...(setup.runtime ? { runtime: setup.runtime } : {}),
      } });
      return;
    }

    if (path.endsWith("/config") && request.method() === "GET") {
      if (setup.configGetDelay) await new Promise((resolveDelay) => setTimeout(resolveDelay, setup.configGetDelay));
      await route.fulfill({ json: model.config });
      return;
    }

    if (path.endsWith("/config") && request.method() === "POST") {
      const configPatch = request.postDataJSON();
      model.configPatches.push(configPatch);
      if (setup.configPostDelay) await new Promise((resolveDelay) => setTimeout(resolveDelay, setup.configPostDelay));
      if (setup.configFailure) {
        await route.fulfill({ status: setup.configFailure.status || 409, json: { error: setup.configFailure.message } });
        return;
      }
      model.config = { ...model.config, ...configPatch };
      await route.fulfill({ json: model.config });
      return;
    }

    if (path.endsWith("/options")) {
      if (setup.optionsFailure) await route.fulfill({ status: setup.optionsFailure.status || 503, json: { error: setup.optionsFailure.message || "options unavailable" } });
      else await route.fulfill({ json: model.options });
      return;
    }

    if (path.endsWith("/task") && request.method() === "POST") {
      const body = request.postDataJSON();
      model.createdTasks.push(body);
      if (setup.createFailure) {
        await route.fulfill({ status: setup.createFailure.status || 507, json: { error: setup.createFailure.message } });
        return;
      }
      const createdKey = body.key || "task-generated";
      const terminal = setup.fastArchiveOnCreate === true && body.autoArchive === true;
      model.tasks.push(task({
        key: createdKey,
        body: body.content,
        summary: String(body.content || "").replace(/^#+\s*/, "").split("\n")[0],
        priority: body.priority,
        taskType: body.cron ? "cron" : (body.schedule ? "schedule" : "manual"),
        cron: body.cron || null,
        schedule: body.schedule || null,
        autoArchive: body.autoArchive,
        enableNotifications: body.enableNotifications,
        status: terminal ? "done" : "pending",
        archivedAt: terminal ? "2026-08-31T10:00:00.000Z" : null,
        executions: terminal ? [{ result: "done", finishedAt: "2026-08-31T10:00:00.000Z" }] : [],
      }));
      model.revision += 1;
      await route.fulfill({ json: { ok: true, key: createdKey } });
      return;
    }

    if (path.endsWith("/detail")) {
      const selectedKey = url.searchParams.get("key");
      const delay = setup.detailDelays && setup.detailDelays[selectedKey];
      if (delay) await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
      const selected = setup.detailTasks && setup.detailTasks[selectedKey]
        ? setup.detailTasks[selectedKey]
        : model.tasks.find((item) => item.key === selectedKey);
      await route.fulfill({ json: { ok: !!selected, task: selected } });
      return;
    }

    if (path.endsWith("/mark-read")) {
      const body = request.postDataJSON();
      model.markReadRequests.push(body);
      model.tasks = model.tasks.map((item) => item.key === body.key
        ? { ...item, readAt: body.read ? "2026-08-31T09:00:00.000Z" : null }
        : item);
      model.revision += 1;
      await route.fulfill({ json: { ok: true, key: body.key } });
      return;
    }

    if (path.endsWith("/action")) {
      const body = request.postDataJSON();
      const action = body.action;
      model.actions.push(action);
      if (setup.actionFailure && setup.actionFailure.kind === action.kind) {
        await route.fulfill({ status: setup.actionFailure.status || 409, json: { error: setup.actionFailure.message } });
        return;
      }

      if (action.kind === "archive") {
        const keys = Array.isArray(action.keys) ? action.keys : [action.key];
        const batchResults = Array.isArray(action.keys) && setup.batchArchiveResults
          ? setup.batchArchiveResults
          : keys.map((key) => ({ key, ok: true }));
        const successfulKeys = batchResults.filter((item) => item.ok).map((item) => item.key);
        model.tasks = model.tasks.map((item) => successfulKeys.includes(item.key)
          ? { ...item, archivedAt: "2026-08-31T09:30:00.000Z" }
          : item);
      } else if (action.kind === "restore") {
        model.tasks = model.tasks.map((item) => item.key === action.key ? { ...item, archivedAt: null } : item);
      } else if (action.kind === "rerun") {
        model.tasks = model.tasks.map((item) => item.key === action.key ? { ...item, status: "pending", archivedAt: null } : item);
      } else if (action.kind === "update") {
        model.tasks = model.tasks.map((item) => item.key === action.key ? { ...item, ...action } : item);
      } else if (action.kind === "set-concurrency") {
        model.stateConfig.maxConcurrent = action.maxConcurrent;
      }
      model.revision += 1;
      await route.fulfill({ json: action.kind === "archive" && Array.isArray(action.keys)
        ? {
          ok: (setup.batchArchiveResults || action.keys.map((key) => ({ key, ok: true }))).every((item) => item.ok),
          results: setup.batchArchiveResults || action.keys.map((key) => ({ key, ok: true })),
        }
        : { ok: true } });
      return;
    }

    await route.fulfill({ status: 404, json: { error: "unmocked" } });
  });

  return model;
}

async function openHarness(page) {
  await page.goto("/");
  await page.waitForFunction(() => !!globalThis.__aq);
  await page.evaluate(() => globalThis.__aq.ready);
  await expect(page.locator(".aq-loading")).toHaveCount(0);
}

function fieldInput(container, label) {
  const pattern = new RegExp(String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return container.getByLabel(pattern).first();
}

function taskRow(page, key) {
  return page.locator(".aq-task-row", { has: page.getByRole("button", { name: "查看任务 " + key }) });
}

function richTasks() {
  return [
    task({
      key: "weekly-competitive-brief", status: "running", taskType: "cron", cron: "0 8 * * 1",
      summary: "汇总本周竞品动态并生成结构化报告", priority: 9, attempts: 1, blockedResumes: 1,
      currentRound: 14, maxGoalRounds: 40, goalPhase: "active", startedAt: "2026-08-31T08:20:00.000Z",
      nextRunAt: "2026-09-07T00:00:00.000Z", sessionId: "session-running",
    }),
    task({
      key: "customer-voice-digest", status: "pending", taskType: "schedule",
      schedule: "2026-09-01T01:30:00.000Z", summary: "整理客服反馈，按主题归纳并输出建议", priority: 7,
    }),
    task({
      key: "release-notes-0831", status: "done", summary: "从提交记录生成发布说明", readAt: null,
      attempts: 1, sessionId: "session-done", updatedAt: "2026-08-31T08:20:00.000Z",
    }),
    task({
      key: "billing-anomaly-audit", status: "failed", summary: "检查异常账单并输出证据", priority: 10,
      attempts: 3, blockedResumes: 2, lastError: "外部账单接口连续返回 503", readAt: null,
    }),
    task({
      key: "host-restart-containment", status: "interrupted", summary: "宿主重启后保持隔离，等待核验",
      goalPhase: "prompt-admission-uncertain", _promptAdmissionUncertain: true, readAt: "2026-08-31T09:00:00.000Z",
    }),
  ];
}

test("each navigation group is a scoped workspace with honest counts, copy, and actions", async ({ page }) => {
  const tasks = richTasks().concat(task({
    key: "archived-result", status: "done", archivedAt: "2026-08-30T10:00:00.000Z",
    readAt: "2026-08-30T09:00:00.000Z", summary: "已归档的最终结果",
  }));
  const model = await mockApi(page, { tasks });
  await openHarness(page);

  await page.getByRole("navigation").getByRole("button", { name: /正在推进/ }).click();
  const activeWorkspace = page.getByRole("region", { name: "正在推进" });
  await expect(activeWorkspace).toContainText("正在同步 DSH 运行状态");
  await expect(page.getByRole("tab", { name: /全部/ })).toContainText("3");
  await expect(page.getByRole("tab", { name: /运行中/ })).toContainText("1");
  await expect(page.getByRole("tab", { name: /待执行/ })).toContainText("1");
  await expect(page.getByRole("button", { name: "查看任务 release-notes-0831" })).toHaveCount(0);

  await page.evaluate(({ tasks: nextTasks, stateConfig }) => {
    globalThis.__eventSources[0].onmessage({ data: JSON.stringify({
      revision: 2,
      tasks: nextTasks,
      config: stateConfig,
      runtime: {
        monitorMode: "native-events+authoritative-reconcile",
        foregroundGate: "open",
        lastNativeEventAt: "2026-08-31T09:01:00.000Z",
        lastPollAt: "2026-08-31T09:01:01.000Z",
        lastScanAt: "2026-08-31T09:00:30.000Z",
        watchdogMs: 10_000,
      },
    }) });
  }, { tasks: model.tasks, stateConfig: model.stateConfig });
  await expect(activeWorkspace).toContainText("事件驱动，定时校验");
  await expect(activeWorkspace).toContainText("DSH 空闲，可以执行");
  await activeWorkspace.getByText("运行诊断").click();
  await expect(activeWorkspace).toContainText("兜底检查");
  await expect(activeWorkspace).toContainText("每 10 秒");
  await expect(activeWorkspace).toContainText("最近事件");
  await expect(activeWorkspace).toContainText("最近状态校验");
  await expect(activeWorkspace).toContainText("最近队列扫描");

  await page.getByRole("navigation").getByRole("button", { name: /循环调度/ }).click();
  await expect(page.getByRole("region", { name: "循环调度" })).toContainText("管理周期任务");
  await expect(page.getByRole("tab", { name: /全部/ })).toContainText("1");
  await expect(page.getByRole("tab", { name: /运行中/ })).toContainText("1");
  await expect(page.getByRole("button", { name: "新建循环任务" })).toBeVisible();

  await page.getByRole("navigation").getByRole("button", { name: /定时执行/ }).click();
  await expect(page.getByRole("region", { name: "定时执行" })).toContainText("一次性定时任务");
  await expect(page.getByRole("tab", { name: /全部/ })).toContainText("1");
  await expect(page.getByRole("tab", { name: /待执行/ })).toContainText("1");
  await expect(page.getByRole("button", { name: "新建定时任务" })).toBeVisible();

  await page.getByRole("navigation").getByRole("button", { name: /归档记录/ }).click();
  const archivedWorkspace = page.getByRole("region", { name: "归档记录" });
  await expect(archivedWorkspace).toContainText("完整执行记录仍保留在任务详情中");
  await expect(page.getByRole("button", { name: "查看任务 archived-result" })).toBeVisible();
  await expect(page.getByRole("button", { name: "查看任务 release-notes-0831" })).toHaveCount(0);
  await expect(page.locator(".aq-kpi, .aq-orbit-mini, .aq-access-art, .aq-eyebrow")).toHaveCount(0);
});

test("empty states are compact, direct, and free of decorative placeholders", async ({ page }) => {
  await mockApi(page, { tasks: [] });
  await openHarness(page);

  const empty = page.locator(".aq-empty");
  await expect(empty).toContainText("还没有任务");
  await expect(empty.getByRole("button", { name: "创建任务" })).toBeVisible();
  await expect(empty.locator("img")).toHaveCount(0);
  const box = await empty.boundingBox();
  expect(box && box.height).toBeLessThanOrEqual(220);
});

test("SSE health and options isolation are reported independently from real evidence", async ({ page }) => {
  await mockApi(page);
  await openHarness(page);

  await expect(page.locator(".aq-host-state")).toContainText("实时通道连接中");
  await expect(page.getByRole("region", { name: "运行安全状态" })).toContainText("隔离已启用");
  await page.evaluate(() => globalThis.__eventSources[0].onopen());
  await expect(page.locator(".aq-host-state")).toContainText("实时通道已连接");

  const health = await page.evaluate(() => {
    globalThis.__eventSources[0].onmessage({ data: JSON.stringify({ revision: 9, tasks: [], config: { maxConcurrent: 2 } }) });
    return globalThis.__aq.controller.getSnapshot().runtimeHealth;
  });
  expect(health.connected).toBe(true);
  expect(health.reconnecting).toBe(false);
  expect(health.revision).toBe(9);
  expect(health.lastEventAt).toBeTruthy();

  const afterStale = await page.evaluate(() => {
    globalThis.__eventSources[0].onmessage({ data: JSON.stringify({ revision: 8, tasks: [{ key: "stale", status: "failed" }], config: {} }) });
    return globalThis.__aq.controller.getSnapshot();
  });
  expect(afterStale.revision).toBe(9);
  expect(afterStale.runtimeHealth.revision).toBe(9);
  expect(afterStale.tasks).toEqual([]);

  await page.evaluate(() => globalThis.__eventSources[0].onerror());
  await expect(page.locator(".aq-host-state")).toContainText("实时通道重连中");
  await expect(page.getByRole("region", { name: "运行安全状态" })).toContainText("隔离已启用");
});

test("unknown or failed isolation options never render as verified", async ({ page }) => {
  await mockApi(page, { optionsFailure: { message: "isolation options unavailable" } });
  await openHarness(page);

  const safety = page.getByRole("region", { name: "运行安全状态" });
  await expect(safety).toContainText("隔离待确认");
  await expect(safety).toContainText("isolation options unavailable");
  await expect(safety.locator(".aq-safety-item").first()).toHaveClass(/danger/);
  await expect(page.locator(".aq-sb-foot p")).toHaveCount(0);
});

test("new task exposes every safe advanced field and never sends host-global overrides", async ({ page }) => {
  const model = await mockApi(page);
  await openHarness(page);

  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建无人值守任务" });
  await expect(fieldInput(dialog, "优先级")).toHaveValue("6");
  await dialog.getByLabel("任务内容（Markdown）").fill("# Weekly insight\n\nSummarize customer evidence.");
  await dialog.getByRole("button", { name: /高级设置/ }).click();
  await expect(fieldInput(dialog, "最多推进轮数")).toHaveValue("77");
  await expect(fieldInput(dialog, "最多自动恢复")).toHaveValue("7");
  await expect(fieldInput(dialog, "最长执行")).toHaveValue("120");
  await expect(fieldInput(dialog, "最多启动尝试")).toHaveValue("8");
  await fieldInput(dialog, "最多推进轮数").fill("55");
  await fieldInput(dialog, "最多自动恢复").fill("4");
  await fieldInput(dialog, "最长执行").fill("45");
  await fieldInput(dialog, "最多启动尝试").fill("6");
  await dialog.getByRole("button", { name: /^通知/ }).click();
  await expect(dialog.getByRole("checkbox", { name: /完成后自动归档/ })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: /浏览器结果通知/ })).toBeChecked();
  await fieldInput(dialog, "Webhook URL").fill("https://hooks.example.test/queue");
  await dialog.getByRole("button", { name: "创建任务" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".aq-toast")).toContainText("已入队：task-generated · 等待执行");
  await expect(page.getByRole("button", { name: "查看任务 task-generated" })).toBeVisible();
  expect(model.createdTasks).toHaveLength(1);
  expect(model.createdTasks[0]).toMatchObject({
    content: "# Weekly insight\n\nSummarize customer evidence.",
    priority: 6,
    deadline: "0 22 * * *",
    maxGoalRounds: 55,
    maxBlockedResumes: 4,
    timeoutMs: 2_700_000,
    maxAttempts: 6,
    webhook: "https://hooks.example.test/queue",
    autoArchive: false,
    enableNotifications: true,
  });
  for (const forbidden of ["model", "workspace", "agentPreset"]) expect(model.createdTasks[0]).not.toHaveProperty(forbidden);
});

test("create success remains explicit when a fast task auto-archives", async ({ page }) => {
  await mockApi(page, { tasks: [], fastArchiveOnCreate: true });
  await openHarness(page);

  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建无人值守任务" });
  await dialog.getByLabel("任务内容（Markdown）").fill("# Fast archive");
  await fieldInput(dialog, "任务标识").fill("fast-archived");
  await dialog.getByRole("button", { name: /^通知/ }).click();
  await dialog.getByRole("checkbox", { name: /完成后自动归档/ }).check();
  await dialog.getByRole("button", { name: "创建任务" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".aq-toast")).toContainText("已入队：fast-archived · 已完成并归档");
  await expect(page.getByRole("button", { name: "查看任务 fast-archived" })).toHaveCount(0);
  await page.getByRole("navigation").getByRole("button", { name: /归档记录/ }).click();
  await expect(taskRow(page, "fast-archived")).toContainText("已完成");
});

test("custom cron remains editable across real sequential keystrokes", async ({ page }) => {
  const model = await mockApi(page, { tasks: [] });
  await openHarness(page);

  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建无人值守任务" });
  await dialog.getByLabel("任务内容（Markdown）").fill("# Typed cron");
  const cronField = dialog.locator(".aq-field", { hasText: "循环调度" }).first();
  await cronField.locator("select").selectOption("__custom__");
  await cronField.locator("input").pressSequentially("*/5 * * * *", { delay: 10 });
  await expect(cronField.locator("input")).toHaveValue("*/5 * * * *");
  await dialog.getByRole("button", { name: "创建任务" }).click();

  await expect(dialog).toHaveCount(0);
  expect(model.createdTasks[0].cron).toBe("*/5 * * * *");
});

test("create persistence is not misreported when the follow-up state refresh fails", async ({ page }) => {
  const model = await mockApi(page, { tasks: [], stateFailureAfter: 1, stateFailureMessage: "state refresh unavailable" });
  await openHarness(page);

  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建无人值守任务" });
  await dialog.getByLabel("任务内容（Markdown）").fill("# Refresh failure");
  await fieldInput(dialog, "任务标识").fill("refresh-failed");
  await dialog.getByRole("button", { name: "创建任务" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".aq-toast")).toContainText("已入队：refresh-failed · 页面刷新失败，请点击扫描");
  await expect(page.getByRole("alert")).toContainText("state refresh unavailable");
  expect(model.createdTasks).toHaveLength(1);
});

test("pending rows explain schedule and foreground-gate waits", async ({ page }) => {
  await mockApi(page, {
    tasks: [
      task({ key: "future-schedule", taskType: "schedule", schedule: "2099-09-01T05:00:00.000Z" }),
      task({ key: "foreground-wait" }),
    ],
    runtime: {
      monitorMode: "native-events+authoritative-reconcile",
      foregroundGate: "busy",
      sessionListKnown: true,
    },
  });
  await openHarness(page);

  await expect(taskRow(page, "future-schedule")).toContainText("计划于");
  await expect(taskRow(page, "foreground-wait")).toContainText("DSH 使用中，队列已暂停");
});

test("runtime settings load all safe fields and submit only the changed field", async ({ page }) => {
  const model = await mockApi(page, { configGetDelay: 80, configPostDelay: 250 });
  await openHarness(page);

  await page.getByRole("button", { name: "运行设置" }).click();
  const dialog = page.getByRole("dialog", { name: "运行设置" });
  const expected = [
    ["最大并发", "2"], ["任务超时", "120"], ["最多推进轮数", "77"], ["最多自动恢复", "7"],
    ["最多启动尝试", "8"], ["连续状态异常次数", "9"], ["首次重试等待", "45"], ["最长重试等待", "1200"],
    ["默认优先级", "6"], ["默认截止时间", "0 22 * * *"], ["Webhook URL", "https://example.test/hook"],
    ["队列根目录", "/srv/queue/tasks"],
  ];
  for (const [label, value] of expected) await expect(fieldInput(dialog, label)).toHaveValue(value);
  await expect(fieldInput(dialog, "队列根目录")).toBeDisabled();
  await expect(dialog.getByRole("checkbox", { name: "任务结束后自动归档" })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "浏览器结果通知" })).toBeChecked();
  await expect(dialog.locator(".aq-field", { hasText: "默认模型" })).toHaveCount(0);
  await expect(dialog.locator(".aq-field", { hasText: "工作区" })).toHaveCount(0);
  await expect(dialog.locator(".aq-field", { hasText: "Agent 预设" })).toHaveCount(0);

  await fieldInput(dialog, "最多推进轮数").fill("78");
  await dialog.getByRole("button", { name: "保存设置" }).click();
  await expect(dialog.getByRole("button", { name: "保存中…" })).toBeVisible();
  await expect(dialog).toHaveCount(0);
  expect(model.configPatches).toEqual([{ maxGoalRounds: 78 }]);
  expect(model.actions.filter((action) => action.kind === "set-concurrency")).toEqual([]);
});

test("a create failure remains contextual inside the open modal", async ({ page }) => {
  await mockApi(page, { createFailure: { status: 507, message: "ledger capacity reached" } });
  await openHarness(page);

  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建无人值守任务" });
  await dialog.getByLabel("任务内容（Markdown）").fill("# Capacity failure");
  await dialog.getByRole("button", { name: "创建任务" }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveText("ledger capacity reached");
});

test("clearing nullable task policy overrides sends explicit nulls", async ({ page }) => {
  const model = await mockApi(page, { tasks: [task({ maxGoalRounds: 12, maxBlockedResumes: 2, timeoutMs: 3_600_000, maxAttempts: 6 })] });
  await openHarness(page);

  await page.getByRole("button", { name: "编辑 safe-job" }).click();
  const dialog = page.getByRole("dialog", { name: "编辑任务 · safe-job" });
  await dialog.getByRole("button", { name: /高级设置/ }).click();
  await fieldInput(dialog, "最多推进轮数").fill("");
  await fieldInput(dialog, "最多自动恢复").fill("");
  await fieldInput(dialog, "最长执行").fill("");
  await fieldInput(dialog, "最多启动尝试").fill("");
  await dialog.getByRole("button", { name: "保存" }).click();

  await expect(dialog).toHaveCount(0);
  expect(model.actions).toContainEqual({
    kind: "update", key: "safe-job", maxGoalRounds: null, maxBlockedResumes: null,
    timeoutMs: null, maxAttempts: null,
  });
});

test("detail uses the selected task, rejects a late stale response, and opens the real session", async ({ page }) => {
  const first = task({ key: "first-job", sessionId: "session-first" });
  const second = task({ key: "second-job", sessionId: "session-second" });
  await mockApi(page, {
    tasks: [first, second],
    detailDelays: { "first-job": 350 },
    detailTasks: {
      "first-job": { ...first, reports: { report: "FIRST_REPORT" } },
      "second-job": { ...second, reports: { report: "SECOND_REPORT" } },
    },
  });
  await openHarness(page);

  await page.getByRole("button", { name: "查看任务 first-job" }).click();
  await page.evaluate(() => globalThis.__aq.controller.openDetail("second-job"));
  const dialog = page.getByRole("dialog", { name: "second-job" });
  await dialog.getByRole("tab", { name: "报告" }).click();
  await expect(dialog).toContainText("SECOND_REPORT");
  await page.waitForTimeout(450);
  await expect(dialog).not.toContainText("FIRST_REPORT");
  await dialog.getByRole("button", { name: "跳转会话" }).click();
  expect(await page.evaluate(() => globalThis.__aq.openedSessions)).toEqual(["session-second"]);
});

test("terminal detail resolves owned-session fallback and pending detail exposes confirmed deletion", async ({ page }) => {
  const model = await mockApi(page, { tasks: [
    task({
      key: "terminal-fallback", status: "done", sessionId: null, lastSessionId: "session-from-last-attempt",
      readAt: "2026-08-31T09:00:00.000Z",
    }),
    task({ key: "pending-detail-delete", status: "pending" }),
  ] });
  await openHarness(page);

  await page.getByRole("button", { name: "查看任务 terminal-fallback" }).click();
  const terminal = page.getByRole("dialog", { name: "terminal-fallback" });
  await expect(terminal).toContainText("任务会话已创建");
  await terminal.getByRole("button", { name: "跳转会话" }).click();
  expect(await page.evaluate(() => globalThis.__aq.openedSessions)).toEqual(["session-from-last-attempt"]);

  await page.evaluate(() => globalThis.__aq.controller.openBoard());
  await page.getByRole("button", { name: "查看任务 pending-detail-delete" }).click();
  const pending = page.getByRole("dialog", { name: "pending-detail-delete" });
  await expect(pending.getByRole("button", { name: "删除", exact: true })).toBeVisible();
  await pending.getByRole("button", { name: "删除", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "删除任务" });
  await expect(confirmation).toContainText("不可恢复");
  await confirmation.getByRole("button", { name: "删除", exact: true }).click();
  expect(model.actions).toContainEqual({ kind: "delete", key: "pending-detail-delete" });
});

test("SSE starts once, disposes cleanly, and an older revision cannot roll state back", async ({ page }) => {
  await mockApi(page);
  await openHarness(page);

  expect(await page.evaluate(() => globalThis.__eventSourceUrls)).toEqual(["/api/queue/events?archived=1"]);
  const diagnostics = await page.evaluate(async () => {
    let resolveState;
    let lateSubscriptions = 0;
    const delayed = globalThis.__aq.createController({
      state: () => new Promise((resolvePromise) => { resolveState = resolvePromise; }),
      options: () => Promise.resolve({ workspaces: [], presets: [], models: [] }),
      getConfig: () => Promise.resolve({}),
      subscribe: () => { lateSubscriptions += 1; return () => {}; },
    });
    const initializing = delayed.init();
    delayed.dispose();
    resolveState({ revision: 1, tasks: [], config: {} });
    await initializing;

    let onEvent;
    const revisioned = globalThis.__aq.createController({
      state: () => Promise.resolve({ revision: 5, tasks: [{ key: "fresh", status: "pending" }], config: {} }),
      options: () => Promise.resolve({ workspaces: [], presets: [], models: [] }),
      getConfig: () => Promise.resolve({}),
      subscribe: (callback) => { onEvent = callback; return () => {}; },
    });
    await revisioned.init();
    onEvent({ revision: 4, tasks: [{ key: "stale", status: "failed" }], config: {} });
    const snapshot = revisioned.getSnapshot();
    revisioned.dispose();

    globalThis.__aq.dispose();
    return {
      lateSubscriptions,
      revision: snapshot.revision,
      keys: snapshot.tasks.map((item) => item.key),
      actualSseClosed: globalThis.__eventSources[0].closed,
    };
  });

  expect(diagnostics).toEqual({ lateSubscriptions: 0, revision: 5, keys: ["fresh"], actualSseClosed: true });
});

test("notifications stay opt-in for initialization, form permission, and SSE transitions", async ({ page }) => {
  await page.addInitScript(() => {
    globalThis.__keepNotificationForTests = true;
    globalThis.__notificationCalls = { permissionRequests: 0, created: [] };
    class FakeNotification {
      static permission = "default";
      static requestPermission() {
        globalThis.__notificationCalls.permissionRequests += 1;
        return Promise.resolve(FakeNotification.permission);
      }
      constructor(title, options) { globalThis.__notificationCalls.created.push({ title, options }); }
    }
    Object.defineProperty(globalThis, "Notification", { value: FakeNotification, configurable: true });
  });
  await mockApi(page, { config: { enableNotifications: false } });
  await openHarness(page);

  expect(await page.evaluate(() => globalThis.__notificationCalls.permissionRequests)).toBe(0);
  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建无人值守任务" });
  await dialog.getByRole("button", { name: /^通知/ }).click();
  await dialog.getByRole("checkbox", { name: /浏览器结果通知/ }).check();
  expect(await page.evaluate(() => globalThis.__notificationCalls.permissionRequests)).toBe(1);
  await page.keyboard.press("Escape");

  const policy = await page.evaluate(async () => {
    Notification.permission = "granted";
    globalThis.__notificationCalls.created.length = 0;

    async function transition(globalEnabled, taskOverride) {
      let emit;
      const initial = { key: "notify-" + String(globalEnabled) + "-" + String(taskOverride), status: "pending" };
      if (taskOverride !== undefined) initial.enableNotifications = taskOverride;
      const controller = globalThis.__aq.createController({
        state: () => Promise.resolve({ revision: 1, tasks: [initial], config: { enableNotifications: globalEnabled } }),
        options: () => Promise.resolve({ workspaces: [], presets: [], models: [] }),
        getConfig: () => Promise.resolve({ enableNotifications: globalEnabled }),
        subscribe: (callback) => { emit = callback; return () => {}; },
      });
      await controller.init();
      const before = globalThis.__notificationCalls.created.length;
      emit({ revision: 2, tasks: [{ ...initial, status: "done" }], config: { enableNotifications: globalEnabled } });
      const count = globalThis.__notificationCalls.created.length - before;
      controller.dispose();
      return count;
    }

    return {
      defaultOff: await transition(false, undefined),
      taskOn: await transition(false, true),
      globalOn: await transition(true, undefined),
      taskOff: await transition(true, false),
    };
  });

  expect(policy).toEqual({ defaultOff: 0, taskOn: 1, globalOn: 1, taskOff: 0 });
});

test("the 390x844 layout has no horizontal overflow and mobile navigation is operable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, { tasks: richTasks() });
  await openHarness(page);

  await expect(page.getByRole("button", { name: "打开导航" })).toBeVisible();
  const widths = await page.evaluate(() => ({
    viewport: innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(widths.html).toBeLessThanOrEqual(widths.viewport);
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  await page.getByRole("button", { name: "打开导航" }).click();
  await expect(page.locator(".aq-ws")).toHaveClass(/nav-open/);
  await expect(page.getByRole("navigation").getByRole("button", { name: /正在推进/ })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: /正在推进/ }).click();
  await expect(page.locator(".aq-ws")).not.toHaveClass(/nav-open/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("dialog focus enters, wraps in both directions, closes on Escape, and returns to the trigger", async ({ page }) => {
  await mockApi(page);
  await openHarness(page);

  const trigger = page.getByRole("button", { name: "新建任务" });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "新建无人值守任务" });
  const first = dialog.getByLabel("任务内容（Markdown）");
  const last = dialog.getByRole("button", { name: "创建任务" });
  await expect(first).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.keyboard.press("Shift+Tab");
  await expect(last).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("task rows open their inspector with Enter", async ({ page }) => {
  await mockApi(page);
  await openHarness(page);

  const row = page.getByRole("button", { name: "查看任务 safe-job" });
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "safe-job" })).toBeVisible();
});

test("foreground preemption is visible in the safety status, row, and task inspector", async ({ page }) => {
  await mockApi(page, { tasks: [task({
    key: "foreground-yield", status: "running", sessionId: "autoqueue-session-owned",
    foregroundPaused: true, goalPhase: "foreground-paused", currentRound: 6, maxGoalRounds: 40,
  })] });
  await openHarness(page);

  await expect(page.getByRole("region", { name: "运行安全状态" })).toContainText("已暂停 1 个后台任务");
  const row = taskRow(page, "foreground-yield");
  await expect(row).toContainText("已暂停");
  await expect(row).toContainText("DSH 使用中，后台任务已暂停");
  await page.getByRole("button", { name: "查看任务 foreground-yield" }).click();
  const dialog = page.getByRole("dialog", { name: "foreground-yield" });
  await expect(dialog).toContainText("任务已暂停");
  await expect(dialog).toContainText("空闲后任务会自动继续");
});

test("a stop-pending task shows containment progress and cannot be stopped twice", async ({ page }) => {
  await mockApi(page, { tasks: [task({
    key: "stopping-owned-session", status: "running", sessionId: "autoqueue-session-owned",
    stopPending: true, goalPhase: "stop-pending", currentRound: 9, maxGoalRounds: 40,
  })] });
  await openHarness(page);

  const row = taskRow(page, "stopping-owned-session");
  await expect(row).toContainText("正在停止");
  await expect(row).toContainText("正在确认任务已完全停止");
  await expect(page.getByRole("button", { name: "停止 stopping-owned-session" })).toHaveCount(0);
  await page.getByRole("button", { name: "查看任务 stopping-owned-session" }).click();
  const detail = page.getByRole("dialog", { name: "stopping-owned-session" });
  await expect(detail).toContainText("正在停止任务");
  await expect(detail).toContainText("停止指令已提交");
  await expect(detail.getByRole("button", { name: "停止", exact: true })).toHaveCount(0);
});

test("interrupted tasks expose both rerun and archive actions", async ({ page }) => {
  const model = await mockApi(page, { tasks: [
    task({ key: "interrupt-rerun", status: "interrupted", readAt: null }),
    task({ key: "interrupt-archive", status: "interrupted", readAt: null }),
  ] });
  await openHarness(page);

  await page.getByRole("button", { name: "重新执行 interrupt-rerun" }).click();
  const rerunConfirm = page.getByRole("dialog", { name: "重新执行任务" });
  await expect(rerunConfirm).toContainText("再次消耗模型与工具资源");
  await rerunConfirm.getByRole("button", { name: "重新执行", exact: true }).click();
  await page.getByRole("button", { name: "归档 interrupt-archive" }).click();
  expect(model.actions).toEqual(expect.arrayContaining([
    expect.objectContaining({ kind: "rerun", key: "interrupt-rerun" }),
    expect.objectContaining({ kind: "archive", key: "interrupt-archive" }),
  ]));
});

test("core action parity reaches confirmations, restore, scan, and concurrency without synthetic keys", async ({ page }) => {
  const model = await mockApi(page, { tasks: [
    task({ key: "running-stop", status: "running", sessionId: "session-running" }),
    task({ key: "pending-delete", status: "pending" }),
    task({ key: "archived-restore", status: "done", archivedAt: "2026-08-30T10:00:00.000Z", readAt: "2026-08-30T09:00:00.000Z" }),
  ] });
  await openHarness(page);

  await page.getByRole("button", { name: "停止 running-stop" }).click();
  const stopConfirm = page.getByRole("dialog", { name: "停止任务" });
  await expect(stopConfirm).toContainText("会安全结束");
  await stopConfirm.getByRole("button", { name: "停止", exact: true }).click();

  await page.getByRole("button", { name: "删除 pending-delete" }).click();
  const deleteConfirm = page.getByRole("dialog", { name: "删除任务" });
  await expect(deleteConfirm).toContainText("不可恢复");
  await deleteConfirm.getByRole("button", { name: "删除", exact: true }).click();

  await page.getByRole("navigation").getByRole("button", { name: /归档记录/ }).click();
  await page.getByRole("button", { name: "还原 archived-restore" }).click();
  await page.getByRole("button", { name: "返回任务队列" }).click();
  await page.getByRole("button", { name: "立即检查任务" }).click();

  await page.getByRole("button", { name: "运行设置" }).click();
  const settings = page.getByRole("dialog", { name: "运行设置" });
  await fieldInput(settings, "最大并发").fill("3");
  await settings.getByRole("button", { name: "保存设置" }).click();
  await expect(settings).toHaveCount(0);

  await expect.poll(() => model.actions).toEqual(expect.arrayContaining([
    { kind: "stop", key: "running-stop" },
    { kind: "delete", key: "pending-delete" },
    { kind: "restore", key: "archived-restore" },
    { kind: "force-scan" },
    { maxConcurrent: 3, kind: "set-concurrency" },
  ]));
  expect(model.configPatches).toEqual([]);
});

test("batch archive sends one action envelope with the selected keys", async ({ page }) => {
  const model = await mockApi(page, { tasks: [
    task({ key: "batch-a", status: "done", readAt: null }),
    task({ key: "batch-b", status: "failed", readAt: null }),
    task({ key: "running-not-selectable", status: "running" }),
  ] });
  await openHarness(page);

  await page.getByRole("checkbox", { name: "选择 batch-a" }).check();
  await page.getByRole("checkbox", { name: "选择 batch-b" }).check();
  await page.getByRole("button", { name: "批量归档" }).click();
  const confirm = page.getByRole("dialog", { name: "批量归档" });
  await confirm.getByRole("button", { name: "归档" }).click();

  expect(model.actions).toContainEqual({ kind: "archive", keys: ["batch-a", "batch-b"] });
});

test("partial batch archive keeps failed tasks selected and reports both outcomes", async ({ page }) => {
  const model = await mockApi(page, {
    tasks: [
      task({ key: "batch-success", status: "done", readAt: null }),
      task({ key: "batch-failed", status: "failed", readAt: null }),
    ],
    batchArchiveResults: [
      { key: "batch-success", ok: true },
      { key: "batch-failed", ok: false, error: "DSH 会话归档失败" },
    ],
  });
  await openHarness(page);

  await page.getByRole("checkbox", { name: "选择 batch-success" }).check();
  await page.getByRole("checkbox", { name: "选择 batch-failed" }).check();
  await page.getByRole("button", { name: "批量归档" }).click();
  await page.getByRole("dialog", { name: "批量归档" }).getByRole("button", { name: "归档" }).click();

  await expect(page.locator(".aq-toast")).toContainText("已归档 1 个，1 个未归档并保留选择");
  await expect(page.getByRole("checkbox", { name: "选择 batch-failed" })).toBeChecked();
  await expect(page.getByRole("button", { name: "查看任务 batch-success" })).toHaveCount(0);
  expect(model.actions).toContainEqual({ kind: "archive", keys: ["batch-success", "batch-failed"] });
});

test("a read terminal task can be marked unread explicitly", async ({ page }) => {
  const model = await mockApi(page, { tasks: [task({
    key: "read-result", status: "done", updatedAt: "2026-08-31T08:00:00.000Z", readAt: "2026-08-31T08:30:00.000Z",
  })] });
  await openHarness(page);

  await page.getByRole("button", { name: "标记未读 read-result" }).click();
  expect(model.markReadRequests).toEqual([{ key: "read-result", read: false }]);
});

test("the API drawer reads live capabilities and keeps stable discovery paths", async ({ page }) => {
  await mockApi(page);
  await openHarness(page);

  await page.getByRole("button", { name: "AI / API 接入" }).click();
  const dialog = page.getByRole("dialog", { name: "AI / API 接入" });
  await expect(dialog).toContainText("/api/autoqueue/capabilities");
  await expect(dialog).toContainText("/api/autoqueue/openapi.json");
  await expect(dialog).toContainText("任务队列");
  await expect(dialog).toContainText("老登");
  await expect(dialog).toContainText("需要认证");
  await expect(dialog).toContainText("Authorization: Bearer <token>");
  await expect(dialog.locator(".aq-code-block")).toContainText("Authorization: Bearer $AUTOQUEUE_TOKEN");
  await expect(dialog).toContainText("16 个");
  await expect(dialog).toContainText("默认注册");
  await expect(dialog).toContainText("关闭");
  await expect(dialog).toContainText("danger-full-access");
  await expect(dialog).toContainText("原生 Runtime 监控");
  await expect(dialog).toContainText("enableHostAiTools");
  await expect(dialog).toContainText("/api/queue/events");
  await expect(dialog).toContainText("页面不会显示 token");
  await expect(dialog.getByRole("button", { name: "复制 Capabilities" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "复制 OpenAPI 3.1" })).toBeVisible();
});

test("the API drawer reports capability discovery failures without hiding manual endpoints", async ({ page }) => {
  await mockApi(page, { capabilitiesFailure: { message: "discovery temporarily unavailable" } });
  await openHarness(page);

  await page.getByRole("button", { name: "AI / API 接入" }).click();
  const dialog = page.getByRole("dialog", { name: "AI / API 接入" });
  await expect(dialog.getByRole("alert")).toContainText("discovery temporarily unavailable");
  await expect(dialog.getByRole("button", { name: "重新读取" })).toBeVisible();
  await expect(dialog).toContainText("/api/autoqueue/capabilities");
  await expect(dialog).toContainText("/api/autoqueue/openapi.json");
});

test("the API drawer renders loopback direct access without a fake token requirement", async ({ page }) => {
  const model = await mockApi(page);
  model.capabilities.authentication.loopbackDirectAccess = true;
  await openHarness(page);

  await page.getByRole("button", { name: "AI / API 接入" }).click();
  const dialog = page.getByRole("dialog", { name: "AI / API 接入" });
  await expect(dialog).toContainText("本机直连");
  await expect(dialog).toContainText("本机可直接访问");
  await expect(dialog.locator(".aq-code-block")).toContainText("curl 'http://127.0.0.1:4173/api/queue/state?archived=1&compact=1'");
  await expect(dialog.locator(".aq-code-block")).not.toContainText("AUTOQUEUE_TOKEN");
});

test("an older capability document without authentication stays explicitly unresolved", async ({ page }) => {
  const model = await mockApi(page);
  delete model.capabilities.authentication;
  await openHarness(page);

  await page.getByRole("button", { name: "AI / API 接入" }).click();
  const dialog = page.getByRole("dialog", { name: "AI / API 接入" });
  await expect(dialog).toContainText("认证待确认");
  await expect(dialog).toContainText("未提供认证方式");
  await expect(dialog.locator(".aq-code-block")).toContainText("按部署要求填写认证信息");
});

test("rich workstation visual artifacts render at desktop and mobile breakpoints", async ({ page }) => {
  const tasks = richTasks();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockApi(page, {
    tasks,
    metrics: { total: 5, running: 1, pending: 1, done24h: 1, failed24h: 1, successRate: 50 },
  });
  await openHarness(page);
  await expect(page.getByRole("button", { name: "查看任务 weekly-competitive-brief" })).toBeVisible();
  await expect(page.locator(".aq-empty img, .aq-access-art, .aq-orbit-mini, .aq-eyebrow, .aq-kpi")).toHaveCount(0);
  const typography = await page.evaluate(() => {
    const selectors = [".aq-btn", ".aq-tab", ".aq-card-summary", ".aq-running-detail", ".aq-safety-item small", ".aq-list-head"];
    return selectors.map((selector) => {
      const element = document.querySelector(selector);
      const style = element ? getComputedStyle(element) : null;
      return { selector, size: style ? parseFloat(style.fontSize) : 0, weight: style ? Number(style.fontWeight) : 0 };
    });
  });
  for (const item of typography) expect(item.size, item.selector).toBeGreaterThanOrEqual(12);
  expect(typography.find((item) => item.selector === ".aq-btn").weight).toBeGreaterThanOrEqual(600);
  expect(typography.find((item) => item.selector === ".aq-tab").weight).toBeGreaterThanOrEqual(600);
  const undersizedText = await page.evaluate(() => Array.from(document.querySelectorAll("[data-dsh-autoqueue-view] *")).flatMap((element) => {
    if (!element.getClientRects().length || getComputedStyle(element).visibility === "hidden") return [];
    const hasOwnText = Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (!hasOwnText || element.classList.contains("sr-only")) return [];
    const size = parseFloat(getComputedStyle(element).fontSize);
    return size < 12 ? [{ tag: element.tagName, className: element.className, size, text: element.textContent.trim().slice(0, 40) }] : [];
  }));
  expect(undersizedText).toEqual([]);
  await page.screenshot({ path: VISUAL_DIR + "/workstation-desktop-1440x1000.png", animations: "disabled" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "打开导航" })).toBeVisible();
  await page.screenshot({ path: VISUAL_DIR + "/workstation-mobile-390x844.png", animations: "disabled" });

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await expect(page.locator("[data-dsh-autoqueue-view]")).toHaveCSS("color", "rgb(242, 244, 247)");
  await page.screenshot({ path: VISUAL_DIR + "/workstation-dark-1280x900.png", animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("hostile schedule text is inert and complete archived projections are requested", async ({ page }) => {
  const payload = '<img src=x onerror="globalThis.__pwned=1"> * *';
  const model = await mockApi(page, { tasks: [task({ key: "xss-job", taskType: "cron", cron: payload })] });
  await openHarness(page);

  await expect(page.locator(".aq-task-plan")).toContainText(payload);
  expect(await page.evaluate(() => globalThis.__pwned)).toBeUndefined();
  await expect(page.locator(".aq-task-plan img")).toHaveCount(0);
  expect(model.stateUrls).toContain("?archived=1");
});

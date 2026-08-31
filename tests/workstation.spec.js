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
      workspaces: [{ workspaceId: "workspace-1", title: "Host workspace" }],
      presets: [{ id: "unattended", name: "Unattended" }],
      models: [{ value: "provider/private-model", label: "Private model" }],
      isolation: { strict: true },
    },
    stateUrls: [],
    configPatches: [],
    createdTasks: [],
    actions: [],
    markReadRequests: [],
  };

  await page.route("**/api/queue/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith("/state")) {
      model.stateUrls.push(url.search);
      await route.fulfill({ json: {
        revision: model.revision,
        tasks: model.tasks,
        config: model.stateConfig,
        metrics: setup.metrics || metricsFor(model.tasks),
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
      await route.fulfill({ json: model.options });
      return;
    }

    if (path.endsWith("/task") && request.method() === "POST") {
      const body = request.postDataJSON();
      model.createdTasks.push(body);
      if (setup.createFailure) {
        await route.fulfill({ status: setup.createFailure.status || 507, json: { error: setup.createFailure.message } });
        return;
      }
      await route.fulfill({ json: { ok: true, key: body.key || "task-generated" } });
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
        model.tasks = model.tasks.map((item) => keys.includes(item.key)
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
        ? { ok: true, results: action.keys.map((key) => ({ key, ok: true })) }
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

function fieldInput(container, label, selector = "input") {
  return container.locator(".aq-field", { hasText: label }).first().locator(selector).first();
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

test("new task exposes every safe advanced field and never sends host-global overrides", async ({ page }) => {
  const model = await mockApi(page);
  await openHarness(page);

  await page.getByRole("button", { name: "新建任务" }).click();
  const dialog = page.getByRole("dialog", { name: "新建无人值守任务" });
  await dialog.getByLabel("任务内容（Markdown）").fill("# Weekly insight\n\nSummarize customer evidence.");
  await dialog.getByRole("button", { name: /高级执行策略/ }).click();
  await fieldInput(dialog, "最大 Goal 轮数").fill("55");
  await fieldInput(dialog, "最大反阻塞").fill("4");
  await fieldInput(dialog, "最长执行").fill("45");
  await fieldInput(dialog, "最大派发尝试").fill("6");
  await dialog.getByRole("button", { name: /通知与回调/ }).click();
  await fieldInput(dialog, "Webhook URL").fill("https://hooks.example.test/queue");
  await dialog.getByRole("checkbox", { name: /浏览器结果通知/ }).check();
  await dialog.getByRole("button", { name: "创建任务" }).click();

  await expect(dialog).toHaveCount(0);
  expect(model.createdTasks).toHaveLength(1);
  expect(model.createdTasks[0]).toMatchObject({
    content: "# Weekly insight\n\nSummarize customer evidence.",
    priority: 5,
    maxGoalRounds: 55,
    maxBlockedResumes: 4,
    timeoutMs: 2_700_000,
    maxAttempts: 6,
    webhook: "https://hooks.example.test/queue",
    autoArchive: true,
    enableNotifications: true,
  });
  for (const forbidden of ["model", "workspace", "agentPreset"]) expect(model.createdTasks[0]).not.toHaveProperty(forbidden);
});

test("runtime settings load the full safe contract and submit only the changed field", async ({ page }) => {
  const model = await mockApi(page, { configGetDelay: 80, configPostDelay: 250 });
  await openHarness(page);

  await page.getByRole("button", { name: "运行设置" }).click();
  const dialog = page.getByRole("dialog", { name: "运行时设置" });
  const expected = [
    ["最大并发", "2"], ["任务超时", "120"], ["最大 Goal 轮数", "77"], ["最大反阻塞", "7"],
    ["最大派发尝试", "8"], ["不可达阈值", "9"], ["退避基数", "45"], ["退避上限", "1200"],
    ["默认优先级", "6"], ["默认截止 cron", "0 22 * * *"], ["Webhook URL", "https://example.test/hook"],
    ["收件箱目录", "/srv/queue/tasks"],
  ];
  for (const [label, value] of expected) await expect(fieldInput(dialog, label)).toHaveValue(value);
  await expect(fieldInput(dialog, "收件箱目录")).toBeDisabled();
  await expect(dialog.getByRole("checkbox", { name: "终态自动归档" })).not.toBeChecked();
  await expect(dialog.getByRole("checkbox", { name: "浏览器结果通知" })).toBeChecked();
  await expect(dialog.locator(".aq-field", { hasText: "默认模型" })).toHaveCount(0);
  await expect(dialog.locator(".aq-field", { hasText: "工作区" })).toHaveCount(0);
  await expect(dialog.locator(".aq-field", { hasText: "Agent 预设" })).toHaveCount(0);

  await fieldInput(dialog, "最大 Goal 轮数").fill("78");
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
  await dialog.getByRole("button", { name: /高级执行策略/ }).click();
  await fieldInput(dialog, "最大 Goal 轮数").fill("");
  await fieldInput(dialog, "最大反阻塞").fill("");
  await fieldInput(dialog, "最长执行").fill("");
  await fieldInput(dialog, "最大派发尝试").fill("");
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
  await dialog.getByRole("button", { name: /通知与回调/ }).click();
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

test("foreground preemption is visible in the contract, row, and task inspector", async ({ page }) => {
  await mockApi(page, { tasks: [task({
    key: "foreground-yield", status: "running", sessionId: "autoqueue-session-owned",
    foregroundPaused: true, goalPhase: "foreground-paused", currentRound: 6, maxGoalRounds: 40,
  })] });
  await openHarness(page);

  await expect(page.getByRole("region", { name: "运行契约" })).toContainText("1 个后台 turn 已暂停");
  const row = page.getByRole("button", { name: "查看任务 foreground-yield" });
  await expect(row).toContainText("前台让行");
  await expect(row).toContainText("等待 DSH 前台完成");
  await row.click();
  const dialog = page.getByRole("dialog", { name: "foreground-yield" });
  await expect(dialog).toContainText("正在为 DSH 前台让行");
  await expect(dialog).toContainText("等待双重空闲确认");
});

test("interrupted tasks expose both rerun and archive actions", async ({ page }) => {
  const model = await mockApi(page, { tasks: [
    task({ key: "interrupt-rerun", status: "interrupted", readAt: null }),
    task({ key: "interrupt-archive", status: "interrupted", readAt: null }),
  ] });
  await openHarness(page);

  await page.getByRole("button", { name: "重新执行 interrupt-rerun" }).click();
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
  await expect(stopConfirm).toContainText("安全收口");
  await stopConfirm.getByRole("button", { name: "停止", exact: true }).click();

  await page.getByRole("button", { name: "删除 pending-delete" }).click();
  const deleteConfirm = page.getByRole("dialog", { name: "删除任务" });
  await expect(deleteConfirm).toContainText("不可恢复");
  await deleteConfirm.getByRole("button", { name: "删除", exact: true }).click();

  await page.getByRole("navigation").getByRole("button", { name: /执行记录/ }).click();
  await page.getByRole("button", { name: "还原 archived-restore" }).click();
  await page.getByRole("button", { name: "立即扫描" }).click();

  await page.getByRole("button", { name: "运行设置" }).click();
  const settings = page.getByRole("dialog", { name: "运行时设置" });
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

test("a read terminal task can be marked unread explicitly", async ({ page }) => {
  const model = await mockApi(page, { tasks: [task({
    key: "read-result", status: "done", updatedAt: "2026-08-31T08:00:00.000Z", readAt: "2026-08-31T08:30:00.000Z",
  })] });
  await openHarness(page);

  await page.getByRole("button", { name: "标记未读 read-result" }).click();
  expect(model.markReadRequests).toEqual([{ key: "read-result", read: false }]);
});

test("the API drawer publishes stable capabilities and OpenAPI discovery paths", async ({ page }) => {
  await mockApi(page);
  await openHarness(page);

  await page.getByRole("button", { name: "AI / API 接入" }).click();
  const dialog = page.getByRole("dialog", { name: "AI / API 接入" });
  await expect(dialog).toContainText("/api/autoqueue/capabilities");
  await expect(dialog).toContainText("/api/autoqueue/openapi.json");
  await expect(dialog).toContainText("插件不会向页面回显 token");
  await expect(dialog.getByRole("button", { name: "复制 Capabilities" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "复制 OpenAPI 3.1" })).toBeVisible();
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
  await page.screenshot({ path: VISUAL_DIR + "/workstation-desktop-1440x1000.png", animations: "disabled" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "打开导航" })).toBeVisible();
  await page.screenshot({ path: VISUAL_DIR + "/workstation-mobile-390x844.png", animations: "disabled" });

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

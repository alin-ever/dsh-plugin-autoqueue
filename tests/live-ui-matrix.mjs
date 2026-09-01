import assert from "node:assert/strict";
import { existsSync, mkdirSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";

const runStartedAt = Date.now();
const stamp = runStartedAt.toString(36);
const BASE_URL = parseBaseUrl(process.env.AUTOQUEUE_LIVE_URL || process.env.AUTOQUEUE_LIVE_BASE_URL || "http://127.0.0.1:3280");
const EXPECTED_QUEUE_DIR = requiredAbsolutePathEnv("AUTOQUEUE_LIVE_EXPECTED_QUEUE_DIR");
const SIMPLE_KEY = process.env.AUTOQUEUE_SIMPLE_KEY || `ui-simple-${stamp}`;
const COMPLEX_KEY = process.env.AUTOQUEUE_COMPLEX_KEY || `ui-complex-${stamp}`;
const OWNER_MARKER = `UI_LIVE_OWNER_${stamp}_${randomUUID()}`;
const SCREENSHOT_DIR = resolve(process.env.AUTOQUEUE_SCREENSHOT_DIR || `test-results/live-ui-${stamp}`);
const TIMEZONE = process.env.AUTOQUEUE_TIMEZONE || "Asia/Shanghai";
const UI_TIMEOUT = Number(process.env.AUTOQUEUE_UI_TIMEOUT_MS || 30_000);
const RUN_TIMEOUT = Number(process.env.AUTOQUEUE_RUN_TIMEOUT_MS || 240_000);
const REQUIRE_ISOLATED = process.env.AUTOQUEUE_REQUIRE_ISOLATED !== "0";
const SIMPLE_HOLD_SECONDS = Number(process.env.AUTOQUEUE_SIMPLE_HOLD_SECONDS || 12);
const COMPLEX_HOLD_SECONDS = Number(process.env.AUTOQUEUE_COMPLEX_HOLD_SECONDS || 120);
const HEADLESS = process.env.AUTOQUEUE_HEADED !== "1";
const TOKEN = process.env.AUTOQUEUE_TOKEN || "";
const WRITABLE_CONFIG_FIELDS = Object.freeze([
  "maxGoalRounds", "maxBlockedResumes", "unknownThreshold", "maxAttempts",
  "taskTimeoutMs", "autoArchive", "webhook", "enableNotifications",
  "priority", "defaultDeadline", "retryBackoffBaseMs", "retryBackoffMaxMs",
]);
const chromeCandidates = [
  process.env.PLAYWRIGHT_CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
].filter(Boolean);
const CHROME_PATH = chromeCandidates.find(existsSync);

assert(CHROME_PATH, "找不到 Chrome；请设置 PLAYWRIGHT_CHROME_PATH");
assert(SIMPLE_KEY !== COMPLEX_KEY, "简单任务和复杂任务 key 不能相同");
mkdirSync(SCREENSHOT_DIR, { recursive: true });

function parseBaseUrl(raw) {
  const value = new URL(raw);
  assert(["http:", "https:"].includes(value.protocol), "AUTOQUEUE_LIVE_URL 必须使用 HTTP(S)");
  assert(!value.username && !value.password, "AUTOQUEUE_LIVE_URL 不得携带凭据");
  assert(!value.search && !value.hash, "AUTOQUEUE_LIVE_URL 不得携带 query 或 fragment");
  assert(isLoopbackHostname(value.hostname) || process.env.AUTOQUEUE_LIVE_ALLOW_REMOTE === "1", "live UI 默认只允许 loopback；远端必须显式 AUTOQUEUE_LIVE_ALLOW_REMOTE=1");
  const effectivePort = value.port || (value.protocol === "https:" ? "443" : "80");
  assert(!["3080", "3210"].includes(effectivePort), `拒绝在受保护端口 ${effectivePort} 运行 live UI`);
  value.pathname = value.pathname.replace(/\/+$/, "") || "/";
  return value.href.replace(/\/$/, "");
}

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1") return true;
  const octets = normalized.split(".");
  return octets.length === 4 && octets[0] === "127" &&
    octets.every(octet => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
}

function requiredAbsolutePathEnv(name) {
  const raw = process.env[name];
  assert(typeof raw === "string" && raw.trim(), `${name} 是破坏性 live 测试的必填安全边界`);
  assert(resolve(raw) === raw, `${name} 必须是规范化绝对路径`);
  return raw;
}

function pickConfigFields(config) {
  return Object.fromEntries(WRITABLE_CONFIG_FIELDS
    .filter(fieldName => config?.[fieldName] !== undefined)
    .map(fieldName => [fieldName, config[fieldName]]));
}

const apiHeaders = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
const pwExpect = expect.configure({ timeout: UI_TIMEOUT });
let browser;
let context;
let page;
let stepIndex = 0;
let originalConfig = null;
let testConfig = null;
let configRestored = false;
let configMutationArmed = false;
let matrixPassed = false;
let cleanupOwnershipArmed = false;
const browserProblems = [];

function apiUrl(pathname) {
  return new URL(pathname, `${BASE_URL}/`).toString();
}

async function fetchJson(pathname, init = {}) {
  const response = await fetch(apiUrl(pathname), {
    ...init,
    headers: { ...apiHeaders, ...(init.headers || {}) },
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; }
  catch { throw new Error(`${init.method || "GET"} ${pathname} returned invalid JSON (${response.status})`); }
  assert(response.ok, `${init.method || "GET"} ${pathname} failed: ${response.status} ${text.slice(0, 500)}`);
  return body;
}

async function directState() {
  const state = await fetchJson("/api/queue/state?archived=1");
  assert(Array.isArray(state.tasks), "state.tasks must be an array");
  return state;
}

async function directTask(key) {
  return (await directState()).tasks.find(task => task.key === key) || null;
}

function assertOwnedTask(task, key) {
  assert(task, `本次任务不存在，拒绝执行清理: ${key}`);
  assert.equal(task.key, key);
  assert(typeof task.body === "string" && task.body.includes(OWNER_MARKER), `任务 owner marker 不匹配，拒绝写操作: ${key}`);
  const createdAt = Date.parse(task.createdAt);
  assert(Number.isFinite(createdAt) && createdAt >= runStartedAt - 5_000, `任务早于本次运行，拒绝写操作: ${key}`);
  return task;
}

async function waitForTask(key, predicate, description, timeout = RUN_TIMEOUT) {
  const deadline = Date.now() + timeout;
  let last = null;
  while (Date.now() < deadline) {
    last = await directTask(key);
    if (predicate(last)) return last;
    await new Promise(resolveDelay => setTimeout(resolveDelay, 500));
  }
  throw new Error(`等待 ${key} ${description} 超时；最后状态=${JSON.stringify(last)}`);
}

function responseMatches(response, pathname, method = "POST", requestPredicate = null) {
  try {
    const request = response.request();
    if (request.method() !== method) return false;
    if (new URL(response.url()).pathname !== pathname) return false;
    return requestPredicate ? requestPredicate(request) : true;
  } catch {
    return false;
  }
}

async function browserResponseJson(response, label) {
  assert(response.ok(), `${label} HTTP ${response.status()}`);
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; }
  catch { throw new Error(`${label} returned invalid JSON: ${text.slice(0, 300)}`); }
  return body;
}

function waitForBrowserResponse(pathname, method = "POST", requestPredicate = null, timeout = UI_TIMEOUT) {
  return page.waitForResponse(
    response => responseMatches(response, pathname, method, requestPredicate),
    { timeout },
  );
}

function actionRequest(kind, key) {
  return request => {
    try {
      const action = request.postDataJSON().action;
      return action?.kind === kind && (key === undefined || action.key === key);
    } catch { return false; }
  };
}

async function runAction(kind, key, trigger) {
  if (key !== undefined) assertOwnedTask(await directTask(key), key);
  const responsePromise = waitForBrowserResponse("/api/queue/action", "POST", actionRequest(kind, key), RUN_TIMEOUT);
  await trigger();
  const body = await browserResponseJson(await responsePromise, `${kind} ${key || ""}`.trim());
  assert(body?.ok !== false, `${kind} failed: ${JSON.stringify(body)}`);
  return body;
}

function safeName(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "");
}

async function shot(name, failed = false) {
  const prefix = String(stepIndex).padStart(2, "0");
  const path = resolve(SCREENSHOT_DIR, `${prefix}-${safeName(name)}${failed ? "-FAILED" : ""}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" }).catch(() => {});
  return path;
}

async function step(name, operation) {
  stepIndex += 1;
  process.stdout.write(`\n[${stepIndex}] ${name}\n`);
  try {
    await operation();
    const state = await directState(); // Every step ends with a direct HTTP/state assertion.
    await pwExpect(page.locator("body")).toBeVisible(); // Every step also proves a rendered DOM.
    const path = await shot(name);
    process.stdout.write(`  ok rev=${state.revision} screenshot=${path}\n`);
  } catch (error) {
    const path = await shot(name, true);
    error.message += `\n失败截图: ${path}`;
    throw error;
  }
}

function board() {
  // DSH owns the outer plugin mount while the workstation owns a nested
  // application root. Both intentionally carry the view marker for styling;
  // the plugin marker identifies the single interaction boundary.
  return page.locator('[data-dsh-autoqueue-view][data-dsh-plugin="autoqueue"]');
}

function navButton(label) {
  return board().locator('aside[aria-label="任务工作台导航"]').getByRole("button", { name: new RegExp(`^${label}`) });
}

function taskRow(key) {
  return board().getByRole("button", { name: `查看任务 ${key}`, exact: true });
}

function field(scope, label) {
  return scope.locator(".aq-field").filter({ hasText: label }).first();
}

function checkbox(scope, label) {
  return scope.locator("label.aq-check-row").filter({ hasText: label }).locator('input[type="checkbox"]');
}

async function setChecked(locator, value) {
  if (await locator.isChecked() !== value) await locator.setChecked(value);
}

function localParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
}

function localDatetimeValue(date) {
  const p = localParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function oneShotCronTarget() {
  const now = Date.now();
  const target = new Date(now + 90_000);
  target.setUTCSeconds(0, 0);
  if (target.getTime() - now < 45_000) target.setUTCMinutes(target.getUTCMinutes() + 1);
  const p = localParts(target);
  return { target, expression: `${Number(p.minute)} ${Number(p.hour)} ${Number(p.day)} ${Number(p.month)} *` };
}

async function openBoard() {
  const stateResponse = waitForBrowserResponse("/api/queue/state", "GET");
  const configResponse = waitForBrowserResponse("/api/queue/config", "GET");
  const optionsResponse = waitForBrowserResponse("/api/queue/options", "GET");
  const eventsResponse = waitForBrowserResponse("/api/queue/events", "GET");
  await page.getByRole("button", { name: "AutoQueue 任务工作台", exact: true }).click();
  const [state, config, options, events] = await Promise.all([stateResponse, configResponse, optionsResponse, eventsResponse]);
  await Promise.all([
    browserResponseJson(state, "initial state"),
    browserResponseJson(config, "initial config"),
    browserResponseJson(options, "initial options"),
  ]);
  assert(events.ok(), `SSE HTTP ${events.status()}`);
  await pwExpect(board().locator("button.aq-create")).toBeVisible();
  await pwExpect(board()).toContainText("实时通道已连接");
}

async function createTaskViaUi({ key, content, schedule = "", cron = "" }) {
  await board().locator("button.aq-create").click();
  const dialog = page.getByRole("dialog", { name: "新建无人值守任务" });
  await pwExpect(dialog).toBeVisible();
  await dialog.locator("#aq-new-content").fill(content);
  await field(dialog, "任务标识（可选）").locator("input").fill(key);
  await field(dialog, "优先级（1-10）").locator("input").fill("8");
  if (schedule) await field(dialog, "一次性定时").locator('input[type="datetime-local"]').fill(schedule);
  if (cron) {
    const cronField = field(dialog, "循环调度");
    await cronField.locator("select").selectOption("__custom__");
    await cronField.locator("input").pressSequentially(cron, { delay: 8 });
    await pwExpect(cronField.locator("input")).toHaveValue(cron);
  }
  await dialog.getByRole("button", { name: /通知与回调/ }).click();
  await setChecked(checkbox(dialog, "完成后自动归档"), false);
  await setChecked(checkbox(dialog, "浏览器结果通知"), false);
  const responsePromise = waitForBrowserResponse("/api/queue/task", "POST", request => {
    try { return request.postDataJSON().key === key; } catch { return false; }
  });
  await dialog.getByRole("button", { name: "创建任务", exact: true }).click();
  const response = await responsePromise;
  const requestBody = response.request().postDataJSON();
  assert.equal(requestBody.autoArchive, false);
  assert.equal(requestBody.enableNotifications, false);
  assert.equal(requestBody.webhook, undefined);
  assert.equal(requestBody.deadline, undefined);
  assert(String(requestBody.content).includes(OWNER_MARKER));
  const body = await browserResponseJson(response, `create ${key}`);
  assert.equal(body?.ok, true);
  assert.equal(body?.key, key);
  await pwExpect(board().locator(".aq-toast")).toContainText(`已入队：${key}`);
  const task = await waitForTask(key, item => item?.status === "pending", "进入 pending");
  assertOwnedTask(task, key);
  return task;
}

async function openDetail(key) {
  const responsePromise = waitForBrowserResponse("/api/queue/detail", "GET", request => new URL(request.url()).searchParams.get("key") === key);
  await taskRow(key).click();
  const body = await browserResponseJson(await responsePromise, `detail ${key}`);
  assert.equal(body?.task?.key, key);
  const dialog = page.getByRole("dialog", { name: key });
  await pwExpect(dialog).toBeVisible();
  return { dialog, body };
}

async function editTaskViaUi(key, mutate) {
  assertOwnedTask(await directTask(key), key);
  const detailResponse = waitForBrowserResponse("/api/queue/detail", "GET", request => new URL(request.url()).searchParams.get("key") === key);
  await board().getByRole("button", { name: `编辑 ${key}`, exact: true }).click();
  const detail = await browserResponseJson(await detailResponse, `edit detail ${key}`);
  assertOwnedTask(detail?.task, key);
  const dialog = page.getByRole("dialog", { name: `编辑任务 · ${key}` });
  await pwExpect(dialog).toBeVisible();
  await mutate(dialog);
  assertOwnedTask(await directTask(key), key);
  const actionResponse = waitForBrowserResponse("/api/queue/action", "POST", actionRequest("update", key));
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  const body = await browserResponseJson(await actionResponse, `update ${key}`);
  assert.equal(body?.ok, true);
  return body;
}

async function configureRuntime(maxConcurrent, priority) {
  await board().getByRole("button", { name: "运行设置", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "运行时设置" });
  await pwExpect(dialog).toBeVisible();
  await field(dialog, "最大并发（1-8）").locator("input").fill(String(maxConcurrent));
  await field(dialog, "默认优先级").locator("input").fill(String(priority));
  const concurrencyResponse = waitForBrowserResponse("/api/queue/action", "POST", actionRequest("set-concurrency"));
  const configResponse = waitForBrowserResponse("/api/queue/config", "POST");
  assert(cleanupOwnershipArmed && originalConfig, "配置写入前必须完成隔离 Host 身份与基线校验");
  configMutationArmed = true;
  await dialog.getByRole("button", { name: "保存设置", exact: true }).click();
  const [concurrencyBody, configBody] = await Promise.all([
    concurrencyResponse.then(response => browserResponseJson(response, "set-concurrency")),
    configResponse.then(response => browserResponseJson(response, "update config")),
  ]);
  assert.equal(concurrencyBody?.ok, true);
  assert.equal(Number(configBody?.priority), Number(priority));
  const state = await directState();
  assert.equal(Number(state.config?.maxConcurrent), Number(maxConcurrent));
  const config = await fetchJson("/api/queue/config");
  assert.equal(Number(config.priority), Number(priority));
}

async function confirmAction(kind, key, confirmLabel) {
  await board().getByRole("button", { name: `${kind === "rerun" ? "重新执行" : kind === "stop" ? "停止" : "删除"} ${key}`, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await pwExpect(dialog).toBeVisible();
  return runAction(kind, key, () => dialog.getByRole("button", { name: confirmLabel, exact: true }).click());
}

async function restoreConfigFallback() {
  if (!originalConfig || !configMutationArmed || configRestored) return;
  await fetchJson("/api/queue/config", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(pickConfigFields(originalConfig)),
  });
  const concurrency = await fetchJson("/api/queue/action", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId: randomUUID(), action: { kind: "set-concurrency", maxConcurrent: originalConfig.maxConcurrent } }),
  });
  assert.equal(concurrency?.ok, true);
  const [restoredConfig, restoredState] = await Promise.all([fetchJson("/api/queue/config"), directState()]);
  assert.deepEqual(pickConfigFields(restoredConfig), pickConfigFields(originalConfig), "运行配置未完整恢复");
  assert.equal(Number(restoredState.config?.maxConcurrent), Number(originalConfig.maxConcurrent), "并发配置未恢复");
  configRestored = true;
}

async function cleanupTaskFallback(key) {
  let task = await directTask(key).catch(() => null);
  if (!task || task.archivedAt) return;
  assertOwnedTask(task, key);
  const action = kind => fetchJson("/api/queue/action", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId: randomUUID(), action: { kind, key } }),
  });
  if (task.status === "running") {
    assertOwnedTask(await directTask(key), key);
    const stopped = await action("stop");
    assert.equal(stopped?.ok, true);
    const deadline = Date.now() + Math.min(RUN_TIMEOUT, 90_000);
    while (Date.now() < deadline) {
      task = await directTask(key).catch(() => null);
      if (!task || task.status !== "running") break;
      await new Promise(resolveDelay => setTimeout(resolveDelay, 500));
    }
    assert(task?.status !== "running", `停止清理未在 90 秒内收口: ${key}`);
  }
  task = await directTask(key).catch(() => null);
  if (!task || task.archivedAt) return;
  assertOwnedTask(task, key);
  if (task.status === "pending") {
    const deleted = await action("delete");
    assert.equal(deleted?.ok, true);
    assert.equal(await directTask(key), null, `待执行任务清理后仍存在: ${key}`);
  } else if (["done", "failed", "stopped", "interrupted"].includes(task.status)) {
    const archived = await action("archive");
    assert.equal(archived?.ok, true);
    assert((await directTask(key))?.archivedAt, `终态任务清理后未归档: ${key}`);
  } else {
    throw new Error(`未知任务状态，拒绝清理: ${key}:${task.status}`);
  }
}

async function cleanupFailedRun() {
  if (!cleanupOwnershipArmed) return;
  const errors = [];
  for (const key of [SIMPLE_KEY, COMPLEX_KEY]) {
    try { await cleanupTaskFallback(key); }
    catch (error) { errors.push(`${key}: ${error.message}`); }
  }
  if (errors.length) throw new Error(`live UI cleanup incomplete: ${errors.join("; ")}`);
}

async function main() {
  browser = await chromium.launch({ headless: HEADLESS, executablePath: CHROME_PATH, args: ["--no-sandbox"] });
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: TIMEZONE,
  });
  if (TOKEN) {
    const apiOrigin = new URL(BASE_URL).origin;
    await context.route("**/*", route => {
      const target = new URL(route.request().url());
      if (target.origin === apiOrigin && target.pathname.startsWith("/api/")) {
        return route.continue({ headers: { ...route.request().headers(), ...apiHeaders } });
      }
      return route.continue();
    });
  }
  page = await context.newPage();
  page.on("console", message => { if (message.type() === "error") browserProblems.push(`console: ${message.text()}`); });
  page.on("pageerror", error => browserProblems.push(`pageerror: ${error.message}`));
  page.on("requestfailed", request => browserProblems.push(`requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`));
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: UI_TIMEOUT });

  await step("打开真实 DSH AutoQueue 与 SSE", async () => {
    await openBoard();
    const state = await directState();
    originalConfig = await fetchJson("/api/queue/config");
    assert.equal(resolve(originalConfig.queueDir), EXPECTED_QUEUE_DIR, "UI Host queueDir 与本次隔离目录不一致");
    assert.equal(realpathSync(originalConfig.queueDir), realpathSync(EXPECTED_QUEUE_DIR), "UI Host queueDir realpath 不一致");
    assert(originalConfig.webhook == null || originalConfig.webhook === "", "live UI 只允许在 webhook 关闭的专用 Host 运行");
    assert(originalConfig.defaultDeadline == null || originalConfig.defaultDeadline === "", "live UI 只允许在 defaultDeadline 关闭的专用 Host 运行");
    assert.equal(state.tasks.length, 0, "live UI 需要全新的空 queueDir（包括归档记录）");
    assert(!state.tasks.some(task => task.key === SIMPLE_KEY || task.key === COMPLEX_KEY), "指定 key 已存在，拒绝覆盖现有任务");
    if (REQUIRE_ISOLATED) {
      const active = state.tasks.filter(task => !task.archivedAt && ["pending", "running"].includes(task.status));
      assert.equal(active.length, 0, `live UI matrix 需要专用 Host；发现活动任务: ${active.map(task => task.key).join(", ")}`);
    }
    originalConfig.maxConcurrent = Number(state.config?.maxConcurrent || 1);
    cleanupOwnershipArmed = true;
  });

  await step("AI API 接入面板", async () => {
    const responsePromise = waitForBrowserResponse("/api/autoqueue/capabilities", "GET");
    await board().getByRole("button", { name: "AI / API 接入", exact: true }).click();
    const capabilities = await browserResponseJson(await responsePromise, "capabilities UI");
    assert.equal(capabilities?.aiTools?.length, 16);
    const openapi = await fetchJson("/api/autoqueue/openapi.json");
    assert.match(String(openapi.openapi), /^3\./);
    const dialog = page.getByRole("dialog", { name: "AI / API 接入" });
    await pwExpect(dialog).toContainText("Host AI tools");
    await pwExpect(dialog).toContainText("OpenAPI 3.1");
    await dialog.getByRole("button", { name: "关闭接入面板" }).click();
  });

  testConfig = {
    maxConcurrent: originalConfig.maxConcurrent === 2 ? 3 : 2,
    priority: Number(originalConfig.priority || 5) === 6 ? 7 : 6,
  };

  await step("配置与并发入口", async () => {
    await configureRuntime(testConfig.maxConcurrent, testConfig.priority);
    await pwExpect(board().getByRole("progressbar", { name: "后台工作位" })).toHaveAttribute("aria-valuemax", String(testConfig.maxConcurrent));
  });

  const simpleSchedule = localDatetimeValue(new Date(Date.now() + 60 * 60_000));
  await step("创建简单一次性定时任务", async () => {
    const task = await createTaskViaUi({
      key: SIMPLE_KEY,
      schedule: simpleSchedule,
      content: `# Simple UI matrix\n\n${OWNER_MARKER}\n\nUse bash once to run: sleep ${SIMPLE_HOLD_SECONDS} && printf SIMPLE_UI_OK. Your final reply must contain the exact token SIMPLE_UI_OK. Then complete the Goal. Do not modify files.`,
    });
    assert(task.schedule, "simple task schedule missing");
    await navButton("定时执行").click();
    await pwExpect(page.getByRole("heading", { name: "定时执行" })).toBeVisible();
    await pwExpect(taskRow(SIMPLE_KEY)).toBeVisible();
    await pwExpect(taskRow(SIMPLE_KEY)).toContainText("等待计划时间");
  });

  await step("简单任务列表详情四页签", async () => {
    const { dialog } = await openDetail(SIMPLE_KEY);
    await pwExpect(dialog).toContainText("隔离边界正常");
    await dialog.getByRole("tab", { name: "执行轨迹" }).click();
    await pwExpect(dialog).toContainText("还没有执行记录");
    await dialog.getByRole("tab", { name: "报告" }).click();
    await pwExpect(dialog).toContainText("报告尚未生成");
    await dialog.getByRole("tab", { name: "策略" }).click();
    await pwExpect(dialog).toContainText("一次性定时");
    await pwExpect(dialog).toContainText("宿主隔离字段已锁定");
    await dialog.getByRole("button", { name: "关闭任务详情" }).click();
  });

  await step("更新简单定时任务", async () => {
    await editTaskViaUi(SIMPLE_KEY, async dialog => {
      await dialog.locator("#aq-edit-content").fill(`# Simple UI matrix updated\n\n${OWNER_MARKER}\n\nUse bash once to run: sleep ${SIMPLE_HOLD_SECONDS} && printf SIMPLE_UI_OK. Your final reply must contain the exact token SIMPLE_UI_OK. Then complete the Goal. Do not modify files.`);
      await field(dialog, "优先级（1-10）").locator("input").fill("9");
    });
    const task = await waitForTask(SIMPLE_KEY, item => item?.priority === 9 && item.body?.includes("updated"), "更新落账");
    assert(task.schedule, "第一次更新不应清除 schedule");
    await pwExpect(taskRow(SIMPLE_KEY)).toContainText("高");
  });

  const cronTarget = oneShotCronTarget();
  process.stdout.write(`complex cron=${cronTarget.expression}, target=${cronTarget.target.toISOString()}\n`);
  await step("创建复杂循环任务", async () => {
    const task = await createTaskViaUi({
      key: COMPLEX_KEY,
      cron: cronTarget.expression,
      content: `# Complex UI matrix\n\n${OWNER_MARKER}\n\nUse bash once to run: sleep ${COMPLEX_HOLD_SECONDS} && printf COMPLEX_UI_OK. Do not finish the Goal before the command returns. Do not modify files.`,
    });
    assert.equal(task.cron, cronTarget.expression);
    await navButton("循环调度").click();
    await pwExpect(page.getByRole("heading", { name: "循环调度" })).toBeVisible();
    await pwExpect(taskRow(COMPLEX_KEY)).toBeVisible();
    await pwExpect(taskRow(COMPLEX_KEY)).toContainText("等待下次 Cron 窗口");
  });

  await step("复杂任务按 cron 进入运行与 runtime 展示", async () => {
    await waitForTask(COMPLEX_KEY, task => task?.status === "running", "按 cron 进入 running");
    await navButton("正在推进").click();
    const runtime = board().locator('[aria-label="原生 Agent runtime 监控"]');
    await pwExpect(runtime).toBeVisible();
    for (const label of ["监控模式", "前台门控", "最近原生事件", "最近权威对账", "最近收件箱扫描", "Watchdog"]) {
      await pwExpect(runtime).toContainText(label);
    }
    const state = await directState();
    assert.equal(state.runtime?.monitorMode, "native-events+authoritative-reconcile");
    assert.equal(state.runtime?.sessionListKnown, true);
    await pwExpect(taskRow(COMPLEX_KEY)).toContainText("执行中");
  });

  await step("清除简单任务定时并强制扫描", async () => {
    await navButton("定时执行").click();
    await editTaskViaUi(SIMPLE_KEY, async dialog => {
      await field(dialog, "一次性定时").locator('input[type="datetime-local"]').fill("");
    });
    const pending = await waitForTask(SIMPLE_KEY, task => task?.status === "pending" && !task.schedule, "清除 schedule");
    assert.equal(pending.taskType || "manual", "manual");
    await navButton("正在推进").click();
    const response = await runAction("force-scan", undefined, () => board().locator('.aq-head-actions button[aria-label="立即扫描"]').click());
    assert.equal(response.ok, true);
    await waitForTask(SIMPLE_KEY, task => task?.status === "running", "force-scan 后运行");
  });

  await step("两个 owned 任务真实并发", async () => {
    const state = await directState();
    const running = state.tasks.filter(task => [SIMPLE_KEY, COMPLEX_KEY].includes(task.key) && task.status === "running");
    assert.equal(running.length, 2, `expected two running tasks, got ${running.map(task => `${task.key}:${task.status}`).join(",")}`);
    await pwExpect(taskRow(SIMPLE_KEY)).toContainText("执行中");
    await pwExpect(taskRow(COMPLEX_KEY)).toContainText("执行中");
    await pwExpect(board().getByRole("progressbar", { name: "后台工作位" })).toHaveAttribute("aria-valuenow", "2");
  });

  await step("停止复杂任务并等待双 idle 收口", async () => {
    const response = await confirmAction("stop", COMPLEX_KEY, "停止");
    assert.equal(response.accepted, true);
    assert.equal(response.pending, true);
    const task = await waitForTask(COMPLEX_KEY, item => item?.status === "stopped" && item.executions?.some(run => run.result === "stopped"), "停止后安全收口");
    assert(task.executions.some(run => run.result === "stopped"));
    await navButton("任务队列").click();
    await pwExpect(taskRow(COMPLEX_KEY)).toContainText("已停止");
  });

  await step("简单任务完成并展示结果详情", async () => {
    await waitForTask(SIMPLE_KEY, task => task?.status === "done", "完成");
    await navButton("任务队列").click();
    await pwExpect(taskRow(SIMPLE_KEY)).toContainText("已完成");
    const { dialog, body } = await openDetail(SIMPLE_KEY);
    assert(body.task.executions?.length >= 1);
    await dialog.getByRole("tab", { name: "执行轨迹" }).click();
    await pwExpect(dialog).toContainText("已完成");
    await dialog.getByRole("tab", { name: "报告" }).click();
    await pwExpect(dialog).toContainText("SIMPLE_UI_OK");
    await dialog.getByRole("button", { name: "关闭任务详情" }).click();
  });

  await step("重新执行简单任务", async () => {
    await confirmAction("rerun", SIMPLE_KEY, "重新执行");
    const task = await waitForTask(SIMPLE_KEY, item => item?.status === "done" && item.executions?.length >= 2, "第二次完成");
    assert(task.executions.length >= 2);
    await pwExpect(taskRow(SIMPLE_KEY)).toContainText("已完成");
  });

  await step("单任务归档与恢复", async () => {
    await runAction("archive", SIMPLE_KEY, () => board().getByRole("button", { name: `归档 ${SIMPLE_KEY}`, exact: true }).click());
    await waitForTask(SIMPLE_KEY, task => Boolean(task?.archivedAt), "归档");
    await navButton("归档记录").click();
    await pwExpect(taskRow(SIMPLE_KEY)).toBeVisible();
    await runAction("restore", SIMPLE_KEY, () => board().getByRole("button", { name: `还原 ${SIMPLE_KEY}`, exact: true }).click());
    await waitForTask(SIMPLE_KEY, task => task && !task.archivedAt, "恢复");
    await navButton("任务队列").click();
    await pwExpect(taskRow(SIMPLE_KEY)).toBeVisible();
  });

  await step("批量归档与双任务恢复", async () => {
    for (const key of [SIMPLE_KEY, COMPLEX_KEY]) await taskRow(key).locator('input[type="checkbox"]').check();
    await board().getByRole("button", { name: "批量归档", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "批量归档" });
    for (const key of [SIMPLE_KEY, COMPLEX_KEY]) assertOwnedTask(await directTask(key), key);
    const batch = await runAction("archive", undefined, () => dialog.getByRole("button", { name: "归档", exact: true }).click());
    assert(batch.results?.every(result => result.ok), JSON.stringify(batch));
    for (const key of [SIMPLE_KEY, COMPLEX_KEY]) await waitForTask(key, task => Boolean(task?.archivedAt), "批量归档");
    await navButton("归档记录").click();
    for (const key of [SIMPLE_KEY, COMPLEX_KEY]) {
      await pwExpect(taskRow(key)).toBeVisible();
      await runAction("restore", key, () => board().getByRole("button", { name: `还原 ${key}`, exact: true }).click());
      await waitForTask(key, task => task && !task.archivedAt, "批量后恢复");
    }
  });

  await step("重新武装并删除已停止的循环任务", async () => {
    await navButton("任务队列").click();
    await confirmAction("rerun", COMPLEX_KEY, "重新执行");
    await waitForTask(COMPLEX_KEY, task => task?.status === "pending", "重新武装为 pending");
    await confirmAction("delete", COMPLEX_KEY, "删除");
    await waitForTask(COMPLEX_KEY, task => task === null, "从 state 删除");
    await pwExpect(taskRow(COMPLEX_KEY)).toHaveCount(0);
  });

  await step("归档简单任务并恢复原配置", async () => {
    await runAction("archive", SIMPLE_KEY, () => board().getByRole("button", { name: `归档 ${SIMPLE_KEY}`, exact: true }).click());
    await waitForTask(SIMPLE_KEY, task => Boolean(task?.archivedAt), "最终归档");
    await configureRuntime(originalConfig.maxConcurrent, originalConfig.priority);
    await restoreConfigFallback();
    await pwExpect(board().getByRole("progressbar", { name: "后台工作位" })).toHaveAttribute("aria-valuemax", String(originalConfig.maxConcurrent));
  });

  assert.equal(browserProblems.length, 0, `browser errors:\n${browserProblems.join("\n")}`);
  matrixPassed = true;
  process.stdout.write(`\nLIVE UI MATRIX PASS\nURL=${BASE_URL}\nSIMPLE_KEY=${SIMPLE_KEY}\nCOMPLEX_KEY=${COMPLEX_KEY}\nSCREENSHOTS=${SCREENSHOT_DIR}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(`\nLIVE UI MATRIX FAIL\n${error.stack || error}\n`);
  process.exitCode = 1;
} finally {
  if (!matrixPassed) {
    try { await cleanupFailedRun(); }
    catch (error) {
      process.stderr.write(`LIVE UI CLEANUP FAIL\n${error.stack || error}\n`);
      process.exitCode = 1;
    }
  }
  try { await restoreConfigFallback(); }
  catch (error) {
    process.stderr.write(`LIVE UI CONFIG RESTORE FAIL\n${error.stack || error}\n`);
    process.exitCode = 1;
  }
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
}

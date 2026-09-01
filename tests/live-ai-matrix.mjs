#!/usr/bin/env node

/**
 * Live DSH / autoqueue Host-AI-tool matrix.
 *
 * This is intentionally not a mocked Playwright test. It drives a normal DSH
 * conversation, lets the model call every registered autoqueue_* tool, and
 * uses direct HTTP as a read-only source of truth between foreground turns.
 * Direct mutations are reserved for best-effort failure cleanup. The run
 * writes screenshots and machine-readable evidence below
 * test-results/live-ai-matrix/ by default.
 *
 * Useful environment variables:
 *   AUTOQUEUE_LIVE_URL=http://127.0.0.1:3280
 *   AUTOQUEUE_LIVE_EXPECTED_QUEUE_DIR=/tmp/dsh-autoqueue-dedicated
 *   AUTOQUEUE_LIVE_KEY_PREFIX=aq-live-my-run
 *   AUTOQUEUE_LIVE_UI_TIMEOUT_MS=180000
 *   AUTOQUEUE_LIVE_TASK_TIMEOUT_MS=900000
 *   AUTOQUEUE_LIVE_POLL_MS=1000
 *   AUTOQUEUE_LIVE_ARTIFACT_DIR=/absolute/path
 *   AUTOQUEUE_LIVE_HEADED=1
 *   AUTOQUEUE_LIVE_CHROME=/usr/bin/google-chrome-stable
 *   AUTOQUEUE_LIVE_WORKSPACE=duilie
 *   AUTOQUEUE_LIVE_ALLOW_REMOTE=1  # explicit opt-in; loopback is the default
 *
 * Individual keys can be overridden with AUTOQUEUE_LIVE_{PROBE,STOP,SIMPLE,
 * COMPLEX}_KEY. Do not put credentials in the URL; this driver neither reads
 * nor prints authentication secrets.
 */

import { chromium } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

const TOOL_NAMES = Object.freeze([
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
const WRITABLE_CONFIG_FIELDS = Object.freeze([
  "maxGoalRounds", "maxBlockedResumes", "unknownThreshold", "maxAttempts",
  "taskTimeoutMs", "autoArchive", "webhook", "enableNotifications",
  "priority", "defaultDeadline", "retryBackoffBaseMs", "retryBackoffMaxMs",
]);

const HOST_URL = parseHostUrl(process.env.AUTOQUEUE_LIVE_URL ?? "http://127.0.0.1:3280");
const EXPECTED_QUEUE_DIR = requiredAbsolutePathEnv("AUTOQUEUE_LIVE_EXPECTED_QUEUE_DIR");
const UI_TIMEOUT_MS = intEnv("AUTOQUEUE_LIVE_UI_TIMEOUT_MS", 180_000, 10_000);
const TASK_TIMEOUT_MS = intEnv("AUTOQUEUE_LIVE_TASK_TIMEOUT_MS", 900_000, 30_000);
const POLL_MS = intEnv("AUTOQUEUE_LIVE_POLL_MS", 1_000, 100);
const runStartedAt = Date.now();
const runToken = `${new Date(runStartedAt).toISOString().replace(/\D/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
const keyPrefix = process.env.AUTOQUEUE_LIVE_KEY_PREFIX ?? `aq-live-${runToken}`;
const keys = Object.freeze({
  probe: process.env.AUTOQUEUE_LIVE_PROBE_KEY ?? `${keyPrefix}-probe`,
  stop: process.env.AUTOQUEUE_LIVE_STOP_KEY ?? `${keyPrefix}-stop`,
  simple: process.env.AUTOQUEUE_LIVE_SIMPLE_KEY ?? `${keyPrefix}-simple`,
  complex: process.env.AUTOQUEUE_LIVE_COMPLEX_KEY ?? `${keyPrefix}-complex`,
});
const ARTIFACT_DIR = path.resolve(
  process.env.AUTOQUEUE_LIVE_ARTIFACT_DIR
    ?? path.join("test-results", "live-ai-matrix", runToken),
);
const WORKSPACE_NAME = process.env.AUTOQUEUE_LIVE_WORKSPACE ?? path.basename(process.cwd());
const complexMarker = `AQ_COMPLEX_${runToken.replace(/\W/g, "_")}`;
const simpleMarker = `AQ_SIMPLE_${runToken.replace(/\W/g, "_")}`;
const ownershipMarker = `AQ_LIVE_OWNER_${runToken.replace(/\W/g, "_")}`;
const fixtureNonce = randomUUID();
const expectedOrders = Object.freeze([
  ["O-001", "C-001", "12.50"],
  ["O-002", "C-002", "7.25"],
  ["O-003", "C-001", "10.25"],
  ["O-004", "C-003", "20.00"],
]);
const expectedCustomers = Object.freeze({
  "C-001": "Ada",
  "C-002": "Linus",
  "C-003": "Grace",
});
const expectedComplexSummary = Object.freeze({
  schemaVersion: 1,
  marker: complexMarker,
  nonce: fixtureNonce,
  orderCount: 4,
  totalAmount: "50.00",
  customers: [
    { customerId: "C-001", name: "Ada", orderCount: 2, totalAmount: "22.75" },
    { customerId: "C-002", name: "Linus", orderCount: 1, totalAmount: "7.25" },
    { customerId: "C-003", name: "Grace", orderCount: 1, totalAmount: "20.00" },
  ],
});
const probeV1Content = `# 生命周期探针 v1\n${ownershipMarker}\n这是 2099 年才执行的 pending 探针。`;
const probeV2Content = `# 生命周期探针 v2\n${ownershipMarker}\n已由 Host AI tool 更新。`;
const stopContent = `# 停止语义探针 ${runToken}\n${ownershipMarker}\n必须使用 bash 前台执行 sleep 300，禁止后台、daemon 或子会话。sleep 结束后才写执行报告.md 并完成 Goal。`;
const simpleContent = `# 简单任务\n${ownershipMarker}\n不联网、不修改业务代码。计算 37×41，把 ${simpleMarker} 和结果 1517 写入执行报告.md，然后完成 Goal。`;
const complexContent = `# 复杂文件任务\n${ownershipMarker}\n先在当前任务工作目录创建 orders.csv，内容为 order_id,customer_id,amount 换行 O-001,C-001,12.50 换行 O-002,C-002,7.25 换行 O-003,C-001,10.25 换行 O-004,C-003,20.00；创建 customers.json，内容为 {"C-001":"Ada","C-002":"Linus","C-003":"Grace"}；创建 nonce.txt，内容为 ${fixtureNonce}。必须从这三个文件重新读取数据并计算，在 deliverable/summary.json 写入严格 JSON（字段、类型、数组顺序和值必须精确等于 ${JSON.stringify(expectedComplexSummary)}，不得增加字段）；同时写执行报告.md，明确列出 marker、nonce、orderCount、totalAmount，以及每个 customerId/name/orderCount/totalAmount，最后完成 Goal。`;
const ALLOWED_OWNED_PRESETS = new Set([
  "autoqueue-unattended-v2",
  "autoqueue-ptc-unattended-v2",
]);
const OWNED_SESSION_ID_RE = /^autoqueue-session-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

validateKeys(keys);
assert(typeof WORKSPACE_NAME === "string" && WORKSPACE_NAME.trim(), "AUTOQUEUE_LIVE_WORKSPACE must be non-empty");

let browser;
let page;
let baselineRestoreConfig;
let baselineConcurrencyForCleanup;
let cleanupOwnershipArmed = false;
let aiHostCoupled = false;
let configMutationArmed = false;
let matrixPassed = false;
const phaseEvidence = [];

try {
  await mkdir(ARTIFACT_DIR, { recursive: true });

  const baselineConfig = await getConfig();
  const baselineState = await getState(true);
  assertEqual(path.resolve(baselineConfig.queueDir), EXPECTED_QUEUE_DIR, "direct Host expected queueDir");
  assertEqual(await realpath(baselineConfig.queueDir), await realpath(EXPECTED_QUEUE_DIR), "direct Host queueDir real path");
  assert(
    baselineConfig.webhook == null || baselineConfig.webhook === "",
    "Live AI matrix requires a dedicated Host with webhook disabled",
  );
  assert(
    baselineConfig.defaultDeadline == null || baselineConfig.defaultDeadline === "",
    "Live AI matrix requires a dedicated Host with defaultDeadline disabled",
  );
  assert(
    Array.isArray(baselineState.tasks) && baselineState.tasks.length === 0,
    "Live AI matrix requires a fresh empty queueDir, including no archived tasks",
  );
  assertKeysAbsent(baselineState);
  cleanupOwnershipArmed = true;
  const queueRunsDir = requireQueueRunsDir(baselineConfig.queueDir);
  const preexistingActive = (baselineState.tasks ?? []).filter(task =>
    !task.archivedAt && ["pending", "running"].includes(task.status),
  );
  assert(
    preexistingActive.length === 0,
    `Live AI matrix requires an isolated Host; active tasks: ${preexistingActive.map(task => task.key).join(", ")}`,
  );
  const baselineConcurrency = Number.isInteger(baselineState?.config?.maxConcurrent)
    ? baselineState.config.maxConcurrent
    : 1;
  const exercisePriority = baselineConfig.priority === 6 ? 7 : 6;
  const restoreConfig = pickDefined({
    priority: baselineConfig.priority,
    autoArchive: baselineConfig.autoArchive,
    enableNotifications: baselineConfig.enableNotifications,
  });
  const baselineWritableConfig = pickFields(baselineConfig, WRITABLE_CONFIG_FIELDS);
  baselineRestoreConfig = baselineWritableConfig;
  baselineConcurrencyForCleanup = baselineConcurrency;

  await writeJson("manifest.json", {
    runToken,
    runStartedAt: new Date(runStartedAt).toISOString(),
    host: HOST_URL.origin,
    keys,
    toolNames: TOOL_NAMES,
    timeouts: { ui: UI_TIMEOUT_MS, task: TASK_TIMEOUT_MS, poll: POLL_MS },
    workspace: WORKSPACE_NAME,
    ownershipMarker,
    queueRunsDir,
    baseline: { maxConcurrent: baselineConcurrency, config: baselineWritableConfig },
  });

  browser = await chromium.launch(browserLaunchOptions());
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 },
    reducedMotion: "reduce",
  });
  page = await context.newPage();
  page.setDefaultTimeout(UI_TIMEOUT_MS);
  await page.goto(HOST_URL.href, { waitUntil: "domcontentloaded" });
  await dismissOverlays();
  await startNormalConversation();
  await screenshot("00-ready");

  // Prove that this conversation's registered tools point at the same
  // isolated Host before allowing any mutation. queueDir is a per-run mktemp
  // identity, so the complete successful tool render is a read-only nonce.
  const couplingPhase = await runPhase({
    number: 0,
    name: "host-coupling",
    calls: [{ tool: "autoqueue_get_config", args: {} }],
    prompt: `先做只读 Host 耦合检查。只能调用一次 autoqueue_get_config，不得调用任何修改类工具，不得使用 HTTP、curl 或 shell。成功后最后一行输出 \`PHASE_0\` 后紧接 \`_DONE\`，中间不要有空格。`,
  });
  const renderedCoupling = parseRenderedConfig(couplingPhase.cards[0].output);
  assertEqual(renderedCoupling.queueDir, baselineConfig.queueDir, "AI tool Host queueDir coupling");
  aiHostCoupled = true;
  await attachHttpEvidence(0, { coupled: true, queueDir: baselineConfig.queueDir });

  // From this point the AI tool Host is cryptographically coupled to the
  // per-run queue identity. Arm exact config rollback before the first tool
  // that can mutate runtime settings.
  configMutationArmed = true;
  await runPhase({
    number: 1,
    name: "discovery-and-config",
    calls: [
      { tool: "autoqueue_get_options", args: {} },
      { tool: "autoqueue_get_config", args: {}, expectedConfig: { maxConcurrent: baselineConcurrency, priority: baselineConfig.priority } },
      { tool: "autoqueue_set_concurrency", args: { maxConcurrent: 2 } },
      { tool: "autoqueue_get_config", args: {}, expectedConfig: { maxConcurrent: 2, priority: baselineConfig.priority } },
      { tool: "autoqueue_set_concurrency", args: { maxConcurrent: baselineConcurrency } },
      { tool: "autoqueue_update_config", args: { priority: exercisePriority, autoArchive: false, enableNotifications: false } },
      { tool: "autoqueue_get_config", args: {}, expectedConfig: { maxConcurrent: baselineConcurrency, priority: exercisePriority, autoArchive: false, enableNotifications: false } },
    ],
    prompt: `你正在执行 autoqueue Host AI tool 的真实验收。必须严格按下面顺序逐项调用工具；每次都等待上一步返回，禁止并行，禁止用自然语言冒充工具结果，也不要使用 HTTP、curl 或 shell：
1. 调用 autoqueue_get_options。
2. 调用 autoqueue_get_config。
3. 调用 autoqueue_set_concurrency，maxConcurrent=2。
4. 再调用 autoqueue_get_config，确认并发变化。
5. 调用 autoqueue_set_concurrency，maxConcurrent=${baselineConcurrency}。
6. 调用 autoqueue_update_config，参数只传 priority=${exercisePriority}、autoArchive=false、enableNotifications=false。
7. 再调用 autoqueue_get_config。
任何一步失败都明确报告并停止。全部成功后，最后一行输出 \`PHASE_1\` 后紧接 \`_DONE\`，中间不要有空格。`,
  });
  const phase1Config = await getConfig();
  const phase1State = await getState(true);
  assertEqual(phase1Config.priority, exercisePriority, "P1 priority");
  assertEqual(phase1Config.autoArchive, false, "P1 autoArchive");
  assertEqual(phase1Config.enableNotifications, false, "P1 enableNotifications");
  assertEqual(phase1State.config?.maxConcurrent, baselineConcurrency, "P1 concurrency restored");
  await attachHttpEvidence(1, { config: phase1Config, state: summarizeState(phase1State) });

  await runPhase({
    number: 2,
    name: "pending-lifecycle",
    calls: [
      { tool: "autoqueue_create_task", args: { key: keys.probe, content: probeV1Content, schedule: "2099-01-01T00:00:00.000Z", priority: 3, autoArchive: false } },
      { tool: "autoqueue_get_task", args: { key: keys.probe }, outputIncludes: [keys.probe, "生命周期探针 v1", "优先级 3"] },
      { tool: "autoqueue_update_task", args: { key: keys.probe, content: probeV2Content, priority: 7 } },
      { tool: "autoqueue_archive_task", args: { key: keys.probe } },
      { tool: "autoqueue_list_tasks", args: { includeArchived: true }, outputIncludes: [keys.probe] },
      { tool: "autoqueue_restore_task", args: { key: keys.probe } },
      { tool: "autoqueue_get_task", args: { key: keys.probe }, outputIncludes: [keys.probe, "生命周期探针 v2", "优先级 7"] },
      { tool: "autoqueue_delete_task", args: { key: keys.probe } },
      { tool: "autoqueue_list_tasks", args: { includeArchived: true }, outputExcludes: [keys.probe] },
    ],
    prompt: `继续真实验收。严格串行调用，不能跳步、并行、改 key 或用自然语言代替工具结果：
1. autoqueue_create_task：key=${keys.probe}；content=${JSON.stringify(probeV1Content)}；schedule=2099-01-01T00:00:00.000Z；priority=3；autoArchive=false。
2. autoqueue_get_task 查询 ${keys.probe}。
3. autoqueue_update_task 更新 ${keys.probe}：content=${JSON.stringify(probeV2Content)}，priority=7。
4. autoqueue_archive_task 归档 ${keys.probe}。
5. autoqueue_list_tasks，includeArchived=true。
6. autoqueue_restore_task 还原 ${keys.probe}。
7. autoqueue_get_task 再查询 ${keys.probe}。
8. autoqueue_delete_task 永久删除这个仍为 pending 的 ${keys.probe}。
9. autoqueue_list_tasks，includeArchived=true，确认它消失。
任何一步失败都明确报告并停止。全部成功后，最后一行输出 \`PHASE_2\` 后紧接 \`_DONE\`，中间不要有空格。`,
  });
  const phase2State = await getState(true);
  assert(!findTask(phase2State, keys.probe), "P2 deleted probe is still present");
  await attachHttpEvidence(2, { state: summarizeState(phase2State) });

  await runPhase({
    number: 3,
    name: "seed-and-dispatch",
    calls: [
      { tool: "autoqueue_create_task", args: { key: keys.stop, content: stopContent, priority: 10, autoArchive: false, timeoutMs: 600000 } },
      { tool: "autoqueue_create_task", args: { key: keys.simple, content: simpleContent, priority: 9, autoArchive: false } },
      { tool: "autoqueue_create_task", args: { key: keys.complex, content: complexContent, priority: 8, autoArchive: false } },
      { tool: "autoqueue_list_tasks", args: { includeArchived: false }, outputIncludes: [keys.stop, keys.simple, keys.complex] },
      { tool: "autoqueue_force_scan", args: {} },
      { tool: "autoqueue_list_tasks", args: { includeArchived: false }, outputIncludes: [keys.stop, keys.simple, keys.complex] },
    ],
    prompt: `继续真实验收。严格串行创建三个无人值守任务，key 必须逐字一致；不要在当前会话亲自执行任务：
1. autoqueue_create_task：key=${keys.stop}；priority=10；autoArchive=false；timeoutMs=600000；content=${JSON.stringify(stopContent)}。
2. autoqueue_create_task：key=${keys.simple}；priority=9；autoArchive=false；content=${JSON.stringify(simpleContent)}。
3. autoqueue_create_task：key=${keys.complex}；priority=8；autoArchive=false；content=${JSON.stringify(complexContent)}。
4. autoqueue_list_tasks，includeArchived=false。
5. autoqueue_force_scan。
6. autoqueue_list_tasks，includeArchived=false。
任何一步失败都明确报告并停止。全部成功后，最后一行输出 \`PHASE_3\` 后紧接 \`_DONE\`，中间不要有空格。`,
  });
  const seededState = await getState(true);
  for (const key of [keys.stop, keys.simple, keys.complex]) {
    assert(findTask(seededState, key), `P3 task was not persisted: ${key}`);
  }
  await attachHttpEvidence(3, { state: summarizeState(seededState) });

  // This wait is deliberately outside a DSH foreground turn. A normal active
  // conversation must make the queue yield rather than compete with the Host.
  const runningStop = await waitForTask(
    keys.stop,
    task => task.status === "running" && task.stopPending !== true,
    "stop probe to enter running",
  );
  await writeJson("between-p3-p4-running-stop.json", sanitizeTask(runningStop));

  await runPhase({
    number: 4,
    name: "durable-stop",
    calls: [
      { tool: "autoqueue_get_task", args: { key: keys.stop } },
      { tool: "autoqueue_stop_task", args: { key: keys.stop } },
      { tool: "autoqueue_get_task", args: { key: keys.stop } },
    ],
    prompt: `继续真实验收，只操作正在运行的 ${keys.stop}，严格串行：
1. autoqueue_get_task 查询它。
2. autoqueue_stop_task 提交停止请求。accepted/pending 只表示已受理，不要宣称已经 stopped。
3. autoqueue_get_task 再查询一次并如实报告当前 status 与 stopPending。
不要轮询、不要调用 HTTP。三次工具调用完成后，最后一行输出 \`PHASE_4\` 后紧接 \`_DONE\`，中间不要有空格。`,
  });
  const stoppedTask = await waitForTask(
    keys.stop,
    task => task.status === "stopped" && task.stopPending !== true,
    "accepted stop to converge to stopped",
  );
  await attachHttpEvidence(4, { task: sanitizeTask(stoppedTask) });

  // Again, all background execution waits happen after the foreground turn.
  const simpleDone = await waitForTask(
    keys.simple,
    task => task.status === "done"
      && reportFileText(task).includes(simpleMarker)
      && /(^|\D)1517(\D|$)/.test(reportFileText(task)),
    "simple task completion and report",
  );
  const complexDone = await waitForTask(
    keys.complex,
    task => task.status === "done"
      && complexReportHasExpectedValues(task),
    "complex task completion and report",
  );
  const simpleIsolation = await validateTaskIsolation(simpleDone, queueRunsDir);
  const complexIsolation = await validateTaskIsolation(complexDone, queueRunsDir);
  const firstComplexFiles = await validateComplexWorkDir(complexDone, queueRunsDir, complexIsolation);
  await writeJson("between-p4-p5-background-results.json", {
    simple: boundedTaskEvidence(simpleDone, simpleIsolation),
    complex: boundedTaskEvidence(complexDone, complexIsolation),
    complexFiles: firstComplexFiles,
  });
  const firstComplexExecutions = executionCount(complexDone);

  await runPhase({
    number: 5,
    name: "read-and-rerun",
    calls: [
      { tool: "autoqueue_get_task", args: { key: keys.simple } },
      { tool: "autoqueue_mark_read", args: { key: keys.simple, read: false }, outputIncludes: ["未读"] },
      { tool: "autoqueue_mark_read", args: { key: keys.simple, read: true }, outputIncludes: ["已读"] },
      { tool: "autoqueue_get_task", args: { key: keys.complex } },
      { tool: "autoqueue_rerun_task", args: { key: keys.complex } },
    ],
    prompt: `继续真实验收，严格串行：
1. autoqueue_get_task 查询 ${keys.simple}。
2. autoqueue_mark_read 对 ${keys.simple} 传 read=false。
3. autoqueue_mark_read 对 ${keys.simple} 传 read=true。
4. autoqueue_get_task 查询 ${keys.complex}。
5. autoqueue_rerun_task 重新排队 ${keys.complex}。返回成功只表示已排队，不要宣称第二次执行已完成。
不要轮询、不要调用 HTTP。全部工具调用成功后，最后一行输出 \`PHASE_5\` 后紧接 \`_DONE\`，中间不要有空格。`,
  });
  const simpleRead = await getTask(keys.simple);
  assert(Boolean(simpleRead.readAt), "P5 simple task was not left read");
  const complexRerunDone = await waitForTask(
    keys.complex,
    task => task.status === "done"
      && executionCount(task) >= firstComplexExecutions + 1
      && complexReportHasExpectedValues(task),
    "complex rerun completion",
  );
  const rerunComplexIsolation = await validateTaskIsolation(complexRerunDone, queueRunsDir);
  const rerunComplexFiles = await validateComplexWorkDir(
    complexRerunDone,
    queueRunsDir,
    rerunComplexIsolation,
  );
  await attachHttpEvidence(5, {
    simple: boundedTaskEvidence(simpleRead, simpleIsolation),
    complex: boundedTaskEvidence(complexRerunDone, rerunComplexIsolation),
    complexFiles: rerunComplexFiles,
  });

  await runPhase({
    number: 6,
    name: "batch-archive-and-restore-config",
    calls: [
      { tool: "autoqueue_get_task", args: { key: keys.complex } },
      { tool: "autoqueue_batch_archive", args: { keys: [keys.stop, keys.simple, keys.complex] } },
      { tool: "autoqueue_list_tasks", args: { includeArchived: true } },
      { tool: "autoqueue_update_config", args: restoreConfig },
      { tool: "autoqueue_set_concurrency", args: { maxConcurrent: baselineConcurrency } },
      { tool: "autoqueue_get_config", args: {}, expectedConfig: { maxConcurrent: baselineConcurrency, ...restoreConfig } },
    ],
    prompt: `完成最后阶段，严格串行：
1. autoqueue_get_task 查询 ${keys.complex}，确认第二次执行记录。
2. autoqueue_batch_archive，一次传 keys=[${keys.stop}, ${keys.simple}, ${keys.complex}]；检查 results 中三项都成功，HTTP 200 不能代替逐项成功。
3. autoqueue_list_tasks，includeArchived=true。
4. autoqueue_update_config，只传这个 JSON 对象中的字段：${JSON.stringify(restoreConfig)}。
5. autoqueue_set_concurrency，maxConcurrent=${baselineConcurrency}。
6. autoqueue_get_config，确认恢复结果。
任何一步失败都明确报告并停止。全部成功后，最后一行输出 \`PHASE_6\` 后紧接 \`_DONE\`，中间不要有空格。`,
  });
  const finalState = await getState(true);
  const finalConfig = await getConfig();
  const finalTaskDetails = await Promise.all(
    [keys.stop, keys.simple, keys.complex].map(key => getTask(key)),
  );
  const finalIsolation = await Promise.all(
    finalTaskDetails.map(task => validateTaskIsolation(task, queueRunsDir)),
  );
  const finalComplexFiles = await validateComplexWorkDir(
    finalTaskDetails[2],
    queueRunsDir,
    finalIsolation[2],
  );
  for (const task of finalTaskDetails) {
    assert(task?.archivedAt, `P6 task was not archived: ${task?.key ?? "unknown"}`);
  }
  for (const [field, value] of Object.entries(restoreConfig)) {
    assertEqual(finalConfig[field], value, `P6 restored config ${field}`);
  }
  assertDeepEqual(
    pickFields(finalConfig, WRITABLE_CONFIG_FIELDS),
    baselineWritableConfig,
    "P6 complete writable config restoration",
  );
  assertEqual(finalState.config?.maxConcurrent, baselineConcurrency, "P6 restored concurrency");
  await attachHttpEvidence(6, {
    config: finalConfig,
    state: summarizeState(finalState),
    taskDetails: finalTaskDetails.map((task, index) => boundedTaskEvidence(task, finalIsolation[index])),
    complexFiles: finalComplexFiles,
  });

  const finalCards = await collectToolCards();
  // Some DSH builds virtualize old chat rows. Every phase captures its cards
  // while they are visible, so use that evidence union for the final matrix.
  const allObservedCards = phaseEvidence.flatMap(phase => phase.cards);
  const observedOkTools = [...new Set(
    allObservedCards.filter(card => card.state === "ok").map(card => card.tool),
  )].sort();
  const missingTools = TOOL_NAMES.filter(name => !observedOkTools.includes(name));
  assert(missingTools.length === 0, `Missing successful DOM tool evidence: ${missingTools.join(", ")}`);
  await screenshot("99-complete");
  await writeJson("summary.json", {
    ok: true,
    runToken,
    keys,
    expectedTools: TOOL_NAMES,
    observedOkTools,
    toolCardCount: finalCards.length,
    phases: phaseEvidence,
    finalTasks: finalTaskDetails.map((task, index) => boundedTaskEvidence(task, finalIsolation[index])),
    finalComplexFiles,
  });
  matrixPassed = true;
  console.log(`LIVE_AI_MATRIX_OK ${ARTIFACT_DIR}`);
} catch (error) {
  if (page) {
    await screenshot("failure").catch(() => {});
    await writeJson("failure-tool-dom.json", await collectToolCards().catch(() => [])).catch(() => {});
  }
  await writeJson("failure.json", {
    ok: false,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    phases: phaseEvidence,
  }).catch(() => {});
  console.error(`LIVE_AI_MATRIX_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (!matrixPassed) await cleanupFailedRun();
  await browser?.close().catch(() => {});
}

async function runPhase({ number, name, calls, prompt }) {
  const beforeCards = await collectToolCards();
  const beforeCallIds = new Set([
    ...phaseEvidence.flatMap(phase => phase.cards.map(card => card.callId)),
    ...beforeCards.map(card => card.callId),
  ].filter(Boolean));
  const marker = `PHASE_${number}_DONE`;
  const textarea = composer();
  await textarea.waitFor({ state: "visible" });
  await textarea.fill(prompt);
  const send = page.getByRole("button", { name: /Send message/i });
  await send.waitFor({ state: "visible" });
  await send.click();

  await page.waitForFunction(
    expected => document.body.innerText.includes(expected),
    marker,
    { timeout: UI_TIMEOUT_MS },
  );
  // The marker can appear in a streamed text chunk before the Host publishes
  // its final idle edge. Do not enqueue the next foreground prompt until the
  // composer has returned to its authoritative send state.
  await page.getByRole("button", { name: "Send message", exact: true }).waitFor({ state: "visible" });

  const cards = (await collectToolCards(true)).filter(card => !beforeCallIds.has(card.callId));
  validatePhaseCards(number, cards, calls);
  const evidence = {
    number,
    name,
    expectedCalls: calls,
    cards,
  };
  phaseEvidence.push(evidence);
  await writeJson(`phase-${number}-${name}-tool-dom.json`, evidence);
  await screenshot(`phase-${number}-${name}`);
  return evidence;
}

async function attachHttpEvidence(number, value) {
  await writeJson(`phase-${number}-http-truth.json`, value);
  const phase = phaseEvidence.find(item => item.number === number);
  if (phase) phase.httpEvidence = `phase-${number}-http-truth.json`;
}

async function startNormalConversation() {
  // DOMContentLoaded precedes the React surface. `locator.count()` would race
  // that mount and could silently reuse a restored user conversation, so wait
  // for the real New Session control before doing anything else.
  const newSession = page.getByRole("button", { name: /^New session$/i })
    .filter({ visible: true })
    .first();
  await newSession.waitFor({ state: "visible" });
  await dismissOverlays();
  await newSession.click();

  const blankHero = page.locator([
    'textarea[placeholder="Describe what you want to build"]:visible',
    'textarea[aria-label="Choose workspace"][placeholder="Choose a workspace to start"]:visible',
  ].join(", ")).first();
  await blankHero.waitFor({ state: "visible" });

  const workspaceChip = page.getByRole("button", { name: "Choose workspace", exact: true })
    .filter({ visible: true })
    .first();
  await workspaceChip.waitFor({ state: "visible" });
  const selectedTitle = normalizeText(await workspaceChip.innerText());
  if (selectedTitle !== WORKSPACE_NAME) {
    await workspaceChip.click();
    const menu = page.locator('[role="menu"]:visible, [role="listbox"]:visible').last();
    await menu.waitFor({ state: "visible" });
    let menuItems = menu.locator('[role="menuitem"], [role="option"]');
    if (await menuItems.count() === 0) menuItems = menu.locator("button");
    const labels = (await menuItems.allInnerTexts()).map(normalizeText);
    const matchingIndexes = labels.flatMap((label, index) => label === WORKSPACE_NAME ? [index] : []);
    assert(
      matchingIndexes.length === 1,
      `Expected one registered workspace named ${WORKSPACE_NAME}, found ${matchingIndexes.length}`,
    );
    await menuItems.nth(matchingIndexes[0]).click();
  }

  await page.waitForFunction(expected => {
    const chip = [...document.querySelectorAll('button[aria-label="Choose workspace"]')]
      .find(element => element.offsetParent !== null);
    return chip?.textContent?.replace(/\s+/g, " ").trim() === expected;
  }, WORKSPACE_NAME, { timeout: UI_TIMEOUT_MS });
  const accessMode = page.getByRole("button", { name: /Access mode, current:/ }).filter({ visible: true }).first();
  await accessMode.waitFor({ state: "visible" });
  if (!/current:\s*Read Only/i.test(await accessMode.getAttribute("aria-label") ?? "")) {
    await accessMode.click();
    await page.getByText("Read Only", { exact: true }).filter({ visible: true }).last().click();
  }
  await page.getByRole("button", { name: /Access mode, current:\s*Read Only/i })
    .filter({ visible: true })
    .first()
    .waitFor({ state: "visible" });
  const input = heroComposer();
  await input.waitFor({ state: "visible" });
  assert(await input.isEditable(), "Blank-session hero composer is not editable");
  const visibleFlowItems = await page.locator('[data-chat-flow-kind]:visible').count();
  assertEqual(visibleFlowItems, 0, "new session must have an empty message flow");
}

function composer() {
  return page.locator([
    'textarea[placeholder="Describe what you want to build"]:visible',
    'textarea[placeholder="Message the agent"]:visible',
  ].join(", ")).first();
}

function heroComposer() {
  return page.locator('textarea[placeholder="Describe what you want to build"]:visible').first();
}

async function dismissOverlays() {
  for (const name of ["Close details", "关闭任务台"]) {
    const button = page.getByRole("button", { name });
    if (await button.count()) await button.first().click().catch(() => {});
  }
}

async function collectToolCards(expand = false) {
  const locator = page.locator("[data-tool]");
  if (expand) {
    const count = await locator.count();
    for (let index = 0; index < count; index++) {
      const toggle = locator.nth(index).locator('[data-disclosure-row][aria-expanded]').first();
      if (await toggle.count() && await toggle.getAttribute("aria-expanded") !== "true") {
        await toggle.click();
        await toggle.waitFor({ state: "visible" });
      }
    }
  }
  return locator.evaluateAll(cards => cards.map((card, index) => {
    const ioValue = labelText => {
      const label = [...card.querySelectorAll("span")]
        .find(element => (element.textContent ?? "").trim() === labelText);
      if (!label?.parentElement) return null;
      return [...label.parentElement.children]
        .filter(element => element !== label)
        .map(element => element.textContent ?? "")
        .join("")
        .trim();
    };
    const summaryNode = card.querySelector("[data-disclosure-row]");
    return {
      index,
      tool: card.getAttribute("data-tool"),
      state: card.getAttribute("data-state"),
      callId: card.closest("[data-chat-call-id]")?.getAttribute("data-chat-call-id") ?? null,
      summary: (summaryNode?.textContent ?? card.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 500),
      input: ioValue("IN"),
      output: ioValue("OUT"),
    };
  }));
}

function validatePhaseCards(number, cards, expectedCalls) {
  assertEqual(cards.length, expectedCalls.length, `P${number} exact tool call count`);
  const previousIds = new Set(phaseEvidence.flatMap(phase => phase.cards.map(card => card.callId)));
  const currentIds = new Set();
  for (const [index, expected] of expectedCalls.entries()) {
    const card = cards[index];
    assert(card?.callId, `P${number} call ${index + 1} is missing callId`);
    assert(!previousIds.has(card.callId), `P${number} reused prior callId ${card.callId}`);
    assert(!currentIds.has(card.callId), `P${number} duplicated callId ${card.callId}`);
    currentIds.add(card.callId);
    assertEqual(card.tool, expected.tool, `P${number} call ${index + 1} tool order`);
    assertEqual(card.state, "ok", `P${number} ${card.tool} DSH execution state`);
    assert(typeof card.input === "string", `P${number} ${card.tool} did not expose expanded IN evidence`);
    assert(typeof card.output === "string" && card.output.length > 0, `P${number} ${card.tool} did not expose expanded OUT evidence`);
    let parsedInput;
    try {
      parsedInput = JSON.parse(card.input);
    } catch (error) {
      throw new Error(`P${number} ${card.tool} IN is not JSON: ${error.message}`);
    }
    assertDeepEqual(parsedInput, expected.args, `P${number} ${card.tool} exact arguments`);
    assertToolBusinessSuccess(number, card, expected);
  }
}

function assertToolBusinessSuccess(number, card, expected) {
  const args = expected.args;
  const output = card.output;
  const check = (condition, message) => assert(condition, `P${number} ${card.tool}: ${message}; OUT=${output.slice(0, 500)}`);
  for (const value of expected.outputIncludes ?? []) {
    check(output.includes(value), `OUT is missing ${JSON.stringify(value)}`);
  }
  for (const value of expected.outputExcludes ?? []) {
    check(!output.includes(value), `OUT unexpectedly contains ${JSON.stringify(value)}`);
  }
  if (card.tool === "autoqueue_batch_archive") {
    check(/成功 3，失败 0/.test(output), "batch result was not 3/3 successful");
    return;
  }
  if (new Set([
    "autoqueue_create_task", "autoqueue_update_task", "autoqueue_stop_task",
    "autoqueue_archive_task", "autoqueue_restore_task", "autoqueue_delete_task",
    "autoqueue_rerun_task", "autoqueue_mark_read", "autoqueue_update_config",
    "autoqueue_force_scan", "autoqueue_set_concurrency",
  ]).has(card.tool)) {
    check(output.includes("✅"), "business result did not render success");
    return;
  }
  if (card.tool === "autoqueue_get_config") {
    const config = parseRenderedConfig(output);
    check(config.queueDir === EXPECTED_QUEUE_DIR, "config came from a different queueDir");
    for (const [field, value] of Object.entries(expected.expectedConfig ?? {})) {
      check(Object.is(config[field], value), `config ${field} expected ${JSON.stringify(value)}, got ${JSON.stringify(config[field])}`);
    }
    return;
  }
  if (card.tool === "autoqueue_get_options") {
    check(output.includes("严格隔离已启用"), "strict isolation was not rendered");
    return;
  }
  if (card.tool === "autoqueue_get_task") {
    check(output.includes(args.key) && !output.includes("查询失败"), "task lookup did not return the requested task");
    return;
  }
  if (card.tool === "autoqueue_list_tasks") {
    check(output.includes("队列中"), "list result was not rendered");
    return;
  }
  throw new Error(`P${number} unexpected tool reached business validator: ${card.tool}`);
}

async function getState(includeArchived = true) {
  return httpJson(`/api/queue/state?compact=1${includeArchived ? "&archived=1" : ""}`);
}

async function getConfig() {
  return httpJson("/api/queue/config");
}

async function getTask(key) {
  const body = await httpJson(`/api/queue/detail?key=${encodeURIComponent(key)}`);
  assert(body?.ok && body.task, `Task detail missing for ${key}`);
  return body.task;
}

async function httpJson(relativePath) {
  const target = new URL(relativePath, HOST_URL);
  const response = await fetch(target, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(Math.min(UI_TIMEOUT_MS, 30_000)),
  });
  const type = response.headers.get("content-type") ?? "";
  assert(type.toLowerCase().includes("application/json"), `HTTP ${response.status} was not JSON`);
  const body = await response.json();
  assert(response.ok, `HTTP ${response.status}: ${typeof body?.error === "string" ? body.error : "request failed"}`);
  return body;
}

async function httpMutation(relativePath, body) {
  const target = new URL(relativePath, HOST_URL);
  const response = await fetch(target, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Math.min(UI_TIMEOUT_MS, 30_000)),
  });
  const type = response.headers.get("content-type") ?? "";
  assert(type.toLowerCase().includes("application/json"), `HTTP ${response.status} was not JSON`);
  const value = await response.json();
  assert(response.ok, `HTTP ${response.status}: ${typeof value?.error === "string" ? value.error : "request failed"}`);
  return value;
}

async function cleanupFailedRun() {
  const evidence = {
    startedAt: new Date().toISOString(),
    ownership: { armed: cleanupOwnershipArmed, aiHostCoupled, configMutationArmed },
    tasks: [],
    config: {},
    errors: [],
  };
  if (!cleanupOwnershipArmed || !aiHostCoupled) {
    evidence.skipped = "No mutation-safe ownership proof; cleanup intentionally performed no writes";
    evidence.finishedAt = new Date().toISOString();
    await writeJson("failure-cleanup.json", evidence).catch(() => {});
    return;
  }
  const recordError = (scope, error) => {
    evidence.errors.push({
      scope,
      message: error instanceof Error ? error.message : String(error),
    });
  };
  const action = async (kind, key) => {
    const result = await httpMutation("/api/queue/action", {
      requestId: `live-cleanup-${randomUUID()}`,
      action: { kind, key },
    });
    assert(result?.ok !== false, `${kind} ${key} failed: ${result?.error ?? "unknown error"}`);
    return result;
  };
  const stateTask = async key => findTask(await getState(true), key) ?? null;
  const ownedDetail = async key => {
    const task = await getTask(key);
    assert(
      typeof task.body === "string" && task.body.includes(ownershipMarker),
      `refusing cleanup for unowned task body: ${key}`,
    );
    const createdAt = Date.parse(task.createdAt);
    assert(
      Number.isFinite(createdAt) && createdAt >= runStartedAt - 5_000,
      `refusing cleanup for task created before this run: ${key}`,
    );
    return task;
  };

  for (const key of Object.values(keys)) {
    const taskEvidence = { key, actions: [] };
    evidence.tasks.push(taskEvidence);
    try {
      let task = await stateTask(key);
      taskEvidence.initial = sanitizeTask(task);
      if (!task || task.archivedAt) {
        taskEvidence.final = sanitizeTask(task);
        continue;
      }
      await ownedDetail(key);
      if (task.status === "running") {
        await ownedDetail(key);
        await action("stop", key);
        taskEvidence.actions.push("stop");
        const deadline = Date.now() + Math.min(TASK_TIMEOUT_MS, 90_000);
        do {
          await new Promise(resolve => setTimeout(resolve, Math.max(250, Math.min(POLL_MS, 1_000))));
          task = await stateTask(key);
        } while (task?.status === "running" && Date.now() < deadline);
        assert(task?.status !== "running", `cleanup stop did not converge within 90s: ${key}`);
      }
      task = await stateTask(key);
      if (task && !task.archivedAt) {
        await ownedDetail(key);
        if (task.status === "pending") {
          await action("delete", key);
          taskEvidence.actions.push("delete");
        } else if (["done", "failed", "stopped", "interrupted"].includes(task.status)) {
          await action("archive", key);
          taskEvidence.actions.push("archive");
        } else {
          throw new Error(`cleanup does not recognize status ${task.status}: ${key}`);
        }
      }
      taskEvidence.final = sanitizeTask(await stateTask(key));
    } catch (error) {
      recordError(`task:${key}`, error);
      taskEvidence.error = error instanceof Error ? error.message : String(error);
      taskEvidence.final = sanitizeTask(await stateTask(key).catch(() => null));
    }
  }

  if (configMutationArmed && baselineRestoreConfig) {
    try {
      evidence.config.restored = await httpMutation("/api/queue/config", baselineRestoreConfig);
    } catch (error) {
      recordError("config", error);
    }
  }
  if (configMutationArmed && Number.isInteger(baselineConcurrencyForCleanup)) {
    try {
      const result = await httpMutation("/api/queue/action", {
        requestId: `live-cleanup-${randomUUID()}`,
        action: { kind: "set-concurrency", maxConcurrent: baselineConcurrencyForCleanup },
      });
      assert(result?.ok !== false, `set-concurrency cleanup failed: ${result?.error ?? "unknown error"}`);
      evidence.config.maxConcurrent = baselineConcurrencyForCleanup;
    } catch (error) {
      recordError("concurrency", error);
    }
  }
  try {
    const finalRawState = await getState(true);
    evidence.finalState = summarizeState(finalRawState);
    evidence.finalConfig = await getConfig();
    if (configMutationArmed && baselineRestoreConfig) {
      assertDeepEqual(
        pickFields(evidence.finalConfig, WRITABLE_CONFIG_FIELDS),
        baselineRestoreConfig,
        "failure cleanup writable config restoration",
      );
    }
    if (configMutationArmed && Number.isInteger(baselineConcurrencyForCleanup)) {
      assertEqual(
        evidence.finalState.config?.maxConcurrent,
        baselineConcurrencyForCleanup,
        "failure cleanup concurrency restoration",
      );
    }
    const activeOwned = (finalRawState.tasks ?? []).filter(task =>
      Object.values(keys).includes(task.key) && !task.archivedAt &&
      ["pending", "running"].includes(task.status),
    );
    assert(activeOwned.length === 0, `failure cleanup left active owned tasks: ${activeOwned.map(task => task.key).join(", ")}`);
  } catch (error) {
    recordError("final-state", error);
  }
  evidence.finishedAt = new Date().toISOString();
  await writeJson("failure-cleanup.json", evidence).catch(() => {});
  if (evidence.errors.length) {
    console.error(`LIVE_AI_MATRIX_CLEANUP_INCOMPLETE: ${evidence.errors.map(item => `${item.scope}: ${item.message}`).join("; ")}`);
  }
}

async function waitForTask(key, predicate, description) {
  const deadline = Date.now() + TASK_TIMEOUT_MS;
  let lastTask;
  let lastError;
  while (Date.now() < deadline) {
    try {
      lastTask = await getTask(key);
      if (predicate(lastTask)) return lastTask;
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
  }
  const suffix = lastError
    ? `; last error=${lastError.message}`
    : `; last task=${JSON.stringify(sanitizeTask(lastTask))}`;
  throw new Error(`Timed out waiting for ${description} (${key})${suffix}`);
}

function findTask(state, key) {
  return state?.tasks?.find(task => task.key === key);
}

function executionCount(task) {
  return Array.isArray(task?.executions) ? task.executions.length : 0;
}

function reportFileText(task) {
  return typeof task?.reports?.report === "string" ? task.reports.report : "";
}

function complexReportHasExpectedValues(task) {
  const report = reportFileText(task);
  return [
    complexMarker,
    fixtureNonce,
    "orderCount",
    "totalAmount",
    "50.00",
    "C-001",
    "Ada",
    "22.75",
    "C-002",
    "Linus",
    "7.25",
    "C-003",
    "Grace",
    "20.00",
  ].every(value => report.includes(value));
}

async function validateTaskIsolation(task, queueRunsDir) {
  assert(task && typeof task === "object", "Task detail is required for isolation validation");
  assert(ALLOWED_OWNED_PRESETS.has(task.agentPreset), `Unexpected Agent preset for ${task.key}: ${task.agentPreset}`);
  assert(task.workspace == null, `Task ${task.key} escaped the workspace isolation lock`);
  assert(task.model == null, `Task ${task.key} escaped the model isolation lock`);
  assert(task.sessionId == null, `Terminal task ${task.key} still owns a live sessionId`);
  assert(task.goalRef == null, `Terminal task ${task.key} still owns a live goalRef`);

  const runsReal = await realpath(queueRunsDir);
  const taskWorkDir = await validateOwnedDirectory(task.workDir, queueRunsDir, runsReal, `${task.key}.workDir`);
  const executions = Array.isArray(task.executions) ? task.executions : [];
  assert(executions.length > 0, `Task ${task.key} has no execution records`);
  const executionEvidence = [];
  for (const [index, execution] of executions.entries()) {
    assert(
      typeof execution?.sessionId === "string" && OWNED_SESSION_ID_RE.test(execution.sessionId),
      `Task ${task.key} execution ${index} does not have an owned session ID`,
    );
    const executionWorkDir = await validateOwnedDirectory(
      execution.workDir,
      queueRunsDir,
      runsReal,
      `${task.key}.executions[${index}].workDir`,
    );
    executionEvidence.push({
      id: execution.id,
      sessionId: execution.sessionId,
      attempt: execution.attempt,
      startedAt: execution.startedAt,
      endedAt: execution.endedAt,
      result: execution.result,
      workDir: executionWorkDir,
    });
  }
  const lastExecution = executionEvidence.at(-1);
  assertEqual(task.lastSessionId, lastExecution.sessionId, `${task.key} lastSessionId`);
  assertEqual(taskWorkDir, lastExecution.workDir, `${task.key} latest workDir`);
  assert(
    new Set(executionEvidence.map(execution => execution.sessionId)).size === executionEvidence.length,
    `Task ${task.key} reused an owned session ID across attempts`,
  );
  assert(
    new Set(executionEvidence.map(execution => execution.workDir)).size === executionEvidence.length,
    `Task ${task.key} reused an owned workDir across attempts`,
  );
  return {
    queueRunsDir: runsReal,
    workDir: taskWorkDir,
    agentPreset: task.agentPreset,
    lastSessionId: task.lastSessionId,
    executions: executionEvidence,
  };
}

async function validateOwnedDirectory(candidate, lexicalRunsDir, realRunsDir, label) {
  assert(typeof candidate === "string" && path.isAbsolute(candidate), `${label} must be an absolute path`);
  const lexical = path.resolve(candidate);
  assertPathWithin(path.resolve(lexicalRunsDir), lexical, label);
  const info = await lstat(lexical);
  assert(info.isDirectory() && !info.isSymbolicLink(), `${label} must be a real directory`);
  const canonical = await realpath(lexical);
  assertPathWithin(realRunsDir, canonical, `${label} real path`);
  return canonical;
}

async function validateComplexWorkDir(task, queueRunsDir, isolation = undefined) {
  const checkedIsolation = isolation ?? await validateTaskIsolation(task, queueRunsDir);
  const workDir = checkedIsolation.workDir;
  const [orders, customers, nonce, summary] = await Promise.all([
    readOwnedUtf8(workDir, "orders.csv"),
    readOwnedUtf8(workDir, "customers.json"),
    readOwnedUtf8(workDir, "nonce.txt"),
    readOwnedUtf8(workDir, "deliverable/summary.json"),
  ]);

  const orderLines = orders.text.trim().split(/\r?\n/);
  assertEqual(orderLines.shift(), "order_id,customer_id,amount", "orders.csv header");
  assertDeepEqual(
    orderLines.map(line => line.split(",")),
    expectedOrders,
    "orders.csv rows",
  );
  let parsedCustomers;
  let parsedSummary;
  try {
    parsedCustomers = JSON.parse(customers.text);
  } catch (error) {
    throw new Error(`customers.json is invalid JSON: ${error.message}`);
  }
  try {
    parsedSummary = JSON.parse(summary.text);
  } catch (error) {
    throw new Error(`deliverable/summary.json is invalid JSON: ${error.message}`);
  }
  assertDeepEqual(parsedCustomers, expectedCustomers, "customers.json");
  assertEqual(nonce.text.trim(), fixtureNonce, "nonce.txt");
  assertDeepEqual(parsedSummary, expectedComplexSummary, "deliverable/summary.json schema and values");
  assert(complexReportHasExpectedValues(task), "执行报告.md is missing exact complex-task values");

  return {
    workDir,
    files: {
      orders: fileEvidence(orders, true),
      customers: fileEvidence(customers, true),
      nonce: fileEvidence(nonce, true),
      summary: { ...fileEvidence(summary, false), json: parsedSummary },
    },
  };
}

async function readOwnedUtf8(workDir, relativeName) {
  assert(!path.isAbsolute(relativeName), `Owned file path must be relative: ${relativeName}`);
  const target = path.resolve(workDir, relativeName);
  assertPathWithin(workDir, target, relativeName);
  const info = await lstat(target);
  assert(info.isFile() && !info.isSymbolicLink(), `Owned artifact must be a regular file: ${relativeName}`);
  assert(info.size <= 1024 * 1024, `Owned artifact exceeds 1 MiB: ${relativeName}`);
  const canonical = await realpath(target);
  assertPathWithin(workDir, canonical, `${relativeName} real path`);
  const buffer = await readFile(canonical);
  assert(buffer.length === info.size, `Owned artifact changed while being read: ${relativeName}`);
  return {
    relativePath: relativeName,
    bytes: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    text: buffer.toString("utf8"),
  };
}

function assertPathWithin(base, candidate, label) {
  const relative = path.relative(base, candidate);
  assert(
    relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
    `${label} escapes the owned queue runs directory`,
  );
}

function fileEvidence(file, includeText) {
  return {
    relativePath: file.relativePath,
    bytes: file.bytes,
    sha256: file.sha256,
    ...(includeText ? { content: boundedTextEvidence(file.text, 8_192) } : {}),
  };
}

function boundedTaskEvidence(task, isolation) {
  return {
    key: task.key,
    status: task.status,
    attempts: task.attempts,
    blockedResumes: task.blockedResumes,
    readAt: task.readAt,
    archivedAt: task.archivedAt,
    updatedAt: task.updatedAt,
    workspace: task.workspace,
    model: task.model,
    agentPreset: task.agentPreset,
    workDir: task.workDir,
    lastSessionId: task.lastSessionId,
    isolation,
    executions: (task.executions ?? []).map(execution => ({
      id: execution.id,
      sessionId: execution.sessionId,
      attempt: execution.attempt,
      startedAt: execution.startedAt,
      endedAt: execution.endedAt,
      result: execution.result,
      workDir: execution.workDir,
    })),
    reports: {
      result: boundedTextEvidence(task.reports?.result),
      report: boundedTextEvidence(task.reports?.report),
    },
  };
}

function boundedTextEvidence(value, limit = 16_384) {
  if (typeof value !== "string") return null;
  return {
    text: value.slice(0, limit),
    chars: value.length,
    bytes: Buffer.byteLength(value),
    truncated: value.length > limit,
  };
}

function sanitizeTask(task) {
  if (!task) return null;
  return {
    key: task.key,
    status: task.status,
    stopPending: task.stopPending,
    foregroundPaused: task.foregroundPaused,
    attempts: task.attempts,
    executions: executionCount(task),
    readAt: task.readAt,
    archivedAt: task.archivedAt,
    updatedAt: task.updatedAt,
    reportChecks: {
      simpleMarker: reportFileText(task).includes(simpleMarker),
      simpleResult1517: /(^|\D)1517(\D|$)/.test(reportFileText(task)),
      complexValues: complexReportHasExpectedValues(task),
    },
  };
}

function summarizeState(state) {
  return {
    revision: state?.revision,
    config: state?.config,
    runtime: state?.runtime,
    metrics: state?.metrics,
    tasks: (state?.tasks ?? [])
      .filter(task => Object.values(keys).includes(task.key))
      .map(sanitizeTask),
  };
}

async function screenshot(name) {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, `${name}.png`), fullPage: true });
}

async function writeJson(name, value) {
  await mkdir(ARTIFACT_DIR, { recursive: true });
  await writeFile(path.join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function browserLaunchOptions() {
  const configured = process.env.AUTOQUEUE_LIVE_CHROME;
  const conventional = "/usr/bin/google-chrome-stable";
  const executablePath = configured || (existsSync(conventional) ? conventional : undefined);
  return {
    headless: process.env.AUTOQUEUE_LIVE_HEADED !== "1",
    ...(executablePath ? { executablePath } : {}),
  };
}

function parseHostUrl(raw) {
  const value = new URL(raw);
  assert(["http:", "https:"].includes(value.protocol), "AUTOQUEUE_LIVE_URL must use HTTP(S)");
  assert(!value.username && !value.password, "AUTOQUEUE_LIVE_URL must not contain credentials");
  assert(!value.search && !value.hash, "AUTOQUEUE_LIVE_URL must not contain query or fragment");
  assert(
    isLoopbackHostname(value.hostname) || process.env.AUTOQUEUE_LIVE_ALLOW_REMOTE === "1",
    "AUTOQUEUE_LIVE_URL must be loopback unless AUTOQUEUE_LIVE_ALLOW_REMOTE=1 is explicitly set",
  );
  const effectivePort = value.port || (value.protocol === "https:" ? "443" : "80");
  assert(!["3080", "3210"].includes(effectivePort), `Refusing forbidden live port ${effectivePort}`);
  value.pathname = value.pathname.replace(/\/+$/, "") || "/";
  return value;
}

function validateKeys(value) {
  const all = Object.values(value);
  assert(new Set(all).size === all.length, "Live task keys must be unique");
  for (const key of all) {
    assert(typeof key === "string" && key.length > 0 && key.length <= 200, `Invalid live task key: ${key}`);
  }
}

function assertKeysAbsent(state) {
  const present = Object.values(keys).filter(key => findTask(state, key));
  assert(
    present.length === 0,
    `Refusing to reuse task keys already present (including archived): ${present.join(", ")}`,
  );
}

function isLoopbackHostname(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1") return true;
  const octets = normalized.split(".");
  return octets.length === 4
    && octets[0] === "127"
    && octets.every(octet => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
}

function requireQueueRunsDir(queueDir) {
  assert(typeof queueDir === "string" && queueDir.trim(), "Live Host config did not expose queueDir");
  return path.resolve(queueDir, "runs");
}

function requiredAbsolutePathEnv(name) {
  const raw = process.env[name];
  assert(typeof raw === "string" && raw.trim(), `${name} is required for destructive live testing`);
  assert(path.isAbsolute(raw), `${name} must be an absolute path`);
  return path.resolve(raw);
}

function parseRenderedConfig(output) {
  assert(typeof output === "string", "Expanded autoqueue_get_config OUT is missing");
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  assert(start >= 0 && end > start, "Expanded autoqueue_get_config OUT did not contain JSON");
  let value;
  try {
    value = JSON.parse(output.slice(start, end + 1));
  } catch (error) {
    throw new Error(`Expanded autoqueue_get_config OUT is invalid JSON: ${error.message}`);
  }
  assert(value && typeof value === "object" && !Array.isArray(value), "Rendered config must be an object");
  return value;
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function intEnv(name, fallback, minimum) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  assert(Number.isSafeInteger(value) && value >= minimum, `${name} must be an integer >= ${minimum}`);
  return value;
}

function pickDefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function pickFields(value, fields) {
  return pickDefined(Object.fromEntries(fields.map(field => [field, value?.[field]])));
}

function assertEqual(actual, expected, label) {
  assert(Object.is(actual, expected), `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertDeepEqual(actual, expected, label) {
  assert(
    isDeepStrictEqual(actual, expected),
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

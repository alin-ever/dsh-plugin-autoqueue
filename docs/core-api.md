# autoqueue 核心层 API

核心层是纯逻辑模块，不依赖 DSH 运行时。上层（HTTP、AI 工具、视图）都通过它操作队列。

## 模块

| 模块 | 文件 | 职责 |
|---|---|---|
| files | `lib/files.js` | 文件 I/O、调度解析 |
| ledger | `lib/ledger.js` | 任务账本（持久化状态机） |
| runner | `lib/runner.js` | 会话生命周期（创建/轮询/干预/归档） |
| engine | `lib/engine.js` | 编排层（派发/轮询/动作/配置） |

---

## engine — 编排层

### `createEngine(apiProxy, options)`

创建引擎实例。所有上层操作都通过返回的 `engine` 对象。

**参数**

| 参数 | 类型 | 说明 |
|---|---|---|
| `apiProxy` | object | DSH ctx.apiProxy |
| `options` | object | 全局默认配置 |

**options 默认值**

| 字段 | 默认 | 说明 |
|---|---|---|
| `maxGoalRounds` | 40 | goal 最大轮数 |
| `maxBlockedResumes` | 3 | 最大反阻塞次数 |
| `autoArchive` | false | 完成后自动归档 |
| `stallThreshold` | 10 | 停滞检测阈值 |
| `unknownThreshold` | 3 | 未知状态阈值 |
| `maxAttempts` | 3 | 最大重试次数 |

---

### engine.snapshot(includeArchived)

获取队列快照。

```js
const snap = engine.snapshot();
// { revision, tasks: [...], config: { maxConcurrent } }

const snap = engine.snapshot(true);
// 包含归档任务
```

---

### engine.getConfig() / engine.setConfig(patch)

获取/更新运行时配置。

```js
engine.setConfig({ maxGoalRounds: 50, autoArchive: true });
```

---

### engine.applyAction(action, requestId)

统一动作入口。

```js
// 停止任务
await engine.applyAction({ kind: "stop", key: "daily-report" }, "req-001");

// 创建任务
await engine.applyAction({ kind: "create", key: "daily-report", content: "..." }, "req-002");
```

---

### engine.scanPending() / engine.pollRunning()

手动触发扫描/轮询（通常由定时器调用）。

---

## ledger — 账本

### `loadLedger()` → `LedgerEntry[]`

加载所有任务条目。

### `findByKey(key)` → `LedgerEntry | undefined`

按 key 查找任务。

### `upsertEntry(key, patch)` → `LedgerEntry`

原子写入/更新任务条目。

### `removeEntry(key)` → `boolean`

删除任务条目。

### `snapshot()` → `{ revision, tasks, config }`

获取当前账本快照。

### `checkRequest(requestId, action)` → `boolean`

去重检查，防止重复执行。

### `flushLedger()`

立即刷盘（同步写入文件）。

### `getConcurrency()` / `setConcurrency(n)`

获取/设置并发上限。

### `runningCount()` → `number`

当前 running 状态的任务数。

---

## runner — 会话驱动

### `createRunner(apiProxy, options)` → runner

创建 runner 实例。

### runner.launch(entry)

启动任务：创建会话 → 重命名 → 投递 prompt → 挂 goal。

**返回** `{ sessionId, goalRef, workspaceId? }`

### runner.pollTask(entry)

轮询 goal 状态，返回 `{ phase, ... }`。

### runner.antiBlock(entry)

反阻塞：steering + resume goal。

### runner.wakeup(sessionId, goalRef)

唤醒：系统恢复后重新激活会话。

### runner.cancelTask(sessionId, goalRef)

取消任务：清除 goal + 取消 session。

### runner.cancelSession(sessionId)

取消单个 session。

### runner.archiveSessions(entry)

归档任务关联的所有 DSH 会话。

### runner.isTimeout(startedAt) → boolean

检查任务是否超时。

---

## files — I/O

### `listTaskFiles()` → `TaskFile[]`

扫描收件箱，返回所有 `.md` 任务文件。

### `readTaskFile(key)` → `TaskFile | undefined`

读取单个任务文件。

### `removeTaskFile(key)`

删除收件箱文件。

### `writeTaskFile(key, content)`

写入任务文件。

### `createRunDir(key)` → `string`

为任务创建运行目录，返回 workDir。

### `ensureRunDir(workDir)`

确保运行目录存在。

### `writeTaskCopy(workDir, body)`

写入任务副本到运行目录。

### `writeReport(workDir, report)`

写入执行报告。

### `writeGoalSnapshot(workDir, objective)`

写入目标快照。

### `writeResult(workDir, result)`

写入结果 JSON。

### `parseSchedule(raw)` → `{ schedule?, cron?, deadline? }`

解析文件头调度声明。

### `matchCron(cron)` → boolean

检查当前时间是否匹配 cron 表达式。

### `atomicWrite(file, content)`

原子写入（tmp + rename + fsync）。

---

## ai-tool — AI 工具

### `registerAiTool(ctx, baseUrl)`

注册 9 个 AI 工具 + 系统提示。

**工具列表**

| 工具 | 说明 |
|---|---|
| `autoqueue_create_task` | 创建任务 |
| `autoqueue_list_tasks` | 列出任务 |
| `autoqueue_get_task` | 查看详情 |
| `autoqueue_update_task` | 更新配置 |
| `autoqueue_stop_task` | 停止任务 |
| `autoqueue_archive_task` | 归档任务 |
| `autoqueue_restore_task` | 还原归档 |
| `autoqueue_delete_task` | 删除待执行任务 |
| `autoqueue_rerun_task` | 重跑任务 |

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

**options:**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `maxGoalRounds` | number | 40 | 单个任务最多 goal 轮数 |
| `maxBlockedResumes` | number | 3 | 阻塞后最多重试次数 |
| `autoArchive` | boolean | false | 全局默认：done/failed 是否自动归档 |
| `unknownThreshold` | number | 3 | 连续 unknown 轮数阈值，判定任务不可达 |
| `maxAttempts` | number | 3 | 派发失败重试次数 |
| `agentPreset` | string\|null | null | 全局默认 Agent 预设 |
| `model` | string\|null | null | 全局默认执行模型 |
| `priority` | number | 5 | 全局默认优先级 1-10 |
| `webhook` | string\|null | null | 全局 webhook URL |
| `workspace` | string\|null | null | DSH 工作区 UUID |
| `queueDir` | string\|null | null | 队列根目录，默认 `$DSH_HOME/queue` |

**返回:**

```js
const engine = {
  // 快照
  snapshot(includeArchived),
  // 配置
  getConfig(),
  setConfig(patch),
  // 任务操作
  createTask(requestId, key, content, opts),
  applyAction(requestId, action, key, opts),
  // 详情
  getTaskDetail(key),
  // 生命周期
  startScanning(timer, intervalMs),
  startPolling(timer),
}
```

---

### `engine.createTask(requestId, key, content, opts)`

创建任务并写入收件箱和账本，立即尝试派发。

**参数:**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `requestId` | string | 是 | 去重 ID |
| `key` | string | 是 | 唯一任务标识 |
| `content` | string | 是 | Markdown 任务内容 |
| `opts` | object | 否 | 可选配置 |

**opts:**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `priority` | number | 5 | 优先级 1-10，越高越先派发 |
| `schedule` | string | - | ISO 8601 一次性定时，如 `2026-08-26T08:00:00Z` |
| `cron` | string | - | cron 表达式循环定时，如 `0 8 * * *` |
| `webhook` | string | - | 任务级 webhook URL |
| `workspace` | string | - | 任务级工作区 UUID |
| `agentPreset` | string | - | 指定 Agent 预设 |
| `maxGoalRounds` | number | - | 任务级 goal 轮数上限 |
| `maxBlockedResumes` | number | - | 任务级阻塞重试上限 |
| `timeoutMs` | number | - | 任务级超时毫秒 |
| `autoArchive` | boolean | - | 任务级自动归档，覆盖全局配置 |
| `deadline` | string | - | 5 字段 cron 截止时间 |
| `maxAttempts` | number | - | 任务级派发重试次数，覆盖全局 |

**返回:**

```json
{ "ok": true, "key": "my-task" }
```

**调度方式:**

| 方式 | 格式 | 示例 | 行为 |
|---|---|---|---|
| 不传 | - | - | 立即执行 |
| `schedule` | ISO 8601 | `2026-08-26T08:00:00Z` | 到时间执行一次 |
| `cron` | 5 字段 | `0 8 * * *` | 每次匹配时执行 |

**cron 常用示例:**

| cron | 含义 |
|---|---|
| `0 8 * * *` | 每天 08:00 |
| `0 8 * * 1-5` | 工作日 08:00 |
| `0 8 * * 1` | 每周一 08:00 |
| `0 8 1 * *` | 每月 1 日 08:00 |
| `*/30 * * * *` | 每 30 分钟 |
| `0 * * * *` | 每小时整点 |
| `0 */2 * * *` | 每 2 小时 |
| `0 8,20 * * *` | 每天 08:00 和 20:00 |
| `0 9-17 * * 1-5` | 工作日 9-17 点整点 |
| `*/5 9-17 * * 1-5` | 工作日 9-17 点每 5 分钟 |

---

### `engine.applyAction(requestId, action, key, opts)`

对任务执行操作。异步方法。

**action:**

| action | 说明 | 前置条件 |
|---|---|---|
| `stop` | 停止运行中任务 | status=running |
| `archive` | 归档任务 + 归档 DSH 会话 | status≠running |
| `restore` | 恢复归档任务 | 已归档 |
| `delete` | 永久删除待执行任务及记录 | status=pending |
| `rerun` | 重跑失败/已停止任务 | status=failed/stopped |
| `update` | 修改任务内容/配置 | status≠running |
| `force-scan` | 立即扫描收件箱 | 无 |
| `set-concurrency` | 调整并发数 | 无 |

**批量归档:**

```json
{
  "requestId": "x",
  "action": { "kind": "archive", "keys": ["a", "b", "c"] }
}
```

**返回:**

```json
{ "ok": true }
// 批量归档:
{ "ok": true, "results": [{ "key": "a", "ok": true }, { "key": "b", "ok": false, "error": "运行中" }] }
```

---

### `engine.snapshot(includeArchived = false)`

获取任务列表快照。默认不包含已归档任务。

**返回:**

```json
{
  "revision": 13,
  "tasks": [{ "key": "...", "status": "running", ... }],
  "config": {
    "maxConcurrent": 2,
    "autoArchive": false,
    "webhook": null,
    "queueDir": null,
    "workspace": null
  }
}
```

---

### `engine.getConfig()` / `engine.setConfig(patch)`

读写运行时配置。

**setConfig 支持的字段:**

| 字段 | 类型 | 范围 |
|---|---|---|
| `maxGoalRounds` | number | 1-100 |
| `maxBlockedResumes` | number | 0-10 |
| `autoArchive` | boolean | 默认 false；true 时 done/failed 自动归档 |
| `unknownThreshold` | number | 1-10，默认 3；连续 poll 返回 unknown 触发 retry |
| `maxAttempts` | number | 1-10，默认 3；派发失败重试次数 |
| `agentPreset` | string\|null | Agent 预设名称 |
| `priority` | number | 1-10，默认 5；全局默认优先级 |
| `webhook` | string\|null | - |
| `workspace` | string\|null | - |
| `queueDir` | string\|null | - |
| `defaultDeadline` | string\|null | 全局截止时间 cron |

---

### `engine.getTaskDetail(key)`

获取任务详情，含执行记录和报告。

**返回:**

```json
{
  "ok": true,
  "task": {
    "key": "my-task",
    "status": "done",
    "archivedAt": null,
    "autoArchive": null,
    "maxAttempts": null,
    "priority": 5,
    "schedule": null,
    "cron": null,
    "deadline": null,
    "executions": [
      {
        "sessionId": "session-xxx",
        "startedAt": "2026-08-25T...",
        "endedAt": "2026-08-25T...",
        "result": "done",
        "error": null
      }
    ],
    "reports": {
      "goal": "目标: # 每日报告\n结果: done\n时间: ...",
      "result": "{ \"result\": \"done\", ... }",
      "report": "## 执行报告\n..."
    }
  }
}
```

---

## files — 文件 I/O

### 目录结构

```
$QUEUE_DIR/
├── tasks/           # 收件箱 .md 文件
├── runs/
│   └── YYYY-MM/     # 按月分组
│       └── key-ISO时间/
│           ├── .task.md
│           ├── .目标.md
│           ├── .结果.md
│           └── 执行报告.md
└── queue-ledger.json
```

### `setQueueDir(dir)`

设置队列根目录。必须在其他操作前调用。

### `getQueueDir()`

返回当前队列根目录。

### `getTasksDir()` / `getRunsDir()`

返回收件箱/运行目录路径。

### `listTaskFiles()`

扫描收件箱所有 `.md` 文件，自动解析调度声明。

**返回:**

```js
[
  {
    key: "my-task",       // 文件名去 .md
    path: "...",          // 完整路径
    raw: "...",           // 原始内容
    body: "...",          // 去调度声明的正文
    schedule: {           // 解析后的调度
      schedule: "2026-...", // ISO 时间
      cron: "0 8 * * *",   // cron 表达式
      deadline: "0 21 * * *" // 截止时间
    }
  }
]
```

### `readTaskFile(key)` / `removeTaskFile(key)` / `writeTaskFile(key, content)`

单个任务文件的读写删。注意：`readTaskFile` 当前未实现（内部使用 `readFileSync` 直接读取），`removeTaskFile` 和 `writeTaskFile` 可用。

### `createRunDir(key)`

创建运行目录，返回路径。

### `writeTaskCopy(workDir, body)` / `writeGoalSnapshot(workDir, content)` / `writeResult(workDir, content)`

向运行目录写入 `.task.md`（任务副本）、`.目标.md`（目标快照）、`.结果.md`（执行结果）。Agent 自行写入 `执行报告.md`。

### `matchCron(expr, now?)`

检查 cron 表达式是否匹配当前时间（本地时间，与 task-board 一致）。

**cron 格式:** 5 字段，空格分隔：`分 时 日 月 周`

| 字段 | 范围 | 说明 |
|---|---|---|
| 分 | 0-59 | |
| 时 | 0-23 | 本地时间 |
| 日 | 1-31 | |
| 月 | 1-12 | |
| 周 | 0-6 | 0=周日 |

**支持的语法:**

| 语法 | 示例 | 含义 |
|---|---|---|
| `*` | `* * * * *` | 每分钟 |
| 数字 | `0 8 * * *` | 每天 8:00 |
| `*/step` | `*/15 * * * *` | 每 15 分钟 |
| `a-b` | `0 9-17 * * 1-5` | 工作日 9-17 点整点 |
| 逗号 | `0 8,20 * * *` | 每天 8:00 和 20:00 |

---

## ledger — 任务账本

持久化到 `queue-ledger.json`，原子写入。

### 数据结构

```json
{
  "schemaVersion": 2,
  "revision": 13,
  "tasks": [
    {
      "key": "my-task",
      "status": "pending|running|done|failed|stopped|interrupted",
      "workDir": "C:\\...",
      "sessionId": "session-xxx",
      "goalRef": { "id": "...", "revision": 1 },
      "attempts": 1,
      "blockedResumes": 0,
      "executions": [{ "sessionId": "...", "startedAt": "...", "endedAt": "...", "result": "done|failed|stopped", "error": "..." }],
      "createdAt": "2026-...",
      "updatedAt": "2026-...",
      "archivedAt": "2026-...",
      "body": "# 任务内容",
      "raw": "<!-- cron: ... -->\n# 任务内容",
      "schedule": "2026-...",
      "cron": "0 8 * * *",
      "deadline": "0 21 * * *",
      "priority": 5,
      "webhook": "https://...",
      "workspace": "uuid",
      "agentPreset": "...",
      "autoArchive": null,
      "maxAttempts": null,
      "maxGoalRounds": 40,
      "maxBlockedResumes": 3,
      "timeoutMs": 5400000
    }
  ],
  "config": { "maxConcurrent": 2 },
  "recentRequests": [{ "requestId": "...", "fingerprint": "..." }]
}
```

### 任务状态机

```
pending ──→ running ──→ done
   │           │
   │           ├──→ failed
   │           │
   │           └──→ stopped
   │
   └──→ (archive: 手动归档 → archivedAt 打标 + 会话归档)
```

**归档规则：** 手动调用 archive action 时，归档任务列表并同步归档 DSH 会话。

**autoArchive 自动归档：** 全局配置 `autoArchive: true` 或单任务指定 `autoArchive: true` 时，done/failed 自动触发完整归档（列表隐藏 + 会话归档）。任务级优先于全局。

**工作区隔离：** 每个任务自动创建独立 DSH 工作区（`entry.workDir` 注册为 workspace），防止并发任务文件冲突。若创建时指定了 `workspace` 则使用指定的。

### 导出函数

| 函数 | 说明 |
|---|---|
| `loadLedger()` | 从磁盘加载账本 |
| `flushLedger()` | 强制写入磁盘 |
| `snapshot()` | 返回 `{ revision, tasks, config }` |
| `findByKey(key)` | 查找任务 |
| `upsertEntry(key, patch)` | 创建或更新任务 |
| `removeEntry(key)` | 删除任务 |
| `getConcurrency()` / `setConcurrency(n)` | 并发数 |
| `runningCount()` | 运行中任务数 |
| `markRead(key)` | 标记任务为已读 |
| `markUnread(key)` | 标记任务为未读 |
| `unreadCount()` | 未读任务数 |
| `checkRequest(requestId, meta)` | 请求去重 |

---

## runner — 会话生命周期

### `createRunner(apiProxy, options)`

**options:**

| 参数 | 默认 | 说明 |
|---|---|---|
| `maxGoalRounds` | 40 | |
| `maxBlockedResumes` | 3 | |
| `taskTimeoutMs` | 5400000 | 90 分钟 |
| `autoArchive` | false | 全局自动归档默认 |
| `agentPreset` | null | 全局 Agent 预设 |
| `model` | null | 全局执行模型 |
| `model` | null | 全局执行模型 |
| `priority` | 5 | 全局优先级 |
| `unknownThreshold` | 3 | 不可达检测阈值 |
| `maxAttempts` | 3 | 派发重试次数 |
| `webhook` | null | 全局 webhook |
| `workspace` | null | 默认工作区 |
| `queueDir` | null | 队列根目录 |
| `defaultDeadline` | null | 全局截止时间 |

**返回:**

```js
const runner = {
  launch(entry),           // 创建会话（自动创建独立 workspace）并启动
  pollTask(sessionId),     // 轮询状态
  antiBlock(sessionId, goalRef), // 发送解除阻塞提示
  wakeup(sessionId, goalRef),    // 重启后唤醒会话
  finalize(entry, result, error), // 写报告（done/failed）
  cancelTask(sessionId, goalRef),  // 取消运行中任务
  cancelSession(sessionId),       // 清理孤儿会话
  archiveSessions(entry),  // 归档该任务所有会话
  listSessions(),          // 列出所有活跃 session
  maxBlockedResumes,       // 配置值
  taskTimeoutMs,           // 配置值
}
```

### 轮询状态

`pollTask` 返回 goal 的 phase：

| phase | 含义 | 引擎行为 |
|---|---|---|
| `active` | 运行中 | agent 工作中，不做干预 |
| `complete` | 完成 | 调用 finalize，若 `autoArchive` 则归档 |
| `blocked` | 阻塞 | 调用 antiBlock，超限则标记失败 |

### 提示词

- **queue 模式:** 告诉 Agent "不要提问，先自己解决，记录 GAP 不等于失败"
- **anti-block 模式:** 告诉 Agent "换方案或记录 GAP 后继续"
- **wakeup 模式:** 恢复中断任务，重新发送 queue 提示词

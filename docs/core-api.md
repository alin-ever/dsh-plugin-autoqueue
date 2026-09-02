# autoqueue 核心层 API

本文描述 `files`、`ledger`、`runner`、`engine` 及 Host 装配边界。实现和测试逐项对照的精确基线是 **`@deepseek-ai/dsh 0.1.1-rc.2`**；清单虽允许 `>=0.1.1-rc.2 <0.1.2`，安全语义仍以 rc.2 为准。

## 1. 模块边界

| 模块 | 文件 | 职责 |
|---|---|---|
| files | `lib/files.js` | 私有目录、原子文件 I/O、任务 key/调度校验、收件箱和报告安全读取 |
| ledger | `lib/ledger.js` | 权威账本、schema/容量校验、原子事务、CAS generation、requestId 去重、并发和恢复 |
| runner | `lib/runner.js` | 唯一的 `apiProxy` 调用层；专属 session/goal 生命周期和 ownership 守卫 |
| engine | `lib/engine.js` | 扫描、派发、前台让行、轮询、反阻塞、重试、动作、配置和结算 |
| Host 入口 | `lib/index.js` | DSH 服务装配、approval policy、owned presets、HTTP/SSE、鉴权和可选 AI 工具 |

依赖方向是 `index/UI/AI → HTTP → engine → runner/ledger/files`。Host AI 工具是 HTTP 薄客户端，不能绕过 HTTP 校验直接调用 engine 或 ledger。

## 2. 不可破坏的隔离不变量

### 2.1 Session ownership

- `createAutoqueueSessionId()` 只生成 `autoqueue-session-<uuid>`。
- `isAutoqueueSessionId()` 同时校验固定前缀和 UUID 形状。
- runner 对 history、prompt、goal 变更、cancel 和 archive 先校验 ownership。
- 批量归档先验证全部 session ID；只要出现一个外部 ID，整批远端 mutation fail closed。

### 2.2 独立 cwd

每次 attempt 都创建新的 `runs/YYYY-MM/...-a<attempt>-<random>/`。启动只使用：

```js
apiProxy.sessions.create({
  sessionId: reservedSessionId,
  cwd: entry.workDir,
  agentPreset: engineSelectedOwnedPreset,
})
```

其中 preset 是引擎内部派生值，不是调用参数。runner 不创建或选择 Host 全局工作区。

### 2.3 Versioned owned presets

引擎只能选择：

- `autoqueue-unattended-v2`
- `autoqueue-ptc-unattended-v2`

`ensureOwnedPreset()` 从 Host 内置来源复制首次版本，并注入 `[autoqueue:unattended-discipline:v2]` 与完整无人值守纪律。v2 的可收口约束是：

- 直接禁用 `tool-ask-user`、`tool-jobs`、`tool-subagent-control`、`tool-subagent-list-agents`、`tool-subagent`、`tool-subagent-fork`、`tool-subagent-codex`、`tool-subagent-claude-code`、`tool-workflow`、`tool-ralph`。
- `tool-bash` 与 `tool-pwsh` 必须配置 `enableRunInBackground: false`。
- persona 明确禁止 detached、daemon、background-job、workflow、Ralph 和 child-agent 工作；命令必须在当前 owned foreground turn 内完成。

原因是这些高扇出/后台工作不会继承 autoqueue owned session ID，Host 前台抢占时无法可靠 pause/cancel。已存在的 v2 只有在 marker、工具禁用、shell 配置和纪律都精确匹配时才接受；缺失或被修改会 fail closed。旧 v1 preset 保留在 Host 上且绝不覆盖，但 runner 的 allowlist 只接受 v2。

### 2.4 Approval policy before goal

`index.apply()` 强制把 runner 的 `prepareSession` 绑定到 `pinOwnedSessionApprovalPolicy()`，不接受调用方替换：

1. 校验 session 属于 autoqueue。
2. 通过同进程 session store 取到完全相同的 session。
3. `setApprovalPolicy(session, "never")`。
4. `sessions.flush(session)` 持久化。
5. `effectiveApprovalPolicy(session.events)` 必须回读为 `never`。

runner 在 `sessions.create` / `sessions.rename` 之后、`goals.create` 之前执行该步骤。任何失败都会阻止 goal admission，并尝试取消刚创建的专属 session。恢复、反阻塞、唤醒和 resume 前也会再次确保 session 已准备；Host 重启后的新 runner 不沿用进程内缓存。

### 2.5 Host selection locks

DSH rc.2 的选择接口会持久化 Host 默认状态。核心层通过 `assertNoIsolationOverrides()` 在 engine 构造、任务创建、任务更新和运行时配置更新边界拒绝这类覆盖；HTTP schema 也不接受这些字段。内部遗留账本值可以被读取用于迁移诊断，但不能驱动执行。

### 2.6 Foreground cooperative yield

`engine._hostAllowsDispatch()` 通过 `runner.listSessions()` 判断 Host 是否可用：

- 发现活跃且不属于 autoqueue 的 session：返回 `false`。
- RPC 失败、列表缺失或 item 形状不可信：`known=false`，返回 `false`。
- 只有列表可信且没有活跃前台 session 时才允许新派发、重试 replacement、wakeup 或 anti-block mutation。

已经运行的 owned task 由 `pollRunning()` 协作暂停：

1. 先持久化 `_foregroundPausePending` 和当前 ownership generation。
2. `runner.pauseGoal()` 调用 `goals.pause`，处理 stale revision 和不确定响应。
3. 先持久化 paused ref、`_foregroundPaused` 与 `_foregroundCancelPending`，再取消当前 turn；绝不 cancel 一个仍 armed 的 goal。
4. 在 `sessions.list` 明确报告该 owned session `running=false` 前，保留 cancel-pending 并重试。
5. 前台消失后先检查 history，再做第二次紧邻 resume 的可信 session list；两次都空闲且 owned turn 仍 idle 才 `goals.resume`。
6. resume 不注入 prompt；恢复后原子清除 foreground markers。

列表未知同样进入 pause 路径。默认并发仍是 1。整个流程只 pause/cancel autoqueue 自有 session，不修改用户会话。

## 3. `createEngine(apiProxy, options)`

### 安全业务选项

| 选项 | 默认值 | 说明 |
|---|---|---|
| `maxGoalRounds` | `40` | 每个 Goal 最大轮数 |
| `maxBlockedResumes` | `3` | blocked 后 steering + resume 上限 |
| `autoArchive` | `true` | terminal 后默认自动归档 |
| `unknownThreshold` | `3` | 连续不可达阈值 |
| `maxAttempts` | `3` | attempt 上限 |
| `taskTimeoutMs` | `10800000` | 180 分钟，允许 10 分钟至 24 小时 |
| `priority` | `5` | 默认优先级 1-10 |
| `webhook` | `null` | 默认终态 Webhook |
| `queueDir` | `null` | 启动时队列根目录；运行时不可切换 |
| `defaultDeadline` | `null` | 默认 5 字段截止 cron |
| `enableNotifications` | `false` | 浏览器终态通知默认关闭 |
| `retryBackoffBaseMs` | `30000` | 重试退避基数 |
| `retryBackoffMaxMs` | `300000` | 重试退避上限 |
| `rpcTimeoutMs` | `30000` | runner RPC 等待上限，钳位 1-120 秒 |

`prepareSession` 是 Host 入口注入的内部安全回调，不是配置 API 字段。

### 返回对象

```js
const engine = {
  snapshot(includeArchived),
  getConfig(),
  setConfig(patch),
  createTask(requestId, key, content, opts),
  applyAction(requestId, action, key, opts),
  getTaskDetail(key),
  scanPending(),
  pollRunning(),
  retryExecution(entry, reason),
  stopTask(key),
  archiveTask(key),
  archiveTasks(keys),
  restoreTask(key),
  deleteTask(key),
  updateTask(key, patch),
  startScanning(timer, intervalMs),
  startPolling(timer),
  dispose(),
}
```

## 4. 任务创建与更新

### `engine.createTask(requestId, key, content, opts)`

安全 `opts`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `priority` | integer 1-10 | 越高越先派发 |
| `schedule` | ISO 8601 string | 一次性调度，与 cron 互斥 |
| `cron` | 5-field cron | 循环调度，与 schedule 互斥 |
| `deadline` | 5-field cron | 截止窗口 |
| `maxGoalRounds` | integer 1-100 | 任务级轮数 |
| `maxBlockedResumes` | integer 0-10 | 任务级反阻塞上限 |
| `timeoutMs` | integer | 600000-86400000 |
| `maxAttempts` | integer 1-10 | attempt 上限 |
| `webhook` | string/null | 终态回调 |
| `autoArchive` | boolean | 覆盖全局自动归档 |
| `enableNotifications` | boolean | 覆盖全局浏览器通知 |

创建顺序：校验/预留 requestId → 生成唯一 key → 原子写收件箱 → 原子写账本 → 完成 requestId → 触发一次 `scanPending()`。若账本事务失败，会回滚本次创建的收件箱文件。

### `engine.updateTask(key, patch)`

只允许更新未归档的 `pending` 任务。字段范围与 HTTP update 相同：正文、调度、优先级、轮数、反阻塞、超时、尝试、Webhook、自动归档和通知；`maxGoalRounds`、`maxBlockedResumes`、`timeoutMs`、`maxAttempts` 传 `null` 可恢复全局默认。收件箱文件先原子更新，账本事务若失败会恢复旧文件。

## 5. 动作层

### `engine.applyAction(requestId, action, key, opts)`

| action | 前置条件 | 核心行为 |
|---|---|---|
| `stop` | running | 持久化 stop intent，提交 owned cancel；双重权威 idle 后 finalize stopped |
| `archive` | 非 running | archive owned sessions，设置 `archivedAt` |
| `restore` | 已归档 | 清除 `archivedAt` |
| `delete` | pending | 删除收件箱与账本项 |
| `rerun` | 非 running、未归档 | 回到 pending 并重新创建收件箱源 |
| `update` | pending、未归档 | 调用 `updateTask` |
| `force-scan` | 无 | 立即 `scanPending` |
| `set-concurrency` | 1-8 | 调用 ledger `setConcurrency` |

`archive` 支持 `opts.keys` 1-100 个任务并逐项返回结果。requestId 使用 fingerprint 区分同 ID 同操作、inflight 重复和冲突复用。

`stop` 返回 `{ ok:true, accepted:true, pending:true }` 只表示异步停止意图已持久接纳；pending 任务必须走 `delete`。`_cancelAccepted` 仅由 DSH cancel 的明确 `true` 回执设置，并绑定当时的 goal ref/ledger revision；之后两次因果上更晚的可信 idle/缺席观察才允许释放 ownership。重启、running 回弹或新 goal ref 都会保留/重置证明并继续 containment。

## 6. 快照、详情与配置

### `engine.snapshot(includeArchived = false)`

返回：

```js
{
  revision,
  tasks,
  runtime: {
    monitorMode: "native-events+authoritative-reconcile",
    foregroundGate,
    sessionListKnown,
    lastNativeEventAt,
    lastPollAt,
    lastScanAt,
    watchdogMs: 10000
  },
  unreadCount,
  metrics: { total, running, pending, done24h, failed24h, successRate },
  config: { maxConcurrent, webhook, queueDir, enableNotifications, unknownThreshold }
}
```

任务按 `updatedAt` 倒序。投影会删除 `raw` 和所有下划线内部字段，并派生 `taskType`、`nextRunAt`、`startedAt`、`currentRound`、`goalPhase`、`lastActivityTime`、`lastSessionId`、`lastError`、`readAt`、`foregroundPaused` 与 `stopPending`。

### `engine.getTaskDetail(key)`

返回任务正文、公开策略、execution 历史，以及安全读取的：

- `.目标.md`
- `.结果.md`
- `执行报告.md`

报告路径必须仍位于当前 attempt 的 workDir 内，文件必须是普通文件且大小不超过 2 MiB。

### `engine.getConfig()` / `engine.setConfig(patch)`

运行时可更新：

| 字段 | 范围 |
|---|---|
| `maxGoalRounds` | 1-100 |
| `maxBlockedResumes` | 0-10 |
| `unknownThreshold` | 1-10 |
| `maxAttempts` | 1-10 |
| `taskTimeoutMs` | 600000-86400000 |
| `autoArchive` | boolean，默认 true |
| `webhook` | string/null |
| `enableNotifications` | boolean，默认 false |
| `priority` | 1-10 |
| `defaultDeadline` | cron/null |
| `retryBackoffBaseMs` | 5000-600000 |
| `retryBackoffMaxMs` | 10000-3600000 |

`queueDir` 只允许启动时设置；请求切换到不同路径会失败。并发数是 ledger 配置，通过 `setConcurrency` 单独更新。

## 7. 派发与前台让行

### `engine.scanPending()`

1. 扫描 `.md` 收件箱。
2. 计算 `maxConcurrent - runningCount`；默认最大并发为 1。
3. 无空位或无任务时返回。
4. 调用 `_hostAllowsDispatch()`；前台活跃或列表未知时返回，不占用任务。
5. 按 priority 降序处理。
6. 检查 schedule / cron、分钟级 cron 去重、归档、退避和 admission quarantine。
7. 为每个被接纳的任务异步 `_dispatch()`；`inFlight` 防止同 key 重入。

### `engine.pollRunning()` 的前台分支

一次可信或未知的 session list 供本轮所有 running task 共用。若检测到前台活跃或列表未知，则每个 owned task 进入 `_yieldForForeground()`；若任务已经带 foreground marker 且 Host 当前可信空闲，则进入 `_resumeAfterForeground()`；其余才执行普通 `_pollOne()`。前台暂停任务仍保留 `status=running` 和并发占位，不能走 wakeup/replacement retry。

`registerRuntimePollEvents()` 监听原生 `agent/status`、owned `goal/changed`、`session/disposed`，只设置 coalescing dirty latch；回调不直接改变 ledger/session/goal。`pollRunning()` 仍是唯一控制收敛路径，10 秒 timer 是漏事件 watchdog。

### `_dispatch(task)`

派发前再次检查 Host，避免扫描与真正 admission 之间的竞态。每个 attempt：

1. 引擎根据正文判定 standard 或 PTC owned preset。
2. 创建独立 workDir 和专属 session ID。
3. 在任何远端 create 前把 `status=running`、workDir、session ID、attempt 和 launch marker 持久化。
4. 调用 `runner.launch()`；`beforeGoal` 在不可中止的 `goals.create` 前持久化 goal admission marker。
5. `goals.create` 返回有效 ref 后，`afterGoal` 原子持久化 ref 并清除 marker。
6. 远端调用 timeout/畸形响应无法证明 mutation 未发生时，保持 ownership/quarantine，不自动启动 replacement。

## 8. `createRunner(apiProxy, options)`

### 返回能力

```js
const runner = {
  launch(entry, { beforeGoal, afterGoal }),
  pollTask(sessionId),
  listSessions(),
  antiBlock(sessionId, goalRef),
  wakeup(sessionId, goalRef),
  pauseGoal(sessionId, goalRef),
  resumeGoal(sessionId, goalRef),
  finalize(entry, result, error),
  cancelLaunch(sessionId, goalRef),
  cancelTask(sessionId, goalRef),
  cancelSession(sessionId),
  archiveSessions(entry),
  maxBlockedResumes,
  taskTimeoutMs,
  rpcTimeoutMs,
}
```

### `launch` 的唯一入场流程

```text
ensure runDir + write .task.md
→ validate reserved autoqueue session ID
→ validate engine-selected owned preset
→ sessions.create({ sessionId, cwd, owned preset })
→ verify returned session ID is exactly reserved ID
→ sessions.rename
→ persist + verify session approvalPolicy=never
→ beforeGoal: persist goal-admission marker
→ goals.create({ objective: full task, maxGoalRounds })
→ afterGoal: persist exact goal ref
→ return { sessionId, goalRef }
```

rc.2 的 goal driver 在 `goals.create` 后自行开始工作。因此新 launch 没有 `sessions.prompt(mode:'queue')`，也没有第二个 prompt admission boundary。账本里保留的 prompt quarantine 字段只用于旧版本数据的 fail-closed 兼容，不是当前启动流程。

### Goal 轮询与干预

| phase | engine 行为 |
|---|---|
| `active` / `running` | 静默等待并更新轮次/活动信息 |
| `complete` | finalize 为 done，Webhook，按策略归档 |
| `blocked` | Host 可用时 steering + resume；超过上限则 failed |
| `paused` | 前台暂停任务双重空闲确认后 resume；其他 dormant 在 Host 可用时恢复，均无重复 prompt |
| `unknown` | 连续计数，达到阈值后 wakeup 或 bounded retry |

`pauseGoal`/`resumeGoal` 是前台协作让行的 durable transition；pause 接纳后必须先持久化新 revision 才能 cancel turn，resume 前需要两次可信空闲观察。`antiBlock` 和 `wakeup` 是故障恢复干预，允许发送 steering/恢复提示；这些都不等于启动时的重复初始 prompt。每次继续前仍重新确保 `approvalPolicy=never`。

### 停止和归档

- `cancelTask` 先 clear goal，再 cancel session；只 cancel 当前 turn 不足以停止 durable goal。
- stale goal revision 会从 history 读取最新 ref 后重试 clear。
- `cancelLaunch` 在 ref 未持久化时尝试从 history 恢复 ref，再做 clear/cancel。
- `archiveSessions` 只归档 entry 中全部通过 ownership 校验的 session。

## 9. ledger

### 文件与默认值

账本位于 `$QUEUE_DIR/queue-ledger.json`，schemaVersion 为 2。空账本默认：

```json
{
  "schemaVersion": 2,
  "revision": 0,
  "tasks": [],
  "config": { "maxConcurrent": 1 },
  "recentRequests": []
}
```

### 状态

合法状态：`pending`、`running`、`done`、`failed`、`stopped`、`interrupted`。`done` / `failed` / `stopped` / `interrupted` 属于 terminal；`archivedAt` 是独立归档标志。

每条 execution 包含稳定 `id`、专属 `sessionId`、attempt、起止时间、结果和可选错误。每任务最多保留 100 条 execution。账本总大小上限 64 MiB，并为活跃生命周期预留容量。

### 事务与恢复

- 所有修改先克隆 document/request cache，在副本上校验 schema 和精确序列化容量，再一次性换入。
- `upsertEntry` 总是增加 `_generation`，旧异步 continuation 用 generation CAS 识别 ownership 已失效。
- 原子写使用私有临时文件和 rename；持久化失败后暂停后续写入，直到 `flushLedger()` 成功。
- 账本损坏时保留原文件并尽力写只读诊断副本，插件 fail closed，不以空账本启动。
- 重启时，只有 `running` 且没有 session ID 的 legacy 记录回到 pending；带专属 ID/goal/admission marker 的记录保留 ownership，由 poll/containment 继续处理。
- foreground pause pending/paused/cancel-pending marker 同样持久化；重启后从 history/list 收敛，不 wakeup 或重建第二个 Agent。
- stop/deadline/retry/cleanup 的 cancel intent、DSH 受理 revision 与首次 idle 证明同样持久化；未受理、旧快照或单次 idle 都不能释放 session ownership。

### 导出

| 函数 | 说明 |
|---|---|
| `initializeLedger()` / `reloadLedger()` | 初始化或显式切换账本 |
| `loadLedger()` / `snapshot()` | 读取权威状态 |
| `flushLedger()` | 同步持久化 |
| `findByKey()` / `upsertEntry()` / `removeEntry()` | 任务事务 |
| `getConcurrency()` / `setConcurrency()` / `runningCount()` | 并发控制 |
| `checkRequest()` / `completeRequest()` / `releaseRequest()` | requestId 两阶段去重 |
| `markRead()` / `markUnread()` / `unreadCount()` | 结果阅读状态 |

## 10. files

### 目录

```text
$QUEUE_DIR/
├── tasks/<key>.md
├── runs/YYYY-MM/<key>-a<attempt>-<random>/
│   ├── .task.md
│   ├── .目标.md
│   ├── .结果.md
│   └── 执行报告.md
└── queue-ledger.json
```

### 主要导出

| 函数 | 说明 |
|---|---|
| `setQueueDir` / `getQueueDir` | 启动时设置/读取队列根目录 |
| `ensurePrivateDir` / `atomicWrite` | 私有目录与原子写 |
| `validateKey` | 拒绝路径穿越、控制字符、保留名和超长 key |
| `validateSchedule` / `validateCronExpression` / `matchCron` | 调度验证和本地时间匹配 |
| `listTaskFiles` | 扫描 `.md` 并解析 schedule/cron/deadline 文件头 |
| `writeTaskFile` / `removeTaskFile` | 收件箱原子写删 |
| `createRunDir` / `ensureRunDir` | 创建/验证 attempt 私有目录 |
| `writeTaskCopy` / `writeGoalSnapshot` / `writeResult` | 运行工件 |
| `safeReadReportFile` | 防 symlink/越界/超限的报告读取 |

cron 是 5 字段本地时间表达式，支持 `*`、数字、`*/step`、范围和逗号；日与周同时受限时采用标准 OR 语义。

## 11. 上层能力面

- HTTP：完整接口说明见 `docs/api.md`。
- 外部 AI：Capabilities → OpenAPI → compact state → detail。
- Host AI：16 个工具，只有 `enableHostAiTools=true` 才注册；列表/详情结构化结果含 runtime 和派生运行事实，默认不改变普通会话 tool catalog。
- UI：五个范围工作区、原生 runtime 观测、SSE 健康、完整安全任务表单/动作、批量归档、详情四页签、配置与动态 AI/API 接入抽屉、已读状态均已暴露。
- `/api/queue/options` 返回 `workspaces: []`、`presets: []`、`models: []` 和 `isolation.overridesLocked`；它是锁声明，不是 Host 枚举接口。

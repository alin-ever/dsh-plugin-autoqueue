# autoqueue HTTP API

业务 API 位于 `/api/queue/*`，机器发现 API 位于 `/api/autoqueue/*`。本文按 **`@deepseek-ai/dsh 0.1.1-rc.2`** 精确基线验证；插件清单的运行范围是 `>=0.1.1-rc.2 <0.1.2`，但其他 DSH 版本需要重新验证隔离语义。

## 0. 安全边界

- 每个 attempt 使用专属 `autoqueue-session-<uuid>` 和独立 cwd；插件拒绝操作其他 DSH 会话。
- 引擎只选择 `autoqueue-unattended-v2` / `autoqueue-ptc-unattended-v2`。v1 只保留不覆盖；v2 marker 必须完整，并禁用提问、高扇出子会话/工作流/后台任务工具，bash/pwsh 只能前台运行。调用方不能指定任意 preset。
- 专属会话在 `goals.create` 前先持久化并验证 `approvalPolicy=never`；验证失败则不允许 goal 入场。
- runner 不调用 `workspace.create`，不调用 `session.selectModel`，也不发送重复的初始 queue prompt。完整任务只进入一次 `goals.create.objective`。
- 普通前台会话活跃时暂停派发；`sessions.list` 调用失败或返回结构未知时同样按前台忙碌处理。已经运行的 owned goal 先持久化 pause intent，再 pause goal、取消当前 turn；只有连续两次可信空闲观察后才 resume。
- 任务与配置请求均不能覆盖 Host 的模型、工作区或任意 Agent preset。未知字段会被拒绝。
- 默认 `maxConcurrent=1`、`autoArchive=true`、`enableNotifications=false`。
- Host 普通会话中的 16 个 AI 工具随插件自动注册，可用 `enableHostAiTools: false` 关闭；外部 AI 始终可以使用本 API。

## 1. 访问控制

- 未配置 token 时，只有 socket 对端地址与请求 `Host` 同时为 loopback 的本机直连免密。
- 一旦配置 token，包括 localhost 在内的所有请求都必须鉴权。
- 远程或反向代理部署还必须在启动配置中加入 `allowedHosts`。
- 请求可使用 `Authorization: Bearer <token>` 或 `X-Autoqueue-Token: <token>`。
- `Origin` 只用于同源校验，不是身份凭据。
- 所有 POST 请求必须使用 `Content-Type: application/json`。
- 服务拒绝未知字段、非法调度、超限正文、不支持的方法和超限请求体。

```bash
curl https://queue.example.com/api/queue/state \
  -H "Authorization: Bearer $AUTOQUEUE_API_TOKEN"
```

API 不在任何响应中返回 token、环境变量值或其他认证凭据。

## 2. 外部 AI 的发现流程

外部 Agent 推荐按以下顺序接入：

1. `GET /api/autoqueue/capabilities`：发现 API 版本、资源、限制、隔离特性和 Host AI 工具策略。
2. `GET /api/autoqueue/openapi.json`：加载 OpenAPI 3.1 schema、动作枚举和认证方案。
3. `GET /api/queue/state?compact=1`：用紧凑投影列任务。
4. `GET /api/queue/detail?key=...`：只在需要时获取正文、执行历史和报告。

```bash
curl https://queue.example.com/api/autoqueue/capabilities \
  -H "Authorization: Bearer $AUTOQUEUE_API_TOKEN"

curl https://queue.example.com/api/autoqueue/openapi.json \
  -H "Authorization: Bearer $AUTOQUEUE_API_TOKEN"

curl 'https://queue.example.com/api/queue/state?archived=1&compact=1' \
  -H "Authorization: Bearer $AUTOQUEUE_API_TOKEN"
```

Capabilities 与 OpenAPI 使用和业务接口相同的鉴权。Capabilities 中 `hostAiToolsDefaultEnabled` / `aiToolRegistration.defaultEnabled` 为 `true`，`aiToolRegistration.enabled` 表示当前进程的实际注册状态；这不影响外部 HTTP 调用。

## 3. 端点总览

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/autoqueue/capabilities` | 能力、限制、资源和 AI 工具发现 |
| `GET` | `/api/autoqueue/openapi.json` | OpenAPI 3.1 接口描述 |
| `GET` | `/api/queue/state` | 队列快照 |
| `POST` | `/api/queue/task` | 创建任务 |
| `POST` | `/api/queue/action` | 执行任务或队列动作 |
| `GET` | `/api/queue/detail?key=` | 获取完整任务、执行记录和报告 |
| `GET` | `/api/queue/options` | 读取严格隔离锁 |
| `GET\|POST` | `/api/queue/config` | 读取/更新安全运行时配置 |
| `POST` | `/api/queue/mark-read` | 标记已读或未读 |
| `GET` | `/api/queue/events` | compact SSE 快照 |

## 4. `GET /api/queue/state`

获取队列快照。

### 查询参数

| 参数 | 允许值 | 默认 | 说明 |
|---|---|---|---|
| `archived` | `0` / `1` | `0` | `1` 时包含已归档任务 |
| `compact` | `0` / `1` | `0` | `1` 时移除 `body` 与 `executions`，增加 `summary` 与 `lastSessionId` |

面向 LLM 的列表调用应使用 `compact=1`。完整列表可能包含大正文和最多 100 条 execution 记录，不应无条件放进模型上下文。

### compact 响应示例

```json
{
  "revision": 42,
  "tasks": [
    {
      "key": "daily-report",
      "status": "running",
      "summary": "每日工作报告",
      "lastSessionId": "autoqueue-session-017c9c4f-a5d0-4fe5-9558-98a805dd485e",
      "taskType": "cron",
      "cron": "0 8 * * 1-5",
      "priority": 5,
      "attempts": 1,
      "blockedResumes": 0,
      "goalPhase": "active",
      "foregroundPaused": false,
      "stopPending": false,
      "autoArchive": true,
      "enableNotifications": false,
      "createdAt": "2026-08-31T08:00:00.000Z",
      "updatedAt": "2026-08-31T08:01:00.000Z"
    }
  ],
  "unreadCount": 0,
  "metrics": {
    "total": 1,
    "running": 1,
    "pending": 0,
    "done24h": 0,
    "failed24h": 0,
    "successRate": 0
  },
  "config": {
    "maxConcurrent": 1,
    "enableNotifications": false
  },
  "runtime": {
    "monitorMode": "native-events+authoritative-reconcile",
    "watchdogMs": 10000,
    "lastNativeEventAt": "2026-08-31T08:00:59.000Z",
    "lastNativeEventSource": "agent/status",
    "lastPollAt": "2026-08-31T08:01:00.000Z",
    "lastScanAt": "2026-08-31T08:00:58.000Z",
    "foregroundGate": "open",
    "sessionListKnown": true
  }
}
```

`runtime` 是只读、进程内观测：DSH 原生事件负责低延迟唤醒，`sessions.list` / history 权威对账负责控制决策，10 秒 watchdog 负责补漏。`foregroundGate` 为 `open`、`busy` 或 `unknown`；未知时引擎 fail closed。

### 状态枚举

| 状态 | 含义 |
|---|---|
| `pending` | 等待调度或前台让行 |
| `running` | 已由插件自有会话执行；也可能因前台优先而 `foregroundPaused=true` |
| `done` | 已完成 |
| `failed` | 已失败 |
| `stopped` | 已手动或按截止策略停止 |
| `interrupted` | 兼容旧账本/迁移数据的中断终态；可以显式 rerun |

`done`、`failed`、`stopped`、`interrupted` 都是 terminal。`archivedAt` 是独立标志；归档不会创造新状态。

运行任务还可能带 `stopPending=true`：停止或 deadline 意图已经持久化，但 owned session 尚未完成 DSH 受理后的双重 idle 收口，因此仍保留 `status=running` 和并发占位。

## 5. `POST /api/queue/task`

创建任务。`requestId` 用于幂等去重，长度为 1-128 个字符；同一 ID 不能用于不同请求。

### 请求字段

| 字段 | 类型 | 必填 | 默认/范围 | 说明 |
|---|---|---|---|---|
| `requestId` | string | 是 | 1-128 字符 | 去重 ID |
| `key` | string | 否 | 最长 200 字符 | 省略时生成；冲突时生成不重复 key |
| `content` | string | 是 | 非空，UTF-8 ≤ 2 MiB | Markdown 任务正文 |
| `priority` | integer | 否 | `5`，范围 1-10 | 数值越高越先派发 |
| `schedule` | string | 否 | ISO 8601 | 一次性调度；与 `cron` 互斥 |
| `cron` | string | 否 | 5 字段 cron | 循环调度；与 `schedule` 互斥 |
| `deadline` | string | 否 | 5 字段 cron | 墙上时钟截止窗口 |
| `maxGoalRounds` | integer | 否 | `40`，范围 1-100 | Goal 最大轮数 |
| `maxBlockedResumes` | integer | 否 | `3`，范围 0-10 | 反阻塞恢复上限 |
| `timeoutMs` | integer | 否 | `10800000`，范围 600000-86400000 | 单 attempt 相对超时 |
| `maxAttempts` | integer | 否 | `3`，范围 1-10 | 派发/恢复尝试上限 |
| `webhook` | string/null | 否 | http/https | 终态回调；不允许 URL 内凭据 |
| `autoArchive` | boolean | 否 | 全局默认 `true` | 终态后自动归档 |
| `enableNotifications` | boolean | 否 | 全局默认 `false` | 浏览器终态通知 |

隔离覆盖字段不在请求 schema 中；发送这类字段会得到未知字段错误，而不是被默默应用。

### 示例

```json
{
  "requestId": "task-20260831-001",
  "key": "weekly-insight",
  "content": "# 周度洞察\n\n汇总本周访谈并写出三个机会点。",
  "cron": "0 8 * * 1",
  "deadline": "0 21 * * *",
  "priority": 8,
  "maxGoalRounds": 50,
  "autoArchive": true,
  "enableNotifications": false
}
```

### 响应

```json
{ "ok": true, "key": "weekly-insight" }
```

若业务冲突，端点可以返回 `409`；输入格式、字段或范围错误返回 `400`。

## 6. `POST /api/queue/action`

所有动作使用统一信封：

```json
{
  "requestId": "req-001",
  "action": {
    "kind": "stop",
    "key": "weekly-insight"
  }
}
```

### 动作矩阵

| `kind` | 关键字段 | 前置条件/效果 |
|---|---|---|
| `stop` | `key` | 仅 running；持久化异步停止意图并取消 owned session，pending 请用 delete |
| `archive` | `key` | 非 running；隐藏任务并归档其插件自有 sessions |
| `archive` | `keys` | 1-100 个唯一 key，逐项返回结果 |
| `restore` | `key` | 清除 `archivedAt` |
| `delete` | `key` | 仅 pending；删除收件箱文件和账本项 |
| `rerun` | `key` | 非 running 且未归档；terminal 与 pending 均可重新入队 |
| `update` | `key` + patch | 仅 pending 且未归档 |
| `force-scan` | 无 | 立即检查 Markdown 收件箱 |
| `set-concurrency` | `maxConcurrent` | 设置 1-8，持久化到账本 |

停止成功响应为 `{ "ok": true, "accepted": true, "pending": true }`，表示停止意图已持久化且正在等待 DSH 权威 idle 收口，不代表 session 已在该 HTTP 响应前终止。调用方应继续读取 state/detail，直到状态变为 `stopped`。`sessions.cancel` 受理后必须有连续两次因果上晚于该受理的可信 idle/缺席观察，ownership 才会释放。

### 批量归档

```json
{
  "requestId": "archive-001",
  "action": {
    "kind": "archive",
    "keys": ["a", "b", "c"]
  }
}
```

```json
{
  "ok": true,
  "results": [
    { "key": "a", "ok": true },
    { "key": "b", "ok": false, "error": "运行中" }
  ]
}
```

### 更新 pending 任务

```json
{
  "requestId": "update-001",
  "action": {
    "kind": "update",
    "key": "weekly-insight",
    "content": "# 新任务正文",
    "schedule": "2026-09-01T08:00:00Z",
    "priority": 8,
    "autoArchive": true
  }
}
```

可更新字段：

- `content`
- `schedule` / `cron`（二者互斥；空字符串清除）
- `deadline`（空字符串清除）
- `priority`
- `maxGoalRounds` / `maxBlockedResumes`（`null` 恢复全局默认）
- `timeoutMs`（`null` 恢复全局默认）
- `maxAttempts`（`null` 恢复全局默认）
- `webhook`（空字符串或 `null` 清除）
- `autoArchive`
- `enableNotifications`

## 7. `GET /api/queue/detail?key=...`

返回单任务完整正文、执行历史和报告。该端点适合按需调用，不适合作为 LLM 的列表 API。

```json
{
  "ok": true,
  "task": {
    "key": "weekly-insight",
    "status": "done",
    "workDir": "/home/user/.dsh/queue/runs/2026-08/weekly-insight-a1-...",
    "sessionId": null,
    "goalRef": null,
    "attempts": 1,
    "blockedResumes": 0,
    "createdAt": "2026-08-31T08:00:00.000Z",
    "updatedAt": "2026-08-31T08:15:00.000Z",
    "archivedAt": "2026-08-31T08:15:01.000Z",
    "body": "# 周度洞察\n\n...",
    "cron": "0 8 * * 1",
    "priority": 8,
    "autoArchive": true,
    "enableNotifications": false,
    "executions": [
      {
        "id": "f295c301-b745-4f59-b78c-b65742b0d4d0",
        "sessionId": "autoqueue-session-017c9c4f-a5d0-4fe5-9558-98a805dd485e",
        "attempt": 1,
        "startedAt": "2026-08-31T08:00:00.000Z",
        "endedAt": "2026-08-31T08:15:00.000Z",
        "result": "done"
      }
    ],
    "reports": {
      "goal": "目标: 周度洞察...",
      "result": "{\"result\":\"done\"}",
      "report": "## 执行报告\n..."
    }
  }
}
```

不存在的 key 返回业务结果：

```json
{ "ok": false, "error": "任务不存在" }
```

## 8. `GET /api/queue/options`

该端点表达隔离约束，不枚举 Host 的全局状态，也不发起对应的 Host RPC。

```json
{
  "workspaces": [],
  "presets": [],
  "models": [],
  "isolation": {
    "strict": true,
    "overridesLocked": ["workspace", "agentPreset", "model"],
    "reason": "AutoQueue uses a task-local cwd, versioned owned preset, and the Host default model without mutating Host selection state."
  }
}
```

三个数组始终为空。客户端应读取 `isolation.strict` 与 `overridesLocked`，不要把空数组解释成“尚未加载”。

## 9. `GET|POST /api/queue/config`

### GET

返回当前安全业务默认值：

```json
{
  "maxGoalRounds": 40,
  "maxBlockedResumes": 3,
  "unknownThreshold": 3,
  "maxAttempts": 3,
  "taskTimeoutMs": 10800000,
  "autoArchive": true,
  "webhook": null,
  "queueDir": null,
  "enableNotifications": false,
  "priority": 5,
  "defaultDeadline": null,
  "retryBackoffBaseMs": 30000,
  "retryBackoffMaxMs": 300000
}
```

`maxConcurrent` 属于账本持久化配置，通过 state 的 `config.maxConcurrent` 读取，通过 `set-concurrency` 动作修改；它不属于 config POST。

### POST 可写字段

| 字段 | 范围/说明 |
|---|---|
| `maxGoalRounds` | 1-100 |
| `maxBlockedResumes` | 0-10 |
| `unknownThreshold` | 1-10 |
| `maxAttempts` | 1-10 |
| `taskTimeoutMs` | 600000-86400000 |
| `autoArchive` | boolean；默认 true |
| `webhook` | http/https URL；空字符串或 null 清除 |
| `enableNotifications` | boolean；默认 false |
| `priority` | 1-10 |
| `defaultDeadline` | 5 字段 cron；空字符串或 null 清除 |
| `retryBackoffBaseMs` | 5000-600000 |
| `retryBackoffMaxMs` | 10000-3600000 |

```json
{
  "maxGoalRounds": 60,
  "autoArchive": true,
  "enableNotifications": false,
  "defaultDeadline": "0 21 * * *"
}
```

`queueDir` 只允许作为启动参数；POST 携带该字段返回 `409`。`allowedHosts`、token、`baseUrl` 与 `enableHostAiTools` 也是启动边界，不在运行时配置 API 中。

## 10. `POST /api/queue/mark-read`

```json
{
  "key": "weekly-insight",
  "read": true
}
```

- `read` 省略时默认为 `true`。
- 传 `false` 可重新标为未读。
- 响应包含服务端最新 `unreadCount`。

```json
{
  "ok": true,
  "key": "weekly-insight",
  "unreadCount": 0
}
```

## 11. `GET /api/queue/events`

SSE 查询支持 `archived=0|1`，快照始终是 compact 投影：

```text
data: {"revision":42,"tasks":[...],"config":{...},"runtime":{...}}

: heartbeat
```

- 连接建立后立即推送一份快照。
- ledger 变化时推送，另每 10 秒推送包含最新进程内 `runtime` 观测的快照；每 25 秒发送 heartbeat。
- 每实例最多 8 个 SSE 连接。
- 写端持续背压达到 30 秒后，巡检会主动断开。
- SSE 不包含 `body` / `executions`；需要完整内容时调用 detail。

## 12. Host AI 工具（自动注入）

启动配置 `enableHostAiTools` 默认是 `true`。插件加载后向普通 DSH 会话注册以下 16 个 HTTP 薄客户端工具；需要保持原始 tool catalog 的部署可显式设置为 `false`。`autoqueue-session-*` 自有任务 Agent 会隐藏这些工具，执行 guard 也会拒绝其通过 Host 工具递归控制队列：

工具默认访问 `http://127.0.0.1:3080`。若当前 DSH Web 不在该地址，启动配置必须提供正确的 `baseUrl`。

工具的正式自然语言名称是「任务队列」，并识别「老登」这个别称。别称只参与意图识别；机器协议仍只有下表的 `autoqueue_*` 名称，不注册重复 alias tool。

| 工具 | 能力 |
|---|---|
| `autoqueue_create_task` | 创建安全字段范围内的任务 |
| `autoqueue_list_tasks` | 使用 compact state 列表，并返回 metrics/unreadCount/runtime |
| `autoqueue_get_task` | 获取详情、报告和轮次/Goal/最近会话/错误/停止收口投影 |
| `autoqueue_update_task` | 更新 pending 任务 |
| `autoqueue_stop_task` | 提交异步停止；返回 accepted/pending 后继续查询终态 |
| `autoqueue_archive_task` | 归档单任务 |
| `autoqueue_batch_archive` | 批量归档 1-100 个任务 |
| `autoqueue_restore_task` | 恢复归档任务 |
| `autoqueue_delete_task` | 删除 pending 任务 |
| `autoqueue_rerun_task` | 重新执行非 running 任务 |
| `autoqueue_mark_read` | 标记已读/未读 |
| `autoqueue_get_options` | 读取隔离锁 |
| `autoqueue_get_config` | 读取安全配置 |
| `autoqueue_update_config` | 更新安全配置 |
| `autoqueue_force_scan` | 立即检查收件箱 |
| `autoqueue_set_concurrency` | 设置 1-8 并发 |

工具全部通过 HTTP API，不绕过 HTTP 校验直接访问 engine/ledger，也不会暴露 token。外部 AI 不依赖这组 Host 工具；即使关闭自动注入，HTTP API 仍保持可用。

## 13. UI 与 API 能力对应

| UI 区域 | 使用的能力 |
|---|---|
| 任务队列、正在推进、循环调度、定时执行、归档记录工作区 | state + compact SSE 的范围投影 |
| 正在推进的原生 runtime 监控、前台门控与 watchdog | state/SSE `runtime` |
| 新建任务 | task |
| 编辑、停止、重跑、归档、恢复、删除、立即检查 | action |
| 多选批量归档 | action `archive + keys` |
| 详情四页签 | detail |
| 已读/未读 | mark-read |
| 运行设置 | config + `set-concurrency` |
| AI / API 接入抽屉 | 实时 capabilities + options 隔离证据 + OpenAPI + compact state 示例 |

UI 不提供隔离覆盖控件。任务表支持跳转到该任务的插件自有 DSH session；runner 的 ownership guard 仍然是最终安全边界。

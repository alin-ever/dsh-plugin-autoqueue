# autoqueue HTTP API

> 所有接口挂载在 `/api/queue/*` 下，Content-Type 均为 `application/json; charset=utf-8`。

---

## 1. `GET /api/queue/state`

获取任务队列快照。

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `archived` | string | — | `"1"` 时包含已归档任务 |

**响应** `200`

```json
{
  "revision": 42,
  "tasks": [
    {
      "key": "daily-report",
      "status": "done",
      "workDir": "/home/user/.dsh/queue/runs/2026-08/daily-report-2026-08-26T...",
      "sessionId": "abc-123",
      "goalRef": { "id": "goal-1", "revision": 3 },
      "attempts": 1,
      "blockedResumes": 0,
      "readAt": "2026-08-28T12:00:00.000Z",
      "executions": [
        {
          "id": "exec-1",
          "sessionId": "abc-123",
          "attempt": 1,
          "startedAt": "2026-08-26T08:00:00.000Z",
          "endedAt": "2026-08-26T08:15:00.000Z",
          "result": "done"
        }
      ],
      "createdAt": "2026-08-25T12:00:00.000Z",
      "updatedAt": "2026-08-26T08:15:00.000Z",
      "archivedAt": null,
      "body": "# 每日工作报告\n\n...",
      "cron": "0 8 * * *",
      "schedule": null,
      "deadline": null,
      "maxGoalRounds": 40,
      "maxBlockedResumes": 3,
      "timeoutMs": 5400000,
      "priority": 5,
      "webhook": null,
      "workspace": "ws-1",
      "agentPreset": null,
      "autoArchive": false,
      "maxAttempts": 3
    }
  ],
  "config": {
    "maxConcurrent": 2,
    "webhook": null,
    "queueDir": null,
    "workspace": null
  }
}
```

**状态枚举**

| 值 | 含义 |
|---|---|
| `pending` | 待执行 |
| `running` | 执行中 |
| `done` | 已完成 |
| `failed` | 已失败 |
| `stopped` | 已停止 |
| `interrupted` | 已中断（Host 重启） |

---

## 2. `POST /api/queue/task`

创建任务。

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `requestId` | string | ✅ | 去重 ID（任意唯一字符串） |
| `key` | string | ✅ | 任务标识（唯一） |
| `content` | string | ✅ | 任务内容（Markdown，≤2MB） |
| `priority` | number | | 优先级 1-10，默认 5 |
| `schedule` | string | | ISO 8601 一次性定时，如 `"2026-09-01T08:00:00Z"` |
| `cron` | string | | 5 字段 cron 表达式，如 `"0 8 * * *"` |
| `deadline` | string | | 5 字段 cron 截止时间，到点强制停止运行中任务 |
| `webhook` | string | | 完成/失败时 POST 回调 URL |
| `workspace` | string | | 工作区 ID（UUID，非显示名称） |
| `agentPreset` | string | | Agent 预设名 |
| `maxGoalRounds` | number | | 最大 goal 轮数，默认 40，范围 1-100 |
| `maxBlockedResumes` | number | | 最大反阻塞次数，默认 3，范围 0-10 |
| `timeoutMs` | number | | 任务超时毫秒，默认 90 分钟 |
| `autoArchive` | boolean | | 完成后自动归档，默认跟随全局配置 |
| `maxAttempts` | number | | 派发重试次数，默认 3 |

**响应**

```json
// 成功 200
{ "ok": true, "key": "daily-report" }

// 冲突 409（任务已存在）
{
  "ok": false,
  "key": "daily-report",
  "error": "任务已存在",
  "existing": {
    "status": "running",
    "cron": "0 8 * * *",
    "body": "# 每日工作报告...",
    "createdAt": "2026-08-25T12:00:00.000Z"
  }
}
```

---

## 3. `POST /api/queue/action`

对任务执行动作。所有动作共享同一个端点，通过 `action.kind` 区分。

**请求体**

```json
{
  "requestId": "req-xxx",
  "action": {
    "kind": "stop",
    "key": "daily-report"
  }
}
```

### 3.1 停止

```json
{ "requestId": "req-xxx", "action": { "kind": "stop", "key": "daily-report" } }
```

**响应**

```json
{ "ok": true }
```

### 3.2 归档

```json
{ "requestId": "req-xxx", "action": { "kind": "archive", "key": "daily-report" } }
```

运行中的任务不能归档。

**批量归档**

```json
{ "requestId": "req-xxx", "action": { "kind": "archive", "keys": ["a", "b", "c"] } }
```

**响应**

```json
{ "ok": true, "results": [{ "key": "a", "ok": true }, { "key": "b", "ok": false, "error": "运行中" }] }
```

### 3.3 还原

```json
{ "requestId": "req-xxx", "action": { "kind": "restore", "key": "daily-report" } }
```

### 3.4 删除

```json
{ "requestId": "req-xxx", "action": { "kind": "delete", "key": "daily-report" } }
```

只能删除待执行（`pending`）的任务，已执行的任务请使用 `archive` 归档。

### 3.5 重新执行

```json
{ "requestId": "req-xxx", "action": { "kind": "rerun", "key": "daily-report" } }
```

仅对 `failed` / `stopped` / `pending` 状态有效。

### 3.6 更新

```json
{
  "requestId": "req-xxx",
  "action": {
    "kind": "update",
    "key": "daily-report",
    "content": "新内容",
    "cron": "0 9 * * *",
    "priority": 8
  }
}
```


运行中的任务不能更新。

### 3.7 强制扫描

```json
{ "requestId": "req-xxx", "action": { "kind": "force-scan" } }
```

立即触发一次收件箱扫描，无需等定时器。

### 3.8 设置并发

```json
{ "requestId": "req-xxx", "action": { "kind": "set-concurrency", "maxConcurrent": 4 } }
```

---

## 4. `GET /api/queue/detail`

获取任务详情及报告。

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `key` | string | ✅ | 任务标识 |

**响应** `200`

```json
{
  "ok": true,
  "task": {
    "key": "daily-report",
    "status": "done",
    "workDir": "/home/user/.dsh/queue/runs/2026-08/daily-report-...",
    "sessionId": "abc-123",
    "attempts": 1,
    "blockedResumes": 0,
    "createdAt": "2026-08-25T12:00:00.000Z",
    "updatedAt": "2026-08-26T08:15:00.000Z",
    "archivedAt": null,
    "body": "# 每日工作报告\n\n...",
    "schedule": null,
    "cron": "0 8 * * *",
    "deadline": null,
    "maxGoalRounds": 40,
    "maxBlockedResumes": 3,
    "timeoutMs": 5400000,
    "priority": 5,
    "webhook": null,
    "workspace": "ws-1",
    "agentPreset": null,
    "autoArchive": false,
    "maxAttempts": 3,
    "executions": [
      {
        "id": "exec-1",
        "sessionId": "abc-123",
        "attempt": 1,
        "startedAt": "2026-08-26T08:00:00.000Z",
        "endedAt": "2026-08-26T08:15:00.000Z",
        "result": "done"
      }
    ],
    "reports": {
      "goal": "目标: # 每日工作报告\n结果: done\n时间: 2026-08-26T08:15:00.000Z",
      "result": "{ \"result\": \"done\", ... }",
      "report": "## 执行报告\n\n### 完成情况\n..."
    }
  }
}
```

**错误响应** `200`

```json
{ "ok": false, "error": "任务不存在" }
```

---

## 5. `GET /api/queue/options`

获取可用的工作区和 Agent 预设列表。

**响应** `200`

```json
{
  "workspaces": [
    { "workspaceId": "ws-1", "path": "/home/user/projects/foo", "title": "Foo 项目", "createdAt": "...", "updatedAt": "..." }
  ],
  "presets": [
    { "id": "default", "isDefault": true, "name": "默认", "trust": "trusted" }
  ]
}
```

---

## 6. `GET|POST /api/queue/config`

运行时配置读写。

**GET** 响应

```json
{
  "maxGoalRounds": 40,
  "maxBlockedResumes": 3,
  "autoArchive": false,
  "maxAttempts": 3,
  "agentPreset": null,
  "priority": 5,
  "webhook": null,
  "workspace": null,
  "queueDir": null,
  "defaultDeadline": null
}
```

**POST** 请求体

```json
{
  "maxGoalRounds": 60,
  "autoArchive": true,
  "defaultDeadline": "0 21 * * *"
}
```


---

## 7. `POST /api/queue/mark-read`（标记已读/未读）

标记已完成任务为已读或未读状态。未读任务会在看板中显示蓝色标记，并在 `unreadCount` 中计数。

**请求体**

```json
{
  "key": "daily-report",
  "read": true
}
```

- `key`（必填）— 任务标识
- `read`（可选）— `true` 标记已读（默认），`false` 标记未读

**响应** `200`

```json
{
  "ok": true,
  "key": "daily-report",
  "unreadCount": 5
}
```

---

## 8. `GET /api/queue/events`（SSE）

Server-Sent Events 实时推送。

**响应** `200`，`Content-Type: text/event-stream`

```
data: {"revision":42,"tasks":[...],"config":{...}}

: heartbeat

data: {"revision":43,"tasks":[...],"config":{...}}
```

- 初始立即推送一次快照
- 之后每 10 秒推送一次快照
- 每 25 秒发送一次心跳注释（`: heartbeat`）
- 连接关闭时自动清理定时器

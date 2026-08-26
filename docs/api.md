# autoqueue HTTP API

> 所有接口挂载在 `/api/queue/*` 下，Content-Type 均为 `application/json; charset=utf-8`。

---

## 1. `GET /api/queue/state`

获取任务队列快照。

**查询参数**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `archived` | string | — | `\"1\"` 时包含已归档任务 |

**响应** `200`

```json
{
  \"revision\": 42,
  \"tasks\": [
    {
      \"key\": \"daily-report\",
      \"status\": \"done\",
      \"workDir\": \"/home/user/.dsh/queue/runs/2026-08/daily-report-...\",
      \"sessionId\": \"abc-123\",
      \"goalRef\": { \"id\": \"goal-1\", \"revision\": 3 },
      \"attempts\": 1,
      \"blockedResumes\": 0,
      \"executions\": [
        {
          \"id\": \"exec-1\",
          \"sessionId\": \"abc-123\",
          \"attempt\": 1,
          \"startedAt\": \"2026-08-26T08:00:00.000Z\",
          \"endedAt\": \"2026-08-26T08:15:00.000Z\",
          \"result\": \"done\"
        }
      ],
      \"createdAt\": \"2026-08-25T12:00:00.000Z\",
      \"updatedAt\": \"2026-08-26T08:15:00.000Z\",
      \"archivedAt\": null,
      \"body\": \"# 每日工作报告\\n\\n...\",
      \"cron\": \"0 8 * * *\",
      \"schedule\": null,
      \"deadline\": null,
      \"maxGoalRounds\": 40,
      \"maxBlockedResumes\": 3,
      \"timeoutMs\": 5400000,
      \"priority\": 5,
      \"webhook\": null,
      \"workspace\": \"ws-1\",
      \"agentPreset\": null,
      \"autoArchive\": false,
      \"stallThreshold\": 10,
      \"unknownThreshold\": 3,
      \"maxAttempts\": 3
    }
  ],
  \"config\": {
    \"maxConcurrent\": 2,
    \"webhook\": null,
    \"queueDir\": null,
    \"workspace\": null
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

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `requestId` | string | ✓ | — | 去重 ID，全局唯一 |
| `key` | string | ✓ | — | 任务标识，唯一 |
| `content` | string | ✓ | — | Markdown 内容（≤2MB） |
| `priority` | number | | 5 | 优先级 1-10 |
| `schedule` | string | | — | ISO 8601 一次性定时 |
| `cron` | string | | — | 5 字段 cron 循环定时 |
| `deadline` | string | | — | 5 字段 cron 截止时间 |
| `webhook` | string | | — | 完成/失败回调 URL |
| `workspace` | string | | — | 工作区 ID |
| `agentPreset` | string | | — | Agent 预设名 |
| `maxGoalRounds` | number | | 40 | 最大 goal 轮数 |
| `maxBlockedResumes` | number | | 3 | 最大反阻塞次数 |
| `timeoutMs` | number | | 5400000 | 任务超时（毫秒） |
| `autoArchive` | boolean | | 跟随全局 | 完成后自动归档 |
| `stallThreshold` | number | | 10 | 停滞检测阈值 |
| `unknownThreshold` | number | | 3 | 未知状态阈值 |
| `maxAttempts` | number | | 3 | 最大重试次数 |

**响应** `201`

```json
{ \"ok\": true, \"key\": \"daily-report\", \"existing\": false, \"status\": \"pending\" }
```

---

## 3. `POST /api/queue/action`

动作信封，统一入口。

**请求体**

```json
{
  \"requestId\": \"unique-id\",
  \"action\": {
    \"kind\": \"stop\",
    \"key\": \"daily-report\"
  }
}
```

**支持的 kind**

| kind | 说明 | 额外参数 |
|---|---|---|
| `stop` | 停止运行中任务 | — |
| `archive` | 归档任务 | — |
| `restore` | 还原已归档任务 | — |
| `delete` | 删除待执行任务 | — |
| `rerun` | 重跑失败/停止任务 | — |
| `update` | 更新任务配置 | `content/priority/schedule/cron/deadline/...` |
| `force-scan` | 立即触发收件箱扫描 | — |
| `set-concurrency` | 设置并发数 | `value: number` |

**响应** `200`

```json
{ \"ok\": true, \"key\": \"daily-report\" }
```

---

## 4. `GET /api/queue/detail?key=`

获取任务详情，含执行报告。

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `key` | string | ✓ | 任务标识 |

**响应** `200`

```json
{
  \"ok\": true,
  \"task\": {
    \"key\": \"daily-report\",
    \"status\": \"done\",
    \"reports\": {
      \"goal\": \"...\",
      \"result\": \"{...}\",
      \"report\": \"# 执行报告\\n...\"
    }
  }
}
```

---

## 5. `GET /api/queue/options`

获取工作区列表和 Agent 预设。

**响应** `200`

```json
{
  \"agents\": [{ \"name\": \"default\", \"label\": \"默认\" }],
  \"workspaces\": [{ \"id\": \"ws-1\", \"name\": \"Default\" }]
}
```

---

## 6. `GET|POST /api/queue/config`

获取或更新运行时配置。

**GET 响应** `200`

```json
{
  \"maxGoalRounds\": 40,
  \"maxBlockedResumes\": 3,
  \"autoArchive\": false,
  \"stallThreshold\": 10,
  \"unknownThreshold\": 3,
  \"maxAttempts\": 3,
  \"webhook\": null,
  \"workspace\": null,
  \"queueDir\": null,
  \"defaultDeadline\": null
}
```

**POST 请求体**（只传需要修改的字段）

```json
{ \"maxConcurrent\": 4 }
```

---

## 7. `GET /api/queue/events`

SSE 实时推送。

- 每 10 秒推送一次完整快照
- 每 25 秒推送心跳 `: heartbeat`
- 客户端断开后自动清理

**响应** `200`

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {\"revision\":42,\"tasks\":[...],\"config\":{...}}

data: {\"revision\":43,\"tasks\":[...],\"config\":{...}}

: heartbeat

```

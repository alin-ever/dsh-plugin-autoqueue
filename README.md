# autoqueue — DSH 无人值守任务队列

丢一个 POST 或一个 `.md` 文件进去，AI 自动执行、遇到阻塞自己换方案、产出报告、结算归档。全程无人值守。

## 快速开始

### 安装

```bash
dsh plugin --profile web add link:./queue-plugin
```

### 创建任务

```bash
curl -X POST http://127.0.0.1:3080/api/queue/task \
  -H 'Content-Type: application/json' \
  -d '{
    "requestId": "my-001",
    "key": "daily-report",
    "content": "# 生成日报\n\n收集今天的工作数据，输出 report.md"
  }'
```

### 丢文件

```sh
echo "# 生成日报" > ~/.dsh/queue/tasks/daily-report.md
```

文件名就是 `key`，内容就是任务。支持文件头声明调度：

```md
<!-- cron: 0 8 * * * -->
<!-- deadline: 0 21 * * * -->
# 每日工作报告
```

### 看板

安装后在 DSH Web 侧边栏底部点击「队列」进入看板。

---

## API 参考

完整文档见 [`docs/api.md`](./docs/api.md)。

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/queue/state` | 任务快照（`?archived=1` 含归档） |
| `POST` | `/api/queue/task` | 创建任务 |
| `POST` | `/api/queue/action` | 动作信封（stop/archive/restore/delete/rerun/update/force-scan/set-concurrency） |
| `GET` | `/api/queue/detail?key=` | 任务详情（含执行报告） |
| `GET` | `/api/queue/options` | 工作区 + Agent 预设列表 |
| `GET\|POST` | `/api/queue/config` | 运行时配置 |
| `GET` | `/api/queue/events` | SSE 实时推送（10s 快照 + 25s 心跳） |

### 创建任务参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `requestId` | string | ✅ | — | 去重 ID |
| `key` | string | | — | 可选。省略时从内容首行自动生成，重复时自动附加时间戳 |
| `content` | string | ✅ | — | Markdown 内容（≤2MB） |
| `priority` | number | | 5 | 优先级 1-10 |
| `schedule` | string | | — | ISO 8601 一次性定时 |
| `cron` | string | | — | 5 字段 cron 循环定时 |
| `deadline` | string | | — | 5 字段 cron 截止时间 |
| `webhook` | string | | — | 完成/失败回调 URL |
| `workspace` | string | | — | 工作区 ID（UUID，非显示名称） |
| `agentPreset` | string | | — | Agent 预设名 |
| `maxGoalRounds` | number | | 40 | 最大 goal 轮数 |
| `maxBlockedResumes` | number | | 3 | 最大反阻塞次数 |
| `timeoutMs` | number | | 180 分钟 | 任务超时 |
| `autoArchive` | boolean | | 跟随全局 | 完成后自动归档 |
| `stallThreshold` | number | | 360 | 连续 active 轮数后触停滞检测 |
| `stallTimeoutMs` | number | | 300000 | 单轮无 rounds 增长时的停滞超时（毫秒，默认 5 分钟） |
| `maxAttempts` | number | | 3 | 派发重试次数 |

---

## 调度

### cron 常用示例

| cron | 含义 |
|---|---|
| `0 8 * * *` | 每天 08:00 |
| `0 8 * * 1-5` | 工作日 08:00 |
| `0 8 * * 1` | 每周一 08:00 |
| `0 8 1 * *` | 每月 1 日 08:00 |
| `*/30 * * * *` | 每 30 分钟 |
| `0 * * * *` | 每小时整点 |
| `0 8,20 * * *` | 每天 08:00 和 20:00 |

### 截止时间（deadline）

`deadline` 和 `timeoutMs` 共存，先到先停：

| 字段 | 类型 | 起算点 | 场景 |
|---|---|---|---|
| `timeoutMs` | 毫秒 | 任务启动 | "单次最多跑 180 分钟" |
| `deadline` | cron | 墙上时钟 | "每天 21:00 还没跑完就停" |

---

## 反阻塞 & 停滞检测

### 显式阻塞
goal 报告 `blocked` → 自动 steering 注入换方案指令 + resume goal，最多 `maxBlockedResumes` 次（默认 3）。

### 隐式停滞
goal 连续 `stallThreshold` 轮（默认 360）仍为 `active`/`running`，无进展 → 自动 steering 催促，计入 `blockedResumes` 配额。

两种机制耗尽后任务标记 `failed`。Agent 不会等待人类回答——系统提示已要求「不要提问，自己做决定」。

---

## 任务生命周期

```
pending ──→ running ──→ done
               │
               ├──→ failed (超时/反阻塞上限/会话不可达)
               │       └──→ pending（重试，未达 maxAttempts）
               └──→ stopped (手动停止)
```

`archived` 是独立布尔标志，不是状态。

---

## Webhook 回调

任务到达终态时 POST 到 webhook URL：

```json
{
  "key": "daily-report",
  "status": "done",
  "result": "done",
  "error": null,
  "attempts": 1,
  "blockedResumes": 0,
  "finishedAt": "2026-08-26T08:15:00.000Z"
}
```

---

## 配置

```yaml
# cordis.patch.yml
config:
  maxGoalRounds: 40
  maxBlockedResumes: 3
  autoArchive: false
  stallThreshold: 30
  stallTimeoutMs: 300000
  maxAttempts: 3
  agentPreset: null
  priority: 5
  scanIntervalMs: 30000
  maxConcurrent: 2
```

运行时也可通过 `GET/POST /api/queue/config` 动态调整。

---

## 架构

```
lib/
├── index.js     ← 插件入口：路由 + 定时器 + SSE + AI 工具注册
├── engine.js    ← 编排层：派发 / 轮询结算 / 反阻塞 / 重试 / 状态机
├── runner.js    ← 会话驱动：所有 apiProxy 调用集中在此
├── ledger.js    ← 账本：原子读写 / 去重 / 并发控制 / 重启恢复
├── files.js     ← I/O 层：收件箱扫描 / 调度解析 / 原子写入
├── ai-tool.js   ← AI 工具层：10 个模型工具 + 系统提示注入
└── client.js    ← 浏览器看板：React UI + 侧边栏入口
```

数据流单向向下，下层不感知上层。设计文档见 [`autoqueue-design.md`](./autoqueue-design.md)。

# autoqueue — DSH 无人值守任务队列

把一个 Markdown 任务交给队列，插件会在 DSH 后台自动派发、反阻塞、重试、结算并归档。设计目标只有两个：正常任务不打扰用户；队列任务不改变 DSH 普通前台会话的运行状态。

## 兼容基线

- 本版本逐项审计和自测的精确基线是 **`@deepseek-ai/dsh 0.1.1-rc.2`**。
- 插件清单接受 `>=0.1.1-rc.2 <0.1.2`，但升级 DSH 后仍应重新跑单元测试和 Playwright；本文的安全结论不自动外推到其他版本。
- `@deepseek-ai/dsh-tools` 与 `@deepseek-ai/dsh-user-approval` 固定为 `0.1.1-rc.2`。

## 无人值守安全契约

autoqueue 不是普通会话的全局自动化开关。每次执行都遵守以下边界：

1. 每次 attempt 先在账本中持久化一个 `autoqueue-session-<uuid>` 专属会话 ID；runner 拒绝读取或修改不属于该命名空间的会话。
2. 每次 attempt 使用独立运行目录，并通过 `sessions.create({ sessionId, cwd, ... })` 把 cwd 绑定到该会话；不会创建、选择或切换 Host 全局工作区。
3. 执行模式只由引擎在两个插件自有、带版本号的 preset 中选择：`autoqueue-unattended-v2` 与 `autoqueue-ptc-unattended-v2`。v1 内容保留且绝不覆盖，但不再被新执行选择。v2 要求 `[autoqueue:unattended-discipline:v2]` 完整匹配，并禁用提问、jobs、subagent/fork/control/list、workflow、Ralph；bash/pwsh 强制 `enableRunInBackground:false`，禁止 detached/daemon/background 工作逃离 owned session。已有 v2 若 marker 缺失或内容被改动，插件启动失败，不覆盖外部内容。
4. 会话创建后、`goals.create` 前，插件把该专属会话的 `approvalPolicy` 固化为 `never`，持久化并回读验证。失败时不投递 goal，并尝试取消该会话。
5. 任务正文只通过一次完整的 `goals.create.objective` 入场。不会调用 `workspace.create`、不会调用 `session.selectModel`，也不会再发送一条重复的初始 queue prompt。
6. 每轮读取 `sessions.list`。只要存在活跃的非 autoqueue 会话，或者列表 RPC/返回结构无法可靠判断，队列就不再派发；已经运行的 owned goal 会先持久化 pause intent，再 `goals.pause` 并协作取消当前 turn。只有连续两次可信空闲观察后才无 prompt 地 `goals.resume`。
7. 默认最大并发为 `1`、终态自动归档开启、浏览器通知关闭。Host 普通会话中的 `autoqueue_*` AI 工具也默认关闭，避免改变其 prompt 与 tool catalog。

DSH rc.2 的公开选择接口会持久化 Host 默认路由，因此任务和运行时配置都不能覆盖模型、工作区或任意 Agent preset。`GET /api/queue/options` 会明确返回三类空数组和隔离锁，而不是枚举 Host 状态。

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
    "content": "# 生成日报\n\n收集今天的工作数据，输出 report.md",
    "priority": 5,
    "autoArchive": true,
    "enableNotifications": false
  }'
```

任务可写策略仅包括正文、调度、优先级、轮数、反阻塞次数、超时、派发尝试、Webhook、自动归档和浏览器通知。完整字段见 [`docs/api.md`](./docs/api.md)。

### 丢文件

```sh
echo "# 生成日报" > ~/.dsh/queue/tasks/daily-report.md
```

文件名就是 `key`，正文就是任务。文件头可声明一次性调度、循环调度和截止窗口：

```md
<!-- schedule: 2026-09-01T08:00:00Z -->
<!-- cron: 0 8 * * 1-5 -->
<!-- deadline: 0 21 * * * -->
# 每日工作报告
```

`schedule` 与 `cron` 二选一；`deadline` 可以和任一方式共存。

### 打开看板

安装后，在 DSH Web 侧边栏点击「任务工作台」。看板关闭时不会预加载队列数据，也不会维持 SSE 连接；只有用户主动打开后才初始化状态、配置和事件订阅。

## 看板功能面

React 看板已暴露安全业务能力的完整操作面：

- 导航：全部任务、正在推进、循环调度、定时执行、执行记录；状态二级筛选覆盖运行中、待执行、失败、中断和完成，并支持关键词搜索。
- 运行态：严格隔离/前台让行契约条、后台工作位占用、前台暂停状态、执行中、待派发、需关注、24 小时完成数、成功率和未读结果 KPI。
- 任务列表：摘要、任务类型、状态/隔离告警、计划、优先级、轮次进度、尝试次数；支持多选批量归档。
- 任务动作：新建、编辑 pending 任务、停止、重跑、归档、恢复、删除 pending 任务、标记未读、跳转插件自有 DSH 会话、立即扫描收件箱。
- 任务详情：概览、执行轨迹、Goal/结果/最终报告、调度与韧性策略；打开终态详情会标记已读。
- 运行设置：并发、任务超时、Goal 轮数、反阻塞次数、派发尝试、不可达阈值、退避、默认优先级、默认截止、Webhook、自动归档和浏览器通知；队列目录只读。
- 外部接入：独立的「AI / API 接入」抽屉展示 Capabilities、OpenAPI 3.1、compact 查询示例和已开放动作；页面从不回显 token。
- 交互与可访问性：响应式导航、抽屉/弹窗、危险操作确认、键盘焦点锁定与恢复、ESC 关闭、实时错误提示、空状态插图。

隔离字段不会出现在新建、编辑或运行设置表单中；UI 只展示“已锁定”的安全说明。

## 外部 AI 与 HTTP API

外部 AI 的稳定边界是带鉴权的 HTTP API，而不是 Host 普通会话的工具注入：

```bash
# 1. 发现能力
curl http://127.0.0.1:3080/api/autoqueue/capabilities

# 2. 读取机器契约
curl http://127.0.0.1:3080/api/autoqueue/openapi.json

# 3. 用紧凑投影列任务，避免把正文和 executions 放进 LLM 上下文
curl 'http://127.0.0.1:3080/api/queue/state?archived=1&compact=1'
```

完整正文、执行历史和报告按需读取 `/api/queue/detail?key=...`。所有端点见 [`docs/api.md`](./docs/api.md)。

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/autoqueue/capabilities` | 能力、限制、资源地址和 Host AI 工具启用策略 |
| `GET` | `/api/autoqueue/openapi.json` | OpenAPI 3.1 机器契约 |
| `GET` | `/api/queue/state` | 快照；支持 `archived=1`、`compact=1` |
| `POST` | `/api/queue/task` | 创建任务 |
| `POST` | `/api/queue/action` | stop/archive/restore/delete/rerun/update/force-scan/set-concurrency |
| `GET` | `/api/queue/detail?key=` | 正文、执行记录和报告 |
| `GET` | `/api/queue/options` | 三类空数组与严格隔离锁 |
| `GET\|POST` | `/api/queue/config` | 安全运行时配置 |
| `POST` | `/api/queue/mark-read` | 标记已读/未读 |
| `GET` | `/api/queue/events` | compact SSE 快照 |

### 鉴权

未配置 token 时，只有连接端地址和请求 `Host` 同时为 loopback 的本机直连免 token。远程或反向代理部署必须配置允许的 Host 和 token：

```yaml
config:
  allowedHosts:
    - queue.example.com
  apiToken: "replace-with-a-long-random-secret"
```

也可以通过 `DSH_AUTOQUEUE_TOKEN` 或 `AUTOQUEUE_API_TOKEN` 环境变量提供 token。一旦设置 token，localhost 也必须鉴权。客户端发送：

```http
Authorization: Bearer <token>
```

或：

```http
X-Autoqueue-Token: <token>
```

Capabilities、OpenAPI、业务 API 和 SSE 使用相同鉴权；任何响应都不会包含 token 值。

## 调度与生命周期

| 字段 | 格式 | 语义 |
|---|---|---|
| `schedule` | ISO 8601 | 到点执行一次 |
| `cron` | 5 字段 cron | 每个匹配分钟触发 |
| `timeoutMs` | 毫秒 | 从本次 attempt 启动起计算 |
| `deadline` | 5 字段 cron | 墙上时钟截止，运行中任务到点收口 |

状态机包含六个值：`pending`、`running`、`done`、`failed`、`stopped`、`interrupted`。其中 `done` / `failed` / `stopped` / `interrupted` 都属于 terminal；`archivedAt` 是独立归档标志，不是状态。

goal 报告 `blocked` 时，引擎先注入 steering 指令，再 `goals.resume`，最多执行 `maxBlockedResumes` 次。前台忙碌时，运行中的 goal 使用持久化 pause-before-cancel 流程让行；恢复前做两次可信空闲确认，不注入重复任务正文。会话不可达、超时、截止、限流和启动不确定性采用不同的恢复/隔离路径；关键 mutation 在远端调用前先持久化 ownership/admission marker，避免自动创建第二个 Agent。

## 默认配置

捆绑配置的安全默认值：

```yaml
config:
  maxGoalRounds: 40
  maxBlockedResumes: 3
  autoArchive: true
  unknownThreshold: 3
  maxAttempts: 3
  taskTimeoutMs: 10800000
  enableNotifications: false
  enableHostAiTools: false
  priority: 5
  scanIntervalMs: 15000
  maxConcurrent: 1
```

- `maxConcurrent` 持久化到账本，范围 `1-8`；插件启动时仅在账本当前值为 `1` 时应用非空启动值。
- `queueDir`、`allowedHosts`、`apiToken`、`baseUrl`、`enableHostAiTools` 属于启动边界；`queueDir` 不能运行时热切换。
- `enableHostAiTools: true` 会把 16 个 `autoqueue_*` 工具和系统提示注入 Host 普通会话，只有明确需要时才开启。外部 AI 走 HTTP/OpenAPI，不依赖此开关。

## 架构与开发

```text
lib/
├── index.js     插件入口、鉴权、HTTP、SSE、preset 和 approvalPolicy 固化
├── engine.js    派发、前台让行、轮询、反阻塞、重试、admission containment
├── runner.js    所有 apiProxy 会话/goal 调用和 session ownership 守卫
├── ledger.js    原子账本、CAS generation、requestId 去重、并发和恢复
├── files.js     收件箱、调度解析、运行目录和安全报告读取
├── ai-tool.js   可选 Host AI 工具的 HTTP 薄客户端
└── client.js    由 client/src/ 构建的浏览器 bundle
```

```bash
npm install
npm run build:client
npm run test:unit
npm run test:playwright
```

内部接口见 [`docs/core-api.md`](./docs/core-api.md)，设计和隔离论证见 [`autoqueue-design.md`](./autoqueue-design.md)。

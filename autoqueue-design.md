# autoqueue 设计文档

> DSH 无人值守任务队列：接收 Markdown 任务，在不打扰普通前台会话的前提下自动执行、恢复、结算和归档。

版本 `0.3.0`。实现、RPC 形状和安全结论的精确审计基线是 **`@deepseek-ai/dsh 0.1.1-rc.2`**。插件清单接受 `>=0.1.1-rc.2 <0.1.2`，但不同版本仍需重新验证 Host session、goal 与选择状态语义。

## 1. 产品目标

autoqueue 同时满足两个核心要求：

1. **正常任务不打扰。** 没有问题时不提问、不弹审批、默认不发浏览器通知；Host 普通会话活跃时后台让行。
2. **不影响 DSH 主进程的普通执行。** 队列只操作自有 session，使用独立 cwd 和自有版本化 preset，不修改 Host 的模型、工作区或任意 Agent preset 选择，也不默认向普通会话注入额外工具。

它把一个队列任务映射为一个 DSH 专属会话和一个 durable goal；插件管理生命周期，Agent 管理任务内部的多步工作。

## 2. 非目标

- 不实现任务依赖图（`depends_on`）。复杂工作由单个无人值守 Agent 自行分解，或由外部编排器通过 HTTP API 创建多个任务。
- 不承诺分布式 exactly-once。实现用持久 ownership、admission marker、CAS generation 和定向 containment 尽力避免重复执行。
- 不把 Host 的全局选择器包装成“任务级能力”。rc.2 无法证明这类选择不会影响普通会话。
- 不默认改变所有 DSH 会话的 prompt/tool catalog。Host AI 工具必须显式 opt-in。
- 不承诺内核级进程/资源隔离。插件仍运行在同一 DSH Host 进程内；本文的“不影响主进程”指不修改普通会话或 Host 选择状态、前台优先和 fail-closed admission。要求 CPU/内存/崩溃域硬隔离时应部署独立 DSH Host。

## 3. 总体架构

```text
Markdown inbox ─┐
HTTP / external AI ─┼─→ index: auth + validation ─→ engine
React workstation ──┘                              │
                                                   ├─→ ledger: durable facts/CAS
                                                   ├─→ files: inbox/run artifacts
                                                   └─→ runner: owned DSH session/goal RPC
```

| 模块 | 作用 |
|---|---|
| `lib/index.js` | 装配 DSH 服务、owned presets、session approval policy、HTTP/SSE 和可选 AI 工具 |
| `lib/engine.js` | 扫描、调度、前台让行、派发、轮询、反阻塞、重试、动作和结算 |
| `lib/runner.js` | 所有 `apiProxy` RPC、session ownership 校验、goal 转移与清理 |
| `lib/ledger.js` | 原子账本、schema/容量、requestId 去重、generation CAS、并发和恢复 |
| `lib/files.js` | 收件箱、cron/ISO 解析、独立运行目录、安全报告 I/O |
| `lib/ai-tool.js` | 显式 opt-in 的 16 个 Host AI HTTP 薄客户端工具 |
| `client/src/` | React 工作台、抽屉/弹窗、HTTP/SSE controller |

三层持久化：

| 层 | 位置 | 权责 |
|---|---|---|
| 收件箱 | `$QUEUE_DIR/tasks/<key>.md` | 可脚本化任务源与调度声明 |
| 账本 | `$QUEUE_DIR/queue-ledger.json` | 权威状态、ownership、attempt、goal ref、execution、配置 |
| attempt 目录 | `$QUEUE_DIR/runs/YYYY-MM/<key>-aN-<random>/` | `.task.md`、`.目标.md`、`.结果.md`、`执行报告.md` |

## 4. 严格隔离设计

### 4.1 专属 session 命名空间

所有远端会话 ID 在 RPC 前生成并持久化，格式为：

```text
autoqueue-session-<uuid>
```

runner 对 history、prompt、goal、cancel、archive 的目标先做格式校验。外部 session ID 即使进入旧账本也不会被操作；批量归档在首个 mutation 前校验整批 ID。

这条边界解决“不能影响 DSH 主进程”的权限范围问题：插件无法把普通会话误当作队列会话清理或归档。

### 4.2 每 attempt 独立 cwd

每次派发或 retry 都建立新的运行目录。`sessions.create` 只接收预留 session ID、该 attempt 的 cwd，以及由引擎选择的 owned preset。

当前流程不调用 `workspace.create`，也不选择已有 Host 工作区。这样既避免修改 UI/Host 全局选择，也避免多个 attempt 覆盖同一份报告。

### 4.3 版本化 owned presets

执行模式由引擎根据正文自动判定：

| 模式 | 固定 preset ID | 用途 |
|---|---|---|
| standard | `autoqueue-unattended-v2` | 探索型和判断型任务 |
| PTC/code | `autoqueue-ptc-unattended-v2` | 步骤明确、批量文件、数据或代码任务 |

调用方不能选择 preset。插件首次创建 v2 时写入 `[autoqueue:unattended-discipline:v2]` 和无人值守 persona，并执行可收口加固：

- 禁用 ask-user、jobs、subagent control/list、subagent/fork 及其 codex/claude-code 变体、workflow、Ralph。
- bash/pwsh 设置 `enableRunInBackground: false`。
- persona 禁止 detached、daemon、background job、workflow、Ralph 和 child agent；所有命令都在当前 owned foreground turn 内结束。

这些工具产生的后台/子会话工作不携带 owned session ID，前台出现时无法由 pause-before-cancel 流程收口。后续加载要求 marker、纪律、disabled 字段和 shell 配置全部精确完整；发现外部同名或被篡改内容时启动失败，绝不覆盖。v1 preset 原样保留但不再执行，迁移通过新版本 ID 完成，而不是覆盖旧版本。

### 4.4 Approval policy 是 session 状态

rc.2 中“不请求审批”不能只靠 persona。插件在同进程 session store 上执行：

```text
setApprovalPolicy(ownedSession, "never")
→ sessions.flush(ownedSession)
→ effectiveApprovalPolicy(events) === "never"
```

顺序严格位于 `sessions.create/rename` 之后、`goals.create` 之前。session 不存在、store 不可用、flush 失败或回读不匹配，都会阻止任务入场并触发专属 session cleanup。

无人值守 preset 仍要求 Agent 不询问、不提权、把客观阻碍写入 GAP；持久 policy 是硬边界，prompt 是行为纪律，两者不能互相替代。

### 4.5 不改变 Host 选择状态

DSH rc.2 的公开选择接口会持久化 Host 默认路由。autoqueue 因此：

- 不调用 `session.selectModel`。
- 不创建或选择 Host 全局工作区。
- 不接受任意 Agent preset。
- 任务、配置、HTTP、AI 工具和 UI 都不开放这些覆盖。
- `/api/queue/options` 只返回三类空数组和 `isolation.overridesLocked`。

任务继承 Host 已有默认路由，但插件不主动读取、展示或改变它。

### 4.6 普通前台会话优先

每次新派发、replacement retry、wakeup 或 anti-block 远端干预前，engine 读取 `sessions.list`：

```text
列表可信且无活跃的非 autoqueue session → 可以推进
存在活跃的非 autoqueue session             → 让行
RPC 失败 / 列表缺失 / item 结构不可信        → 按“前台可能忙”处理并让行
```

这是一条 fail-safe 策略：不知道时也按前台忙碌处理。对于已在执行的 owned goal，engine 还会执行持久化 cooperative yield：

```text
persist pause intent
→ goals.pause（stale/uncertain 通过 history 收敛）
→ persist paused ref + cancel intent
→ sessions.cancel 当前 owned turn
→ 等 sessions.list 明确 running=false
→ 前台消失后 history + 第二次紧邻 resume 的可信空闲确认
→ goals.resume（不发 prompt）
→ clear foreground markers
```

pause-before-cancel 是硬顺序：绝不 cancel 一个仍 armed 的 durable goal。前台暂停状态保留在账本中，重启后不会被 wakeup/replacement 路径误启动。整个过程不取消、暂停、重命名或归档用户会话。

原生 `agent/status`、owned `goal/changed`、`session/disposed` 只触发 dirty latch，让这条收敛更快；它们不是控制事实。所有恢复、结算和前台门控仍由 `sessions.list` / history 权威读取决定，10 秒 watchdog 负责补漏事件。

### 4.7 Host AI 工具默认关闭

注册工具会改变所有普通会话的系统提示和 tool catalog，因此 `enableHostAiTools` 默认 `false`。只有显式设置 `true` 才注册 16 个 `autoqueue_*` 工具。外部 AI 走鉴权 HTTP/OpenAPI，不依赖这个开关。

## 5. 唯一启动入场路径

rc.2 的 goal driver 在 `goals.create` 后开始执行。任务正文不能同时通过 goal 和 prompt 入场，否则存在重复执行与只拿首行启动的竞态。

当前 launch 顺序：

```text
1. 创建 attempt workDir，写 .task.md
2. 使用账本已预留的 autoqueue session ID
3. 校验引擎派生的 owned preset
4. sessions.create({ sessionId, cwd, owned preset })
5. 返回 ID 必须和预留 ID 完全相同
6. sessions.rename({ title: task.key })
7. 持久化并验证 approvalPolicy=never
8. beforeGoal: 持久化 _goalAdmissionUncertain + ownership generation
9. goals.create({ objective: 完整任务, maxGoalRounds })
10. afterGoal: 原子持久化 goalRef，清除 admission marker
11. 发布运行成功
```

新 launch 不发送 `sessions.prompt(mode:'queue')`，也不存在第二个初始 prompt admission。anti-block steering 和 session-gone wakeup 是后续恢复干预，不是任务首次入场。

## 6. Admission containment

rc.2 的 mutation RPC 不能真正 abort。客户端 timeout 只说明“不再等待”，不能证明 Host 没有接纳操作。

因此每个不可逆 admission 前必须先持久化：

- 确切的专属 session ID
- 当前 task generation
- `_launchPending` / orphan cleanup 状态
- goal admission marker

结果分类：

| 证据 | 处理 |
|---|---|
| 明确 `ok:false` | 证明 RPC 被拒绝；确认 clear/cancel 后可重试 |
| timeout、异常、畸形成功响应 | 结果不确定；保持 ownership/quarantine，不自动建第二个 Agent |
| 有效 goal ref | 原子持久化 ref 后才能对外发布成功 |
| cleanup 未确认 | 持续有界探测，不以“可能不存在”释放 ownership |

所有异步 continuation 返回后比较 `_generation`。如果期间 stop、retry、dispose 或另一个 engine 已改变任务，旧 continuation 不能覆盖新状态。

## 7. 状态机

```text
pending ──admit──→ running ──goal complete──→ done
   ▲                  │
   │                  ├─ unrecoverable / limits ─→ failed
   │                  ├─ manual/deadline stop ───→ stopped
   │                  └─ legacy/imported state ──→ interrupted
   │
   └──── explicit rerun / confirmed retry ────────┘

archivedAt 是独立标志，不是状态。
```

合法状态共六个：`pending`、`running`、`done`、`failed`、`stopped`、`interrupted`。terminal 集合是 `done` / `failed` / `stopped` / `interrupted`。

默认 `autoArchive=true`：terminal 结算后归档插件自有 sessions，并设置 `archivedAt`；归档失败时不提前隐藏任务。任务级显式设置可覆盖此默认。

stop/deadline/timeout/cleanup 走另一条持久取消子状态：先落 cancel intent，再请求 DSH；`sessions.cancel=true` 只记录受理，不直接结算。只有两次因果上晚于受理的可信 idle/缺席观察后才能 stopped/retry。旧快照、未知列表、running 回弹、重启或新 goal ref 都不会释放 ownership。

## 8. 轮询、反阻塞与恢复

### 8.1 轮询

原生 runtime 事件会立即请求一次合并对账；每 10 秒仍由 watchdog 批量调用 `sessions.list`，再按任务读取 goal projection：

| phase/信号 | 行为 |
|---|---|
| `complete` | 写结果，状态 done，Webhook，按策略归档 |
| `blocked` | Host 可用时 steering + resume；达到上限后 failed |
| `active` / `running` | 静默记录轮次、活动时间和最新 ref |
| `paused` / dormant | 若为前台让行则双重空闲确认后 resume；其他 dormant 在 Host 可用时恢复，均不注入重复初始正文 |
| session 缺失 | 达阈值后先 wakeup；失败再走受控 retry |
| 列表/历史 unknown | 累计 `consecutiveUnknowns`，未达阈值不立即重建 |
| timeout | clear/cancel 确认后 bounded retry |
| deadline 命中 | clear/cancel，结算 stopped |

### 8.2 反阻塞

```text
goal.phase = blocked
→ blockedResumes < maxBlockedResumes ?
   ├─ 是：sessions.prompt(mode:'steer') → goals.resume → blockedResumes + 1
   └─ 否：failed
```

只 resume 没有新策略，Agent 可能马上再次 blocked；只 steering 不 resume，durable goal 仍未激活，所以必须两步完成。默认上限为 3。

### 8.3 限流

provider RATE_LIMIT/HTTP 429 使用指数退避，尊重受限的 provider retry-after。限流不消耗 attempt；退避基数默认 30 秒，上限默认 5 分钟。

### 8.4 重启恢复

- `running` 且没有 session ID 的 legacy 记录回到 pending。
- 带专属 session ID 的 running 记录保留 ownership，交给 poll/reconcile。
- launch/goal admission 不确定记录保持隔离并定向 containment。
- 账本里的 legacy prompt admission marker 继续 fail closed，但新 launch 不再产生它。
- foreground pause intent、paused ref 和 cancel-pending 都持久化；恢复只走双重空闲确认后的 `goals.resume`，不 wakeup、不 replacement。
- 恢复后的所有 goal mutation 先重新固化 `approvalPolicy=never`。

## 9. 调度

| 方式 | 字段 | 格式 | 语义 |
|---|---|---|---|
| 立即 | 无 | — | admission gate 允许后派发 |
| 一次性 | `schedule` | ISO 8601 | 到点执行一次 |
| 循环 | `cron` | 5 字段 | 每个匹配分钟执行，账本按分钟去重 |
| 相对超时 | `timeoutMs` | 毫秒 | attempt 启动后计时 |
| 绝对截止 | `deadline` | 5 字段 | 墙上时钟命中后收口 |

文件头形式：

```md
<!-- schedule: 2026-12-31T23:59:59Z -->
<!-- cron: 0 8 * * 1-5 -->
<!-- deadline: 0 21 * * * -->
# 任务标题
```

cron 使用本地时间，支持 `*`、数字、步长、范围和逗号；日与周同时受限时采用标准 OR 语义。

## 10. HTTP 与外部 AI

外部集成不需要解析本文：

| 步骤 | 端点 | 目的 |
|---|---|---|
| 1 | `/api/autoqueue/capabilities` | 发现版本、能力、限制、资源和隔离特性 |
| 2 | `/api/autoqueue/openapi.json` | 获取 OpenAPI 3.1 schema |
| 3 | `/api/queue/state?compact=1` | 获取不含正文/executions 的 LLM 列表投影 |
| 4 | `/api/queue/detail?key=...` | 按需获取正文、history 和报告 |

业务能力覆盖创建、更新、查询、详情、停止、重跑、归档、批量归档、恢复、删除、强制扫描、并发配置、运行时配置、已读状态与 SSE。

所有端点使用同一 Host/token 鉴权。未配置 token 时，仅 socket peer 与 Host header 都是 loopback 的本机直连免 token；远程或配置 token 后必须鉴权。Capabilities 与 OpenAPI 不返回 token 值。`/options` 返回：

```json
{
  "workspaces": [],
  "presets": [],
  "models": [],
  "isolation": {
    "strict": true,
    "overridesLocked": ["workspace", "agentPreset", "model"]
  }
}
```

## 11. UI 功能面

UI 不是只读监控页，而是安全核心能力的完整工作台。

### 11.1 信息架构

- 左侧：任务队列、正在推进、循环调度、定时执行、归档记录；每项都是带独立统计、文案、空态和动作的范围工作区。
- 顶部：隔离状态、前台优先、并发占用、立即检查任务、运行设置、新建任务、AI/API 接入。
- 正在推进：原生事件时间、权威对账、foreground gate、扫描时间和 watchdog；SSE 连接健康单独表达。
- 状态栏：只保留隔离、前台让行和并发占用；详细监控数据按需展开。
- 队列：搜索 + 状态筛选；任务类型、状态/隔离告警、计划、优先级、进度、attempt。

### 11.2 操作面

- 新建/编辑：正文、priority、schedule/cron/deadline、Goal 轮数、反阻塞、超时、attempt、Webhook、自动归档、通知。
- 行级动作：停止、编辑、重跑、归档、恢复、标记未读、删除 pending、跳转 owned session。
- 批量动作：多选非 running 任务并批量归档。
- 详情抽屉：概览、执行轨迹、Goal/结果/最终报告、调度/韧性策略和隔离状态。
- 设置抽屉：并发、超时、轮数、反阻塞、attempt、unknown 阈值、退避、默认 priority/deadline、Webhook、归档、通知；queueDir 只读。
- AI/API 抽屉：实时 Capabilities、16 个工具、中文资源与限制、options 隔离状态、OpenAPI、compact curl 与本机/远程鉴权说明；从不回显 token。

隔离覆盖不出现在任何表单中。详情的策略页只展示它们已锁定。

### 11.3 不打扰策略

看板关闭时 controller 不初始化状态/options/config，也不建立 SSE。用户主动打开后才加载，并在可见性恢复时刷新。浏览器通知默认关闭，只有用户在任务或全局策略中主动开启才请求权限。

## 12. 默认配置

捆绑安全默认值：

| 键 | 默认值 |
|---|---|
| `maxConcurrent` | `1` |
| `autoArchive` | `true` |
| `enableNotifications` | `false` |
| `enableHostAiTools` | `false` |
| `maxGoalRounds` | `40` |
| `maxBlockedResumes` | `3` |
| `unknownThreshold` | `3` |
| `maxAttempts` | `3` |
| `taskTimeoutMs` | `10800000` |
| `priority` | `5` |
| `scanIntervalMs` | `15000`（捆绑配置；代码兜底为 30000） |
| `retryBackoffBaseMs` | `30000` |
| `retryBackoffMaxMs` | `300000` |

`maxConcurrent` 持久化到账本；启动配置只在仍为初始值 1 时初始化。`queueDir`、Host/token、AI tool opt-in 和 base URL 是启动边界。

## 13. 已知边界

- 不保证分布式 exactly-once；不确定 admission 会选择永久隔离而不是冒险重派发。
- rc.2 的 RPC 无真正 cancellation；timeout 后的 containment 依赖专属 ID、history 和幂等清理。
- Webhook 只允许解析为公共地址的 http/https 目标，DNS 任一私网答案都会拒绝；失败不阻塞任务结算。
- 反阻塞仍可能失败，`maxBlockedResumes` 和 `maxGoalRounds` 是上限。
- 自动执行会消耗 Host 已配置路由的额度并在任务独立 cwd 内产生真实文件。
- 归档 session 没有通用“反归档” Host RPC；restore 恢复队列记录，不恢复已归档的历史 session。

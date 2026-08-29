# autoqueue 设计文档

> 无人值守任务队列插件 — 丢 .md 进收件箱 → AI 自动执行 → 产出报告
> 版本 0.2.0 · 基于 DSH 插件生态，所有 API 已对照源码验证

---

## 1. 这是什么

`autoqueue` 是运行在 DeepSeek Harness（DSH）Web 宿主上的「无人值守任务队列」插件。它把「丢一个 .md 任务进去，由 AI 自动执行完并产出报告」产品化成：

- **Host 侧引擎**：每 ~30s 扫描收件箱 → 用 `ctx.apiProxy` 派发一个真实会话去执行 → 轮询 goal 投影判定完成/阻塞 → 反阻塞 → 结算归档
- **Client 侧看板**：侧边栏「任务队列」入口，实时展示任务状态，支持新建/停止/归档/删除
- **AI 工具层**：9 个模型工具，让 AI 在对话中直接管理任务队列

**一句话**：DSH 的一个 Agent 会话 = 一个无人值守任务的执行载体；插件负责把「任务生命周期」映射到「DSH 会话生命周期」上。

---

## 2. 与 task-board 的差异

| 能力 | task-board (竞品) | autoqueue (我们) |
|---|---|---|
| 看板 UI | ✅ 5 列 kanban | ✅ 吸收其 UI 模式 |
| 真实 DSH 会话执行 | ✅ | ✅ |
| cron 定时调度 | ✅ | ✅ |
| SSE 实时推送 | ✅ | ✅ |
| 账本持久化 | ✅ | ✅ |
| 系统提示词注入 | ✅ | ✅ 无人值守纪律 |
| **反阻塞（anti-block）** | ❌ 直接判失败 | ✅ steering 唤醒 + resume |
| **收件箱模式** | ❌ | ✅ 丢 .md 就跑 |
| **自治执行纪律** | ❌ 依赖 agent 自觉 | ✅ 强制注入 + 反阻塞唤醒 |

task-board 解决的是「任务编排调度」，autoqueue 解决的是「无人值守自治」。两者互补。

---

## 3. 核心设计

### 3.1 一句话流程

```
丢 .md 进收件箱 → 扫描派发 → 创建会话 → 注入无人值守纪律 → 挂 goal
→ 轮询 goal.phase
  ├─ complete → 结算 done
  ├─ blocked  → 反阻塞：steering 唤醒 + resume goal（最多 3 次）
  ├─ active/running → 停滞检测 → 反阻塞
  └─ 超时/deadline → 结算 failed/stopped
→ 产出报告 → 标记未读 → 归档会话
```

### 3.2 反阻塞（Anti-Block）—— 核心差异化

DSH 的 goal 生命周期允许 agent 主动标记 `blocked`（「我做不了」）。在无人值守场景下，autoqueue 拦截 `blocked` 阶段，不直接判失败，而是：

```
pollRunning 检测到 goal.phase === 'blocked'
  │
  ├─ blockedResumes < maxBlockedResumes（默认 3）？
  │     ├─ 是 → steering 注入换方案指令 + resume goal → blockedResumes++
  │     └─ 否 → 结算为 failed
```

关键两步：先 `sessions.prompt(mode:'steer')` 注入新思路，再 `goals.resume()` 重新激活。仅 resume 不注入新指令可能立即再次 blocked；仅 steering 不 resume 则 goal 仍处于 blocked 状态。

**停滞检测**：agent 连续多轮处于 `active`/`running` 但无进展时，也会触发 steering 催促（`stallThreshold`，默认 10 轮）。

### 3.3 未读/已读标记

任务进入 terminal 状态（done/failed/stopped）后自动标记为未读。用户可通过 HTTP API、AI 工具或看板 UI 标记已读。未读判断逻辑：

- 只统计 terminal 状态的任务
- 已归档的不算
- 没有 `readAt` 或 `updatedAt > readAt` 视为未读

`unreadCount` 随快照一起返回，SSE 实时推送。

---

## 4. 架构

### 4.1 目录结构（实际实现）

```
├── package.json
├── cordis.patch.yml
├── lib/
│   ├── index.js          ← Host 入口：apply() 装配路由/定时器/SSE/AI工具
│   ├── engine.js          ← 编排层：扫描/派发/轮询/状态机/动作路由
│   ├── ledger.js          ← 账本：原子读写/并发/去重/reconcile
│   ├── files.js           ← 收件箱 I/O + 调度解析（cron/schedule/deadline）
│   ├── runner.js          ← 会话驱动：所有 apiProxy 调用集中在此
│   ├── ai-tool.js         ← AI 工具层：9 个模型工具 + 系统提示注入
│   └── client.js          ← 浏览器半：看板 UI + 侧边栏入口
├── docs/
│   ├── api.md             ← HTTP API 文档
│   └── core-api.md        ← 核心层内部 API 文档
├── AGENTS.md              ← AI 项目指引
└── README.md              ← 项目说明
```

### 4.2 模块职责

| 模块 | 核心导出 | 职责 |
|---|---|---|
| `index.js` | `apply(ctx, config)` | 装配入口：注册路由/SSE、启动定时器、注册 AI 工具 |
| `engine.js` | `createEngine(apiProxy)` | 编排：`scanPending` / `pollRunning` / `snapshot` / `applyAction` / `createTask` |
| `ledger.js` | `loadLedger`, `upsertEntry`, `snapshot`, `checkRequest` | 账本持久化：原子写入、requestId 去重、并发控制、重启 reconcile |
| `files.js` | `listTaskFiles`, `createRunDir`, `matchCron`, `atomicWrite` | 纯 I/O 函数：收件箱扫描、运行目录、调度解析、原子写入 |
| `runner.js` | `createRunner(apiProxy)` | 会话驱动：`launch` / `pollTask` / `antiBlock` / `wakeup` / `finalize` / `cancelTask` |
| `ai-tool.js` | `registerAiTool(ctx)` | 注册 9 个 AI 工具 + 系统提示（调度语法说明） |
| `client.js` | `apply(ctx)` | 看板 UI（React）：侧边栏入口、任务列表、新建/停止/删除 |

### 4.3 三层持久化

| 层 | 位置 | 内容 |
|---|---|---|
| 收件箱 | `~/.dsh/queue/tasks/<key>.md` | 任务源文本 + 文件头声明（schedule/cron/deadline） |
| 账本 | `~/.dsh/queue/queue-ledger.json` | 权威运行状态：key/status/attempts/blockedResumes/executions[] |
| 运行目录 | `~/.dsh/queue/runs/<ym>/<key>-<stamp>/` | `.task.md`、`执行报告.md`、`.结果.md`、`.目标.md` |

---

## 5. 执行模型

### 5.1 任务状态机

```
pending → running → done
                  → failed → pending (重试，未达上限)
                           → failed (终态，达上限)
                  → stopped (手动停止)
                  → interrupted (Host 重启)

archived 是独立布尔标志，不是状态。
```

### 5.2 一次完整执行

```
1. 投递
   收件箱 .md 文件 | POST /api/queue/task | AI 工具 autoqueue_create_task

2. 派发（scanPending，15s 定时）
   按优先级排序 → 调度检查（schedule/cron）→ 并发检查 → _dispatch

3. 启动（runner.launch）
   apiProxy.sessions.create → rename → prompt(mode:'queue') → goals.create

4. 轮询（pollRunning，10s 定时）
   apiProxy.sessions.history → projections.goal.goal.phase
     complete → 结算 done
     blocked  → antiBlock（steering + resume）
     active/running → 停滞检测 → antiBlock 催促
     unknown  → 连续失败计数 → 超阈值判定 failed

5. 结算（finalize）
   写 .目标.md / .结果.md → 补 executions[] → 归档会话 → 回调 webhook
```

### 5.3 重启恢复

Host 重启后，ledger 初始化时 `reconcileInterrupted()`：
- `running` 且无 `sessionId` → 回退 `pending`，下次扫描重派发
- `running` 且有 `sessionId` → 标记 `wakeupNeeded`，下次轮询时 `wakeup()` 重新激活

---

## 6. HTTP API

所有路由挂载在 `/api/queue/*` 下：

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/state` | 快照（支持 `?archived=1`） |
| `GET` | `/options` | 枚举工作区 + Agent 预设 |
| `GET` | `/detail?key=` | 任务详情（含报告） |
| `GET` | `/events` | SSE 实时推送（10s 快照 + 25s 心跳） |
| `POST` | `/task` | 创建任务 |
| `POST` | `/action` | 动作信封：stop / archive / restore / delete / rerun / update / force-scan / set-concurrency |
| `GET/POST` | `/config` | 运行时配置读写 |

---

## 7. AI 工具层

### 7.1 系统提示

注入调度语法说明，让 AI 理解 cron 和 ISO 8601 格式：

```
You have access to autoqueue tools for managing unattended background tasks.
Available tools: autoqueue_create_task, autoqueue_list_tasks, autoqueue_get_task,
autoqueue_update_task, autoqueue_stop_task, autoqueue_archive_task,
autoqueue_restore_task, autoqueue_delete_task, autoqueue_rerun_task.

Use these when the user asks to schedule, query, or modify background tasks.
Do NOT ask the user for a key — infer it from their request.

Scheduling: use schedule (ISO 8601) for one-time, cron (5-field) for recurring.
Common cron: daily 08:00 = "0 8 * * *", every 30min = "*/30 * * * *", ...
```

### 7.2 9 个工具

| 工具 | 功能 |
|---|---|
| `autoqueue_create_task` | 创建任务（key/content/priority/schedule/cron/deadline/webhook/maxGoalRounds/...） |
| `autoqueue_list_tasks` | 列出任务（含归档过滤） |
| `autoqueue_get_task` | 查看详情（状态/执行历史/报告） |
| `autoqueue_update_task` | 更新内容或配置 |
| `autoqueue_stop_task` | 停止运行中任务 |
| `autoqueue_archive_task` | 归档（隐藏 + 归档 DSH 会话） |
| `autoqueue_restore_task` | 还原归档任务 |
| `autoqueue_delete_task` | 永久删除 |
| `autoqueue_rerun_task` | 重新执行失败/停止的任务 |

所有工具通过 HTTP 透传到 engine，AI 不直接访问 engine 内部状态。

---

## 8. 调度

### 8.1 三种调度方式

| 方式 | 格式 | 示例 | 说明 |
|---|---|---|---|
| 立即执行 | 不声明 | — | 默认，创建后立即派发 |
| 一次性定时 | `schedule` (ISO 8601) | `2026-09-01T08:00:00Z` | 到点执行一次 |
| 循环定时 | `cron` (5 字段) | `0 8 * * 1-5` | 工作日每天 08:00 |

### 8.2 截止时间（deadline）

| 维度 | 字段 | 起算点 | 场景 |
|---|---|---|---|
| 相对超时 | `timeoutMs`（默认 90 分钟） | 任务启动 | "单次最多跑 30 分钟" |
| 绝对截止 | `deadline`（cron 5 字段） | 墙上时钟 | "每天 21:00 还没跑完就停" |

两者同时生效，先到先停。任务级配置覆盖全局配置。

### 8.3 文件头声明

```markdown
<!-- schedule: 2026-12-31T23:59:59Z -->
<!-- cron: 0 8 * * * -->
<!-- deadline: 0 21 * * * -->
# 任务标题

任务正文...
```

---

## 9. 配置参考

### 9.1 全局配置（cordis.patch.yml）

| 键 | 默认值 | 说明 |
|---|---|---|
| `maxGoalRounds` | 40 | 最大 goal 轮数 |
| `maxBlockedResumes` | 3 | 最大反阻塞次数 |
| `autoArchive` | false | 完成后自动归档 |
| `stallThreshold` | 10 | 连续 active 轮数后触发停滞检测 |
| `stallTimeoutMs` | 300000 | 单轮无 rounds 增长时的停滞超时（毫秒，默认 5 分钟） |
| `unknownThreshold` | 3 | 连续轮询失败后判定会话不可达 |
| `maxAttempts` | 3 | 派发重试上限 |
| `maxConcurrent` | 2 | 最大并发任务数（上限 8） |
| `scanIntervalMs` | 15000 | 收件箱扫描间隔 |
| `priority` | 5 | 默认优先级（1-10） |

### 9.2 任务级覆盖

通过 `autoqueue_create_task` 或 HTTP API 创建时可指定：`maxGoalRounds`、`maxBlockedResumes`、`timeoutMs`、`autoArchive`、`stallThreshold`、`stallTimeoutMs`、`unknownThreshold`、`maxAttempts`、`priority`、`webhook`、`workspace`、`agentPreset`、`model`、`deadline`。任务级配置覆盖全局配置。

---

## 10. 关键设计决策

### 10.1 为什么用收件箱模式

- 文件系统天然可持久化、可脚本化、可 Git 跟踪
- 适合自动化场景（脚本批量投递、CI 触发）
- Web 表单是上层封装，收件箱是底层

### 10.2 为什么反阻塞需要 steering + resume 两步

- 仅 resume：agent 被唤醒后没有新指令，可能立即再次 blocked
- 仅 steering：不 resume 的话 goal 仍处于 blocked 状态，续跑不会启动
- 两步结合：先注入新思路，再重新激活 goal

### 10.3 为什么 runner.js 集中所有 apiProxy 调用

- 单一职责：其他模块不碰 apiProxy，方便测试和替换
- 错误处理集中：所有 RPC 调用的错误处理逻辑在一起

### 10.4 为什么暂不实现依赖门控（depends_on）

1. **和核心模型冲突**：autoqueue 的本质是「一个任务 = 一个完整的 AI 会话」。AI agent 本身就具备串行执行多步工作的能力，不需要拆成多个任务再靠依赖串联。
2. **实现成本高，收益低**：需要任务间传参、依赖图解析（防死锁/防环）、重新设计派发逻辑。
3. **更好的替代方案**：如果未来需要任务间编排，让一个任务通过 AI 工具层调用 `autoqueue_create_task` 创建子任务并轮询等待结果，比静态的 `depends_on` 声明灵活得多。

---

## 11. 边界与已知限制

- **不保证 exactly-once**：消费即占位、running 跳过、goal 结算尽力避免重复派发，但不保证分布式意义上的精确一次
- **会话恢复未实现**：DSH 无「恢复归档会话」的通道，归档是一次性的
- **无人值守的副作用**：自动执行真实消耗模型 API 额度、操作真实工作区；最终判断权在模型
- **反阻塞的边界**：steering 注入后 agent 仍可能再次 blocked；`maxBlockedResumes` 兜底
- **active 阶段死循环**：由 `maxGoalRounds`（40 轮）兜底

---

## 12. 参考资源

| 资源 | 路径 |
|---|---|
| DSH API 速查表 | `../dsh-api-cheatsheet.md` |
| 插件源码 | `lib/` |
| 可学习 DSH 包 | `dsh-schedule` / `dsh-goal` / `dsh-headless` / `dsh-host-apiproxy` |
| task-board 竞品 | `node_modules/@linxin666/dsh-client-ui-task-board/` |
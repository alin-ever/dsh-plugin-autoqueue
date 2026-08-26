# autoqueue 设计文档

> 无人值守任务队列插件 — 丢 .md 进收件箱 → AI 自动执行 → 产出报告
> 版本 0.1.1 · 基于 DSH 插件生态，所有 API 已对照源码验证

---

## 1. 这是什么

`autoqueue` 是运行在 DeepSeek Harness（DSH）Web 宿主上的「无人值守任务队列」插件。它把「丢一个 .md 任务进去，由 AI 自动执行完并产出报告」产品化成：

- **Host 侧引擎**：每 ~15s 扫描收件箱 → 用 `ctx.apiProxy` 派发一个真实会话去执行 → 轮询 goal 投影判定完成/阻塞 → 反阻塞 → 结算归档
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
| **停滞检测** | ❌ | ✅ 连续 active 轮数超限触发 |
| **Webhook 回调** | ❌ | ✅ 终态通知外部系统 |
| **重启恢复（reconcile）** | ❌ | ✅ 识别中断会话并唤醒 |
| **收件箱模式** | ❌ | ✅ 丢 .md 文件自动派发 |
| **依赖门控（depends_on）** | ❌ | ⚠️ 暂不实现 |

---

## 3. 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                      调用方                             │
│  AI 对话  ←── autoqueue_create_task 等 9 个工具        │
│  浏览器  ←── /api/queue/* HTTP API                     │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / 函数调用
┌──────────────────────▼──────────────────────────────────┐
│                      engine.js                           │
│  编排层：扫描收件箱 → 按优先级派发 → 轮询结算 → 反阻塞    │
│  状态机：pending → running → done/failed/stopped         │
└──────────────────────┬──────────────────────────────────┘
       ┌───────────────┼───────────────┐
       │               │               │
┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│  ledger.js  │ │  runner.js │ │  files.js  │
│  账本       │ │  会话驱动  │ │  I/O       │
│  原子写入   │ │  apiProxy  │ │  收件箱    │
│  requestId  │ │  goals     │ │  cron 解析 │
│  去重       │ │  antiBlock │ │  原子写入  │
└─────────────┘ └────────────┘ └────────────┘
```

---

## 4. 模块职责

### `files.js` — 纯 I/O 层

```js
listTaskFiles()       // 扫描 ~/.dsh/queue/tasks/*.md
readTaskFile(key)     // 读取单个任务
removeTaskFile(key)   // 消费后清理
writeTaskFile(key)    // API 创建写盘
createRunDir(key)     // 为执行创建隔离目录
parseSchedule(raw)    // 解析 <!-- cron: --> 头
matchCron(cron)       // 5 字段 cron 匹配当前分钟
atomicWrite(file)     // tmp + rename + fsync
```

**关键设计**：
- 收件箱是 `~/.dsh/queue/tasks/` 目录，丢 .md 文件即入队
- 调度声明用文件头注释：`<!-- cron: 0 8 * * * -->`
- 原子写入防并发写损坏

---

### `ledger.js` — 账本

```js
upsertEntry(key, patch)  // 原子写入，+1 revision
findByKey(key)           // O(n) 查找
snapshot()               // 完整快照（供 SSE/HTTP）
checkRequest(reqId)      // 防重放
flushLedger()            // 立即刷盘
getConcurrency() / setConcurrency()
runningCount()           // 当前并行数
```

**关键设计**：
- 单文件 JSON，每次写入全量（任务量通常 < 100）
- `requestId` 去重防重复执行
- 模块加载时自动恢复中断会话

---

### `runner.js` — 会话驱动

```js
runner.launch(entry)        // 创建会话 → 命名 → 投 prompt → 挂 goal
runner.pollTask(entry)      // GET goals
runner.antiBlock(entry)     // steering + resume
runner.wakeup(sid, goal)    // 重启后重新激活
runner.cancelTask(sid, goal) // 清理 goal + session
runner.archiveSessions(entry) // 归档 DSH 会话
runner.isTimeout(startedAt)   // 超时检测
```

**无人值守 prompt 模板**：
```
[SYSTEM — 无人值守执行纪律]
1. 不要提问：没有人会回答你
2. 先自己解决：遇到困难先查文档、搜索、换方案
3. 记录 GAP：无法完成的写入 GAP.md
4. 产出报告：完成写入《执行报告.md》
5. 自评完成：做完后标记 complete
```

---

### `engine.js` — 编排层

**派发逻辑**（`scanPending`）：
1. 读取收件箱所有 .md 文件
2. 过滤已调度（schedule/cron 未到时间）的
3. 按优先级排序
4. 并发槽位空闲则派发

**轮询结算**（`pollRunning`）：
1. 每个 running 任务调 `runner.pollTask`
2. goal phase 处理：
   - `complete` → 结算 `done` + 归档
   - `blocked` → 反阻塞（steering + resume），次数上限后标记 `failed`
   - `active`/`running` 超 `stallThreshold` 轮 → 同样反阻塞
   - `unknown` 超 `unknownThreshold` 轮 → 标记 `failed`
3. 超时检测（`timeoutMs`）
4. 截止时间检测（`deadline` cron）

**状态机**：
```
pending ──→ running ──→ done
               │
               ├──→ failed（重试未达 maxAttempts → 回到 pending）
               └──→ stopped
```

**重启恢复**（`reconcileInterrupted`）：
- 无 sessionId 的 running → interrupted（launch 失败）
- 有 sessionId 的 running → 标记 wakeupNeeded（重启前正在执行）

---

### `ai-tool.js` — AI 工具层

注册 9 个工具：
- `autoqueue_create_task`
- `autoqueue_list_tasks`
- `autoqueue_get_task`
- `autoqueue_update_task`
- `autoqueue_stop_task`
- `autoqueue_archive_task`
- `autoqueue_restore_task`
- `autoqueue_delete_task`
- `autoqueue_rerun_task`

**设计原则**：工具层是薄客户端，通过 HTTP 调 `/api/queue/*`，不直接访问 engine。这样 AI 工具层和 HTTP API 层走同一条路径，行为一致。

---

### `index.js` — 插件入口

```js
apply(ctx, config) {
  // 1. 初始化 engine
  // 2. 注册 AI 工具 + 系统提示
  // 3. 创建默认工作区
  // 4. 启动定时器（scan 15s / poll 10s）
  // 5. 注册 HTTP 路由（state/action/task/config/options/detail/events）
  // 6. 返回 dispose 清理
}
```

---

## 5. 调度系统

### cron 表达式（5 字段）

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ 星期几（0-6，0=日）
│ │ │ └─── 月（1-12）
│ │ └───── 日（1-31）
│ └─────── 时（0-23）
└───────── 分（0-59）
```

支持：`*` / `*/N` / `N` / `N-M` / `N,M`

### 三种调度模式

| 字段 | 类型 | 含义 |
|---|---|---|
| `schedule` | ISO 8601 | 一次性定时执行 |
| `cron` | 5 字段 | 循环调度 |
| `deadline` | 5 字段 | 截止时间（到达后 force-stop） |

---

## 6. 反阻塞与停滞检测

### 反阻塞（anti-block）
- 触发：goal phase = `blocked`
- 动作：steering 注入换方案提示 + resume goal
- 次数上限：`maxBlockedResumes`（默认 3）

### 停滞检测
- 触发：goal phase 连续 `stallThreshold` 轮（默认 10）为 `active`/`running`
- 动作：同样 steering + resume，计入 `blockedResumes` 配额
- 耗尽后：标记 `failed`

---

## 7. 任务生命周期

```
                    ┌──────────────────────────────────┐
                    │           pending                 │
                    │  (收件箱 .md / API 创建)          │
                    └───────────────┬──────────────────┘
                                    │ scanPending 派发
                                    ▼
                    ┌──────────────────────────────────┐
                    │           running                 │
                    │  (DSH 会话执行中)                  │
                    └───────┬──────────────┬───────────┘
                            │              │
               poll 超时会话  │   goal.complete │
                            ▼              ▼
              ┌──────────────────┐  ┌──────────────────┐
              │     failed       │  │       done       │
              │  (超时/反阻塞上限) │  │  (结算 + 归档)    │
              └────────┬─────────┘  └──────────────────┘
                       │
              attempts < maxAttempts
                       │
                       ▼
              ┌──────────────────┐
              │     pending      │
              │   (重新入队重试)   │
              └──────────────────┘
```

**手动干预**：
- `stop`：停止任务（无论 pending/running/failed）
- `archive`：归档（隐藏列表 + 归档 DSH 会话）
- `restore`：还原归档任务
- `delete`：删除 pending 任务
- `rerun`：重跑 failed/stopped 任务

---

## 8. 并发控制

```js
// 全局并发上限
maxConcurrent: 2  // cordis.patch.yml 配置
                  // GET/POST /api/queue/config 动态调整

// 实际并发 = maxConcurrent - runningCount()
// scanPending 每次取 min(available, inFlight) 个任务
```

---

## 9. 数据目录结构

```
~/.dsh/queue/
├── queue-ledger.json    ← 账本（任务状态 + 元数据）
├── tasks/               ← 收件箱
│   ├── daily-report.md
│   └── weekly-review.md
└── runs/                ← 运行目录
    └── 2026-08/
        └── daily-report-2026-08-26T08:00:00.000Z/
            ├── .task.md           ← 任务副本
            ├── .目标.md           ← 目标快照
            ├── .结果.md           ← 结果 JSON
            └── 执行报告.md        ← AI 产出
```

---

## 10. 待实现

### 10.1 任务依赖门控（depends_on）
- 允许任务 B 依赖任务 A 完成后才能启动
- **暂不实现**：队列场景中任务应独立，依赖关系增加复杂度且收益有限

### 10.2 任务分组/标签
- 允许给任务打标签分类
- **暂不实现**：当前 key 已足够标识，分组可通过目录结构实现

### 10.3 执行日志流
- 实时查看 AI 执行过程
- **暂不实现**：goal 投影的详细信息不在当前 API 范围内

---

## 11. 设计决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 账本格式 | 单文件 JSON | 任务量小，简单可靠 |
| 原子写入 | tmp + rename + fsync | 防断电/崩溃损坏 |
| 调度解析 | 文件头注释 | 纯文本编辑器友好 |
| 反阻塞 | steering + resume | goal API 原生支持 |
| 并发控制 | 全局 maxConcurrent | 简单，不引入队列优先级复杂度 |
| 任务状态 | 5 值枚举 | pending/running/done/failed/stopped |
| 归档 | 独立布尔标志 | 不污染状态机 |
| 重启恢复 | reconcileInterrupted | 识别会话状态并唤醒 |
| 去重 | requestId + SHA-256 fingerprint | 防重放 + 防篡改 |
| HTTP API | RESTful + action 信封 | 统一入口，扩展灵活 |
| AI 工具 | 薄客户端透传 HTTP | 与 HTTP API 行为一致 |
| 收件箱 | 文件目录 | 人类可手动创建，调试友好 |
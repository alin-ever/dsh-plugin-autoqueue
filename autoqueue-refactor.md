# autoqueue 重构方案：站在 DSH 肩膀上

> 版本：v0.2（草案）
> 日期：2026-08-26
> 作者：基于 cordis preset 的 AI Agent

---

## 一、背景

autoqueue 当前实现了一个完整的"小型作业调度系统"——从原子写入的账本、cron 解析器、会话轮询引擎到状态机，几乎全部手写。但 DSH 本身已经提供了这些能力（`dsh-storage-json`、`dsh-schedule`、`dsh-jobs`），autoqueue 应该从"自己实现"转向"组合 DSH 原生能力"，把精力集中在真正不可替代的部分。

---

## 二、现状：autoqueue 做了什么

```
┌─────────────────────────────────────────────────────────┐
│                    autoqueue 当前架构                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  index.js          ← 插件入口：路由 + 定时器 + SSE + AI 工具  │
│  engine.js         ← 编排层：派发/轮询/反阻塞/状态机       │
│  runner.js         ← 会话驱动：所有 apiProxy 调用          │
│  ledger.js         ← 账本：原子读写/去重/并发控制/重启恢复   │
│  files.js          ← I/O 层：收件箱扫描/调度解析/原子写入    │
│  ai-tool.js        ← AI 工具层：9 个模型工具 + 系统提示     │
│  client.js         ← 浏览器看板：React UI + 侧边栏入口      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

7 个模块，其中 3 个（ledger.js、files.js、runner.js 的大部分）在重复 DSH 已有的能力。

---

## 三、DSH 原生能力盘点

### 3.1 dsh-storage-json — 持久化存储

```typescript
// 位置：@deepseek-ai/dsh-storage-json
// 能力：KV 持久化后端，原子写入，每 unit 一个 JSON 文件
// 配置：
interface Config {
  root: string;  // 存放 <unit>.json 的目录
}
// 用法（通过 ctx.storage 或 ctx.get('storage')）：
// 自动处理：原子写入、并发控制、文件锁、优雅关闭
```

**现在的 autoqueue**：`ledger.js` 手写 `openSync` + `fsyncSync` + `renameSync` 实现原子写入，约 60 行。

### 3.2 dsh-schedule — 调度引擎

```typescript
// 位置：@deepseek-ai/dsh-schedule
// 能力：会话级一次性/固定频率提醒，含时区支持、cron 解析、持久化
// 核心函数：
createAfterScheduleRecord(id, prompt, afterSeconds, now)  // 相对延时
createAtScheduleRecord(id, prompt, at, now)                // 绝对时间
createEveryScheduleRecord(id, prompt, everySeconds, now)   // 固定频率
resolveEveryOccurrence(record, acceptedAt)                 // 计算下次触发
scheduleView(record, now)                                  // 执行视图
canonicalizeTimeZone(value)                                // 时区规范化
```

**现在的 autoqueue**：`files.js` 手写 `matchCron()` 解析 5 字段 cron，约 40 行。

### 3.3 dsh-jobs — 后台作业注册表

```typescript
// 位置：@deepseek-ai/dsh-jobs + @deepseek-ai/dsh-jobs-local
// 能力：进程内后台作业注册、生命周期管理、完成通知
// 核心 API：
ctx.jobs.start(spec)           // 启动作业 → JobId
ctx.jobs.list(caller)          // 列出作业
ctx.jobs.get(id, caller)       // 查看作业
ctx.jobs.read(id, caller)      // 读取输出
ctx.jobs.kill(id, caller, reason)  // 停止作业
ctx.jobs.wait(id, timeoutMs, caller, signal)  // 等待完成
ctx.jobs.onJobDone(listener)   // 完成通知
ctx.jobs.attachController(name)  // 附加控制器
```

**现在的 autoqueue**：`runner.js` 手写 `pollTask()` 每 10s 轮询 goal phase。

---

## 四、重构方案

### 4.1 目标架构

```
┌──────────────────────────────────────────────────────────────┐
│                    autoqueue v2 架构                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌── 核心编排（不可替代，autoqueue 的真正价值）──────┐          │
│  │                                                     │      │
│  │  inbox scanner     → 监控收件箱目录，发现 .md 文件  │      │
│  │  dispatcher        → 创建 DSH 会话 + 注入 goal     │      │
│  │  anti-block        → 轮询 goal phase，steering +   │      │
│  │                      resume 唤醒阻塞的 Agent        │      │
│  │  settler           → 结算、归档、回调 webhook       │      │
│  │                                                     │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                              │
│  ┌── 底层能力（DSH 原生，直接注入）──────────────┐             │
│  │                                                 │         │
│  │  dsh-storage-json  → 账本持久化（替换 ledger.js）│         │
│  │  dsh-schedule      → 调度引擎（替换 files.js     │         │
│  │                      的 cron 解析）               │         │
│  │  dsh-jobs-local    → 后台作业跟踪（替换           │         │
│  │                      runner.js 的轮询层）          │         │
│  │                                                 │         │
│  └─────────────────────────────────────────────────┘         │
│                                                              │
│  ┌── 接口层（保留，autoqueue 独有）───────────────┐           │
│  │                                                 │         │
│  │  9 个 AI 工具  → autoqueue_create_task 等       │         │
│  │  7 个 HTTP 路由 → /api/queue/*                  │         │
│  │  React 看板    → 侧边栏任务队列 UI               │         │
│  │                                                 │         │
│  └─────────────────────────────────────────────────┘         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 模块变更清单

| 当前模块 | 变更 | 说明 |
|---|---|---|
| **ledger.js** | **删除**，替换为 `dsh-storage-json` | 用 DSH 原生 KV 持久化，不再手写原子写入 |
| **files.js** | **精简** | 保留收件箱扫描（`listTaskFiles`），删除 cron 解析（`matchCron`），改用 `dsh-schedule` |
| **runner.js** | **精简** | 保留 apiProxy 调用（sessions.create、goals.create、prompt），删除轮询逻辑，改用 `dsh-jobs` |
| **engine.js** | **保留并重构** | 核心编排逻辑不变，底层依赖换为 DSH 原生服务 |
| **ai-tool.js** | **保留** | 9 个工具的接口不变，内部实现可能微调 |
| **client.js** | **保留** | 看板 UI 不变 |
| **index.js** | **保留** | 插件入口不变，依赖注入调整 |

### 4.3 新依赖

```json
// package.json 新增
{
  "peerDependencies": {
    "@deepseek-ai/dsh-storage-json": "^0.1.1",
    "@deepseek-ai/dsh-schedule": "^0.1.1",
    "@deepseek-ai/dsh-jobs": "^0.1.1",
    "@deepseek-ai/dsh-jobs-local": "^0.1.1"
  }
}
```

### 4.4 cordis.patch.yml 变更

```yaml
# 当前
- insert:
    - id: autoqueue
      name: '@deepseek-ai/dsh-plugin-autoqueue'
      config:
        maxGoalRounds: 40
        maxBlockedResumes: 3
        # ...

# 新：需要确保 storage-json 和 schedule 在 autoqueue 之前加载
# 但 dsh-base 已经包含这些行，所以 autoqueue 只需要声明 inject
```

---

## 五、具体实现方案

### 5.1 账本：从 ledger.js 到 dsh-storage-json

**当前**：
```js
// ledger.js — 手写 200+ 行
function atomicWrite(file, content) { /* 60 行原子写入 */ }
function loadLedger() { /* 读取 + 解析 + reconcile */ }
function upsertEntry(key, patch) { /* 读 → 改 → 写 */ }
function flushLedger() { /* 确保写入磁盘 */ }
```

**新**：
```js
// 直接在 ctx 上使用 storage 服务
// 注入: ['storage']
const unit = await ctx.storage.backend('json').kv.open('autoqueue')
await unit.set('tasks', tasks)
const data = await unit.get('tasks')
```

### 5.2 调度：从 files.js 到 dsh-schedule

**当前**：
```js
// files.js — 手写 cron 解析
function matchCron(cron, now) {
  const [min, hour, dom, month, dow] = cron.trim().split(/\s+/)
  // 手写 5 字段匹配逻辑
}
```

**新**：
```js
// 使用 dsh-schedule 的调度能力
import { createAtScheduleRecord, createEveryScheduleRecord, resolveEveryOccurrence } from '@deepseek-ai/dsh-schedule'

// 一次性定时
const record = createAtScheduleRecord(id, prompt, { time: '2026-09-01T08:00:00Z', timezone: 'Asia/Shanghai' }, Date.now())

// 循环定时（每 24 小时 = 86400 秒）
const record = createEveryScheduleRecord(id, prompt, 86400, Date.now())
const { occurrenceAt, nextScheduledAt } = resolveEveryOccurrence(record, Date.now())
```

### 5.3 任务跟踪：从 runner.js 轮询到 dsh-jobs

**当前**：
```js
// runner.js — 手写轮询
const pollTimer = ctx.timer.interval(async () => {
  const hist = await apiProxy.sessions.history({ sessionId })
  const phase = hist.result.value.projections?.values?.goal?.goal?.phase
  if (phase === 'complete') finalize(sessionId, 'done')
  else if (phase === 'blocked') antiBlock(sessionId, goalRef)
  else if (phase === 'active') checkStall(sessionId)
}, 10000)
```

**新**：
```js
// 使用 dsh-jobs 注册任务
// 模型可以直接用 job_output / job_kill / job_list 管理
const jobId = ctx.jobs.start({
  kind: 'autoqueue-task',
  starter: () => {
    // 启动 DSH 会话
    // 返回可读的输出流
  },
})

// 通过 onJobDone 监听完成
ctx.effect(() => ctx.jobs.onJobDone((snapshot, owner) => {
  if (snapshot.status === 'done') { /* 结算 */ }
  if (snapshot.status === 'failed') { /* 反阻塞或重试 */ }
}))
```

---

## 六、精简后的文件清单

```
autoqueue-plugin/
├── package.json           # 新增 dsh-storage-json 等依赖
├── cordis.patch.yml       # 不变
├── lib/
│   ├── index.js           # 保留：插件入口，注入调整
│   ├── engine.js          # 保留并重构：核心编排逻辑
│   ├── runner.js          # 精简：只保留 apiProxy 调用，删除轮询
│   ├── ai-tool.js         # 保留：9 个 AI 工具
│   └── client.js          # 保留：看板 UI
│   # 删除 ledger.js       → 替换为 dsh-storage-json
│   # 删除 files.js 的调度部分 → 替换为 dsh-schedule
│   # 删除 runner.js 的轮询部分 → 替换为 dsh-jobs
```

**从 7 个模块精简到 5 个模块**，删除约 400 行自实现代码。

---

## 七、风险与注意事项

### 7.1 依赖风险

| 风险 | 缓解 |
|---|---|
| `dsh-storage-json` 的 API 可能与我们当前用法不匹配 | 先通过 `cordis_inspect_query` 确认完整 API 再改 |
| `dsh-schedule` 是会话级调度，autoqueue 需要的是全局级调度 | 可能需要用 `dsh-schedule` 的低级 API 而不是会话级工具 |
| `dsh-jobs` 的 `start()` 在当前 Agent 进程内运行，autoqueue 需要跨会话启动 | 需要用 `starter` 回调包装 `apiProxy.sessions.create` |

### 7.2 迁移风险

| 风险 | 缓解 |
|---|---|
| 现有账本格式不兼容 | 写迁移脚本，从 `queue-ledger.json` 读入 `dsh-storage-json` |
| 运行中的任务在升级后丢失 | 先 stop 所有任务 → 升级 → 再启动 |
| 新依赖不在 profile 中 | 更新 `package.json` 的 `peerDependencies`，用户需 `dsh plugin --profile web add ...` |

### 7.3 复杂度风险

引入 3 个新依赖意味着需要理解 3 个 DSH 原生包的 API。但这是"学习一次，永久受益"——以后 autoqueue 不再需要自己维护持久化、调度、作业跟踪的逻辑。

---

## 八、迭代计划

| 阶段 | 内容 | 预估工作量 |
|---|---|---|
| **P0** | 确认 `dsh-storage-json`、`dsh-schedule`、`dsh-jobs` 的完整 API（通过 `cordis_inspect_query`） | 1 轮 |
| **P1** | 替换 ledger.js → `dsh-storage-json` | 1 轮 |
| **P2** | 替换 files.js 调度部分 → `dsh-schedule` | 1 轮 |
| **P3** | 替换 runner.js 轮询部分 → `dsh-jobs` | 1 轮 |
| **P4** | 重构 engine.js 适配新底层 | 1 轮 |
| **P5** | 集成测试 + 迁移脚本 | 1 轮 |
| **P6** | 更新文档（README、autoqueue-design.md） | 1 轮 |

总计约 **6-7 轮迭代**，每轮约 1 次对话。

---

## 九、总结

```
重构前：autoqueue = 自己实现一切（7 个模块，~1500 行）
重构后：autoqueue = 核心编排（~600 行） + DSH 原生能力（3 个包）
                       ↓                         ↓
                  不可替代的价值              巨人的肩膀
```

- **删除**：`ledger.js`（~200 行）、`files.js` 的调度部分（~40 行）、`runner.js` 的轮询部分（~100 行）
- **保留**：收件箱扫描、反阻塞、跨会话编排、看板 UI、AI 工具
- **新增依赖**：`dsh-storage-json`、`dsh-schedule`、`dsh-jobs`
- **核心价值不变**：丢 .md 文件 → 无人值守执行 → 反阻塞 → 产出报告
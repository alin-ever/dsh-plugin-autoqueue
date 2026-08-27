# autoqueue 重构方案评估报告

> 对 `autoqueue-refactor.md` v0.2 的逐项审查
> 日期：2026-08-26
> 评估人：基于实际 DSH 源码（`.d.ts` 类型定义 + 插件源码）验证

---

## 总评

**方向正确，但具体替换项存在根本性架构错配。** 提案的核心理念——"站在 DSH 肩膀上，减少重复造轮子"——是好的。但三个替换项中有两个（`dsh-schedule`、`dsh-jobs`）与 autoqueue 的实际需求不匹配，建议不采纳。唯一可行的替换（`dsh-storage-json`）也需要先修正 API 假设。

---

## 评估方法

所有 DSH 原生包的 API 验证均基于实际安装的 `@deepseek-ai/dsh-*` 包的 `.d.ts` 类型定义文件，而非提案文档的假设。

---

## 逐项评估

### 替换一：`ledger.js` → `dsh-storage-json`

| 项目 | 内容 |
|---|---|
| 当前文件 | `lib/ledger.js`，312 行 |
| 提案建议 | 删除 ledger.js，替换为 `dsh-storage-json` 的 KV 存储 |
| 评估结论 | **有条件采纳** — 需要修正 API 用法，且不能简单删除 |

#### 提案的 API 假设

```js
// 提案假设的写法（不准确）
const unit = await ctx.storage.backend('json').kv.open('autoqueue')
await unit.set('tasks', tasks)
```

#### 实际 API（`dsh-storage-json` 类型定义）

`dsh-storage-json` 是一个 Cordis 插件，注册为 `json` 后端到 storage hub 上。核心能力是 `KvUnit`：

```ts
// 位置：@deepseek-ai/dsh-storage-json/lib/types/unit.d.ts
export function openJsonUnit(
  descriptor: KvUnitDescriptor,
  path: string,
  onClose: () => void
): Promise<KvUnit>
```

各写入操作原子重写整个文件（与 autoqueue 当前的 `atomicWrite()` 模式一致）。

#### 实际收益分析

| 当前 ledger.js 的能力 | 能否被 dsh-storage-json 替代 | 说明 |
|---|---|---|
| 原子写入（`atomicWrite`） | ✅ 可替代 | DSH 原生 KV unit 自带原子写入 |
| 防抖提交（`commit` 的 setTimeout） | ✅ 可替代 | 底层自动处理，上层可简化 |
| Schema 版本管理（`SCHEMA_VERSION`） | ❌ 需保留 | DSH KV 不关心版本，autoqueue 需要独立迁移 |
| requestId 去重（`checkRequest`） | ❌ 需保留 | 业务逻辑，DSH KV 不提供 |
| 重启恢复（`reconcileInterrupted`） | ❌ 需保留 | 业务逻辑，DSH KV 不提供 |
| 运行中任务计数（`runningCount`） | ❌ 需保留 | 业务逻辑，DSH KV 不提供 |
| 并发控制（`clampConcurrency`） | ❌ 需保留 | 业务逻辑，DSH KV 不提供 |

**实际减负：约 60 行**（`atomicWrite` 的实现 + 文件路径管理），而非提案声称的 200 行。

#### 前置条件

1. 需要通过 `cordis_inspect_query` 确认 `KvUnit` 的完整接口（`set`、`get`、`delete`、`list` 等）
2. 需要确认 `dsh-storage-json` 的依赖关系：它是 `dsh-base` 的组成部分，autoqueue 的 `package.json` 是否需要显式声明 `peerDependencies`
3. 需要编写数据迁移脚本：从 `queue-ledger.json` 格式迁移到 `dsh-storage-json` 的 unit 格式

#### 建议

**P2 优先级**。作为一次技术债务清理，在确认 API 后将 `ledger.js` 的底层持久化层替换为 DSH 原生 KV，但 `ledger.js` 的业务逻辑层（去重、状态机、恢复）保留，封装为更薄的模块。

---

### 替换二：`files.js` cron 解析 → `dsh-schedule`

| 项目 | 内容 |
|---|---|
| 当前文件 | `lib/files.js`，274 行（其中 `matchCron` 约 40 行） |
| 提案建议 | 删除 `matchCron`，替换为 `dsh-schedule` 的调度 API |
| 评估结论 | **不采纳** — ROI 为负，架构层级不匹配 |

#### 提案的 API 假设

```js
import { createAtScheduleRecord, createEveryScheduleRecord, resolveEveryOccurrence } from '@deepseek-ai/dsh-schedule'

const record = createAtScheduleRecord(id, prompt, { time: '2026-09-01T08:00:00Z', timezone: 'Asia/Shanghai' }, Date.now())
const record = createEveryScheduleRecord(id, prompt, 86400, Date.now())
```

#### 实际 API（`dsh-schedule` 类型定义）

`dsh-schedule` 是**会话级（session-level）** 的提醒系统：

```ts
// 位置：@deepseek-ai/dsh-schedule/lib/types/index.d.ts
// 设计用途：给当前 Agent 设置定时提醒
// 核心函数：
createAfterScheduleRecord(id, prompt, afterSeconds, now)  // 相对延时
createAtScheduleRecord(id, prompt, at, now)                 // 绝对时间
createEveryScheduleRecord(id, prompt, everySeconds, now)    // 固定频率
resolveEveryOccurrence(record, acceptedAt)                  // 计算下次触发
```

#### 架构错配分析

| 维度 | dsh-schedule（会话级） | autoqueue 需要（全局级） |
|---|---|---|
| 作用域 | 单个 Agent 会话 | 整个服务进程 |
| 触发方式 | 会话事件日志中注入提醒 | 扫描引擎定时检查 cron 匹配 |
| 持久化 | 跟随会话事件日志 | 独立账本 |
| 用例 | "5 分钟后提醒我" | "每天 08:00 检查哪些任务需要执行" |

`matchCron()` 的用途很简单：给定一个 5 字段 cron 表达式和当前时间，判断是否匹配。这是 **40 行纯函数**，零依赖，已经过生产验证。

#### 成本收益分析

| 成本项 | 估算 |
|---|---|
| 保留 `matchCron` | 40 行代码，零维护成本 |
| 换成 `dsh-schedule` | 新增依赖 + 新增 API 适配 + 新增部署配置 + 持续跟踪版本兼容性 + 额外约 20 行胶水代码 |

引入一个完整包来替换 40 行稳定代码，收益为负。

#### 建议

**不改。** `matchCron()` 留在原地。

---

### 替换三：`runner.js` 轮询 → `dsh-jobs`

| 项目 | 内容 |
|---|---|
| 当前文件 | `lib/runner.js`，283 行 |
| 提案建议 | 删除轮询逻辑，替换为 `dsh-jobs` 的作业跟踪 |
| 评估结论 | **不采纳** — 根本性架构错配，会毁掉 autoqueue 的核心差异化 |

#### 提案的 API 假设

```js
const jobId = ctx.jobs.start({
  kind: 'autoqueue-task',
  starter: () => {
    // 启动 DSH 会话
    // 返回可读的输出流
  },
})
ctx.effect(() => ctx.jobs.onJobDone((snapshot, owner) => {
  // 结算
}))
```

#### 实际 API（`dsh-jobs` 类型定义）

`dsh-jobs` 是**进程内后台作业注册表**：

```ts
// 位置：@deepseek-ai/dsh-jobs/lib/types/index.d.ts
export abstract class JobRegistry extends Service {
  abstract start(spec: JobStart): JobId;   // starter 在当前进程内同步执行
  abstract list(caller?: Agent): JobSnapshot[];
  abstract get(id: JobId, caller?: Agent): JobSnapshot;
  abstract read(id: JobId, caller?: Agent): JobRead;
  abstract kill(id: JobId, caller?: Agent, reason?: string): 'requested' | 'already-finished';
  abstract wait(id: JobId, timeoutMs: number, caller?: Agent, signal?: AbortSignal): Promise<JobSnapshot>;
  abstract onJobDone(listener: JobDoneListener): () => void;
  abstract attachController(name: string): () => void;
}
```

#### 根本性架构错配

autoqueue 管理的不是"进程内后台任务"，而是**独立的 DSH Agent 会话的生命周期**。这是两个完全不同的抽象层次：

```
dsh-jobs 的抽象：
  └── 当前 Agent 进程内启动一个后台任务
       └── 任务在当前进程的线程/worker 中执行
       └── 输出通过 process.stdout / 流返回

autoqueue 的抽象：
  └── 通过 apiProxy 创建一个独立的 DSH Agent 会话
       └── 该会话在另一个进程（或线程）中独立运行
       └── 状态通过 sessions.history().projections.goal.phase 跟踪
       └── 反阻塞：phase === 'blocked' → steering + resume
       └── 停滞检测：连续 active 轮数超阈值 → steering 催促
       └── 超时/截止：墙上时钟 vs 任务启动时间
```

#### 核心能力对比

| autoqueue 的 runner.js 能力 | dsh-jobs 能否提供 | 说明 |
|---|---|---|
| 跨会话创建（`sessions.create`） | ❌ | dsh-jobs 在本进程内 |
| Goal 生命周期管理（`goals.create`/`resume`/`clear`） | ❌ | dsh-jobs 没有 goal 概念 |
| 反阻塞（steering + resume） | ❌ | **autoqueue 核心差异化**，dsh-jobs 无此能力 |
| 停滞检测（连续 active 轮数） | ❌ | dsh-jobs 没有 phase 概念 |
| 结算写报告 + 归档会话 | ❌ | dsh-jobs 只有输出流 |
| 唤醒重启（`wakeup`） | ❌ | dsh-jobs 进程内，重启即消失 |
| 归档会话（`archiveSessions`） | ❌ | dsh-jobs 不管理会话 |

**`runner.js` 中实际的轮询代码只有 `pollTask()` 约 12 行**——真正的轮询循环在 `engine.js` 中。而这 12 行代码是 autoqueue 反阻塞能力的"眼睛"，没有它，整个 anti-block 机制无法工作。

#### 建议

**绝对不能改。** 这会毁掉 autoqueue 的核心差异化能力。

---

## 整体评估汇总

### 提案核心主张验证

| 提案主张 | 验证结果 |
|---|---|
| "7 个模块中 3 个（ledger.js、files.js、runner.js 的大部分）在重复 DSH 已有的能力" | **部分正确** — `ledger.js` 的持久化层确实重复了，但 `files.js` 的 cron 解析（40 行）和 `runner.js` 的轮询（12 行）是 autoqueue 的独特价值，DSH 没有对应能力 |
| "删除约 400 行自实现代码" | **高估** — 实际可安全删除的约 60 行（`atomicWrite` 的实现） |
| "7 个模块精简到 5 个模块" | **不准确** — 即使替换了 storage，业务逻辑仍然需要保留，只是底层存储换了个接口 |
| "引入 3 个新依赖意味着需要理解 3 个 DSH 原生包的 API" | **低估风险** — 其中两个（`dsh-schedule`、`dsh-jobs`）与 autoqueue 需求不匹配 |

### 每个替换项的建议

| 替换项 | 评估 | 建议 | 优先级 |
|---|---|---|---|
| `ledger.js` → `dsh-storage-json` | 有条件可行 | 调研后确认 API，替换底层持久化 | P2 |
| `files.js` cron → `dsh-schedule` | 不推荐 | 40 行稳定代码，ROI 为负 | 不改 |
| `runner.js` 轮询 → `dsh-jobs` | 架构错配 | 会毁掉 autoqueue 核心差异化 | 绝对不能改 |

---

## 真正的改进方向

如果确实要重构，**更务实的方案**是：

```
P0: 创建 unattended Agent Preset
    └── 让 autoqueue 派发任务时使用无人值守预设
    └── 从 standard 复制，修改 persona、禁用 tool-ask-user
    └── 这是"从根本上解决问题"的方向

P1: 调研 dsh-storage-json 的 KvUnit 接口
    └── 通过 cordis_inspect_query 确认完整 API
    └── 如果匹配，替换 ledger.js 的底层持久化层
    └── 保留 ledger.js 的业务逻辑（去重、状态机、恢复）

P2: 其余不变
    └── matchCron() 留在原地（40 行，稳定，零依赖）
    └── runner.js 的轮询保留（autoqueue 的核心差异化）
    └── engine.js 的编排逻辑保留（autoqueue 的独特价值）
```

---

## 附录：验证依据

以下文件已被实际读取验证：

| 文件 | 用途 |
|---|---|
| `lib/ledger.js`（312 行） | 当前账本实现 |
| `lib/files.js`（274 行） | 当前 I/O 层 + cron 解析 |
| `lib/runner.js`（283 行） | 当前会话驱动层 |
| `dsh-storage-json/lib/types/index.d.ts` | 实际 API 定义 |
| `dsh-storage-json/lib/types/unit.d.ts` | KvUnit 接口定义 |
| `dsh-jobs/lib/types/index.d.ts` | 实际 API 定义 |
| `dsh-schedule/lib/types/index.d.ts` | 实际 API 定义 |
| `dsh-jobs-local/lib/types/index.d.ts` | 实际实现 |
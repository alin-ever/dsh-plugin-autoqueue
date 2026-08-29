# queue-plugin Bug Report

> 扫描时间：2026-07-xx
> 扫描范围：lib/ 下全部 7 个源文件 + docs/ + AGENTS.md
> 总计发现：**3 个严重 Bug + 5 个中等问题 + 4 个低优先级问题**

---

## 🔴 严重 Bug（会导致运行时错误 / 功能完全失效）

### Bug 1 — `unknownThreshold` 引用未定义的变量（client.js:1277）

**位置：** `lib/client.js` 第 1277 行

**现象：** `ConfigPanel` 组件渲染时引用 `unknownThreshold` 和 `setUnknownThreshold`，但这两个变量从未在组件内声明为 React `useState`。

```js
// lib/client.js:1277
e("input", { type: "number", min: "1", max: "100", value: unknownThreshold, onChange: (ev) => setUnknownThreshold(ev.target.value) })
```

`ConfigPanel` 函数（第 1186 行）内声明的 state 变量共 15 个（maxConcurrent、maxGoalRounds、maxBlockedResumes、autoArchive、stallThreshold、maxAttempts、defaultDeadline、queueDir、enableNotifications、webhook、workspace、agentPreset、model、priority），但**没有** `unknownThreshold` / `setUnknownThreshold`。

**后果：** 打开「运行时配置」面板时会触发运行时 JavaScript 错误（`ReferenceError: unknownThreshold is not defined`），ConfigPanel 无法渲染。

**修复建议：**
1. 在 `ConfigPanel` 中添加 state：
   ```js
   const [unknownThreshold, setUnknownThreshold] = React.useState(String(config.unknownThreshold ?? 10));
   ```
2. 在 `handleSave` 中提交：
   ```js
   patch.unknownThreshold = parseInt(unknownThreshold, 10);
   ```
3. 在 `engine.js` 的 `engineConfig` 中添加 `unknownThreshold` 默认值，并在 `setConfig` 中支持该字段。
4. 在 `_pollOne` 的 `unknown` case 中实现计数逻辑（见 Bug 2）。

---

### Bug 2 — `consecutiveUnknowns` 永远不会被递增（engine.js:623-629）

**位置：** `lib/engine.js` 第 623-629 行，`_pollOne` 方法的 `case "unknown":` 分支

**现象：** 当 `pollTask` 返回 `phase: "unknown"` 时，代码直接 `break`，**既不递增 `consecutiveUnknowns`，也不触发任何重试或失败逻辑**。

```js
case "unknown":
default: {
  // session 活着（已通过 sessionAlive 检查）→ "unknown" 很可能是
  // rate limit / API 瞬态错误，不要累计重试，避免误发 wakeup 消息
  // 只记录日志，等待下一轮自然恢复
  break;
}
```

虽然代码注释说"不要累计重试"，但这导致 `consecutiveUnknowns` 字段在所有其他分支都被重置为 0，却**从未被设置过非零值**。该字段在 ledger schema 中存在、在 UI 配置面板中有对应输入框（Bug 1），但实际逻辑完全空缺。

**后果：** 如果 DSH API 持续返回 `unknown` phase（如持续 rate limit），任务会永远处于 `running` 状态，直到 `maxGoalRounds` 或 `timeoutMs` 兜底。设计的「连续 unknown 判定不可达」功能完全失效。

**修复建议：** 在 `unknown` case 中递增计数器，超过阈值后调用 `retryExecution(entry, "unknown")`：
```js
case "unknown": {
  const unknownLimit = entry.unknownThreshold ?? engineConfig.unknownThreshold ?? 10;
  const newUnknowns = (entry.consecutiveUnknowns ?? 0) + 1;
  if (newUnknowns >= unknownLimit) {
    await engine.retryExecution(entry, "unknown");
  } else {
    upsertEntry(entry.key, { consecutiveUnknowns: newUnknowns });
  }
  break;
}
```

---

## 🟠 中等问题（功能缺陷 / 数据不一致）

### Bug 3 — `formatTimestamp` 在循环内可能返回相同值（engine.js:165-173）

**位置：** `lib/engine.js` 第 165-173 行，`createTask` 方法的 key 自动生成逻辑

**现象：**
```js
if (!key) key = `task-${formatTimestamp()}`;
let resolvedKey = key;
let attempt = 0;
while (findByKey(resolvedKey)) {
  attempt++;
  resolvedKey = `${key}-${formatTimestamp()}`;  // ← 同一秒内调用返回相同值
  if (attempt > 10) resolvedKey = `${key}-${Date.now()}`;
}
```

`formatTimestamp()` 粒度为秒（`YYYYMMDD-HHmmss`）。如果在同一秒内多次进入 `while` 循环，每次调用都返回相同值，导致 `resolvedKey` 不变，循环无法通过碰撞检测，必须等到 `attempt > 10` 才降级到 `Date.now()`。

**后果：** 同一秒内快速创建多个同名任务时，会多执行 10 次无用的 `findByKey` 查询。概率较低，但在高频场景下可复现。

**修复建议：** 在循环内使用 `Date.now()` 作为唯一后缀，或改用单调递增计数器：
```js
while (findByKey(resolvedKey)) {
  attempt++;
  resolvedKey = `${key}-${Date.now()}-${attempt}`;
}
```

---

### Bug 4 — `matchCron` 不识别周日=7（files.js:201-238）

**位置：** `lib/files.js` 第 220-238 行，`matchField` 函数

**现象：** JavaScript 的 `Date.getDay()` 返回 `0=周日, 1=周一, ..., 6=周六`。标准 cron 表达式中周日可以用 `0` **或** `7` 表示。但 `matchField` 的最终分支是 `parseInt(field, 10) === value`，当 `field === "7"` 时，`7 === 0` 为 false，导致周日=7 的 cron 表达式匹配失败。

**后果：** 用户编写 `0 8 * * 7`（每周一早上 8 点，用 7 表示周日）时，表达式永远不会触发。

**修复建议：** 在 `matchField` 中将 `7` 视为 `0`：
```js
// 精确值
const parsed = parseInt(field, 10);
if (parsed === 7) return value === 0; // cron 中 7 和 0 都代表周日
return parsed === value;
```

---

### Bug 5 — `ai-tool.js` 中 `stallThreshold` 默认值描述与代码不一致（ai-tool.js:127）

**位置：** `lib/ai-tool.js` 第 127 行

**现象：** AI 工具描述中说：
```
stallThreshold: "Consecutive active polls before anti-block. Default 10."
```

但 `engine.js` 第 33 行的实际默认值是 **60**：
```js
stallThreshold: options.stallThreshold ?? 60, // 60 轮 ≈ 10 分钟，匹配 stallTimeoutMs
```

**后果：** AI 助手根据工具描述告诉用户默认值是 10，但实际运行中是 60，可能导致用户对停滞检测行为产生误解。

**修复建议：** 更新 ai-tool.js 中的描述为 "Default 60."

---

### Bug 6 — `ConfigPanel` 缺少 `stallTimeoutMs`、`retryBackoffBaseMs`、`retryBackoffMaxMs` 配置项（client.js:1186-1221）

**位置：** `lib/client.js` 第 1186-1221 行

**现象：** `engineConfig` 支持以下字段，但 ConfigPanel UI 完全没有暴露：
- `stallTimeoutMs`（停滞超时毫秒，默认 600000 = 10 分钟）
- `retryBackoffBaseMs`（重试退避基数，默认 30000 = 30 秒）
- `retryBackoffMaxMs`（重试退避上限，默认 300000 = 5 分钟）

后端 `setConfig` 支持这些字段（engine.js:108-147），但前端配置面板没有对应的输入控件。

**后果：** 用户无法通过 UI 调整这些重要参数，只能通过修改配置文件或 HTTP API 设置。

**修复建议：** 在 ConfigPanel 中添加对应的 state 和 input 控件，并在 `handleSave` 中提交。

---

## 🟡 低优先级问题（设计/语义瑕疵）

### Bug 7 — `interrupted` 状态从未被赋值（ledger.js:26, engine.js 全局）

**位置：** 状态机定义处

**现象：** 设计文档和 ledger schema 中定义了 `interrupted` 状态（Host 重启后的中间态），但源码中**没有任何地方将 status 设置为 `"interrupted"`**。`reconcileInterrupted()` 只处理 `running` 且无 `sessionId` 的情况，将其回退为 `pending`。

**后果：** `interrupted` 是一个死状态，不影响功能，但造成文档与实现的偏差。

**修复建议：** 要么在 Host 重启时将 `running` 任务标记为 `interrupted` 再由 reconcile 处理，要么从文档中移除该状态。

---

### Bug 8 — `stopTask` 允许对 `failed` 状态的任务执行停止操作（engine.js:736-749）

**位置：** `lib/engine.js` 第 739 行

**现象：**
```js
if (entry.status === "stopped" || entry.status === "done") return { ok: false, error: "任务已终止" };
```

只拦截了 `stopped` 和 `done`，但没有拦截 `failed`。对已失败的任务调用 stop 会执行 `runner.cancelTask`（尝试取消一个可能已不存在的 session），然后设置状态为 `stopped`。

**后果：** 功能上不会崩溃（cancelTask 内部有 try/catch），但语义混乱——`failed` 任务被改为 `stopped` 状态，执行历史不准确。

**修复建议：** 在条件中加入 `failed`：
```js
if (entry.status === "stopped" || entry.status === "done" || entry.status === "failed") return { ok: false, error: "任务已终止" };
```

---

### Bug 9 — `scanPending` 中同时设置了 `schedule` 和 `cron` 时只检查 `schedule`（engine.js:288-295）

**位置：** `lib/engine.js` 第 288-295 行

**现象：**
```js
if (task.schedule?.schedule) {
  const scheduledAt = new Date(task.schedule.schedule).getTime();
  if (Date.now() < scheduledAt) skipDueToSchedule = true;
}
if (!skipDueToSchedule && task.schedule?.cron) {
  if (!matchCron(task.schedule.cron)) skipDueToSchedule = true;
}
```

如果同时设置了 `schedule`（一次性定时）和 `cron`（循环定时），且 schedule 时间已过，则只检查 cron。这意味着 schedule 是一次性的，过了之后任务转为 cron 循环模式。这个行为可能是有意的，但文档中没有说明。

**后果：** 行为不明确，可能导致用户困惑。

**修复建议：** 在文档中补充说明，或在 `buildFileContent` 中禁止同时设置两者。

---

### Bug 10 — `cron` 任务完成时 `executions` 数组保留历史但 UI 不展示跨周期报告（engine.js:529-547）

**位置：** `lib/engine.js` 第 529-547 行

**现象：** Cron 任务完成后，`executions` 数组保留所有周期的执行记录，但每次新周期会创建新的 `workDir`。旧周期的报告文件（`.目标.md`、`.结果.md`、`执行报告.md`）留在旧目录中。`getTaskDetail` 只读取当前 `entry.workDir` 下的报告，因此只能看到最近一次的报告。

**后果：** 历史周期的执行报告无法通过 detail API 获取，只能通过手动访问文件系统查看。

**修复建议：** （可选优化）在 cron 任务结算时复制报告到统一位置，或在 detail API 中遍历所有 executions 的 workDir 读取报告。

---

## 总结

| 严重程度 | 数量 | 关键项 |
|---|---|---|
| 🔴 严重 | 2 | `unknownThreshold` 未定义（崩溃）、`consecutiveUnknowns` 永不递增（功能失效） |
| 🟠 中等 | 4 | timestamp 碰撞、cron 周日 7 不兼容、默认值描述不一致、UI 缺配置项 |
| 🟡 低优 | 4 | interrupted 死状态、stopTask 语义、schedule+cron 共存、cron 历史报告 |

**最高优先级修复：** Bug 1（运行时崩溃）和 Bug 2（未知 phase 无法判定失败）。

# autoqueue 插件 Bug 报告

> 审查日期：2025-07-17
> 版本：0.3.0（`package.json`）
> 审查范围：`lib/` 下全部 6 个模块 + 文档

---

## 目录

- [BUG-1: force-scan action 未 await scanPending](#bug-1-force-scan-action-未-await-scanpending)
- [BUG-2: stopTask 未触发 webhook 回调](#bug-2-stoptask-未触发-webhook-回调)
- [BUG-3: rerun 归档任务后 archivedAt 未重置](#bug-3-rerun-归档任务后-archivedat-未重置)
- [BUG-4: Cron 任务因 maxAttempts 失败后收件箱文件被永久删除](#bug-4-cron-任务因-maxattempts-失败后收件箱文件被永久删除)
- [BUG-5: runner.js 中 crypto 未导入，依赖 globalThis.crypto](#bug-5-runnerjs-中-crypto-未导入依赖-globalthiscrypto)
- [BUG-6: ai-tool.js 中 existing 字段渲染为死代码](#bug-6-ai-tooljs-中-existing-字段渲染为死代码)
- [BUG-7: 文档与实现不一致](#bug-7-文档与实现不一致)

---

## BUG-1: force-scan action 未 await scanPending

**严重程度**：高

**位置**：`lib/engine.js` 第 236 行

```javascript
case "force-scan":
    engine.scanPending();  // ← 缺少 await
    return { ok: true };
```

**问题**：`scanPending()` 是 `async` 函数（第 270 行），但 `force-scan` action 中调用时没有加 `await`。这导致函数立即返回 `{ ok: true }`，而实际的收件箱扫描尚未开始。HTTP 调用方和 AI 工具方无法感知扫描是否真正完成。

**影响**：
- 用户在浏览器看板点击「立即扫描」按钮后，UI 可能立即刷新但扫描尚未完成，新任务不会立即出现在列表中
- `callWebhook` 和 `rerun` 场景中通过 `engine.scanPending()` 触发的后续扫描也可能被跳过（因为 `_scanning` 锁在异步执行之前已被释放）

**修复**：改为 `await engine.scanPending();`

---

## BUG-2: stopTask 未触发 webhook 回调

**严重程度**：中

**位置**：`lib/engine.js` 第 746-759 行

```javascript
async stopTask(key) {
    const entry = findByKey(key);
    if (!entry) return { ok: false, error: "任务不存在" };
    if (entry.status === "stopped" || entry.status === "done") return { ok: false, error: "任务已终止" };
    if (entry.sessionId && entry.goalRef) {
        await runner.cancelTask(entry.sessionId, entry.goalRef);
    }
    removeTaskFile(key);
    upsertEntry(key, { status: "stopped", sessionId: null, goalRef: null });
    // ...
    flushLedger();
    return { ok: true };
},
```

**问题**：`stopTask` 中没有调用 `engine.callWebhook(entry, "stopped", ...)`。对比之下，deadline 到达导致停止的路径（`_pollOne` 第 511 行）正确调用了 `callWebhook`。两份代码逻辑不一致。

**影响**：通过 API 手动停止的任务不会触发 webhook 回调，导致依赖 webhook 的外部系统（CI/CD、通知等）收不到停止事件。

**修复**：在 `upsertEntry` 和 `flushLedger` 之间增加 `engine.callWebhook(entry, "stopped", "手动停止")`。

---

## BUG-3: rerun 归档任务后 archivedAt 未重置

**严重程度**：中

**位置**：`lib/engine.js` 第 238-255 行

```javascript
case "rerun": {
    const entry = findByKey(key);
    if (!entry) return { ok: false, error: "任务不存在" };
    if (entry.status === "running") return { ok: false, error: "任务正在运行" };
    writeTaskFile(key, entry.raw ?? entry.body ?? "");
    upsertEntry(key, {
        status: "pending", sessionId: null, goalRef: null, consecutiveUnknowns: 0,
        attempts: 0, consecutiveActive: 0, lastRoundCount: 0,
        nextRetryAt: null, retryBackoffMs: 0,
        priority: entry.priority, webhook: entry.webhook,
        maxGoalRounds: entry.maxGoalRounds, maxBlockedResumes: entry.maxBlockedResumes,
        timeoutMs: entry.timeoutMs,
        enableNotifications: entry.enableNotifications,
    });
    // ...
}
```

**问题**：`upsertEntry` 的 patch 中没有包含 `archivedAt: null`。如果已归档的任务被 rerun，`archivedAt` 字段保持原值。由于 `engine.snapshot()`（第 88 行）默认过滤掉 `archivedAt` 非空的任务，rerun 后的任务不会出现在看板中，用户看不到它已重新执行。

**影响**：用户对已归档的失败任务执行 rerun 后，任务虽然重新执行了，但不会出现在任务列表中，造成「点了重跑但没反应」的困惑。

**修复**：在 `upsertEntry` 的 patch 中添加 `archivedAt: null`。

---

## BUG-4: Cron 任务因 maxAttempts 失败后收件箱文件被永久删除

**严重程度**：高

**位置**：`lib/engine.js` 第 382-389 行

```javascript
async _dispatch(task) {
    let entry = findByKey(task.key);
    const maxAttempts = entry?.maxAttempts ?? engineConfig.maxAttempts;
    if ((entry?.attempts ?? 0) >= maxAttempts) {
        upsertEntry(task.key, { status: "failed", sessionId: null, goalRef: null });
        removeTaskFile(task.key);  // ← 对 cron 任务来说是毁灭性的
        flushLedger();
        engine.callWebhook(entry, "failed", "max dispatch attempts reached (" + maxAttempts + ")");
        return;
    }
```

**问题**：`_dispatch` 对所有任务一视同仁地调用 `removeTaskFile(task.key)`。对于 cron 任务，收件箱 `.md` 文件是调度周期的唯一入口——`_pollOne` 中 cron 完成时会通过 `writeTaskFile` 重新写回文件。如果某次派发失败（例如 DSH 服务不可用导致 `runner.launch` 失败且重试次数耗尽），收件箱文件被删除，cron 调度信息永久丢失，该任务永远不会再运行。

**影响**：cron 定时任务在遭遇连续派发失败后「静默消失」，不再按周期执行，且没有日志提示用户。

**修复**：cron 任务不应在 `maxAttempts` 耗尽时删除收件箱文件。应在 `_dispatch` 中判断 `entry.cron` 或 `task.schedule.cron`，如果是 cron 任务则保留文件。

---

## BUG-5: runner.js 中 crypto 未导入，依赖 globalThis.crypto

**严重程度**：低

**位置**：`lib/runner.js` 第 16 行；`lib/engine.js` 第 418 行；`lib/index.js` 第 199 行

```javascript
// runner.js:16
function rpcId() {
    return `autoqueue-${crypto.randomUUID()}`;
}
```

```javascript
// runner.js 顶部导入
import { ensureRunDir, writeTaskCopy, writeGoalSnapshot, writeResult } from "./files.js";
// ← 没有 import crypto
```

**问题**：`runner.js` 中使用 `crypto.randomUUID()` 但没有从 `node:crypto` 导入。该函数依赖 Node.js 19+ 的 `globalThis.crypto`（Web Crypto API）。在 `engine.js`（第 418 行）和 `index.js`（第 199 行）中也有同样用法。

**影响**：如果运行在 Node.js ≤18 环境，`crypto` 不是全局对象，会抛出 `ReferenceError: crypto is not defined`。`package.json` 中声明的 `engines.dsh` 为 `>=0.1.1-rc.2`，并未明确约束 Node.js 版本，但 `cordis.patch.yml` 中的 `scanIntervalMs: 15000` 暗示可能在较旧环境中运行。

**修复**：添加 `import crypto from "node:crypto";` 或 `import { randomUUID } from "node:crypto";` 到各个文件。

---

## BUG-6: ai-tool.js 中 existing 字段渲染为死代码

**严重程度**：低

**位置**：`lib/ai-tool.js` 第 171-174 行

```javascript
render: (args, value) => {
    if (value.ok) { /* ... */ }
    if (value.existing) {
        const e = value.existing;
        return [{ type: "text", text: `⚠️ 任务 \`${value.key}\` 已存在\n   状态: ${e.status}，创建于 ${e.createdAt}\n   内容: ${e.body}\n\n是否换个 key 或 update？` }];
    }
    return [{ type: "text", text: `创建失败: ${value.error || "未知错误"}` }];
},
```

**问题**：`autoqueue_create_task` 工具的 `output.schema` 声明了 `existing: { type: "json" }`，但当任务冲突时，`engine.createTask()` 返回的是 `{ ok: false, key, error: "重复提交" }`，从未包含 `existing` 字段。`engine.createTask` 中重复 key 的处理逻辑是自动生成唯一 key（第 171-176 行），而不是返回冲突错误。因此 `value.existing` 分支永远不会被执行。

**影响**：`autoqueue_create_task` 工具在冲突时的用户体验比设计差：显示的是「创建失败: 重复提交」而不是详细的任务信息。AI 无法呈现已有任务的状态供用户决策。

**修复**：要么让 `engine.createTask` 在重复 key 时返回 `existing` 信息，要么删除 AI 工具中 `existing` 相关的死代码。

---

## BUG-7: 文档与实现不一致

**严重程度**：低

**位置**：`docs/api.md` 第 92 行

```markdown
| `key` | string | ✅ | 任务标识（唯一） |
```

**问题**：`POST /api/queue/task` 的文档中 `key` 标记为必填（✅），但实际实现中（`engine.createTask` 第 169 行）允许 `key` 为空，会自动生成：

```javascript
if (!key) key = `task-${formatTimestamp()}`;
```

并且 `index.js` 的路由处理器（第 149 行）在解构时也没有对 `key` 做必填校验。

**影响**：API 文档与实现行为不一致，调用方可能误以为必须传 `key`。

**修复**：更新 `docs/api.md` 将 `key` 标记为可选。

---

## 总结

| 编号 | 严重程度 | 分类 | 文件 | 行号 |
|------|---------|------|------|------|
| BUG-1 | 🔴 高 | 异步未 await | `engine.js` | 236 |
| BUG-2 | 🟡 中 | 功能缺失 | `engine.js` | 746-759 |
| BUG-3 | 🟡 中 | 状态未重置 | `engine.js` | 238-255 |
| BUG-4 | 🔴 高 | 数据丢失 | `engine.js` | 382-389 |
| BUG-5 | 🟢 低 | 兼容性 | `runner.js` / `engine.js` / `index.js` | 多处 |
| BUG-6 | 🟢 低 | 死代码 | `ai-tool.js` | 171-174 |
| BUG-7 | 🟢 低 | 文档 | `docs/api.md` | 92 |

**主要发现**：
1. 两处**高严重度** bug：`force-scan` 未 await 导致异步操作不可控，以及 cron 任务收件箱文件在失败时被永久删除
2. 两处**中严重度** bug：手动停止不触发 webhook、归档任务 rerun 后不可见
3. 三处**低严重度** bug：`crypto` 兼容性、AI 工具死代码、文档不一致

建议优先修复 BUG-1 和 BUG-4，其次是 BUG-2 和 BUG-3。
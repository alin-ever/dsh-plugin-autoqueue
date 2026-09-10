# autoqueue 插件文档与功能一致性审查报告

> **审查日期**: 2026-09-08  
> **代码基线**: `lib/` 源码  
> **审查范围**: 5 份文档 × 6 个维度

---

## 发现汇总

| 严重度 | 数量 | 说明 |
|---|---|---|
| 🔴 严重 | 5 | 默认值/行为与代码相反，可能导致操作错误 |
| 🟡 中等 | 6 | 文档遗漏或描述不准确 |
| 🟢 轻微 | 3 | 措辞不一致或边界澄清 |

---

## 🔴 严重不一致

### #1 `autoArchive` 默认值：文档声称 `true`，代码实际 `false`

**影响**: 用户可能期望任务完成后自动归档，实际不会。

| 文档 | 位置 | 声称值 |
|---|---|---|
| `docs/api.md` | 第 13 行（安全边界第 13 条） | `autoArchive=true` |
| `docs/api.md` | 第 372 行（config GET 响应示例） | `"autoArchive": true` |
| `docs/api.md` | 第 394 行（config POST 字段表） | `autoArchive \| boolean；默认 true` |
| `README.md` | 第 22 行（快速开始 → 安全边界第 8 条） | "终态自动归档开启" |

**代码实际值**:
- `lib/engine-v2.js` 第 306 行: `autoArchive: options.autoArchive ?? false`
- `autoqueue-design.md` 第 192 行: `默认 autoArchive=false`
- `docs/core-api.md` 第 102 行: `autoArchive: false`
- `AGENTS.md` 第 119 行: `autoArchive=false`
- `README.md` 第 174 行: `autoArchive: false`（与同文件第 22 行矛盾）

**修复建议**: 🔧 **改文档** — 将 `docs/api.md` 第 13 行、第 372 行、第 394 行和 `README.md` 第 22 行的值改为 `false`。代码默认值 `false` 是设计决策（防止意外消耗 token），应保持不变。

---

### #2 `runner` 调用 `session.selectModel`，但文档声称"不调用"

**影响**: 安全边界声明不准确，审计者可能误判插件不会修改 session 模型选择。

| 文档 | 位置 | 声称 |
|---|---|---|
| `README.md` | 第 19 行（安全边界第 5 条） | "不会调用 `session.selectModel`" |
| `docs/core-api.md` | 第 10 行（安全边界第 10 条） | "runner 不调用 `session.selectModel`" |

**代码实际行为**:
- `lib/runner.js` 第 317-324 行实际调用了 `apiProxy.sessions.selectModel`（当 `entry.provider && entry.model` 时）

**设计文档的正确描述**:
- `autoqueue-design.md` 第 142 行: "如果指定了 provider/model，调用 session.selectModel"
- `autoqueue-design.md` 第 117 行: "provider 和 model 允许覆盖"

**修复建议**: 🔧 **改文档** — 更新 `README.md` 第 19 行和 `docs/core-api.md` 第 10 行为"仅在显式指定 provider 和 model 时调用 session.selectModel，否则继承 Host 默认模型"。代码行为正确。

---

### #3 `delete` 动作允许的状态：文档说"仅 pending"，代码允许更多

**影响**: 用户可能不知道可以删除 `failed`/`stopped` 任务，或 API 使用者基于错误文档做判断。

| 文档 | 位置 | 声称 |
|---|---|---|
| `docs/api.md` | 第 231 行（动作矩阵） | `delete \| 仅 pending` |
| `docs/api.md` | 第 519 行（工具列表） | "删除 pending 任务" |
| `docs/api.md` | 第 651 行（工具说明） | "Only pending... tasks can be deleted" |
| `docs/core-api.md` | 第 177 行 | `delete \| pending` |
| `lib/ai-tool.js` | 第 650 行 | "Only pending (not yet executed) tasks can be deleted" |

**代码实际行为**:
- `lib/engine-v2.js` 第 1097 行: `deletableStatuses = new Set(["pending", "failed", "stopped"])`
- 代码同时允许删除 `pending`、`failed`、`stopped` 三种状态的任务

**修复建议**: 🔧 **改文档** — 将所有文档中的"仅 pending"更新为"pending / failed / stopped"。同时更新 `lib/ai-tool.js` 第 650 行的工具描述（这也是 Host AI 看到的描述）。

---

### #4 `autoqueue-ptc-unattended-v2` preset：文档声称存在，代码未实现

**影响**: 外部 AI 或开发者可能尝试引用不存在的 preset。

| 文档 | 位置 | 声称 |
|---|---|---|
| `docs/api.md` | 第 8 行 | "引擎只选择 `autoqueue-unattended-v2` / `autoqueue-ptc-unattended-v2`" |
| `docs/core-api.md` | 第 44-45 行 | "引擎只能选择 `autoqueue-unattended-v2` / `autoqueue-ptc-unattended-v2`" |

**代码实际行为**:
- `grep -r "ptc-unattended" lib/` → 无匹配
- `lib/runner.js` 第 23-25 行: `AUTOQUEUE_AGENT_PRESETS` 仅包含 `autoqueue-unattended-v2`
- `lib/index.js` 第 107 行: 仅创建 `autoqueue-unattended-v2`
- 引擎内部始终使用 `AUTOQUEUE_UNATTENDED_PRESET`（仅一个值）

**修复建议**: 🔧 **改文档** — 从 `docs/api.md` 和 `docs/core-api.md` 中移除对 `autoqueue-ptc-unattended-v2` 的引用。`autoqueue-design.md` 和 `AGENTS.md` 已正确只提一个 preset。

---

### #5 `config GET` 响应示例中 `autoArchive: true` 与代码不一致

**影响**: API 消费者可能基于示例编写错误的默认值假设。

**文档**: `docs/api.md` 第 365-381 行 config GET 响应示例:
```json
{
  "autoArchive": true,
  ...
}
```

**代码实际行为**: `lib/engine-v2.js` 第 306 行，`autoArchive` 默认值为 `false`。GET config 会返回 `engineConfig.autoArchive`，其初始化值为 `options.autoArchive ?? false`。

**修复建议**: 🔧 **改文档** — 将示例中的 `"autoArchive": true` 改为 `"autoArchive": false`。

---

## 🟡 中等不一致

### #6 Template CRUD (POST/PUT/DELETE) 端点已实现但 `api.md` 未文档化

**代码**: `lib/index.js` 第 1246-1283 行注册了 `POST`、`PUT`、`DELETE` `/api/queue/templates`

**文档**: `docs/api.md` 第 12 节只描述了 `GET`（列表+单个）和 `POST /api/queue/templates/resolve`

**OpenAPI schema** 在 `lib/index.js` 第 494-536 行已包含完整的 POST/PUT/DELETE schema。

**修复建议**: 🔧 **改文档** — 在 `docs/api.md` 第 12 节增加模板 CRUD 子章节，说明 POST（创建）、PUT（更新）、DELETE（删除）的请求/响应格式。

---

### #7 `/api/queue/restart` 端点已在代码中注册，但 `api.md` 未列出

**代码**: `lib/restart-route.js` + `lib/index.js` 第 1493 行

**文档**: 
- `AGENTS.md` 第 94-104 行描述了该端点（开发用途）
- `README.md` 未在 API 表中列出
- `docs/api.md` 端点总览表（第 57-71 行）未列出

**修复建议**: 🔧 **改文档** — 在 `docs/api.md` 端点总览表中增加 `POST /api/queue/restart`，注明仅限本机 loopback 访问，用于开发重启。

---

### #8 `README.md` 端点表缺少 templates 端点

**文档**: `README.md` 第 115-126 行 API 表缺少:
- `GET /api/queue/templates`
- `POST /api/queue/templates/resolve`

**但**: `README.md` 第 100 行及以下的外部 AI 接入流程中确实提到了 `capabilities`、`openapi.json`、`state`、`detail`，只是端点速查表不完整。

**修复建议**: 🔧 **改文档** — 在 README 端点表中增加模板相关端点。

---

### #9 `schedule` 字段（ISO 8601 一次性调度）仅文件收件箱支持，HTTP API 不支持

**文档**:
- `README.md` 第 68 行: 文件头示例包含 `<!-- schedule: ... -->`
- `autoqueue-design.md` 第 241 行: 调度表包含 `schedule | ISO 8601`
- `docs/core-api.md` 第 151 行: `schedule | ISO 8601 string | 一次性调度，与 cron 互斥`

**代码**: 
- HTTP `createTask` 的 `TASK_FIELDS`（`lib/index.js` 第 1047-1051 行）不包含 `schedule`
- 但 `lib/files.js` 的文件头解析支持 `schedule`
- `lib/engine-v2.js` 的 scanPending 使用 `task.schedule?.cron`

**修复建议**: 🔧 **改文档** — 在 `docs/api.md` 任务创建字段表和 `docs/core-api.md` 中注明 `schedule` 仅通过文件收件箱支持，HTTP API 请使用 `cron` 或立即执行。

---

### #10 `docs/core-api.md` 第 10 行和 `AGENTS.md` 第 117 行互不一致

**`docs/core-api.md` 第 10 行**:
> runner 不调用 `workspace.create`，不调用 `session.selectModel`，也不发送重复的初始 queue prompt

**`AGENTS.md` 第 117 行**:
> 新任务只通过完整的 `goals.create.objective` 入场；不得恢复旧的 `workspace.create` 或重复初始 queue prompt 流程

AGENTS.md 未提到 `session.selectModel`，而 core-api.md 错误地声称不调用它。

**修复建议**: 🔧 **改文档** — 同步两条文档。AGENTS.md 是正确的（未错误声称不调用 selectModel）；core-api.md 需修正。

---

### #11 `README.md` 第 22 行说"终态自动归档开启"与默认值矛盾

**文档**: `README.md` 第 22 行（安全边界第 8 条）:
> 默认最大并发为 `1`、终态自动归档开启、浏览器通知关闭。

**同文件** `README.md` 第 174 行（默认配置）:
> `autoArchive: false`

同一文件内部自相矛盾。

**修复建议**: 🔧 **改文档** — 修改 `README.md` 第 22 行为"终态自动归档关闭"。

---

## 🟢 轻微不一致

### #12 `docs/api.md` 安全边界中 `autoArchive=true` 与设计决策矛盾

已在 #1 中详述。此处独立列出因为它是边界声明的一部分，影响安全审计印象。

### #13 `docs/core-api.md` 第 209 行 snapshot 返回值中的 `config` 字段列出 `webhook`、`queueDir`、`enableNotifications`、`unknownThreshold`

**代码**: `lib/engine-v2.js` 第 499 行 snapshot 的 config 只包含这些字段。但由于 `maxConcurrent` 也来自账本 config，需确认一致性。

**验证结果**: 代码中 snapshot 的 config 合并了 `s.config`（来自账本，含 `maxConcurrent`）+ engineConfig 中的 webhook/queueDir/enableNotifications/unknownThreshold。core-api.md 只列出了 engineConfig 补充字段，未提 `maxConcurrent` — 这是合理的，因为它来自账本。

### #14 `create_task` AI 工具自动捕获 `provider`、`model`、`cwd`、`sourceSessionId`、`sandbox`

**文档**: `docs/api.md` 第 175-179 行描述了这些自动捕获字段

**代码**: `lib/ai-tool.js` 第 234-257 行实现了这些捕获

**验证结果**: ✅ 一致。但有一个小细节：`sandbox` 捕获通过 `agentCtx?.sandboxPolicy?.resolve()` 获取实际模式名，文档简单说"自动捕获当前会话的 sandbox 策略" — 措辞可更精确，但不影响使用。

---

## 🟢 AI 工具描述准确性审查

对 19 个工具的 `description` 字段逐一核对：

| # | 工具名 | 描述准确性 | 备注 |
|---|---|---|---|
| 1 | `autoqueue_create_task` | ✅ | — |
| 2 | `autoqueue_list_tasks` | ✅ | — |
| 3 | `autoqueue_get_task` | ✅ | — |
| 4 | `autoqueue_update_task` | ✅ | "Only pending tasks can be updated" — 正确 |
| 5 | `autoqueue_stop_task` | ✅ | "Pending tasks must be deleted instead" — 正确 |
| 6 | `autoqueue_archive_task` | ✅ | — |
| 7 | `autoqueue_batch_archive` | ✅ | — |
| 8 | `autoqueue_restore_task` | ✅ | — |
| 9 | `autoqueue_delete_task` | ❌ | 声称 "only pending"，实际允许 pending/failed/stopped（见 #3） |
| 10 | `autoqueue_rerun_task` | ✅ | "Re-run a completed, failed, stopped, or interrupted task" — 正确 |
| 11 | `autoqueue_mark_read` | ✅ | — |
| 12 | `autoqueue_get_options` | ✅ | — |
| 13 | `autoqueue_get_config` | ✅ | — |
| 14 | `autoqueue_update_config` | ✅ | — |
| 15 | `autoqueue_force_scan` | ✅ | — |
| 16 | `autoqueue_set_concurrency` | ✅ | — |
| 17 | `autoqueue_list_templates` | ✅ | — |
| 18 | `autoqueue_get_template` | ✅ | — |
| 19 | `autoqueue_resolve_template` | ✅ | — |

---

## 修复优先级总结

### 需要改文档的文件（按优先级）

| 优先级 | 文件 | 修改内容 |
|---|---|---|
| 🔴 P0 | `docs/api.md` | 第 13/372/394 行 `autoArchive` 改为 `false`（3 处） |
| 🔴 P0 | `docs/api.md` | 第 231/519 行 delete 约束改为 "pending / failed / stopped" |
| 🔴 P0 | `docs/core-api.md` | 第 10 行改为"仅在指定 provider/model 时调用 selectModel"；第 177 行 delete 约束 |
| 🔴 P0 | `README.md` | 第 19/22 行修正 selectModel 和 autoArchive 声明 |
| 🔴 P0 | `lib/ai-tool.js` | 第 650 行 delete_task 描述修正 |
| 🟡 P1 | `docs/api.md` | 移除 `autoqueue-ptc-unattended-v2` 引用；增加模板 CRUD；增加 restart 端点 |
| 🟡 P1 | `docs/core-api.md` | 移除 `autoqueue-ptc-unattended-v2` 引用；说明 schedule 仅文件收件箱 |
| 🟡 P1 | `README.md` | 端点表补充 templates；第 174 行 autoArchive 值（已正确，但第 22 行需改） |
| 🟢 P2 | `docs/api.md` | config GET 示例 `autoArchive: true` → `false` |

### 需要改代码的文件

| 优先级 | 文件 | 修改内容 | 备选方案 |
|---|---|---|---|
| 🟡 P1 | `lib/ai-tool.js` | 第 650 行 delete_task 描述与实际行为对齐 | 也可改为限缩 delete 到仅 pending（需改 engine） |
| 🟢 P2 | `lib/index.js` 或 `lib/runner.js` | 实现 `autoqueue-ptc-unattended-v2` 或从所有文档中彻底删除引用 | 推荐从文档中删除（代码无需改动） |

---

## 审查覆盖度

- ✅ 功能存在性：5 份文档 × 全部声称功能
- ✅ 行为一致性：API 参数/返回值、状态机、安全策略
- ✅ 默认值：13 个配置项的文档值与代码值逐一对比
- ✅ 约束条件：stop/archive/restore/delete/rerun/update 的前置状态
- ✅ AI 工具描述：19 个工具的 description 与实际功能
- ✅ 接口清单：api.md 端点表 vs index.js 路由注册
# 执行报告：queue-plugin Bug 扫描

## 任务目标

扫描 queue-plugin 插件源码，发现并报告 bug。

## 完成状态

✅ 全部完成。已扫描以下文件：
- `lib/engine.js`（942 行）— 编排层
- `lib/runner.js`（275 行）— 会话驱动
- `lib/ledger.js`（348 行）— 账本持久化
- `lib/files.js`（251 行）— I/O 层
- `lib/index.js`（448 行）— 插件入口 + 路由
- `lib/ai-tool.js`（484 行）— AI 工具层
- `lib/client.js`（1674 行）— 浏览器看板
- `docs/api.md` — API 文档
- `autoqueue-design.md` — 设计文档

## 执行步骤

1. 读取 AGENTS.md 了解项目架构
2. 读取 autoqueue-design.md 理解设计意图
3. 逐文件阅读所有源码
4. 对照设计文档验证实现一致性
5. 分析状态机、调度、反阻塞、轮询等核心逻辑
6. 编写详细 Bug 报告

## 关键发现

共发现 **10 个 bug**：

### 🔴 严重（2 个）

1. **`unknownThreshold` 未定义导致 ConfigPanel 崩溃**（client.js:1277）
   - UI 引用了 `unknownThreshold` / `setUnknownThreshold`，但 `ConfigPanel` 内从未声明这两个 state
   - 打开配置面板会触发 `ReferenceError`

2. **`consecutiveUnknowns` 永不递增**（engine.js:623-629）
   - `unknown` phase 分支直接 `break`，不计数也不触发重试
   - 设计的「连续 unknown 判定不可达」功能完全失效

### 🟠 中等（4 个）

3. `formatTimestamp` 在碰撞循环内可能返回相同值（同一秒内重复调用）
4. `matchCron` 不识别周日=7（标准 cron 允许 0 或 7）
5. AI 工具描述中 `stallThreshold` 默认值说 10，实际代码默认 60
6. ConfigPanel 缺少 `stallTimeoutMs` / `retryBackoffBaseMs` / `retryBackoffMaxMs` 配置项

### 🟡 低优（4 个）

7. `interrupted` 状态从未被赋值（死状态）
8. `stopTask` 允许对 `failed` 任务执行（语义问题）
9. `schedule` + `cron` 同时设置时的行为未文档化
10. Cron 任务历史周期的报告无法通过 detail API 获取

## 输出文件

- **`BUG_REPORT.md`** — 完整 bug 报告，含位置、现象、后果、修复建议

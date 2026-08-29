# autoqueue 项目指引

## 这是什么

autoqueue 是 DSH 的无人值守任务队列插件。丢 .md 文件进收件箱 → AI 自动执行 → 产出报告。

## 文档索引（先读这些，别翻源码）

| 文档 | 路径 | 什么时候读 |
|---|---|---|
| 设计文档 | `autoqueue-design.md` | 理解架构、设计决策、执行模型 |
| HTTP API | `docs/api.md` | 视图层开发、外部集成、接口契约 |
| 核心层 API | `docs/core-api.md` | 内部模块接口（ledger/engine/runner） |
| 核心层 API | `docs/core-api.md` | 内部模块接口（engine/runner/ledger/files） |
| README | `README.md` | 快速了解项目、安装使用 |

## 源码位置

```
lib/
├── index.js     ← 插件入口：路由 + 定时器 + SSE + AI 工具注册
├── engine.js    ← 编排层：派发 / 轮询结算 / 反阻塞 / 重试
├── runner.js    ← 会话驱动：所有 apiProxy 调用集中在此
├── ledger.js    ← 账本：原子读写 / 去重 / 并发控制 / 重启恢复
├── files.js     ← I/O 层：收件箱扫描 / 调度解析 / 原子写入
├── ai-tool.js   ← AI 工具层：9 个模型工具 + 系统提示注入
└── client.js    ← 浏览器看板：React UI + 侧边栏入口
```

## 开发约定

- 所有 apiProxy 调用集中在 `runner.js`，其他模块不碰
- 状态机逻辑在 `engine.js` 内联，没有独立 state-machine 模块
- AI 工具层通过 HTTP 透传到 engine，不直接访问 engine 内部
- `depends_on`（依赖门控）**暂不实现**，理由见设计文档 §10.4

## 已实现 vs 未实现

| 功能 | 状态 |
|---|---|
| 收件箱模式（丢 .md 就跑） | ✅ |
| 反阻塞（steering + resume） | ✅ |
| 停滞检测（轮数 + 超时双检测） | ✅ |
| 限流退避（指数退避重试，不消耗 attempts） | ✅ |
| PTC 自动检测（步骤识别 → ptc-unattended） | ✅ |
| cron/schedule/deadline 调度 | ✅ |
| SSE 实时推送 | ✅ |
| 看板 UI | ✅ |
| 10 个 AI 工具 | ✅ |
| 未读/已读标记 | ✅ |
| 任务级 model 选择 | ✅ |
| Webhook 回调 | ✅ |
| 重启恢复（reconcile） | ✅ |
| 优先级派发 | ✅ |
| 并发控制 | ✅ |
| 依赖门控（depends_on） | ❌ 暂不实现 |
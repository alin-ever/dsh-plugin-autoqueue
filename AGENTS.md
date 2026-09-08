# autoqueue 项目指引

## 这是什么

autoqueue 是 DSH 的无人值守任务队列插件。丢 .md 文件进收件箱 → AI 自动执行 → 产出报告。

当前实现与安全结论的精确基线是 `@deepseek-ai/dsh 0.1.1-rc.2`。清单允许 `>=0.1.1-rc.2 <0.1.2`，但升级 Host 后必须重新验证 session/goal/approval 隔离语义。

## 文档索引（先读这些，别翻源码）

| 文档 | 路径 | 什么时候读 |
|---|---|---|
| 设计文档 | `autoqueue-design.md` | 理解架构、隔离决策、执行模型、UI/外部 AI 能力面 |
| HTTP API | `docs/api.md` | 视图层开发、外部集成、接口说明 |
| 核心层 API | `docs/core-api.md` | 内部模块接口（engine-v2/runner/ledger/files/state-machine） |
| README | `README.md` | 快速了解项目、安装使用 |

## 源码位置

```
lib/
├── index.js         ← 插件入口：鉴权/路由/SSE/定时器/owned preset/sandbox+approval policy/AI 工具注入
├── engine-v2.js     ← 编排层：派发 / 轮询结算 / 智能反阻塞 / 重试 / containment
├── runner.js        ← 会话驱动：所有 apiProxy 调用 + autoqueue session ownership 守卫
├── ledger.js        ← 账本：原子读写 / 去重 / 并发控制 / 重启恢复
├── files.js         ← I/O 层：收件箱扫描 / 调度解析 / 原子写入
├── state-machine.js ← 状态机：execution + cancellation 双区域纯函数转换
├── scheduler.js     ← 调度器：cron 解析、nextRunAt 计算、catch-up
├── lifecycle.js     ← 生命周期：反阻塞 / 重试退避 / 结算 / 超时检测
├── cancellation.js  ← 取消收敛：clear goal → cancel session → 两次空闲确认
├── task-intelligence.js ← 任务智能分析：错误分类 / 幂等护栏 / 空转检测
├── ai-tool.js       ← Host AI 工具层：默认自动注册的 HTTP 薄客户端工具
├── templates.js     ← 模板库：加载、列举和参数化任务模板
└── client.js        ← 浏览器看板：esbuild 构建产物，源文件在 client/src/

client/src/
├── index.jsx              ← 入口：ModuleLoader 包装 + DOM 挂载
├── transport.js           ← HTTP + SSE 传输层
├── controller.js          ← 状态管理（订阅模式）
├── utils.js               ← 工具函数、常量、SVG 图标
├── styles/
│   └── workstation.css    ← 全局样式（使用 DSW 令牌）
└── components/
    ├── Workstation.jsx    ← 主布局：侧边栏 + 工具栏 + 状态概览 + 任务列表
    ├── TaskDetail.jsx     ← 右侧滑出详情面板
    ├── Modals.jsx         ← 弹窗：新建/编辑/配置/确认
    └── DialogShell.jsx    ← 抽屉/弹窗的焦点锁定、ESC 和焦点恢复
```

## 测试

```bash
# 纯函数测试（无需 DSH）
node --test tests/task-intelligence.test.js

# 引擎集成测试（fake host，无需 DSH）
node --test --test-concurrency=1 tests/engine.test.js

# 原有单元测试（需 DSH 依赖）
npm test
```

fake host 测试 harness 在 `tests/harness.js`，mock 了 apiProxy + timer + filesystem，加载真实 engine 代码运行，无需启动 DSH 进程。

## 构建
npm run build:client    # esbuild 打包 client/src/ → lib/client.js
npm run watch:client    # 监听模式，修改源文件自动重新构建
```

源文件使用 JSX 语法和 ES import，通过 esbuild 编译为单个 IIFE 模块，输出格式对齐 DSH 的 `__ModuleLoader__` 规范。

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动 watch 模式（终端 1）
npm run watch:client

# 3. 修改 client/src/ 下的源文件，保存后自动构建到 lib/client.js

# 4. 在 DSH 中加载插件，修改即时生效
```

修改 `client/src/` 下的任意文件（JSX、CSS、JS），esbuild 会自动重新构建 `lib/client.js`。刷新页面即可看到效果。

修改 `lib/` 下的服务端文件（`index.js`、`engine-v2.js`、`runner.js`、`ai-tool.js` 等），需要**重启 DSH 进程**才能生效。本插件由 DSH 在启动时加载，没有热重载机制。

### 重启 DSH

项目内置了自重启端点，无需手动杀进程：

```bash
curl -X POST http://127.0.0.1:3080/api/queue/restart
```

或 PowerShell：

```powershell
Invoke-RestMethod -Method POST -Uri http://127.0.0.1:3080/api/queue/restart
```

该端点仅限本机 loopback 访问。调用后旧进程在 500ms 内终止，helper 等待端口释放后自动拉起新进程，全程约 2-5 秒。重启后浏览器会自动刷新页面。

## 开发约定

- 所有 apiProxy 调用集中在 `runner.js`，其他模块不碰
- 状态机逻辑在 `state-machine.js` 独立模块，`lifecycle.js` 封装重试/反阻塞/结算，`engine-v2.js` 编排组装
- AI 工具层通过 HTTP 透传到 engine，不直接访问 engine 内部；默认随插件加载向普通 Host 会话注册，`enableHostAiTools: false` 可显式关闭
- `autoqueue-session-*` 自有任务 Agent 必须通过作用域隐藏与执行 guard 禁止调用这 19 个队列控制工具，避免递归建任务或修改队列
- 外部 AI 的默认接入流程是 capabilities → OpenAPI → compact state → detail，不依赖 Host AI 工具
- 每个 attempt 使用 `autoqueue-session-<uuid>` 与独立 cwd；runner 不得操作其他 session
- 只能使用 `autoqueue-unattended-v2` 这一个 owned preset；v1 只保留不覆盖。v2 marker、disabled tools 和 shell foreground 配置必须完整校验
- v2 必须禁用 ask-user、jobs、subagent/fork/control/list、workflow、Ralph，且 bash/pwsh `enableRunInBackground:false`；不得让 detached/daemon/后台/子会话工作逃离 owned session
- 会话 `approvalPolicy=never` 必须在 `goals.create` 前持久化并回读验证；失败时不得 admit goal
- 新任务只通过完整的 `goals.create.objective` 入场；不得恢复旧的 `workspace.create` 或重复初始 queue prompt 流程
- 任务/运行时配置的工作区、任意 preset 覆盖全部锁定；`provider` 和 `model` 允许覆盖，默认继承 Host 当前模型。`/options` 只返回三类空数组与 isolation locks
- 安全默认值是并发 1、`autoArchive=false`、`enableNotifications=false`、`enableHostAiTools=true`
- `depends_on`（依赖门控）**暂不实现**，理由见设计文档“非目标”章节

## 已实现 vs 未实现

| 功能 | 状态 |
|---|---|
| 收件箱模式（丢 .md 就跑） | ✅ |
| 反阻塞（steering + resume） | ✅ |
| 智能反阻塞（错误分类 + 空转检测 + 幂等护栏） | ✅ |
| 停滞检测（轮数 + 超时双检测） | ✅ |
| 限流退避（指数退避重试，不消耗 attempts） | ✅ |
| cron/schedule/deadline 调度 | ✅ |
| SSE 实时推送 | ✅ |
| 看板 UI（完整安全任务/配置/详情/批量/接入操作面） | ✅ |
| 外部 AI 机器发现（Capabilities + OpenAPI + compact state） | ✅ |
| 19 个 Host AI 工具 | ✅，随插件自动注入普通 Host 会话，可显式关闭 |
| 未读/已读标记 | ✅ |
| 专属 session ID + 独立 cwd + ownership guard | ✅ |
| Versioned owned presets + `approvalPolicy=never` 持久校验 | ✅ |
| 任务/配置工作区、preset 覆盖 | 🔒 按设计禁用（provider/model 允许覆盖） |
| Webhook 回调 | ✅ |
| 重启恢复（reconcile） | ✅ |
| 优先级派发 | ✅ |
| 并发控制 | ✅ |
| 依赖门控（depends_on） | ❌ 暂不实现 |

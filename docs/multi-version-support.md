# autoqueue 多版本 DSH 兼容规范

## 目标

参照 task-board 插件的做法：探测 DSH API 可用性 → 不可用的功能优雅降级 → 通过 capabilities API 对外报告有效功能集。最终去掉 `package.json` 中 `<0.1.2` 的硬上限，让插件在更高版本 DSH 上尝试工作。

## 当前版本约束

```
package.json: "dsh": ">=0.1.1-rc.2 <0.1.2"
```

本地安装的 DSH 版本：`0.1.1-rc.2`。

## autoqueue 的 DSH API 依赖清单

下面是 autoqueue 实际调用的所有 DSH API，按调用位置分组。签名来自本地安装的 `0.1.1-rc.2` 源码。

### 一、ctx.sessions（SessionStore — 内存中的 session 存储）

| 调用 | 位置 | 用途 |
|------|------|------|
| `ctx.sessions.get(sessionId)` | `index.js:198` | 按 ID 查找 live session |
| `ctx.sessions.flush(session)` | `index.js:212` | 持久化 session events |
| `session.append(type, data)` | `index.js:206,208` | 追加 sandbox/mode、approval/policy 事件 |
| `session.events` | `index.js:213` | 读取 event log 验证策略写入 |
| `session.header?.cwd` | `index.js:58` | 读取 session 工作目录（继承用） |
| `session.id` | `index.js:199` | session 身份校验 |

注意：`ctx.sessions` 的类型声明来自 `@deepseek-ai/dsh-session`，通过 cordis 的 `declare module` 注入到 `ctx` 上。

### 二、apiProxy.sessions（Session RPC）

| 方法 | 位置 | 用途 |
|------|------|------|
| `sessions.create({sessionId, cwd, agentPreset})` | `runner.js:286` | 创建 session |
| `sessions.rename({sessionId, title})` | `runner.js:311` | 重命名 session |
| `sessions.selectModel({sessionId, provider, model})` | `runner.js:318` | 选择模型 |
| `sessions.history({sessionId, maxMessages})` | `runner.js:210,417` | 读取历史 events + goal projection |
| `sessions.list({})` | `runner.js:476` | 列出所有 session |
| `sessions.prompt({sessionId, mode, content})` | `runner.js:499,520` | 发送 steer/queue prompt |
| `sessions.cancel({sessionId})` | `runner.js:353,682,699` | 取消 session 当前 turn |

### 三、apiProxy.goals（Goal RPC）

| 方法 | 位置 | 用途 |
|------|------|------|
| `goals.create({sessionId, objective, maxGoalRounds})` | `runner.js:374` | 创建 goal |
| `goals.resume({sessionId, ref})` | `runner.js:506,525,582` | 恢复 goal |
| `goals.pause({sessionId, ref})` | `runner.js:545` | 暂停 goal（前台让步） |
| `goals.clear({sessionId, ref})` | `runner.js:662,669` | 清除 goal |

### 四、apiProxy.workspace（Workspace RPC）

| 方法 | 位置 | 用途 |
|------|------|------|
| `workspace.archiveSession({sessionId})` | `runner.js:719` | 归档 session |

### 五、ctx.on() — Cordis 事件监听

| 事件 | 位置 | 用途 |
|------|------|------|
| `agent/status` | `index.js:148` | agent idle → 请求 runtime poll |
| `goal/changed` | `index.js:154` | goal 状态变更 → 请求 runtime poll |
| `session/disposed` | `index.js:159` | session 销毁 → 请求 runtime poll + scan |

这些事件来自：
- `agent/status`：`@deepseek-ai/dsh-agent` 声明
- `goal/changed`：`@deepseek-ai/dsh-goal` 声明
- `session/disposed`：`@deepseek-ai/dsh-session` 声明

### 六、ctx.get("workspaceRegistry")

| 调用 | 位置 | 用途 |
|------|------|------|
| `ctx.get("workspaceRegistry")` | `index.js:64` | 获取工作区注册表，把队列 session 挂到对应工作区 |

### 七、其他 ctx 服务

| 调用 | 位置 | 用途 |
|------|------|------|
| `ctx.systemPrompt.section()` | `index.js:83` | 注入系统提示 |
| `ctx.timer` | `index.js:110,111` | 定时器 |
| `ctx.webServer` | `index.js` 路由注册 | HTTP 服务 |
| `ctx.apiProxy` | 贯穿 runner.js | RPC 代理 |
| `ctx.inject`（export） | `index.js:33` | 声明依赖注入 |

## API 分级

### 核心 API（不可降级）

这些 API 是插件运行的基本前提，不可用则插件无法启动：

| API | 理由 |
|-----|------|
| `ctx.sessions.get/flush` | session policy 固化必须通过 store |
| `session.append/events` | sandbox+approval 策略写入和验证 |
| `sessions.create` | 创建任务 session |
| `sessions.history` | 轮询 goal 状态 |
| `sessions.cancel` | 取消任务 |
| `sessions.prompt` | 反阻塞注入 |
| `sessions.rename` | 重命名 session |
| `goals.create/resume/pause/clear` | goal 生命周期 |
| `ctx.systemPrompt` | 系统提示注入 |
| `ctx.timer` | 定时扫描/轮询 |
| `ctx.webServer` | HTTP API + SSE |
| `ctx.apiProxy` | RPC 代理 |

### 可降级 API

这些 API 不可用时插件仍能运行，只是功能降级：

| API | 降级策略 | 降级影响 |
|-----|---------|---------|
| `sessions.list` | 回退到 watchdog 10s 轮询（`pollRunning` 定时器） | 轮询延迟从实时变为最多 10s |
| `ctx.on('agent/status')` | 同上 | 同上 |
| `ctx.on('goal/changed')` | 同上 | 同上 |
| `ctx.on('session/disposed')` | 同上 | 同上 |
| `sessions.selectModel` | 跳过，使用 preset 默认模型 | 任务无法指定模型 |
| `workspace.archiveSession` | 跳过，不归档 session | 任务完成后 session 不自动归档 |
| `ctx.get("workspaceRegistry")` | 跳过 | session 不出现在侧边栏工作区 |

> **注意**：`sessions.list` 和 `ctx.on()` 的降级是**相互独立的**。如果两个都不可用，引擎完全靠 watchdog 定时器驱动。如果其中一个可用，就可以减少轮询延迟。

### 当前已有的降级点

代码中已经存在这些 try-catch，但它们是隐式的：

- `runner.listSessions()` → 失败返回 `{known: false}`（line 484-485）
- `runner.launch()` 中 selectModel → 失败只 console.error（line 321-323）
- `attachToWorkspace` → 失败静默跳过（line 336-337）
- `registerRuntimePollEvents` → 已有 `ctx.on` 类型检查 guard（line 133-134）
- `runner.archiveSessions()` → 失败返回 false（line 722-724）

## 实现方案

### 新增 `lib/version.js`

提供一个能力探测模块。核心函数：

```js
// 探测 DSH 的 API 能力，返回每个可选 API 是否可用
function probeApiCapabilities(ctx) {
  return {
    sessionsList: /* 探测 apiProxy.sessions.list 是否可用 */,
    runtimeEvents: /* 探测 ctx.on 是否可用 */,
    selectModel: /* 探测 sessions.selectModel 是否可用 */,
    workspaceArchive: /* 探测 workspace.archiveSession 是否可用 */,
    workspaceRegistry: /* 探测 ctx.get('workspaceRegistry') 是否可用 */,
  };
}
```

**探测方式**：不猜测版本号，直接探测每个 API 是否存在。例如：

```js
// 探测 sessions.list
try {
  await apiProxy.sessions.list(request({}));
  return true;
} catch (err) {
  if (err?.code === 'invocation-unavailable') return false;
  // 其他错误（如 auth）说明 API 存在但调用失败，也算可用
  return true;
}
```

或者更轻量的：直接检查 `typeof apiProxy.sessions.list === 'function'` 并做一次快速调用。

具体的探测策略由实现者根据 DSH 不同版本的实际行为决定。task-board 的做法是先调一次，捕获 `invocation-unavailable` 错误码来判断。

### 修改 `lib/index.js`

1. **启动时探测**：在 `apply()` 中调用 `probeApiCapabilities(ctx)`，将结果注入 engine

2. **动态 capabilities**：修改 `capabilitiesDocument()`：
   ```js
   features: {
     nativeRuntimeMonitoring: caps.sessionsList,
     nativeEventStreaming: caps.runtimeEvents,
     // ...
   },
   degradedFeatures: [
     // 列出所有当前不可用的功能及其原因
   ]
   ```

3. **Runtime monitor**：在 `/api/queue/state` 的 `runtime` 字段中增加降级信息

### 修改 `lib/runner.js`

- `createRunner()` 接受 capabilities 参数
- `listSessions()` 如果 `!caps.sessionsList`，直接返回 `{known: false}`，不走 RPC
- `launch()` 中 selectModel 如果 `!caps.selectModel`，直接跳过
- `archiveSessions()` 如果 `!caps.workspaceArchive`，直接返回 true

### 修改 `lib/engine-v2.js`

- `createEngine()` 接受 capabilities 参数
- 如果 runtime events 不可用，`registerRuntimePollEvents` 可能是一个 no-op（当前已有 guard）

### 修改 `package.json`

```json
"dsh": {
  "engines": {
    "dsh": ">=0.1.1-rc.2"
  }
},
"engines": {
  "dsh": ">=0.1.1-rc.2"
},
"peerDependencies": {
  "@deepseek-ai/dsh-sandbox-policy": ">=0.1.1-rc.2",
  "@deepseek-ai/dsh-tools": ">=0.1.1-rc.2",
  "@deepseek-ai/dsh-user-approval": ">=0.1.1-rc.2"
}
```

去掉所有 `<0.1.2` 上限。

## 实现者需要自行确认的事项

以下信息本地环境无法获取（网络被沙箱限制），需要实现者到 GitHub 和 npm 确认：

1. **DSH 已发布的全部版本列表**：`npm view @deepseek-ai/dsh versions --json`

2. **每个版本之间的 API 变更**：阅读 `deepseek-harness` 的 GitHub Releases 和 CHANGELOG，确认：
   - `sessions.list` 从哪个版本开始可用
   - `ctx.on('agent/status')` / `goal/changed` / `session/disposed` 从哪个版本开始可用
   - `sessions.selectModel` 从哪个版本开始可用
   - `workspace.archiveSession` 从哪个版本开始可用
   - 核心 API（create/history/cancel/prompt/goals.*）在历史版本中是否有签名变更
   - `ctx.sessions.get/flush`、`session.append/events` 的接口是否稳定

3. **task-board 的降级实现参考**：task-board 的 `HostExecutionRunner.listRunning` 中捕获 `invocation-unavailable` 错误码的方式，可以直接复用。

4. **`invocation-unavailable` 错误码的可靠性**：确认这个错误码是否在所有不可用 API 的调用中一致地返回，还是只针对 `sessions.list`。

## 验收标准

1. 在 rc.2 上行为与当前完全一致，capabilities 报告全功能可用
2. 在新版本 DSH 上如果某个可选 API 不可用，插件正常运行 + capabilities 标记降级
3. 如果核心 API 不可用（极不可能），插件启动时给出明确错误信息而非静默崩溃
4. `/api/autoqueue/capabilities` 的 `features` 字段动态反映实际可用功能
5. `package.json` 不再限制上限版本
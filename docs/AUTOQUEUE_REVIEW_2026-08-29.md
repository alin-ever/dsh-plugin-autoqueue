# AutoQueue 插件代码审查报告

> 项目：`@alintever/dsh-plugin-autoqueue`
> 仓库：<https://github.com/alin-ever/dsh-plugin-autoqueue>
> 审查提交：`7b21fb6`
> 审查日期：2026-08-29
> 审查方式：静态源码审查、Node.js 语法检查、部分路径与账本行为的隔离验证
> 审查范围：`lib/`、`package.json`、`cordis.patch.yml`、README 与 API/设计文档

## 1. 结论

当前版本不建议直接用于真实的无人值守任务或生产环境。

代码在 JavaScript 语法层面可以通过检查，但任务隔离、停止语义、cron 调度、账本恢复、配置面板和 HTTP 输入边界均存在高风险问题。其中部分问题可能导致：

- 队列目录外的 Markdown 文件被覆盖或删除；
- 用户已经停止的 Agent 会话继续执行；
- 一个任务读取或修改其他任务、队列账本及运行结果；
- cron 任务在同一分钟重复执行，产生重复副作用和模型费用；
- 崩溃或账本格式异常后任务永久丢失；
- 已归档且不可见的任务仍在后台运行；
- 核心的“无人值守纪律”未成功注入；
- 单个异常会话阻塞整个队列的轮询和超时处理。

建议先完成本报告中 P0/P1 问题，再接入真实工作区和模型额度。

## 2. 风险等级

| 等级 | 定义 |
|---|---|
| P0 | 安全或数据破坏风险，应立即修复 |
| P1 | 核心功能、隔离或可靠性缺陷，上线前必须修复 |
| P2 | 明确的功能、契约或可维护性问题，建议紧随 P1 修复 |
| P3 | 低风险工程改进 |

## 3. 主要发现

### AQ-001 [P0] 未校验的任务 key 可路径穿越

**证据**

- `lib/index.js:149-164` 接收 `key`，但没有校验类型、长度、路径分隔符或 basename。
- `lib/files.js:101-113` 将 `${key}.md` 直接与 tasks 目录拼接后写入或删除。
- `create`、`update`、`rerun`、`stop`、`delete` 都会触达这些文件操作。

**影响**

攻击者可以使用 `..\\` 或 `../` 逃逸 tasks 目录，覆盖或删除当前进程有权限访问的队列外 `.md` 文件。若 DSH Web 宿主未在外层统一鉴权和校验 Origin，该问题还可能被访问 localhost 的恶意网页触发。

**复现思路**

```json
{
  "requestId": "path-test",
  "key": "..\\..\\victim",
  "content": "overwritten"
}
```

**建议**

1. `key` 只允许明确的 slug 字符集和有限长度；
2. 使用 `resolve()` 计算最终路径，并校验其仍位于 tasks 根目录内；
3. 所有写入、删除、运行目录创建共享同一个安全路径函数；
4. HTTP 层强制方法、Content-Type、请求体上限及宿主级鉴权/Origin 策略。

### AQ-002 [P1] 默认工作区破坏任务隔离

**证据**

- `lib/index.js:33-40` 在没有显式配置 workspace 时，将整个 `queueDir` 创建为默认共享 workspace。
- `lib/engine.js:186` 将该 workspace 分配给新任务。
- `lib/runner.js:85-90` 只有在任务没有 workspace 时才创建基于 `entry.workDir` 的独立 workspace。

**影响**

默认情况下，所有无人值守 Agent 都能访问同一个队列根目录，其中包括 `queue-ledger.json`、pending 任务、其他任务的运行目录及报告。一个误操作或提示注入就可能读取、覆盖或删除其他任务和控制状态。

**建议**

- 默认使用每次执行的 `workDir` 创建独立 workspace；
- 共享 workspace 必须成为显式选择，并在 UI/API 中给出风险提示；
- 队列账本和 inbox 不应位于 Agent 默认可写的工作区内。

### AQ-003 [P1] stop 与异步启动存在竞态，停止后会话仍可能运行

**证据**

- `lib/engine.js:393-420` 先写入 `running/sessionId=null`，随后等待 `runner.launch()`。
- `lib/engine.js:757-768` 在此期间执行 stop 时，因为没有 sessionId，只能将本地状态改成 `stopped`。
- launch 完成后，`lib/engine.js:422-426` 直接补写 sessionId/goalRef，没有复查任务当前状态。
- `lib/engine.js:465-466` 只轮询 `status=running` 的任务。

**影响**

账本会显示任务已经停止，但实际 session/goal 仍继续执行，且之后不会被轮询、超时或结算。

另外，`lib/runner.js:216-247` 对 clear/cancel/archive RPC 只捕获异常，不检查 `{ result: { ok: false } }`。因此远端取消失败时，本地仍会返回成功并落入终态。

**建议**

- 为每次 launch 分配 execution token/version；
- launch 返回后以 compare-and-set 方式确认任务仍处于对应的 `starting/running` 状态；
- 如果已经 stopped，立即取消刚创建的 session；
- 所有控制 RPC 必须检查 `result.ok`，失败时不得伪造本地成功。

### AQ-004 [P1] cron 同一时间槽可重复执行

**证据**

- `lib/engine.js:293-295` 只判断“当前时间是否匹配 cron”。
- `lib/engine.js:541-562` 在任务完成后立即重写同一 cron 文件并设为 pending。
- 没有持久化 `lastCronSlot`、`nextRunAt` 或领取记录。

**影响**

如果任务在 cron 匹配分钟内快速完成，下一次扫描仍然匹配，会在同一分钟再次执行。扫描间隔越短，重复次数越多，可能产生重复写入、重复通知、重复外部操作和额外模型费用。

**建议**

- 将 cron 从“电平触发”改为“时间槽领取”；
- 持久化上一时间槽或下一次执行时间；
- 每个 cron occurrence 生成唯一 execution ID，并保证一个时间槽最多领取一次。

### AQ-005 [P1] cron 一次失败可能永久停止后续周期

**证据**

- session 启动成功后，`lib/engine.js:421-422` 删除 inbox 源文件。
- 只有 complete 分支 `lib/engine.js:541-554` 会重新创建 cron 文件。
- blocked 超限、重试耗尽及派发上限路径不会恢复 cron，其中 `lib/engine.js:376-383` 还会明确删除文件。

**影响**

一个周期失败后，后续日期不再执行。这与“循环任务”的用户预期不符。

**建议**

将“调度定义”和“当前 execution”分开存储。周期执行失败只能结束本次 execution，不能删除 schedule 本身。

### AQ-006 [P1] 自定义 queueDir 会加载错误账本并可能覆盖数据

**证据**

- `lib/ledger.js:347-348` 在模块加载时立即调用 `load()`。
- `lib/index.js:22` 直到 `apply()` 才执行 `setQueueDir(config.queueDir)`。
- 内存中的 ledger document 不会随 queueDir 切换重新加载，但后续写盘路径会使用新的 queueDir。

**影响**

配置自定义目录时，进程可能从默认目录加载账本，随后将默认账本写进自定义目录，覆盖自定义目录原有数据。

**建议**

- 移除 ledger 模块的 eager load；
- 在 queueDir 确定后显式初始化 ledger；
- 运行时切换目录时执行受控的 close/reload，而不是只修改显示配置。

### AQ-007 [P1] inbox 删除与 session 持久化之间存在任务丢失窗口

**证据**

- `lib/engine.js:410` 先持久化 `running/sessionId=null`。
- launch 成功后，`lib/engine.js:422` 先删除 inbox 文件。
- `lib/engine.js:423-426` 随后才记录 sessionId 并 flush ledger。
- `lib/ledger.js:154-168` 重启时只会把无 session 的 running 任务改成 pending；派发仍依赖 inbox 文件。

**影响**

如果进程在删除 inbox 后、保存 sessionId 前崩溃，重启后任务会变成 pending，但已没有 inbox 文件，因此永久无法派发；已经创建的 session 还可能成为孤儿继续运行。

**建议**

先持久化 sessionId/execution，再消费 inbox。即使崩溃后 inbox 仍存在，scanner 也可以根据 ledger 状态安全跳过。

### AQ-008 [P1] 账本错误被静默重置为空并覆盖原数据

**证据**

`lib/ledger.js:86-114` 将读取错误、JSON 解析错误和 schema 不匹配全部 catch 后重建空账本，没有日志、备份或迁移。

**影响**

一次磁盘故障、手工编辑错误或 schema 升级，就可能让所有任务在内存中消失；之后任何 flush 都会将原账本永久覆盖成空账本。

**建议**

- fail closed，不要将损坏等同于“没有数据”；
- 保留原文件并生成 `.corrupt` 备份；
- 为旧 schema 编写明确迁移；
- 启动失败时输出可行动的错误并阻止队列继续写入。

### AQ-009 [P1] 无人值守纪律通常没有被注入

**证据**

- `lib/index.js:406` 使用的正则 `/(>-\||-)/` 不匹配常见 YAML 的 `text: >-` 或 `text: |`。
- `lib/index.js:440` 使用全局 `includes("disabled: true")`；只要任意其他工具被禁用，就不会给 `tool-ask-user` 增加禁用配置。
- preset 已存在时，`lib/index.js:314-315` 和 `372-373` 直接返回，不会修复旧版本或半写入配置。

**影响**

插件最核心的“不提问、自主执行、记录 GAP”承诺可能完全不生效，任务会停下来等待无人回答的问题。

**建议**

- 使用 YAML parser 修改结构，不要用正则编辑 YAML；
- 通过 preset 服务的正式更新接口写入并校验；
- 启动时检查目标 preset 的版本/内容，而不是仅检查是否存在。

### AQ-010 [P1] 归档任务仍可能在后台执行

**证据**

- `lib/engine.js:772-796` 允许归档所有非 running 任务，但不删除或停用 inbox schedule。
- `lib/engine.js:321-329` 扫描时只检查 status，不检查 `archivedAt`。
- `lib/engine.js:85-89` 默认快照会隐藏 archived 任务。

**影响**

未来定时的 pending 任务归档后仍会在到点时执行，同时用户在看板上看不到它。归档任务 rerun 也不会清理 `archivedAt`，执行期间继续隐藏。

**建议**

明确区分 archive、disable schedule、stop execution 三种动作；scanner 必须跳过 archived/disabled 项，rerun 时需要显式恢复可见状态或拒绝操作。

### AQ-011 [P1] 配置面板崩溃，并会用默认值覆盖真实配置

**证据**

- `lib/client.js:1279` 引用了未声明的 `unknownThreshold` 和 `setUnknownThreshold`，打开配置面板会触发 ReferenceError。
- `lib/client.js:277-280` 定义了 `transport.getConfig()`，但没有调用者。
- controller 仅使用 `/state` 的部分 config，而 `lib/engine.js:85-90` 未返回大多数运行参数。
- ConfigPanel 使用硬编码默认值补齐缺项，并在保存时全部 POST 回服务端。

**影响**

当前设置页面无法使用。即使只修复 ReferenceError，用户打开后保存一个无关字段，也可能将 `maxGoalRounds`、stall 配置、preset、model 等真实值覆盖为 UI 默认值。

**建议**

- 打开面板时显式加载完整 `/config`；
- 只提交用户实际修改的字段；
- 由共享 schema 生成前后端校验与默认值；
- 删除已废弃的 `unknownThreshold` 配置或完整恢复其实现。

### AQ-012 [P1] 单个异常会话可以阻塞整个轮询器

**证据**

- `lib/engine.js:461-479` 顺序 await 每个 `_pollOne()`，没有单任务 catch。
- `lib/runner.js:140-146` 的 history RPC 没有超时。
- `lib/engine.js:731-750` 在完整重试的部分 launch 失败时，没有像首次派发一样清理 `SessionLaunchError.sessionId`。

**影响**

列表中的第一个任务持续报错时，后续任务每轮都得不到处理；如果第一个 RPC 永不结束，`_polling` 会永久保持 true，所有任务的 timeout/deadline 也不再执行。重试中 rename/prompt/goal 创建失败还会泄漏新 session。

**建议**

- 为每个 RPC 设置超时；
- 单任务轮询独立捕获并记录错误；
- 使用有上限的并行轮询，而非全局串行；
- 统一初次 launch 与 retry launch 的孤儿清理逻辑。

### AQ-013 [P1] HTTP 请求体和 SSE 快照存在资源放大

**证据**

- `lib/index.js:68-85` 在没有上限的情况下缓存完整请求体，JSON 解析后才在 task handler 中检查 content 的 2MB 限制。
- `lib/engine.js:85-90` 返回完整 ledger entry，包括 `body` 和重复的 `raw`。
- `lib/index.js:278-290` 每 10 秒为每个 SSE 客户端序列化完整快照，并忽略 `res.write()` 返回的 backpressure。

**影响**

超大/慢速请求可占用大量内存；大量 2MB 任务乘以多个慢 SSE 客户端，会持续消耗 CPU、网络和待发送缓冲区。

**建议**

- 在流式读取阶段实施总字节数和读取超时限制；
- state/SSE 只返回任务摘要，正文和报告仅通过 detail 按需读取；
- 处理 backpressure，慢客户端超过阈值时断开；
- 优先推送 revision/delta，而非固定全量快照。

## 4. 其他已确认问题

### AQ-014 [P2] ledger revision 不反映任务变化

`lib/ledger.js:134-142` 只有 `commit()` 会增加 revision；绝大多数任务状态使用 `upsertEntry/removeEntry + flushLedger`，而 `flushLedger()` 不增加 revision。外部消费者无法依赖 revision 判断状态是否变化。

### AQ-015 [P2] requestId 幂等实现会毒化失败重试

`lib/ledger.js:272-286` 在副作用执行前就写入 request cache。首次写盘或 RPC 暂时失败后，用同一 requestId 重试会被静默跳过。action 指纹只包含 action/key，遗漏 update patch、并发值等参数。

应在操作成功后记录结果，或缓存完整的进行中/成功/失败结果，并在重复请求时返回第一次的真实响应。

### AQ-016 [P2] webhook 终态数据错误

`lib/engine.js:62-78` 从传入的旧 entry 读取 status。complete/failed 路径虽然已经 upsert 终态，仍传入旧的 running entry，因此 webhook 常出现：

```json
{
  "status": "running",
  "result": "done"
}
```

手动 stop 则完全没有 webhook。Webhook 还缺少超时、状态码检查和重试策略。

### AQ-017 [P2] 部分运行时配置只是“显示已修改”

- POST `/config` 修改 queueDir 只更新 `engineConfig.queueDir`，没有调用 `files.setQueueDir()`，实际扫描和账本目录不变。
- engine 的运行时 `maxGoalRounds` 与 runner 创建时闭包捕获的默认值脱节，修改后新任务仍可能使用旧值。
- file inbox 任务与 API 任务对全局 workspace/model 等默认值的处理不一致。

### AQ-018 [P2] 重试记录和退避不可信

- retry 成功后没有结束上一条 execution，历史中会出现多个“仍在运行”的记录；
- `_dispatch` 在 launch 前将 `retryBackoffMs` 清零，失败后读取的始终是 0，因此所谓指数退避一直退回 base；
- 初次 launch 的瞬态失败会消耗 attempts，与代码注释和文档中的“不消耗 attempts”不一致；
- cron/rerun 重用旧 workDir，后一次会覆盖 `.目标.md`、`.结果.md` 并混用工作区状态。

### AQ-019 [P2] UI 和 AI 工具存在多处契约问题

- 客户端永远请求不含 `archived=1` 的 state，归档后无法从 UI 进入 restore；
- 打开的 detail 只请求一次，之后优先使用旧 detail，SSE 更新不会刷新状态和报告；
- AI action 工具用 `value.key` 渲染，但后端成功响应通常只有 `{ ok: true }`，提示会显示任务名 `undefined`；
- AI 工具所有 fetch 都没有超时或 `res.ok` 检查；
- cron 文案将 `*/30 * * * *` 显示成类似“每天 *:*/30”。

### AQ-020 [P2] 输入和配置缺少统一校验

- 非法 schedule 会产生 `NaN`，比较结果使任务立即执行，而不是拒绝；
- cron、deadline、timeout、maxAttempts、priority 等任务级字段缺少完整类型和范围校验；
- schedule 与 cron 同时出现时没有明确冲突规则；
- config 中非法数字可能通过 `parseInt/Math.min/Math.max` 传播为 `NaN`。

建议为 HTTP、AI 工具、文件头和 UI 共用一套 schema，并在进入 engine 前完成规范化。

## 5. 工程与文档问题

1. `package.json` 没有 test、lint、build 或 start scripts；
2. 仓库只包含构建后的 `lib/client.js`，没有对应前端源码和可复现构建流程；
3. host 代码导入 `@deepseek-ai/dsh-tools`，但 package metadata 未声明 dependency 或 peerDependency；
4. README 安装示例仍使用 `link:./queue-plugin`，与当前仓库目录/包名不一致；
5. 默认值在 README、设计文档、core API、patch 和源码之间多处冲突，例如 maxGoalRounds、stallThreshold、stallTimeoutMs、timeout；
6. 仓库内已有多份 bug report，但其中部分问题仍存在，且缺少回归测试防止重新引入。

## 6. 建议修复顺序

### 阶段一：安全与副作用控制

1. 修复 key 路径校验；
2. 恢复每任务 workspace 隔离；
3. 为 HTTP API 增加方法、Content-Type、body size、Origin/鉴权策略；
4. 让 stop/cancel/archive 以远端确认结果为准；
5. 增加 launch token，消除 stop-vs-launch 竞态。

### 阶段二：状态机与持久化

1. 将 `pending -> starting -> running -> terminal` 设计成可验证的原子转换；
2. 调整 inbox 消费和 session 持久化顺序；
3. 移除 ledger eager load，增加迁移、损坏备份和 fail-closed；
4. 修复 revision 和 requestId 结果缓存；
5. 将 schedule 定义与单次 execution 分离。

### 阶段三：调度与轮询

1. cron 使用 occurrence/slot 去重；
2. cron execution 失败不删除 schedule；
3. 为所有 RPC 增加超时和错误分类；
4. 单任务轮询隔离，限制并行度；
5. 统一 launch/retry/orphan cleanup。

### 阶段四：配置、UI 和工具层

1. 用 YAML parser 修复 unattended preset；
2. 修复配置面板并使用完整配置接口；
3. 让 UI 可以查看/恢复归档任务；
4. 修复 webhook、AI tool、detail 刷新和 cron 文案；
5. state/SSE 改为摘要或增量协议。

### 阶段五：测试与发布门禁

至少增加以下自动化测试：

- key 路径穿越与 API 输入边界；
- stop-vs-launch、stop-vs-retry 并发测试；
- 每个 cron occurrence 只执行一次；
- cron 失败后下一周期仍可执行；
- 进程在每个持久化步骤崩溃后的恢复测试；
- 旧 schema 迁移和损坏账本保护；
- requestId 成功、失败、并发重试；
- 单个 RPC 超时不影响其他任务；
- 配置面板完整加载和最小 patch 保存；
- archived/restore/rerun 可见性；
- webhook payload 契约；
- 包安装、前端构建和 DSH 宿主冒烟测试。

## 7. 验证情况与限制

- `lib/*.js` 已通过 `node --check` 语法检查；
- 部分路径拼接、queueDir/ledger 行为已在隔离临时目录验证；
- 本次没有修改源码或账本数据；
- 仓库没有现成自动化测试，无法执行回归测试；
- 未在真实 DSH 宿主中完成端到端运行，因此 `ctx.webServer` 是否提供统一鉴权、RPC 的精确超时语义及插件生命周期细节仍需结合宿主确认；
- 上述核心状态机、文件路径、调度和 UI 问题不依赖宿主行为，源码层面即可确认。

## 8. 总体建议

该项目的产品方向有价值，但当前实现把调度定义、执行状态、inbox 消费、session 生命周期和归档可见性耦合在同一组可变对象与文件操作中，缺少明确的事务边界。建议不要继续通过局部 catch、计数器和补丁修复状态机，而是先确定以下不变量：

1. 一个 execution 在任意时刻只有一个可追踪 session；
2. stop 返回成功后不存在仍在执行的 session；
3. 一个 cron occurrence 最多执行一次，单次失败不删除 schedule；
4. ledger 损坏时绝不以空账本继续写入；
5. archived/disabled 任务绝不被 scanner 派发；
6. Agent 默认只能访问自己的 workDir；
7. 所有外部副作用都有超时、确认结果和幂等标识。

先围绕这些不变量重构，再恢复 UI 和工具层，会比继续在现有分支上追加条件判断更稳妥。

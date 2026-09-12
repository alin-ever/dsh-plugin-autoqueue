# DSH SDK Upgrade Migration Guide: v0.1.1-rc.2 → v0.1.5-rc.1

## autoqueue Plugin — Breaking Changes Analysis

**Date:** 2026-09-11  
**Source SDK:** `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-agent`, `@deepseek-ai/dsh-goal`, etc. v0.1.1-rc.2  
**Target SDK:** Same packages v0.1.5-rc.1  
**Plugin Version:** `@alintever/dsh-plugin-autoqueue` v0.3.7

---

## 1. Executive Summary / 执行摘要

A single **blocker** issue was identified that will prevent all task launches from succeeding.  
一个阻塞性问题被发现，会导致所有任务启动失败。

| # | Severity / 严重性 | File / 文件 | Issue / 问题 |
|---|---|---|---|
| 1 | 🔴 **BLOCKER** | `lib/index.js:221` | `session.events` does not exist in v0.1.5 — always throws |
| 2 | 🟡 MEDIUM | `lib/index.js:220` | `sessions.flush()` is now async — fire-and-forget may leave log unwritten |
| 3 | 🟡 MEDIUM | `tests/harness.js:93` | Fake session must be updated to match new API |
| 4 | 🟠 LOW | `package.json` | Engine range must be updated |

---

## 2. BLOCKER — `session.events` removed (lib/index.js:221)

### 问题描述 / Problem Description

**In `pinOwnedSessionApprovalPolicy()` (index.js line 221):**

```js
// ❌ BROKEN in v0.1.5 — session.events is undefined
const events = Array.isArray(session.events) ? session.events : [];
```

The v0.1.5 `Session` class no longer exposes an `events` property. The only public event-log field is `session.log`:

```js
// ✅ CORRECT for v0.1.5
const events = Array.isArray(session.log) ? session.log : [];
```

**Impact / 影响:**  
`session.events` resolves to `undefined`, so `Array.isArray(undefined)` is `false`.  
The fallback `[]` is used, the verification loop never finds any events,  
`effectivePolicy` stays `null`, and the check at line 230 **always throws**:

```
Error: session-policy: approval policy verification failed: expected "never", got null
code: "session-policy-verification-failed"
```

**Every task launch will fail immediately after this change.**  
每次任务启动都会在验证阶段立即失败。

### Fix / 修复

File: `lib/index.js`, line ~221:

```diff
- const events = Array.isArray(session.events) ? session.events : [];
+ const events = Array.isArray(session.log) ? session.log : [];
```

Also update the harness fake session (see section 4).

---

## 3. MEDIUM — `sessions.flush()` is now async (lib/index.js:220)

### 问题描述 / Problem Description

In v0.1.5, `SessionStore.flush()` became an `async` function returning `Promise<boolean>`:

```js
// dsh-session v0.1.5 source
async flush(session) {
    const { carrier } = this.liveEntryFor(session);
    // ... registers durability checkpoint callbacks, awaits them
    return callbacks.length > 0;
}
```

The plugin calls it without `await`:

```js
// index.js line 220 — current code
sessions.flush(session);   // fire-and-forget
```

**Impact / 影响:**  
The verification loop reads `session.log` (now `session.events` → `session.log` after fix #2),  
so the policy write and read are both **synchronous** within the same append call.  
The durability checkpoint fires asynchronously and does NOT affect the synchronous verification.

In practice this is **non-breaking** for the current use case, but the semantic guarantee  
("policy is durable before we proceed") is weaker. For strict correctness, await it:

```js
await sessions.flush(session);
```

### Fix / 修复

File: `lib/index.js`, line ~220:

```diff
  // 持久化并回读验证：失败时阻止 goal admission
- sessions.flush(session);
+ await sessions.flush(session);
```

---

## 4. MEDIUM — Test Harness (tests/harness.js)

### 问题描述 / Problem Description

The fake session in the test harness exposes both `events` and `log` properties.  
After the blocker fix, code will read `session.log` instead of `session.events`.

```js
// tests/harness.js lines 88-98 — current fake session
function createFakeSession(id, meta) {
  const events = [];
  return {
    id,
    header: { cwd: meta?.cwd, agentPreset: meta?.agentPreset },
    events,       // ← no longer read, can be removed
    log: events,  // ← this is what the plugin now reads
    append(type, data) { events.push({ type, data, time: Date.now() }); },
  };
}
```

The `events` property is harmless (it will just be ignored). No functional breakage in tests.

### Fix / 修复

Optional cleanup — remove the `events` property:

```js
function createFakeSession(id, meta) {
  const log = [];
  return {
    id,
    header: { cwd: meta?.cwd, agentPreset: meta?.agentPreset },
    log,            // plugin reads session.log
    append(type, data) { log.push({ type, data, time: Date.now() }); },
  };
}
```

---

## 5. LOW — package.json engine range (package.json)

### 问题描述 / Problem Description

The plugin declares compatibility with SDK versions `>=0.1.1-rc.2 <0.1.2` in three places:

```json
// package.json
"dsh": {
  "engines": { "dsh": ">=0.1.1-rc.2 <0.1.2" }
},
"engines": { "dsh": ">=0.1.1-rc.2 <0.1.2" },
"peerDependencies": {
  "@deepseek-ai/dsh-sandbox-policy": ">=0.1.1-rc.2 <0.1.2",
  "@deepseek-ai/dsh-tools":            ">=0.1.1-rc.2 <0.1.2",
  "@deepseek-ai/dsh-user-approval":   ">=0.1.1-rc.2 <0.1.2"
}
```

These ranges must be updated to include v0.1.5.

### Fix / 修复

```diff
- "dsh": ">=0.1.1-rc.2 <0.1.2"
+ "dsh": ">=0.1.1-rc.2 <0.1.6"
```

Apply the same upper-bound bump to all three peer dependencies.  
Update `capabilitiesDocument()` in `index.js` line 254 as well:

```diff
- dshCompatibility: ">=0.1.1-rc.2 <0.1.2",
+ dshCompatibility: ">=0.1.1-rc.2 <0.1.6",
```

---

## 6. Confirmed Compatible — No Changes Needed

### ✅ Session API

| API | v0.1.1-rc.2 | v0.1.5-rc.1 | Status |
|-----|-------------|-------------|--------|
| `sessions.create(id, { meta })` | returns `Session` | returns `Session` | ✅ |
| `sessions.get(id)` | returns `Session \| undefined` | returns `Session \| undefined` | ✅ |
| `sessions.list()` | returns `Session[]` | returns `Session[]` | ✅ |
| `sessions.flush(session)` | sync void | async Promise\<bool\> | 🟡 see §3 |
| `session.id` | string | string (via `header.id`) | ✅ |
| `session.header.cwd` | string \| undefined | string \| undefined | ✅ |
| `session.header.agentPreset` | string \| undefined | string \| undefined | ✅ |
| `session.append(type, data)` | returns `SessionEvent` | returns `SessionEvent` | ✅ |
| `session.log` | (field existed) | `log = []` public field | ✅ after fix |
| `session.events` | (unknown) | **removed** | 🔴 fixed in §2 |

### ✅ Agent API

| API | v0.1.1-rc.2 | v0.1.5-rc.1 | Status |
|-----|-------------|-------------|--------|
| `agents.create({ sessionId, meta, agentOptions })` | returns `AgentHandle` | returns `Promise\<AgentHandle\>` | ✅ |
| `agents.get(id)` | returns `Agent \| undefined` | returns `Agent \| undefined` | ✅ |
| `agents.list()` | returns `Agent[]` | returns `Agent[]` | ✅ |
| `agent.id` | string | string | ✅ |
| `agent.session` | `Session` | `Session` | ✅ |
| `agent.status` | `'running' \| 'idle'` | `'running' \| 'idle'` | ✅ |
| `agent.steer(msg)` | void | void | ✅ |
| `agent.followup(msg)` | void | void | ✅ |
| `agent.cancel(cause, options)` | void | void | ✅ |
| `agent.options.provider` | string \| undefined | string \| undefined | ✅ |
| `agent.options.model` | string \| undefined | string \| undefined | ✅ |

### ✅ Session Event Types

All event types used by the plugin are declared in v0.1.5:

| Event Type | Registration | Status |
|------------|-------------|--------|
| `session/title` | `dsh-session` core | ✅ |
| `model/selection` | `dsh-session` core | ✅ |
| `sandbox/mode` | `dsh-sandbox-policy` | ✅ |
| `approval/policy` | `dsh-user-approval` | ✅ |
| `user/message` | `dsh-session` core | ✅ |
| `assistant/message` | `dsh-session` core | ✅ |
| `tool/call` | `dsh-session` core | ✅ |
| `tool/result` | `dsh-session` core | ✅ |
| `turn/start` / `turn/end` | `dsh-session` core | ✅ |

### ✅ Goals API

| API | v0.1.1-rc.2 | v0.1.5-rc.1 | Status |
|-----|-------------|-------------|--------|
| `goals.create(agent, { objective, maxGoalRounds })` | returns `GoalView` | returns `GoalView` | ✅ |
| `goals.resume(agent, ref)` | returns `GoalView` | returns `GoalView` | ✅ |
| `goals.pause(agent, ref)` | returns `GoalView` | returns `GoalView` | ✅ |
| `goals.clear(agent, ref)` | returns `GoalRef` | returns `GoalRef` | ✅ |
| `GoalView.ref.id` | string | string | ✅ |
| `GoalView.ref.revision` | number | number | ✅ |
| `GoalView.phase` | string | string | ✅ |

### ✅ SessionProjections API

```js
// runner.js line 199
const projection = sessionProjections.snapshot(agent.session, ["goal"]);
const goal = projection.values?.goal?.goal;  // GoalSnapshot
```

Both `snapshot()` signature and return shape (`ProjectionSnapshot { values: { goal: GoalProjection } }`) are unchanged. ✅

### ✅ WorkspaceRegistry API

```js
// runner.js line 710
await workspaceRegistry.archiveSession(sid);

// index.js line 79
await ws.attachSession(sessionId);
```

Both methods exist with the same signatures in v0.1.5. ✅

### ✅ Context Events

```js
ctx.on("agent/status", ...)      // ✅ registered in dsh-agent runtime-types.d.ts
ctx.on("goal/changed", ...)      // ✅ exists
ctx.on("session/disposed", ...)  // ✅ exists
```

### ✅ defineTool() from dsh-tools

All 19 autoqueue AI tools use the standard `defineTool()` interface:

```js
defineTool({
  name, description, parameters,
  execute(args, exec),
  output: { schema, render },
  presentCall?,
})
```

Interface unchanged in v0.1.5. ✅

### ⚠️ `agentDefaultModel` Service

The package `@deepseek-ai/dsh-agent-default-model` is **not installed** in node_modules.  
The plugin already handles this gracefully:

```js
// index.js line 50
agentDefaultModel: ctx.agentDefaultModel ?? ctx.get("agentDefaultModel"),
```

If the service is unavailable, `resolveAgentModel()` returns `null` and the Host default model is used silently.  
No breakage — but model override via `entry.provider / entry.model` falls back to Host selection.  
This may be intentional (strict isolation). ✅

---

## 7. Change Checklist

- [x] **Blocker** `lib/index.js:221` — `session.events` → `session.log`
- [ ] **Medium** `lib/index.js:220` — `sessions.flush(session)` → `await sessions.flush(session)`
- [ ] **Medium** `tests/harness.js:88` — remove `events` property from fake session
- [ ] **Low** `package.json` — update engine ranges to `<0.1.6`
- [ ] **Low** `lib/index.js:254` — update `dshCompatibility` string in capabilities doc
- [ ] Run tests: `node --test --test-concurrency=1 tests/engine.test.js`
- [ ] Run tests: `node --test tests/task-intelligence.test.js`

---

## 8. Appendix — Session Class API Reference (v0.1.5-rc.1)

```typescript
class Session {
  log: SessionEvent[];                    // public, append-only log (was: private or absent)
  header: SessionHeader;                  // { version, id, createdAt, cwd?, agentPreset?, ... }
  id: SessionId;                          // getter → header.id
  surface: SessionSurface;                // getter → surfaceManager
  firstLiveSeq: SessionLogOffset;         // seq of first event appended in this process

  append<T extends SessionEventType>(type: T, data: SessionEventMap[T]): SessionEvent<T>;
  eventAt(seq: SessionSeq): SessionEvent | undefined;
  snapshotEvents(fromSeq?: number, toSeqExclusive?: number): readonly SessionEvent[];
  ownEvents(): readonly SessionEvent[];   // events after fork-inherited prefix
  deriveMessages(): Message[];            // derived LLM message history
  requestHeader(): EpochHeader | undefined;
  requestContext(): RequestContext | undefined;
}
```

**Key change from v0.1.1-rc.2:** The internal event log was previously accessed via a private or differently-named property (`events`). In v0.1.5 it is exposed as the public field `log`. The documented public APIs are `snapshotEvents()` and `ownEvents()` — direct `session.log` access works in JavaScript (the field is a plain class field `log = []`) but is typed as an internal detail in the TypeScript declarations.

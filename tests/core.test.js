import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  linkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { runInNewContext } from "node:vm";

import {
  createRunDir,
  getTasksDir,
  listTaskFiles,
  matchCron,
  MAX_REPORT_BYTES,
  MAX_TASK_CONTENT_BYTES,
  safeReadReportFile,
  setQueueDir,
  validateCronExpression,
  writeTaskFile,
} from "../lib/files.js";
import {
  checkRequest,
  completeRequest,
  findByKey,
  flushLedger,
  getConcurrency,
  releaseRequest,
  reloadLedger,
  setConcurrency,
  snapshot,
  upsertEntry,
} from "../lib/ledger.js";
import {
  AUTOQUEUE_PTC_UNATTENDED_PRESET,
  AUTOQUEUE_SESSION_PREFIX,
  AUTOQUEUE_UNATTENDED_PRESET,
  createRunner,
  isAutoqueueSessionId,
  SessionLaunchError,
} from "../lib/runner.js";
import { createEngine } from "../lib/engine.js";
import { AUTOQUEUE_AI_TOOL_NAMES, registerAiTool } from "../lib/ai-tool.js";
import {
  apply,
  ensureOwnedPreset,
  injectUnattendedDiscipline,
  pinOwnedSessionApprovalPolicy,
  registerRuntimePollEvents,
} from "../lib/index.js";

const roots = [];

function freshQueue() {
  const root = mkdtempSync(join(tmpdir(), "autoqueue-test-"));
  roots.push(root);
  const queueDir = join(root, "queue");
  setQueueDir(queueDir);
  reloadLedger();
  return queueDir;
}

function ok(value = {}) {
  return { result: { ok: true, value } };
}

function fail(code, message, details) {
  return { result: { ok: false, error: { code, message, details } } };
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function ownedSession(sequence = 1) {
  return `${AUTOQUEUE_SESSION_PREFIX}00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

const idleSessionList = async () => ok({ items: [] });

test("production client bundle registers before the Host installs React", () => {
  let registration;
  const source = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
  assert.doesNotThrow(() => runInNewContext(source, {
    window: { __ModuleLoader__: { load(value) { registration = value; } } },
  }));
  assert.equal(registration?.id, "@alintever/dsh-plugin-autoqueue");
  assert.equal(typeof registration?.factory, "function");
});

const SOURCE_AGENT_PRESET = `- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    text: >-
      You are a coding agent.

- id: tool-bash
  name: '@deepseek-ai/dsh-tool-bash'

- id: tool-pwsh
  name: '@deepseek-ai/dsh-tool-pwsh'

- id: tool-jobs
  name: '@deepseek-ai/dsh-tool-jobs'

- id: delegation
  name: cordis:group
  group: true
  config:
    - id: tool-subagent-control
      name: '@deepseek-ai/dsh-tool-subagent-control'
    - id: tool-subagent-list-agents
      name: '@deepseek-ai/dsh-tool-subagent-control/list-agents'
    - id: tool-subagent
      name: '@deepseek-ai/dsh-tool-subagent'
    - id: tool-subagent-fork
      name: '@deepseek-ai/dsh-tool-subagent'
    - id: tool-subagent-codex
      name: '@deepseek-ai/dsh-tool-subagent'
      disabled: true
    - id: tool-subagent-claude-code
      name: '@deepseek-ai/dsh-tool-subagent'
      disabled: true
    - id: tool-workflow
      name: '@deepseek-ai/dsh-tool-workflow'
    - id: tool-ralph
      name: '@deepseek-ai/dsh-tool-ralph'

- id: tool-ask-user
  name: '@deepseek-ai/dsh-tool-ask-user'
`;

test.after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

test("ledger task mutations advance revision while request reservations do not", () => {
  const queueDir = freshQueue();
  assert.equal(snapshot().revision, 0);

  upsertEntry("revision-case", { body: "hello" });
  assert.equal(snapshot().revision, 1);

  assert.equal(checkRequest("request-1", { kind: "create", key: "revision-case" }), "new");
  assert.equal(checkRequest("request-1", { kind: "create", key: "revision-case" }), "inflight");
  assert.equal(snapshot().revision, 1);
  flushLedger();
  let persisted = JSON.parse(readFileSync(join(queueDir, "queue-ledger.json"), "utf8"));
  assert.deepEqual(persisted.recentRequests, []);
  assert.equal(releaseRequest("request-1"), true);
  assert.equal(snapshot().revision, 1);

  assert.equal(checkRequest("request-2", { kind: "create", key: "revision-case" }), "new");
  assert.equal(completeRequest("request-2"), true);
  assert.equal(checkRequest("request-2", { kind: "create", key: "revision-case" }), "completed");
  flushLedger();
  persisted = JSON.parse(readFileSync(join(queueDir, "queue-ledger.json"), "utf8"));
  assert.equal(persisted.recentRequests.length, 1);
  assert.equal(persisted.recentRequests[0].requestId, "request-2");

  upsertEntry("revision-case", { status: "done" });
  assert.equal(snapshot().revision, 2);
  flushLedger();
  persisted = JSON.parse(readFileSync(join(queueDir, "queue-ledger.json"), "utf8"));
  assert.equal(persisted.revision, 2);
  assert.equal(persisted.tasks[0].status, "done");
});

test("corrupt ledger fails closed and preserves the original", () => {
  const root = mkdtempSync(join(tmpdir(), "autoqueue-corrupt-test-"));
  roots.push(root);
  const queueDir = join(root, "queue");
  setQueueDir(queueDir);
  writeFileSync(join(root, "placeholder"), "keep");
  // Initialize the directory through the normal path, then replace only the
  // ledger with malformed input before attempting a reload.
  reloadLedger();
  flushLedger();
  const ledgerFile = join(queueDir, "queue-ledger.json");
  // Move the live singleton away first; reload deliberately flushes its
  // currently active document before reading a target path.
  freshQueue();
  writeFileSync(ledgerFile, "{ definitely-not-json", { mode: 0o600 });

  setQueueDir(queueDir);
  assert.throws(() => reloadLedger(), /账本损坏.*拒绝启动/);
  assert.equal(readFileSync(ledgerFile, "utf8"), "{ definitely-not-json");
  const backups = readdirSync(queueDir).filter(name => name.startsWith("queue-ledger.json.corrupt-"));
  assert.equal(backups.length, 1);

  // Leave the singleton bound to a healthy ledger for subsequent tests.
  freshQueue();
});

test("ledger schema rejects malformed task state and execution records", () => {
  const baseTask = {
    key: "schema-case",
    status: "running",
    workDir: null,
    sessionId: "session-schema",
    goalRef: null,
    attempts: 1,
    blockedResumes: 0,
    executions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    body: "# schema-case",
  };
  for (const [patch, expected] of [
    [{ body: null }, /task body is invalid/],
    [{ maxGoalRounds: 0 }, /maxGoalRounds is invalid/],
    [{ executions: [{}] }, /execution id is invalid/],
    [{ unknownThreshold: "zero" }, /unknownThreshold is invalid/],
    [{ nextRetryAt: {} }, /nextRetryAt is invalid/],
    [{ archivedAt: {} }, /archivedAt is invalid/],
    [{ _goalContainmentConfirmed: { bad: true } }, /_goalContainmentConfirmed is invalid/],
    [{ status: "pending", _goalAdmissionUncertain: true }, /goal admission quarantine is invalid/],
    [{ _promptContainmentConfirmed: { bad: true } }, /_promptContainmentConfirmed is invalid/],
    [{ status: "pending", _promptAdmissionUncertain: true }, /prompt admission quarantine is invalid/],
    [{ _foregroundPaused: "yes" }, /_foregroundPaused is invalid/],
    [{ status: "pending", _foregroundPausePending: true }, /foreground pause state is invalid/],
    [{ _foregroundPaused: true }, /foreground pause has no goal ref/],
    [{ _foregroundCancelPending: true }, /foreground cancel has no durable pause/],
    [{
      goalRef: { id: "goal-foreground-conflict", revision: 1 },
      _foregroundPausePending: true,
      _foregroundPaused: true,
    }, /foreground pause markers conflict/],
    [{
      status: "running",
      sessionId: "session-mutual-markers",
      goalRef: { id: "goal-mutual-markers", revision: 1 },
      _goalAdmissionUncertain: true,
      _promptAdmissionUncertain: true,
    }, /markers are not mutually exclusive/],
  ]) {
    const root = mkdtempSync(join(tmpdir(), "autoqueue-schema-test-"));
    roots.push(root);
    const queueDir = join(root, "queue");
    setQueueDir(queueDir);
    reloadLedger();
    flushLedger();
    const ledgerFile = join(queueDir, "queue-ledger.json");

    // Keep the active singleton healthy while replacing only the target file.
    freshQueue();
    writeFileSync(ledgerFile, JSON.stringify({
      schemaVersion: 2,
      revision: 1,
      tasks: [{ ...baseTask, ...patch }],
      config: { maxConcurrent: 2 },
      recentRequests: [],
    }), { mode: 0o600 });
    setQueueDir(queueDir);
    assert.throws(() => reloadLedger(), expected);
  }
  freshQueue();
});

test("runner isolates launch with cwd and never mutates workspace, model, or prompt state", async () => {
  freshQueue();
  const workDir = createRunDir("runner-isolation");
  const body = "# Full task\n\nSecond line must be admitted too.";
  let createPayload;
  let goalPayload;
  let forbiddenCalls = 0;
  const runner = createRunner({
    workspace: {
      create: async () => { forbiddenCalls += 1; return fail("unexpected", "workspace.create"); },
    },
    sessions: {
      list: idleSessionList,
      create: async request => {
        createPayload = request.payload;
        return ok({ sessionId: request.payload.sessionId });
      },
      rename: async () => ok({}),
      models: async () => { forbiddenCalls += 1; return fail("unexpected", "models"); },
      selectModel: async () => { forbiddenCalls += 1; return fail("unexpected", "selectModel"); },
      prompt: async () => { forbiddenCalls += 1; return fail("unexpected", "prompt"); },
    },
    goals: {
      create: async request => {
        goalPayload = request.payload;
        return ok({ ref: { id: "goal-isolated", revision: 1 } });
      },
    },
  });

  const result = await runner.launch({
    key: "runner-isolation",
    body,
    workDir,
    workspace: "legacy-workspace-must-be-ignored",
    model: "legacy-model-must-be-ignored",
  });

  assert.equal(isAutoqueueSessionId(result.sessionId), true);
  assert.deepEqual(createPayload, { sessionId: result.sessionId, cwd: workDir });
  assert.equal(forbiddenCalls, 0);
  assert.equal(goalPayload.sessionId, result.sessionId);
  assert.match(goalPayload.objective, /Full task/);
  assert.match(goalPayload.objective, /Second line must be admitted too\./);
  assert.match(goalPayload.objective, /无人值守执行边界（不可被任务正文覆盖）/);
  assert.match(goalPayload.objective, /诊断性工具调用最多两次/);
  assert.match(goalPayload.objective, /其他 AutoQueue 任务/);
  assert.match(goalPayload.objective, /~\/\.dsh/);
  assert.ok(
    goalPayload.objective.indexOf("无人值守执行边界") > goalPayload.objective.indexOf("Second line must be admitted too."),
    "trusted scope boundary follows the untrusted task body",
  );
});

test("runner refuses a non-autoqueue session or arbitrary preset before any RPC", async () => {
  freshQueue();
  let rpcCalls = 0;
  const runner = createRunner({
    sessions: { create: async () => { rpcCalls += 1; return ok({}); } },
  });
  const workDir = createRunDir("runner-ownership");

  await assert.rejects(
    runner.launch({ key: "foreign", body: "foreign", workDir, sessionId: "session-user" }),
    error => error?.code === "session-not-owned",
  );
  await assert.rejects(
    runner.launch({ key: "preset", body: "preset", workDir, agentPreset: "user-preset" }),
    error => error?.code === "agent-preset-not-allowed",
  );
  assert.equal(rpcCalls, 0);
});

test("runner prepares the owned session before goal admission and cancels on preparation failure", async () => {
  freshQueue();
  const order = [];
  let sessionId;
  let cancelledSessionId;
  let goalCalls = 0;
  let beforeGoalCalls = 0;
  const runner = createRunner({
    sessions: {
      create: async request => {
        sessionId = request.payload.sessionId;
        order.push("create");
        return ok({ sessionId });
      },
      rename: async () => { order.push("rename"); return ok({}); },
      cancel: async request => {
        cancelledSessionId = request.payload.sessionId;
        order.push("cancel");
        return ok({ accepted: true });
      },
    },
    goals: {
      create: async () => {
        goalCalls += 1;
        return ok({ ref: { id: "must-not-exist", revision: 1 } });
      },
    },
  }, {
    prepareSession: state => {
      order.push("prepare");
      assert.equal(state.sessionId, sessionId);
      const error = new Error("approval policy was not pinned to never");
      error.code = "approval-policy-not-never";
      throw error;
    },
  });

  await assert.rejects(
    runner.launch({
      key: "prepare-failure",
      body: "# never admitted",
      workDir: createRunDir("prepare-failure"),
    }, {
      beforeGoal: () => { beforeGoalCalls += 1; },
    }),
    error => {
      assert.ok(error instanceof SessionLaunchError);
      assert.equal(error.code, "approval-policy-not-never");
      assert.equal(error.goalIssued, false);
      assert.equal(error.goalUncertain, false);
      assert.equal(error.cause.cleanupConfirmed, true);
      return true;
    },
  );

  assert.equal(isAutoqueueSessionId(sessionId), true);
  assert.equal(cancelledSessionId, sessionId);
  assert.equal(beforeGoalCalls, 0);
  assert.equal(goalCalls, 0);
  assert.deepEqual(order, ["create", "rename", "prepare", "cancel"]);
});

test("runner re-prepares restored sessions before every continuation admission", async () => {
  freshQueue();
  const sessionId = ownedSession(41);
  const ref = { id: "restored-goal", revision: 3 };
  let preparationCalls = 0;
  let mutationCalls = 0;
  const runner = createRunner({
    sessions: {
      prompt: async () => { mutationCalls += 1; return ok({ accepted: true }); },
    },
    goals: {
      resume: async () => { mutationCalls += 1; return ok({ ref }); },
    },
  }, {
    prepareSession: () => {
      preparationCalls += 1;
      const error = new Error("restored session policy is unavailable");
      error.code = "approval-policy-unavailable";
      throw error;
    },
  });

  for (const continueTask of [
    () => runner.resumeGoal(sessionId, ref),
    () => runner.antiBlock(sessionId, ref),
    () => runner.wakeup(sessionId, ref),
  ]) {
    await assert.rejects(continueTask, error => error?.code === "approval-policy-unavailable");
  }
  assert.equal(preparationCalls, 3, "a failed preparation remains retryable");
  assert.equal(mutationCalls, 0, "no continuation is admitted before policy verification");
});

test("runner coalesces only concurrent preparation and revalidates sequential continuations", async () => {
  freshQueue();
  const sessionId = ownedSession(43);
  const ref = { id: "prepared-goal", revision: 1 };
  const preparationEntered = deferred();
  const preparationGate = deferred();
  let preparationCalls = 0;
  let resumeCalls = 0;
  const runner = createRunner({
    goals: {
      resume: async () => {
        resumeCalls += 1;
        return ok({ ref });
      },
    },
  }, {
    prepareSession: async () => {
      preparationCalls += 1;
      if (preparationCalls === 1) {
        preparationEntered.resolve();
        await preparationGate.promise;
      }
    },
  });

  const first = runner.resumeGoal(sessionId, ref);
  const concurrent = runner.resumeGoal(sessionId, ref);
  await preparationEntered.promise;
  assert.equal(preparationCalls, 1, "concurrent continuations share one policy fold/flush");
  preparationGate.resolve();
  await Promise.all([first, concurrent]);
  assert.equal(resumeCalls, 2);

  await runner.resumeGoal(sessionId, ref);
  assert.equal(preparationCalls, 2, "a later continuation revalidates Host policy drift");
});

test("anti-block wakeup preserves the strict scope and two-diagnostic ceiling", async () => {
  freshQueue();
  const sessionId = ownedSession(44);
  const ref = { id: "blocked-goal", revision: 2 };
  let content;
  const runner = createRunner({
    sessions: {
      prompt: async request => {
        content = request.payload.content[0].text;
        return ok({ accepted: true });
      },
    },
    goals: { resume: async () => ok({ ref }) },
  }, { prepareSession: () => {} });

  await runner.antiBlock(sessionId, ref);
  assert.match(content, /诊断性工具调用最多两次/);
  assert.match(content, /禁止查看其他队列、~\/\.dsh/);
  assert.doesNotMatch(content, /不要停下来|提出至少两种不同的新方案/);
});

test("index durably pins workspace-write and never only on an owned session", async t => {
  const sessionId = ownedSession(42);

  await t.test("owned-success", async () => {
    const events = [{ type: "approval/policy", data: { policy: "ask" } }];
    const session = {
      id: sessionId,
      events,
      append(type, data) { events.push({ type, data }); },
    };
    let flushCalls = 0;
    await pinOwnedSessionApprovalPolicy({
      get(id) { assert.equal(id, sessionId); return session; },
      async flush(value) {
        flushCalls += 1;
        assert.equal(value, session);
        assert.equal(events.at(-1).data.policy, "never", "append precedes durable flush");
      },
    }, sessionId);
    assert.equal(flushCalls, 1);
    assert.deepEqual(events.at(-2), { type: "sandbox/mode", data: { mode: "workspace-write" } });
    assert.deepEqual(events.at(-1), { type: "approval/policy", data: { policy: "never" } });

    // Sequential verification still reaches the durable store, without
    // growing the event log when neither effective policy drifted.
    const eventCount = events.length;
    await pinOwnedSessionApprovalPolicy({
      get() { return session; },
      async flush() { flushCalls += 1; },
    }, sessionId);
    assert.equal(flushCalls, 2);
    assert.equal(events.length, eventCount);

    session.append("sandbox/mode", { mode: "read-only" });
    await pinOwnedSessionApprovalPolicy({
      get() { return session; },
      async flush() { flushCalls += 1; },
    }, sessionId);
    assert.deepEqual(events.at(-1), { type: "sandbox/mode", data: { mode: "workspace-write" } });
  });

  await t.test("foreign-id", async () => {
    let touched = false;
    await assert.rejects(
      pinOwnedSessionApprovalPolicy({
        get() { touched = true; },
        async flush() { touched = true; },
      }, "session-user"),
      error => error?.code === "session-not-owned",
    );
    assert.equal(touched, false);
  });

  await t.test("missing-owned-session", async () => {
    let flushCalls = 0;
    await assert.rejects(
      pinOwnedSessionApprovalPolicy({
        get() { return undefined; },
        async flush() { flushCalls += 1; },
      }, sessionId),
      error => error?.code === "session-not-found",
    );
    assert.equal(flushCalls, 0);
  });

  await t.test("flush-failure", async () => {
    const events = [];
    const session = {
      id: sessionId,
      events,
      append(type, data) { events.push({ type, data }); },
    };
    await assert.rejects(
      pinOwnedSessionApprovalPolicy({
        get() { return session; },
        async flush() { throw new Error("durable flush failed"); },
      }, sessionId),
      /durable flush failed/,
    );
    assert.equal(events.at(-1).data.policy, "never");
  });
});

test("index creates and verifies versioned owned presets without overwriting collisions", async t => {
  const targetId = AUTOQUEUE_UNATTENDED_PRESET;
  const completeContent = injectUnattendedDiscipline(SOURCE_AGENT_PRESET);

  function makeExistingPreset(content, { path = "/must-not-be-written/agent.cordis.yml" } = {}) {
    let copyCalls = 0;
    return {
      service: {
        async list() { return [{ id: targetId, path }]; },
        async read(id) { assert.equal(id, targetId); return content; },
        async copy() { copyCalls += 1; },
      },
      copyCalls: () => copyCalls,
    };
  }

  await t.test("new-preset-atomic-persistence", async () => {
    const root = mkdtempSync(join(tmpdir(), "autoqueue-preset-test-"));
    roots.push(root);
    const presetDir = join(root, targetId);
    const presetPath = join(presetDir, "agent.cordis.yml");
    let created = false;
    let copyCalls = 0;
    const service = {
      async list() { return created ? [{ id: targetId, path: presetPath }] : []; },
      async copy(from, id, name) {
        copyCalls += 1;
        assert.deepEqual([from, id, name], ["standard", targetId, "Owned test preset"]);
        mkdirSync(presetDir, { recursive: true });
        writeFileSync(presetPath, SOURCE_AGENT_PRESET, "utf8");
        created = true;
      },
      async read(id) {
        assert.equal(id, targetId);
        return readFileSync(presetPath, "utf8");
      },
    };

    await ensureOwnedPreset({ agentPresets: service }, "standard", targetId, "Owned test preset");
    const persisted = readFileSync(presetPath, "utf8");
    assert.equal(copyCalls, 1);
    assert.equal(persisted, completeContent);
    assert.equal((persisted.match(/\[autoqueue:unattended-discipline:v2\]/g) ?? []).length, 1);
    assert.match(persisted, /\*\*Never request approval\.\*\*/);
    assert.match(persisted, /\*\*Stay in the owned foreground turn\.\*\*/);
    assert.match(persisted, /- id: tool-ask-user\n  disabled: true\n/);
    assert.match(persisted, /- id: tool-bash[\s\S]*?enableRunInBackground: false/);
    assert.match(persisted, /- id: tool-subagent\n      disabled: true\n/);
    assert.deepEqual(readdirSync(presetDir), ["agent.cordis.yml"], "atomic temp file is removed");
  });

  await t.test("foreign-marker-missing", async () => {
    const existing = makeExistingPreset(SOURCE_AGENT_PRESET);
    await assert.rejects(
      ensureOwnedPreset({ agentPresets: existing.service }, "standard", targetId, "ignored"),
      /Refusing to overwrite foreign preset/,
    );
    assert.equal(existing.copyCalls(), 0);
  });

  const incompleteCases = {
    "ask-user-missing": completeContent.replace(/\n- id: tool-ask-user\n[\s\S]*$/, "\n"),
    "ask-user-enabled": completeContent.replace("- id: tool-ask-user\n  disabled: true\n", "- id: tool-ask-user\n  disabled: false\n"),
    "subagent-enabled": completeContent.replace("- id: tool-subagent\n      disabled: true\n", "- id: tool-subagent\n      disabled: false\n"),
    "background-shell-enabled": completeContent.replace("enableRunInBackground: false", "enableRunInBackground: true"),
    "discipline-truncated": `- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    text: |-
      [autoqueue:unattended-discipline:v2]
      ## Unattended Discipline
      1. **Do not ask questions.**
      6. **Never request approval.**
      7. **Stay in the owned foreground turn.**
- id: tool-ask-user
  disabled: true
  name: '@deepseek-ai/dsh-tool-ask-user'
`,
  };
  for (const [name, content] of Object.entries(incompleteCases)) {
    await t.test(name, async () => {
      const existing = makeExistingPreset(content);
      await assert.rejects(
        ensureOwnedPreset({ agentPresets: existing.service }, "standard", targetId, "ignored"),
        /incomplete or was modified/,
      );
      assert.equal(existing.copyCalls(), 0);
    });
  }

  await t.test("complete-existing-is-read-only", async () => {
    const existing = makeExistingPreset(completeContent);
    await ensureOwnedPreset({ agentPresets: existing.service }, "standard", targetId, "ignored");
    assert.equal(existing.copyCalls(), 0);
  });
});

test("runner reads rc.2 GoalProjection and wrapped HistoryEntry events", async () => {
  const eventTime = Date.now();
  const runner = createRunner({
    sessions: {
      history: async () => ok({
        projections: {
          values: {
            goal: {
              goal: { id: "goal-1", revision: 7, phase: "active" },
              roundsStarted: 12,
              updatedAt: eventTime - 100,
            },
          },
        },
        events: [
          { event: {
            type: "assistant/message",
            time: eventTime - 200,
            data: { message: { content: [{ type: "text", text: "older output" }] } },
          } },
          { event: {
            type: "assistant/message",
            time: eventTime - 100,
            data: {
              interrupted: true,
              message: { content: [{ type: "text", text: "partial output must not win" }] },
            },
          } },
          { event: {
            type: "assistant/message",
            time: eventTime,
            data: { message: { content: [
              { type: "reasoning", text: "private reasoning" },
              { type: "text", text: "RESULT: 37×19 = " },
              { type: "text", text: "703" },
            ] } },
          } },
        ],
      }),
    },
  });

  const result = await runner.pollTask(ownedSession(1));
  assert.deepEqual(result.goalRef, { id: "goal-1", revision: 7 });
  assert.equal(result.totalMessages, 12);
  assert.equal(result.lastActivityTime, eventTime);
  assert.equal(result.output, "RESULT: 37×19 = 703");
});

test("complete goal waits for owned session idle and persists the closing assistant output", async () => {
  freshQueue();
  const key = "closing-output-race";
  const workDir = createRunDir(key);
  const sessionId = ownedSession(41);
  const goalRef = { id: "goal-closing-output", revision: 2 };
  upsertEntry(key, {
    status: "running",
    body: "# closing output race",
    raw: "# closing output race",
    workDir,
    sessionId,
    goalRef,
    attempts: 1,
    executions: [{
      id: "exec-closing-output",
      sessionId,
      attempt: 1,
      startedAt: new Date().toISOString(),
      workDir,
    }],
  });
  flushLedger();

  let running = true;
  let historyCalls = 0;
  const engine = createEngine({
    sessions: {
      list: async () => ok({ items: [{ sessionId, running }] }),
      history: async () => {
        historyCalls += 1;
        return ok({
          projections: {
            values: {
              goal: {
                goal: { ...goalRef, phase: "complete" },
                roundsStarted: 1,
                updatedAt: Date.now(),
              },
            },
          },
          events: running ? [
            { event: {
              type: "goal/change",
              time: Date.now(),
              data: { operation: "complete" },
            } },
          ] : [
            { event: {
              type: "assistant/message",
              time: Date.now(),
              data: { message: { content: [
                { type: "text", text: "Closing answer: 37×19 = 703" },
              ] } },
            } },
          ],
        });
      },
    },
  }, { autoArchive: false });
  engine.scanPending = async () => {};

  await engine.pollRunning();
  assert.equal(historyCalls, 1);
  assert.equal(findByKey(key).status, "running", "goal complete alone must not settle an active closing turn");
  assert.equal(existsSync(join(workDir, ".结果.md")), false);

  running = false;
  await engine.pollRunning();
  assert.equal(historyCalls, 2);
  assert.equal(findByKey(key).status, "done");
  const result = JSON.parse(readFileSync(join(workDir, ".结果.md"), "utf8"));
  assert.equal(result.result, "done");
  assert.equal(result.output, "Closing answer: 37×19 = 703");
  assert.match(engine.getTaskDetail(key).task.reports.result, /703/);
});

test("runtime poll dirty latch coalesces bursts and replays events received during a poll", async () => {
  freshQueue();
  const engine = createEngine({});
  const firstPollStarted = deferred();
  const releaseFirstPoll = deferred();
  let pollCalls = 0;
  engine.pollRunning = async () => {
    pollCalls += 1;
    if (pollCalls === 1) {
      firstPollStarted.resolve();
      await releaseFirstPoll.promise;
    }
  };

  assert.equal(engine.requestRuntimePoll(), true);
  engine.requestRuntimePoll();
  engine.requestRuntimePoll();
  assert.equal(pollCalls, 0, "runtime callbacks never poll synchronously");
  await firstPollStarted.promise;
  assert.equal(pollCalls, 1, "one event burst collapses into one poll");

  engine.requestRuntimePoll();
  engine.requestRuntimePoll();
  await Promise.resolve();
  assert.equal(pollCalls, 1, "a dirty event never starts a concurrent poll");

  releaseFirstPoll.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pollCalls, 2, "dirty state received during a poll forces one follow-up pass");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pollCalls, 2, "the follow-up pass consumes the dirty latch exactly once");

  engine.dispose();
  assert.equal(engine.requestRuntimePoll(), false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pollCalls, 2);
});

test("state and detail expose derived execution facts plus read-only runtime monitoring", async () => {
  freshQueue();
  const readAt = new Date().toISOString();
  const sessionId = ownedSession(70);
  upsertEntry("projection-contract", {
    status: "failed",
    body: "# projection contract",
    raw: "# projection contract",
    cron: "0 8 * * *",
    sessionId: null,
    goalRef: null,
    attempts: 2,
    blockedResumes: 1,
    readAt,
    _currentRound: 7,
    _goalPhase: "failed",
    _lastActivityTime: 123456789,
    executions: [{
      id: "exec-projection-contract",
      sessionId,
      attempt: 2,
      startedAt: new Date(Date.now() - 10_000).toISOString(),
      endedAt: new Date().toISOString(),
      result: "failed",
      error: "projection failure",
    }],
  });
  const engine = createEngine({});
  let state = engine.snapshot();
  let task = state.tasks.find(candidate => candidate.key === "projection-contract");
  assert.equal(task.taskType, "cron");
  assert.equal(typeof task.nextRunAt, "string");
  assert.equal(task.currentRound, 7);
  assert.equal(task.goalPhase, "failed");
  assert.equal(task.lastActivityTime, 123456789);
  assert.equal(task.lastSessionId, sessionId);
  assert.equal(task.lastError, "projection failure");
  assert.equal(task.readAt, readAt);
  assert.equal(task.stopPending, false);
  assert.equal(Object.keys(task).some(field => field.startsWith("_")), false);

  const detail = engine.getTaskDetail("projection-contract").task;
  for (const field of [
    "taskType", "nextRunAt", "currentRound", "goalPhase", "lastActivityTime",
    "lastSessionId", "lastError", "readAt", "stopPending",
  ]) assert.deepEqual(detail[field], task[field], `${field} must agree across state/detail`);

  assert.equal(state.runtime.monitorMode, "native-events+authoritative-reconcile");
  assert.equal(state.runtime.watchdogMs, 10_000);
  assert.equal(state.runtime.foregroundGate, "unknown");
  assert.equal(state.runtime.sessionListKnown, false);
  assert.equal(engine.requestRuntimePoll("test/native-edge"), true);
  await new Promise(resolve => setImmediate(resolve));
  state = engine.snapshot();
  assert.equal(state.runtime.lastNativeEventSource, "test/native-edge");
  assert.equal(typeof state.runtime.lastNativeEventAt, "string");
  assert.equal(typeof state.runtime.lastPollAt, "string");
  assert.equal(state.runtime.foregroundGate, "unknown", "no list means no stale foreground claim");
});

test("native runtime listeners only dirty-latch relevant edges and uninstall cleanly", async () => {
  freshQueue();
  const listeners = new Map();
  const ctx = {
    on(name, listener) {
      let group = listeners.get(name);
      if (!group) listeners.set(name, group = new Set());
      group.add(listener);
      return () => group.delete(listener);
    },
  };
  const emit = (name, payload) => {
    for (const listener of [...(listeners.get(name) ?? [])]) listener(payload);
  };
  const engine = createEngine({});
  let pollCalls = 0;
  let scanCalls = 0;
  engine.pollRunning = async () => { pollCalls += 1; };
  engine.scanPending = async () => { scanCalls += 1; };
  const beforeRevision = snapshot().revision;
  const dispose = registerRuntimePollEvents(ctx, engine);

  emit("agent/status", { agent: { id: "ordinary-foreground" }, status: "running" });
  emit("agent/status", { agent: { id: ownedSession(42) }, status: "idle" });
  emit("goal/changed", { agent: { id: ownedSession(42) }, change: { operation: "complete" } });
  emit("session/disposed", { id: "ordinary-foreground" });
  assert.equal(pollCalls, 0, "listeners do not enter the control plane synchronously");
  assert.equal(snapshot().revision, beforeRevision, "listeners do not mutate the ledger directly");
  // Runtime polling drains in a microtask while pending scans intentionally
  // use a zero-delay timer. setImmediate ordering relative to that timer
  // depends on the event-loop phase, so wait past the timer boundary.
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(pollCalls, 1, "mixed native edges are coalesced");
  assert.equal(scanCalls, 1, "idle/disposed edges coalesce into one pending scan");

  emit("goal/changed", { agent: { id: "ordinary-foreground" }, change: { operation: "complete" } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pollCalls, 1, "foreign goal changes are not queue control events");
  assert.equal(scanCalls, 1, "foreign goal changes do not scan the inbox");

  dispose();
  dispose();
  assert.deepEqual(
    [...listeners.entries()].map(([name, group]) => [name, group.size]),
    [["agent/status", 0], ["goal/changed", 0], ["session/disposed", 0]],
  );
  emit("agent/status", { agent: { id: "ordinary-foreground" }, status: "running" });
  emit("goal/changed", { agent: { id: ownedSession(42) }, change: { operation: "blocked" } });
  emit("session/disposed", { id: ownedSession(42) });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(pollCalls, 1, "unloaded listeners cannot schedule later polls");
  assert.equal(scanCalls, 1, "unloaded listeners cannot schedule later scans");
  engine.dispose();
});

test("overlapping create scan replays after the active inbox snapshot", async () => {
  freshQueue();
  writeTaskFile("snapshot-old", "# snapshot old");
  const gateEntered = deferred();
  const releaseGate = deferred();
  const dispatched = [];
  const engine = createEngine({});
  let gateCalls = 0;
  engine._hostAllowsDispatch = async () => {
    gateCalls += 1;
    if (gateCalls === 1) {
      gateEntered.resolve();
      await releaseGate.promise;
    }
    return true;
  };
  engine._dispatch = async task => {
    dispatched.push(task.key);
    rmSync(task.path);
  };

  const firstScan = engine.scanPending();
  await gateEntered.promise;
  writeTaskFile("snapshot-new", "# snapshot new");
  await engine.scanPending();
  releaseGate.resolve();
  await firstScan;
  for (let attempt = 0; attempt < 10 && dispatched.length < 2; attempt++) {
    await new Promise(resolve => setImmediate(resolve));
  }

  assert.deepEqual(dispatched, ["snapshot-old", "snapshot-new"]);
  assert.equal(gateCalls, 2, "the retained edge performs one authoritative replay");
  engine.dispose();
});

test("scan blocked by a provisional dispatch reservation replays after final Host rejection", async () => {
  freshQueue();
  writeTaskFile("reservation-old", "# reservation old");
  const firstListEntered = deferred();
  const releaseFirstList = deferred();
  const finalAdmissionEntered = deferred();
  const releaseFinalAdmission = deferred();
  let listCalls = 0;
  let createCalls = 0;
  const engine = createEngine({
    sessions: {
      list: async () => {
        listCalls += 1;
        if (listCalls === 1) {
          firstListEntered.resolve();
          await releaseFirstList.promise;
          return ok({ items: [] });
        }
        if (listCalls === 2) {
          finalAdmissionEntered.resolve();
          await releaseFinalAdmission.promise;
          return ok({ items: [{ sessionId: "foreign-arrived", running: true }] });
        }
        return ok({ items: [] });
      },
      create: async request => {
        createCalls += 1;
        return ok({ sessionId: request.payload.sessionId });
      },
      rename: async () => ok({}),
    },
    goals: {
      create: async () => ok({ ref: { id: "goal-reservation-replay", revision: 1 } }),
    },
  });

  const firstScan = engine.scanPending();
  await firstListEntered.promise;
  assert.deepEqual(
    engine.createTask("reservation-overlap-create", "reservation-new", "# reservation new", { autoArchive: false }),
    { ok: true, key: "reservation-new" },
  );
  releaseFirstList.resolve();
  await firstScan;
  await finalAdmissionEntered.promise;

  // A timer/force-scan can arrive while the real _dispatch still owns its
  // provisional reservation. It must retain rather than consume the dirty
  // edge, otherwise the final Host refusal below strands the overlap task.
  await engine.scanPending();
  assert.equal(listCalls, 2, "a direct scan parks behind the provisional reservation");
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(createCalls, 0);
  releaseFinalAdmission.resolve();
  for (let attempt = 0; attempt < 30 && createCalls === 0; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  assert.equal(createCalls, 1, "reservation release must wake a fresh authoritative scan");
  assert.ok(listCalls >= 5, "replay reaches scan, dispatch, and before-goal Host gates");
  assert.deepEqual(
    [findByKey("reservation-old").status, findByKey("reservation-new").status].sort(),
    ["pending", "running"],
  );
  engine.dispose();
});

test("a retained edge waits for the last reservation release and replays once", async () => {
  freshQueue();
  setConcurrency(2);
  writeTaskFile("multi-reservation-old-1", "# multi reservation old 1");
  writeTaskFile("multi-reservation-old-2", "# multi reservation old 2");
  const firstListEntered = deferred();
  const releaseFirstList = deferred();
  const firstFinalAdmissionEntered = deferred();
  const secondFinalAdmissionEntered = deferred();
  const releaseFirstFinalAdmission = deferred();
  const releaseSecondFinalAdmission = deferred();
  const createdSessionIds = [];
  let listCalls = 0;
  const engine = createEngine({
    sessions: {
      list: async () => {
        listCalls += 1;
        if (listCalls === 1) {
          firstListEntered.resolve();
          await releaseFirstList.promise;
          return ok({ items: [] });
        }
        if (listCalls === 2) {
          firstFinalAdmissionEntered.resolve();
          await releaseFirstFinalAdmission.promise;
          return ok({ items: [{ sessionId: "foreign-arrived-first", running: true }] });
        }
        if (listCalls === 3) {
          secondFinalAdmissionEntered.resolve();
          await releaseSecondFinalAdmission.promise;
          return ok({ items: [{ sessionId: "foreign-arrived-second", running: true }] });
        }
        return ok({ items: [] });
      },
      create: async request => {
        createdSessionIds.push(request.payload.sessionId);
        return ok({ sessionId: request.payload.sessionId });
      },
      rename: async () => ok({}),
    },
    goals: {
      create: async () => ok({ ref: { id: `goal-multi-${createdSessionIds.length}`, revision: 1 } }),
    },
  });

  const firstScan = engine.scanPending();
  await firstListEntered.promise;
  assert.equal(engine.createTask("multi-overlap-1", "multi-reservation-new-1", "# multi new 1").ok, true);
  assert.equal(engine.createTask("multi-overlap-2", "multi-reservation-new-2", "# multi new 2").ok, true);
  releaseFirstList.resolve();
  await firstScan;
  await firstFinalAdmissionEntered.promise;
  await secondFinalAdmissionEntered.promise;
  assert.equal(createdSessionIds.length, 0, "both provisional dispatches are still behind final Host admission");

  releaseFirstFinalAdmission.resolve();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(listCalls, 3, "one remaining reservation keeps the retained edge parked");
  releaseSecondFinalAdmission.resolve();
  for (let attempt = 0; attempt < 40 && createdSessionIds.length < 2; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  assert.equal(createdSessionIds.length, 2, "the last release replays the retained edge with full capacity");
  assert.equal(new Set(createdSessionIds).size, 2, "each owned session is created exactly once");
  const statuses = [
    findByKey("multi-reservation-old-1").status,
    findByKey("multi-reservation-old-2").status,
    findByKey("multi-reservation-new-1").status,
    findByKey("multi-reservation-new-2").status,
  ];
  assert.equal(statuses.filter(status => status === "running").length, 2);
  assert.equal(statuses.filter(status => status === "pending").length, 2);
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(createdSessionIds.length, 2, "the replay neither exceeds concurrency nor self-rearms");
  engine.dispose();
});

test("queued pending scan respects dispose and a busy Host does not self-spin", async () => {
  freshQueue();
  writeTaskFile("scan-dispose", "# scan dispose");
  let disposedListCalls = 0;
  const disposedEngine = createEngine({
    sessions: { list: async () => { disposedListCalls += 1; return ok({ items: [] }); } },
  });
  assert.equal(disposedEngine.requestPendingScan(), true);
  disposedEngine.dispose();
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(disposedListCalls, 0);

  freshQueue();
  writeTaskFile("scan-busy", "# scan busy");
  let busyListCalls = 0;
  const busyEngine = createEngine({
    sessions: {
      list: async () => {
        busyListCalls += 1;
        return ok({ items: [{ sessionId: "foreign-busy", running: true }] });
      },
    },
  });
  assert.equal(busyEngine.requestPendingScan(), true);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(busyListCalls, 1, "foreground refusal consumes one edge without spinning");
  busyEngine.dispose();

  freshQueue();
  writeTaskFile("scan-final-gate-flaps", "# scan final gate flaps");
  let flappingListCalls = 0;
  let flappingCreateCalls = 0;
  const flappingEngine = createEngine({
    sessions: {
      list: async () => {
        flappingListCalls += 1;
        return flappingListCalls % 2 === 1
          ? ok({ items: [] })
          : ok({ items: [{ sessionId: "foreign-final-gate", running: true }] });
      },
      create: async request => {
        flappingCreateCalls += 1;
        return ok({ sessionId: request.payload.sessionId });
      },
    },
  });
  assert.equal(flappingEngine.requestPendingScan(), true);
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(flappingListCalls, 2, "a final Host refusal cannot manufacture another scan edge");
  assert.equal(flappingCreateCalls, 0);
  assert.equal(findByKey("scan-final-gate-flaps").status, "pending");
  flappingEngine.dispose();
});

test("runner retries goal clear with the latest ref after rc.2 stale revision", async () => {
  const clearedRefs = [];
  const runner = createRunner({
    goals: {
      clear: async request => {
        const ref = request.payload.ref;
        clearedRefs.push(ref);
        if (clearedRefs.length === 1) {
          return fail("goal-conflict", "stale", { goalCode: "GOAL_STALE_REVISION" });
        }
        return ok({});
      },
    },
    sessions: {
      history: async () => ok({
        projections: { values: { goal: { goal: { id: "goal-1", revision: 9 } } } },
      }),
      cancel: async () => ok({}),
    },
  });

  assert.equal(await runner.cancelTask(ownedSession(1), { id: "goal-1", revision: 3 }), true);
  assert.deepEqual(clearedRefs, [
    { id: "goal-1", revision: 3 },
    { id: "goal-1", revision: 9 },
  ]);
});

test("runner converges foreground pause and resume through authoritative goal history", async () => {
  const sessionId = ownedSession(22);
  const pauseRefs = [];
  let historyGoal = { id: "goal-yield", revision: 3, phase: "active" };
  const runner = createRunner({
    goals: {
      pause: async request => {
        pauseRefs.push(request.payload.ref);
        if (pauseRefs.length === 1) {
          return fail("goal-conflict", "stale pause ref", { goalCode: "GOAL_STALE_REVISION" });
        }
        historyGoal = { id: "goal-yield", revision: 4, phase: "paused" };
        return ok({ ref: { id: "goal-yield", revision: 4 } });
      },
      // A malformed successful envelope is admission-uncertain. History
      // proving active must converge it without issuing a duplicate resume.
      resume: async () => {
        historyGoal = { id: "goal-yield", revision: 5, phase: "active" };
        return ok({});
      },
    },
    sessions: {
      history: async () => ok({
        projections: { values: { goal: { goal: historyGoal } } },
      }),
    },
  });

  const pausedRef = await runner.pauseGoal(sessionId, { id: "goal-yield", revision: 1 });
  assert.deepEqual(pausedRef, { id: "goal-yield", revision: 4 });
  assert.deepEqual(pauseRefs, [
    { id: "goal-yield", revision: 1 },
    { id: "goal-yield", revision: 3 },
  ]);

  const resumedRef = await runner.resumeGoal(sessionId, pausedRef);
  assert.deepEqual(resumedRef, { id: "goal-yield", revision: 5 });
});

test("runner fails closed before every foreign-session read or mutation", async () => {
  const touched = [];
  const rpc = name => async () => { touched.push(name); return ok({ ref: { id: "goal", revision: 2 } }); };
  const runner = createRunner({
    sessions: {
      history: rpc("history"), prompt: rpc("prompt"), cancel: rpc("cancel"),
    },
    goals: {
      pause: rpc("pause"), resume: rpc("resume"), clear: rpc("clear"),
    },
    workspace: { archiveSession: rpc("archive") },
  });
  const foreign = "session-user-foreground";

  assert.equal((await runner.pollTask(foreign)).errorCode, "session-not-owned");
  await assert.rejects(runner.antiBlock(foreign, { id: "goal", revision: 1 }), /session-not-owned/);
  await assert.rejects(runner.wakeup(foreign, { id: "goal", revision: 1 }), /session-not-owned/);
  await assert.rejects(runner.pauseGoal(foreign, { id: "goal", revision: 1 }), /session-not-owned/);
  await assert.rejects(runner.resumeGoal(foreign, { id: "goal", revision: 1 }), /session-not-owned/);
  assert.equal(await runner.cancelLaunch(foreign, null), false);
  assert.equal(await runner.cancelTask(foreign, { id: "goal", revision: 1 }), false);
  assert.equal(await runner.cancelSession(foreign), false);
  assert.equal(await runner.archiveSessions({
    sessionId: ownedSession(1),
    executions: [{ sessionId: foreign }],
  }), false);
  assert.deepEqual(touched, []);
});

test("cron uses standard DOM-or-DOW matching and accepts Sunday as 7", () => {
  const firstOfMonth = new Date(2026, 8, 1, 0, 0, 0, 0);
  const monday = new Date(2026, 8, 7, 0, 0, 0, 0);
  const neither = new Date(2026, 8, 8, 0, 0, 0, 0);
  const sunday = new Date(2026, 8, 6, 0, 0, 0, 0);

  assert.equal(matchCron("0 0 1 * 1", firstOfMonth), true);
  assert.equal(matchCron("0 0 1 * 1", monday), true);
  assert.equal(matchCron("0 0 1 * 1", neither), false);
  assert.equal(validateCronExpression("0 0 * * 7"), "0 0 * * 7");
  assert.equal(matchCron("0 0 * * 7", sunday), true);
});

test("deadline reconciliation catches a missed cutoff after restart but not one before launch", async t => {
  const realDateNow = Date.now;
  try {
    await t.test("missed-minute-after-restart", async () => {
      freshQueue();
      const cutoff = new Date(2026, 8, 1, 8, 0, 0, 0).getTime();
      Date.now = () => cutoff + 70_000;
      const key = "deadline-restart-window";
      const sessionId = ownedSession(63);
      upsertEntry(key, {
        status: "running",
        body: "# deadline restart window",
        raw: "# deadline restart window",
        sessionId,
        goalRef: { id: "goal-deadline-restart", revision: 1 },
        deadline: "0 8 * * *",
        attempts: 1,
        _lastDeadlineCheckAt: cutoff - 30_000,
        executions: [{
          id: "exec-deadline-restart",
          sessionId,
          attempt: 1,
          startedAt: new Date(cutoff - 120_000).toISOString(),
        }],
      });
      flushLedger();
      reloadLedger();
      const engine = createEngine({}, { autoArchive: false });
      engine.runner.listSessions = async () => ({ known: true, items: [{ sessionId, running: true }] });
      engine.runner.cancelTask = async () => true;
      await engine.pollRunning();
      const entry = findByKey(key);
      assert.equal(entry._cancelIntent, "deadline");
      assert.equal(entry._cancelAccepted, true);
      assert.equal(entry._lastDeadlineCheckAt, cutoff + 70_000);
    });

    await t.test("started-after-cutoff", async () => {
      freshQueue();
      const cutoff = new Date(2026, 8, 1, 8, 0, 0, 0).getTime();
      Date.now = () => cutoff + 45_000;
      const key = "deadline-after-cutoff";
      const sessionId = ownedSession(64);
      upsertEntry(key, {
        status: "running",
        body: "# deadline after cutoff",
        raw: "# deadline after cutoff",
        sessionId,
        goalRef: { id: "goal-after-cutoff", revision: 1 },
        deadline: "0 8 * * *",
        attempts: 1,
        executions: [{
          id: "exec-after-cutoff",
          sessionId,
          attempt: 1,
          startedAt: new Date(cutoff + 30_000).toISOString(),
        }],
      });
      const engine = createEngine({}, { autoArchive: false });
      let cancelCalls = 0;
      engine.runner.listSessions = async () => ({ known: true, items: [{ sessionId, running: true }] });
      engine.runner.cancelTask = async () => { cancelCalls += 1; return true; };
      engine.runner.pollTask = async () => ({
        phase: "active",
        goalRef: { id: "goal-after-cutoff", revision: 1 },
        totalMessages: 1,
        lastActivityTime: cutoff + 40_000,
      });
      await engine.pollRunning();
      assert.equal(cancelCalls, 0);
      assert.equal(findByKey(key)._cancelPending, undefined);
      assert.equal(findByKey(key).status, "running");
    });
  } finally {
    Date.now = realDateNow;
  }
});

test("foreground recovery never resumes when deadline crosses an awaited Host read", async t => {
  const realDateNow = Date.now;
  try {
    for (const edge of ["history", "second-list"]) {
      await t.test(edge, async () => {
        freshQueue();
        const cutoff = new Date(2026, 8, 1, 8, 0, 0, 0).getTime();
        Date.now = () => cutoff - 10_000;
        const key = `foreground-deadline-${edge}`;
        const sessionId = ownedSession(edge === "history" ? 68 : 69);
        upsertEntry(key, {
          status: "running",
          body: `# foreground deadline ${edge}`,
          raw: `# foreground deadline ${edge}`,
          sessionId,
          goalRef: { id: `goal-foreground-${edge}`, revision: 1 },
          deadline: "0 8 * * *",
          attempts: 1,
          _foregroundPaused: true,
          _foregroundPausePending: false,
          _foregroundCancelPending: false,
          _lastDeadlineCheckAt: cutoff - 30_000,
          executions: [{
            id: `exec-foreground-${edge}`,
            sessionId,
            attempt: 1,
            startedAt: new Date(cutoff - 120_000).toISOString(),
          }],
        });
        const engine = createEngine({}, { autoArchive: false });
        const edgeStarted = deferred();
        const releaseEdge = deferred();
        let listCalls = 0;
        let resumeCalls = 0;
        engine.runner.listSessions = async () => {
          listCalls += 1;
          if (edge === "second-list" && listCalls === 2) {
            edgeStarted.resolve();
            await releaseEdge.promise;
          }
          return { known: true, items: [{ sessionId, running: false }] };
        };
        engine.runner.pollTask = async () => {
          if (edge === "history") {
            edgeStarted.resolve();
            await releaseEdge.promise;
          }
          return {
            phase: "paused",
            goalRef: { id: `goal-foreground-${edge}`, revision: 2 },
            totalMessages: 1,
            lastActivityTime: cutoff - 5_000,
          };
        };
        engine.runner.resumeGoal = async () => {
          resumeCalls += 1;
          return { id: `goal-foreground-${edge}`, revision: 3 };
        };
        engine.runner.cancelTask = async () => true;

        const polling = engine.pollRunning();
        await edgeStarted.promise;
        Date.now = () => cutoff + 5_000;
        releaseEdge.resolve();
        await polling;
        assert.equal(resumeCalls, 0);
        assert.equal(findByKey(key)._cancelIntent, "deadline");
        assert.equal(findByKey(key)._cancelAccepted, true);
      });
    }
  } finally {
    Date.now = realDateNow;
  }
});

test("deadline crossing session setup or normal history prevents new work admission", async t => {
  const realDateNow = Date.now;
  try {
    await t.test("launch-before-goal", async () => {
      freshQueue();
      const currentMinute = Math.floor(realDateNow() / 60_000) * 60_000;
      Date.now = () => currentMinute + 30_000;
      writeTaskFile("deadline-launch-admission", "<!-- deadline: * * * * * -->\n# deadline launch admission");
      upsertEntry("deadline-launch-admission", {
        status: "pending",
        body: "# deadline launch admission",
        raw: "<!-- deadline: * * * * * -->\n# deadline launch admission",
        deadline: "* * * * *",
      });
      const renameStarted = deferred();
      const releaseRename = deferred();
      let goalCreates = 0;
      const engine = createEngine({
        sessions: {
          list: idleSessionList,
          create: async request => ok({ sessionId: request.payload.sessionId }),
          rename: async () => { renameStarted.resolve(); await releaseRename.promise; return ok({}); },
          cancel: async () => ok({}),
        },
        goals: {
          create: async () => { goalCreates += 1; return ok({ ref: { id: "forbidden-goal", revision: 1 } }); },
        },
      }, { autoArchive: false });
      const task = listTaskFiles().find(candidate => candidate.key === "deadline-launch-admission");
      const dispatch = engine._dispatch(task);
      await renameStarted.promise;
      Date.now = () => currentMinute + 65_000;
      releaseRename.resolve();
      await dispatch;
      const entry = findByKey("deadline-launch-admission");
      assert.equal(goalCreates, 0);
      assert.equal(entry.status, "running");
      assert.equal(entry._cancelIntent, "deadline");
      assert.equal(entry._cancelAccepted, true);
    });

    await t.test("normal-history", async () => {
      freshQueue();
      const currentMinute = Math.floor(realDateNow() / 60_000) * 60_000;
      Date.now = () => currentMinute + 30_000;
      const key = "deadline-normal-history";
      const sessionId = ownedSession(71);
      upsertEntry(key, {
        status: "running",
        body: "# deadline normal history",
        raw: "# deadline normal history",
        sessionId,
        goalRef: { id: "goal-normal-history", revision: 1 },
        deadline: "* * * * *",
        attempts: 1,
        _lastDeadlineCheckAt: currentMinute + 30_000,
        executions: [{
          id: "exec-normal-history",
          sessionId,
          attempt: 1,
          startedAt: new Date(currentMinute - 120_000).toISOString(),
        }],
      });
      const historyStarted = deferred();
      const releaseHistory = deferred();
      const engine = createEngine({}, { autoArchive: false });
      engine.runner.listSessions = async () => ({ known: true, items: [{ sessionId, running: false }] });
      engine.runner.pollTask = async () => {
        historyStarted.resolve();
        await releaseHistory.promise;
        return { phase: "complete", goalRef: { id: "goal-normal-history", revision: 2 } };
      };
      engine.runner.cancelTask = async () => true;
      const polling = engine.pollRunning();
      await historyStarted.promise;
      Date.now = () => currentMinute + 65_000;
      releaseHistory.resolve();
      await polling;
      const entry = findByKey(key);
      assert.equal(entry.status, "running");
      assert.equal(entry._cancelIntent, "deadline");
      assert.equal(entry._cancelAccepted, true);
      assert.equal(entry.executions[0].endedAt, undefined);
    });
  } finally {
    Date.now = realDateNow;
  }
});

test("pending task numeric overrides can be cleared back to global defaults", () => {
  freshQueue();
  writeTaskFile("clear-overrides", "# clear-overrides");
  upsertEntry("clear-overrides", {
    status: "pending",
    body: "# clear-overrides",
    raw: "# clear-overrides",
    maxGoalRounds: 12,
    maxBlockedResumes: 2,
    timeoutMs: 3_600_000,
    maxAttempts: 6,
  });
  const engine = createEngine({});
  assert.deepEqual(engine.updateTask("clear-overrides", {
    maxGoalRounds: null,
    maxBlockedResumes: null,
    timeoutMs: null,
    maxAttempts: null,
  }), { ok: true, key: "clear-overrides" });
  assert.equal(findByKey("clear-overrides").maxGoalRounds, null);
  assert.equal(findByKey("clear-overrides").maxBlockedResumes, null);
  assert.equal(findByKey("clear-overrides").timeoutMs, null);
  assert.equal(findByKey("clear-overrides").maxAttempts, null);
});

test("pending archive/restore preserves the inbox plan and archived tasks cannot mutate", async () => {
  freshQueue();
  const raw = "<!-- schedule: 2999-01-01T00:00:00Z -->\n# future task";
  writeTaskFile("archive-case", raw);
  upsertEntry("archive-case", {
    status: "pending",
    body: "# future task",
    raw,
    schedule: "2999-01-01T00:00:00Z",
  });
  flushLedger();
  const engine = createEngine({});

  assert.deepEqual(await engine.archiveTask("archive-case"), { ok: true });
  assert.equal(existsSync(join(getTasksDir(), "archive-case.md")), false);
  assert.match(engine.updateTask("archive-case", { content: "changed" }).error, /已归档/);
  assert.match((await engine.applyAction("", "rerun", "archive-case")).error, /已归档/);

  assert.deepEqual(await engine.restoreTask("archive-case"), { ok: true });
  assert.equal(existsSync(join(getTasksDir(), "archive-case.md")), true);
  assert.equal(findByKey("archive-case").archivedAt, null);
});

test("a completion settling during stop cannot overwrite the stopped state", async () => {
  freshQueue();
  const workDir = createRunDir("settle-stop-race");
  const sessionId = ownedSession(20);
  upsertEntry("settle-stop-race", {
    status: "running",
    body: "# settle-stop-race",
    raw: "# settle-stop-race",
    workDir,
    sessionId,
    goalRef: { id: "goal-race", revision: 1 },
    executions: [{ id: "exec-race", sessionId, attempt: 1, startedAt: new Date().toISOString() }],
  });
  const engine = createEngine({});
  const finalizeStarted = deferred();
  const releaseFinalize = deferred();
  let finalizeCalls = 0;
  // This test exercises the finalize/stop ownership race after the closing
  // turn is idle; active closing turns are covered separately above.
  engine.runner.listSessions = async () => ({ known: true, items: [{ sessionId, running: false }] });
  engine.runner.pollTask = async () => ({ phase: "complete", goalRef: { id: "goal-race", revision: 2 } });
  engine.runner.cancelTask = async () => true;
  engine.runner.finalize = async () => {
    finalizeCalls += 1;
    if (finalizeCalls === 1) {
      finalizeStarted.resolve();
      await releaseFinalize.promise;
    }
  };

  const polling = engine.pollRunning();
  await finalizeStarted.promise;
  assert.deepEqual(await engine.stopTask("settle-stop-race"), {
    ok: true,
    accepted: true,
    pending: true,
  });
  releaseFinalize.resolve();
  await polling;

  assert.equal(findByKey("settle-stop-race").status, "running");
  assert.equal(findByKey("settle-stop-race")._cancelPending, true);
  await engine.pollRunning();
  await engine.pollRunning();

  const finalEntry = findByKey("settle-stop-race");
  assert.equal(finalEntry.status, "stopped");
  assert.equal(finalEntry.sessionId, null);
  assert.equal(finalEntry.executions.at(-1).result, "stopped");
});

test("a stale archive completion cannot hide a rerun generation", async () => {
  freshQueue();
  upsertEntry("archive-rerun-race", {
    status: "done",
    body: "# archive-rerun-race",
    raw: "# archive-rerun-race",
    archivedAt: null,
    executions: [{ id: "exec-old", sessionId: "session-old", attempt: 1, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), result: "done" }],
  });
  const engine = createEngine({});
  const archiveStarted = deferred();
  const releaseArchive = deferred();
  engine.runner.archiveSessions = async () => {
    archiveStarted.resolve();
    await releaseArchive.promise;
    return true;
  };
  engine.scanPending = async () => {};

  const archiving = engine.archiveTask("archive-rerun-race");
  await archiveStarted.promise;
  assert.deepEqual(await engine.applyAction("", "rerun", "archive-rerun-race"), { ok: true });
  releaseArchive.resolve();
  const archiveResult = await archiving;

  assert.equal(archiveResult.ok, false);
  assert.match(archiveResult.error, /状态已变化/);
  const finalEntry = findByKey("archive-rerun-race");
  assert.equal(finalEntry.status, "pending");
  assert.equal(finalEntry.archivedAt, null);
});

test("a blocked poll released after stop cannot inject an anti-block prompt", async () => {
  freshQueue();
  const workDir = createRunDir("poll-stop-race");
  const sessionId = ownedSession(21);
  upsertEntry("poll-stop-race", {
    status: "running",
    body: "# poll-stop-race",
    raw: "# poll-stop-race",
    workDir,
    sessionId,
    goalRef: { id: "goal-blocked", revision: 1 },
    blockedResumes: 0,
    maxBlockedResumes: 3,
    executions: [{ id: "exec-blocked", sessionId, attempt: 1, startedAt: new Date().toISOString() }],
  });
  const engine = createEngine({});
  const pollStarted = deferred();
  const releasePoll = deferred();
  let antiBlockCalls = 0;
  engine.runner.listSessions = async () => ({ known: true, items: [{ sessionId, running: true }] });
  engine.runner.pollTask = async () => {
    pollStarted.resolve();
    await releasePoll.promise;
    return { phase: "blocked", goalRef: { id: "goal-blocked", revision: 2 } };
  };
  engine.runner.cancelTask = async () => true;
  engine.runner.finalize = async () => {};
  engine.runner.antiBlock = async () => {
    antiBlockCalls += 1;
    return { id: "goal-blocked", revision: 3 };
  };

  const polling = engine.pollRunning();
  await pollStarted.promise;
  assert.deepEqual(await engine.stopTask("poll-stop-race"), {
    ok: true,
    accepted: true,
    pending: true,
  });
  releasePoll.resolve();
  await polling;

  assert.equal(antiBlockCalls, 0);
  assert.equal(findByKey("poll-stop-race").status, "running");
  engine.runner.listSessions = async () => ({ known: true, items: [{ sessionId, running: false }] });
  await engine.pollRunning();
  await engine.pollRunning();
  assert.equal(findByKey("poll-stop-race").status, "stopped");
  assert.equal(findByKey("poll-stop-race").blockedResumes, 0);
});

test("durable stop requires an accepted cancel and two authoritative idle observations", async () => {
  freshQueue();
  const key = "durable-stop-proof";
  const sessionId = ownedSession(61);
  const goalRef = { id: "goal-durable-stop", revision: 1 };
  upsertEntry(key, {
    status: "running",
    body: "# durable stop proof",
    raw: "# durable stop proof",
    sessionId,
    goalRef,
    attempts: 1,
    executions: [{
      id: "exec-durable-stop",
      sessionId,
      attempt: 1,
      startedAt: new Date().toISOString(),
    }],
  });
  const engine = createEngine({}, { autoArchive: false });
  let cancellationAccepted = false;
  let sessions = { known: true, items: [] };
  engine.runner.cancelTask = async () => cancellationAccepted;
  engine.runner.listSessions = async () => sessions;

  assert.deepEqual(await engine.stopTask(key), { ok: true, accepted: true, pending: true });
  await engine.pollRunning();
  await engine.pollRunning();
  assert.equal(findByKey(key).status, "running", "natural idle cannot settle an unaccepted cancel");
  assert.equal(findByKey(key)._cancelAccepted, false);
  assert.equal(findByKey(key)._cancelIdleConfirmed, false);

  cancellationAccepted = true;
  await engine.pollRunning();
  assert.equal(findByKey(key)._cancelAccepted, true);
  assert.equal(findByKey(key)._cancelIdleConfirmed, false, "the accepting pass is not also an idle proof");
  await engine.pollRunning();
  assert.equal(findByKey(key)._cancelIdleConfirmed, true);

  sessions = { known: true, items: [{ sessionId, running: true }] };
  await engine.pollRunning();
  assert.equal(findByKey(key)._cancelIdleConfirmed, false, "a later running observation resets convergence");
  sessions = { known: true, items: [] };
  await engine.pollRunning();
  assert.equal(findByKey(key).status, "running");
  await engine.pollRunning();
  assert.equal(findByKey(key).status, "stopped");
  assert.equal(findByKey(key).executions.at(-1).result, "stopped");
});

test("accepted cancellation ownership survives reload and settles after two absent lists", async () => {
  freshQueue();
  const key = "restart-stop-proof";
  const sessionId = ownedSession(62);
  upsertEntry(key, {
    status: "running",
    body: "# restart stop proof",
    raw: "# restart stop proof",
    sessionId,
    goalRef: { id: "goal-restart-stop", revision: 1 },
    attempts: 1,
    executions: [{
      id: "exec-restart-stop",
      sessionId,
      attempt: 1,
      startedAt: new Date().toISOString(),
    }],
  });
  const first = createEngine({}, { autoArchive: false });
  first.runner.cancelTask = async () => true;
  assert.equal((await first.stopTask(key)).pending, true);
  assert.equal(findByKey(key)._cancelAccepted, true);
  flushLedger();
  reloadLedger();

  const recovered = createEngine({}, { autoArchive: false });
  recovered.runner.listSessions = async () => ({ known: true, items: [] });
  recovered.runner.cancelTask = async () => true;
  await recovered.pollRunning();
  assert.equal(findByKey(key)._cancelIdleConfirmed, true);
  await recovered.pollRunning();
  assert.equal(findByKey(key).status, "stopped");
});

test("cancel acceptance is bound to the latest durable goal ref", async () => {
  freshQueue();
  const key = "cancel-ref-binding";
  const sessionId = ownedSession(65);
  const firstRef = { id: "goal-ref-binding", revision: 1 };
  const secondRef = { id: "goal-ref-binding", revision: 2 };
  upsertEntry(key, {
    status: "running",
    body: "# cancel ref binding",
    raw: "# cancel ref binding",
    sessionId,
    goalRef: firstRef,
    attempts: 1,
    executions: [{
      id: "exec-ref-binding",
      sessionId,
      attempt: 1,
      startedAt: new Date().toISOString(),
    }],
  });
  const engine = createEngine({}, { autoArchive: false });
  const firstCancel = deferred();
  const cancelStarted = deferred();
  const refs = [];
  engine.runner.cancelTask = async (_sessionId, ref) => {
    refs.push(ref);
    if (refs.length === 1) {
      cancelStarted.resolve();
      return firstCancel.promise;
    }
    return true;
  };

  const stopping = engine.stopTask(key);
  await cancelStarted.promise;
  upsertEntry(key, { goalRef: secondRef });
  firstCancel.resolve(true);
  assert.equal((await stopping).pending, true);
  assert.deepEqual(refs, [firstRef, secondRef]);
  assert.deepEqual(findByKey(key).goalRef, secondRef);
  assert.equal(findByKey(key)._cancelAccepted, true);
});

test("a stop override during retry finalization retains ownership and forbids replacement", async () => {
  freshQueue();
  const key = "stop-overrides-retry";
  const sessionId = ownedSession(66);
  const goalRef = { id: "goal-stop-overrides-retry", revision: 1 };
  upsertEntry(key, {
    status: "running",
    body: "# stop overrides retry",
    raw: "# stop overrides retry",
    sessionId,
    goalRef,
    attempts: 1,
    maxAttempts: 3,
    _cancelPending: true,
    _cancelIntent: "retry",
    _cancelReason: "unknown",
    _cancelError: "retry old execution",
    _cancelAccepted: true,
    _cancelAcceptedRevision: snapshot().revision + 1,
    _cancelIdleConfirmed: true,
    executions: [{
      id: "exec-stop-overrides-retry",
      sessionId,
      attempt: 1,
      startedAt: new Date().toISOString(),
    }],
  });
  const engine = createEngine({}, { autoArchive: false });
  const finalizeStarted = deferred();
  const releaseFinalize = deferred();
  let launches = 0;
  engine.runner.finalize = async () => {
    finalizeStarted.resolve();
    await releaseFinalize.promise;
  };
  engine.runner.cancelTask = async () => true;
  engine.runner.launch = async () => { launches += 1; throw new Error("replacement forbidden"); };

  const retrying = engine.retryExecution(findByKey(key), "unknown", { cancellationConfirmed: true });
  await finalizeStarted.promise;
  assert.equal((await engine.stopTask(key)).pending, true);
  releaseFinalize.resolve();
  await retrying;
  const entry = findByKey(key);
  assert.equal(launches, 0);
  assert.equal(entry.status, "running");
  assert.equal(entry.sessionId, sessionId);
  assert.equal(entry._cancelIntent, "stop");
});

test("a higher-priority stop preserves an accepted cleanup while resetting idle proof", async () => {
  freshQueue();
  const key = "accepted-cleanup-upgrade";
  const sessionId = ownedSession(67);
  upsertEntry(key, {
    status: "running",
    body: "# accepted cleanup upgrade",
    raw: "# accepted cleanup upgrade",
    sessionId,
    goalRef: null,
    attempts: 1,
    _cancelPending: true,
    _cancelIntent: "cleanup",
    _cancelReason: "orphan-cleanup",
    _cancelAccepted: true,
    _cancelAcceptedRevision: snapshot().revision + 1,
    _cancelIdleConfirmed: true,
    executions: [{
      id: "exec-cleanup-upgrade",
      sessionId,
      attempt: 1,
      startedAt: new Date().toISOString(),
    }],
  });
  const engine = createEngine({}, { autoArchive: false });
  engine.runner.cancelSession = async () => false;
  assert.equal((await engine.stopTask(key)).pending, true);
  assert.equal(findByKey(key)._cancelAccepted, true);
  assert.equal(findByKey(key)._cancelIdleConfirmed, false);
  engine.runner.listSessions = async () => ({ known: true, items: [] });
  await engine.pollRunning();
  await engine.pollRunning();
  assert.equal(findByKey(key).status, "stopped");
});

test("stop rejects pending tasks and delete remains their cancellation path", async () => {
  freshQueue();
  writeTaskFile("pending-delete-only", "# pending delete only");
  upsertEntry("pending-delete-only", {
    status: "pending",
    body: "# pending delete only",
    raw: "# pending delete only",
  });
  const engine = createEngine({});
  const stopped = await engine.stopTask("pending-delete-only");
  assert.equal(stopped.ok, false);
  assert.match(stopped.error, /待执行任务请使用删除/);
  assert.deepEqual(engine.deleteTask("pending-delete-only"), { ok: true });
});

test("webhook rejects private targets without making a request", async () => {
  freshQueue();
  const engine = createEngine({}, { webhook: "http://127.0.0.1:9/hook" });
  const delivered = await engine.callWebhook({
    key: "ssrf-case",
    attempts: 1,
    blockedResumes: 0,
  }, "done", null, "done");
  assert.equal(delivered, false);
});

test("report reads reject symlinks, hardlinks, and oversized AI output", (t) => {
  const queueDir = freshQueue();
  const workDir = createRunDir("report-safety");
  const reportFile = join(workDir, "执行报告.md");
  const outsideFile = join(queueDir, "host-secret.txt");
  writeFileSync(outsideFile, "HOST_SECRET", { mode: 0o600 });

  writeFileSync(reportFile, "SAFE_REPORT", { mode: 0o600 });
  assert.equal(safeReadReportFile(workDir, "执行报告.md"), "SAFE_REPORT");
  rmSync(reportFile);

  let symlinkCreated = false;
  try {
    symlinkSync(outsideFile, reportFile);
    symlinkCreated = true;
  } catch (error) {
    if (process.platform !== "win32" || error?.code !== "EPERM") throw error;
    t.diagnostic("Windows 当前用户无创建符号链接权限；继续验证硬链接与超限报告");
  }
  if (symlinkCreated) {
    assert.throws(() => safeReadReportFile(workDir, "执行报告.md"), /安全的普通文件|普通文件/);
    rmSync(reportFile);
  }

  linkSync(outsideFile, reportFile);
  assert.throws(() => safeReadReportFile(workDir, "执行报告.md"), /安全的普通文件|普通文件/);
  rmSync(reportFile);

  writeFileSync(reportFile, Buffer.alloc(MAX_REPORT_BYTES + 1, 0x61), { mode: 0o600 });
  assert.throws(() => safeReadReportFile(workDir, "执行报告.md"), /超过 2MB/);

  upsertEntry("report-safety", { status: "done", body: "test", workDir });
  const detail = createEngine({}).getTaskDetail("report-safety");
  assert.deepEqual(detail.task.reports, {});
});

test("impossible cron snapshots stay bounded", () => {
  freshQueue();
  for (let index = 0; index < 100; index += 1) {
    upsertEntry(`cron-${index}`, {
      status: "pending",
      body: "test",
      cron: "0 0 31 2 *",
    });
  }
  const engine = createEngine({});
  const started = performance.now();
  const view = engine.snapshot();
  const elapsed = performance.now() - started;
  assert.equal(view.tasks.length, 100);
  assert.ok(elapsed < 1_000, `snapshot took ${elapsed.toFixed(1)}ms`);
});

test("AI tools send the configured token and reject bad HTTP responses", async () => {
  const emptyCtx = { systemPrompt: { section() {} }, tools: { register() {} } };
  assert.throws(
    () => registerAiTool(emptyCtx, "https://user:secret@example.test"),
    /must not contain credentials/,
  );
  assert.throws(
    () => registerAiTool(emptyCtx, "https://example.test?unexpected=1"),
    /must not contain a query or fragment/,
  );

  const seenAuthorization = [];
  const server = createServer((request, response) => {
    seenAuthorization.push(request.headers.authorization);
    if (request.url.startsWith("/api/queue/state")) {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ revision: 1, tasks: [], config: {} }));
      return;
    }
    if (request.url.startsWith("/api/queue/detail")) {
      response.writeHead(502, { "Content-Type": "text/plain" });
      response.end("upstream failure");
      return;
    }
    response.writeHead(401, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "denied" }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const address = server.address();
    const registered = new Map();
    registerAiTool({
      systemPrompt: { section() {} },
      tools: { register(tool) { registered.set(tool.name, tool); } },
    }, `http://127.0.0.1:${address.port}`, "tool-secret");

    const state = await registered.get("autoqueue_list_tasks").execute({});
    assert.equal(state.revision, 1);
    assert.equal(seenAuthorization[0], "Bearer tool-secret");
    await assert.rejects(
      registered.get("autoqueue_get_task").execute({ key: "x" }),
      /HTTP 502 returned non-JSON/,
    );
    await assert.rejects(
      registered.get("autoqueue_stop_task").execute({ key: "x" }),
      /HTTP 401: denied/,
    );
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("AI tools expose the complete safe control surface and use compact list responses", async () => {
  const requests = [];
  const server = createServer(async (request, response) => {
    let rawBody = "";
    for await (const chunk of request) rawBody += chunk;
    const body = rawBody ? JSON.parse(rawBody) : null;
    requests.push({ method: request.method, url: request.url, body });

    response.writeHead(200, { "Content-Type": "application/json" });
    if (request.url.startsWith("/api/queue/state")) {
      response.end(JSON.stringify({
        revision: 2,
        tasks: [{ key: "compact", status: "running", summary: "safe", stopPending: true, model: "provider/host-global-model" }],
        config: { maxConcurrent: 2 },
        metrics: { total: 1, running: 1 },
        unreadCount: 1,
        runtime: {
          monitorMode: "native-events+authoritative-reconcile",
          foregroundGate: "busy",
          sessionListKnown: true,
        },
      }));
      return;
    }
    if (request.url === "/api/queue/options") {
      response.end(JSON.stringify({
        workspaces: [{ workspaceId: "workspace-1" }],
        presets: [{ id: "unattended" }],
        models: [{ value: "provider/host-global-model" }],
      }));
      return;
    }
    if (request.url.startsWith("/api/queue/detail")) {
      response.end(JSON.stringify({
        ok: true,
        task: {
          key: "compact", status: "running", body: "# detail", stopPending: true,
          goalPhase: "stop-cancel-pending", currentRound: 3,
          lastSessionId: ownedSession(88), model: "provider/host-global-model",
        },
      }));
      return;
    }
    if (request.url === "/api/queue/config") {
      response.end(JSON.stringify({
        maxGoalRounds: body?.maxGoalRounds ?? 40,
        maxBlockedResumes: 3,
        model: "provider/host-global-model",
        apiToken: "must-never-escape",
      }));
      return;
    }
    if (request.url === "/api/queue/task") {
      response.end(JSON.stringify({ ok: true, key: body.key || "generated" }));
      return;
    }
    if (request.url === "/api/queue/action") {
      if (body?.action?.kind === "archive" && Array.isArray(body.action.keys)) {
        response.end(JSON.stringify({ ok: true, results: body.action.keys.map(key => ({ key, ok: true })) }));
      } else {
        response.end(JSON.stringify({ ok: true }));
      }
      return;
    }
    response.end(JSON.stringify({ ok: false, error: "unexpected request" }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const registered = new Map();
    const promptSections = [];
    const address = server.address();
    registerAiTool({
      systemPrompt: { section(section) { promptSections.push(section); } },
      tools: { register(tool) { registered.set(tool.name, tool); } },
    }, `http://127.0.0.1:${address.port}`);

    assert.equal(registered.size, 16);
    assert.ok([...registered.keys()].every(name => name.startsWith("autoqueue_")));
    assert.match(promptSections[0].text, /任务队列/);
    assert.match(promptSections[0].text, /老登/);
    assert.match(registered.get("autoqueue_create_task").description, /老登/);

    for (const name of [
      "autoqueue_get_options",
      "autoqueue_get_config",
      "autoqueue_update_config",
      "autoqueue_force_scan",
      "autoqueue_set_concurrency",
      "autoqueue_batch_archive",
    ]) assert.ok(registered.has(name), `${name} should be registered`);

    const listed = await registered.get("autoqueue_list_tasks").execute({ includeArchived: true });
    assert.equal(listed.tasks[0].summary, "safe");
    assert.equal(listed.tasks[0].stopPending, true);
    assert.equal(listed.runtime.monitorMode, "native-events+authoritative-reconcile");
    assert.equal(listed.runtime.foregroundGate, "busy");
    assert.equal(listed.metrics.running, 1);
    assert.equal(listed.unreadCount, 1);
    assert.ok(registered.get("autoqueue_list_tasks").output.schema.properties.runtime);
    assert.equal(Object.hasOwn(listed.tasks[0], "model"), false);
    assert.equal(requests.at(-1).url, "/api/queue/state?archived=1&compact=1");

    const projectedDetail = await registered.get("autoqueue_get_task").execute({ key: "compact" });
    assert.equal(projectedDetail.stopPending, true);
    assert.equal(projectedDetail.goalPhase, "stop-cancel-pending");
    assert.equal(projectedDetail.currentRound, 3);
    assert.ok(registered.get("autoqueue_get_task").output.schema.properties.lastSessionId);

    await registered.get("autoqueue_create_task").execute({
      key: "full-create",
      content: "# full create",
      model: "provider/forbidden",
      webhook: "https://example.test/callback",
      maxAttempts: 4,
      enableNotifications: false,
    });
    const createBody = requests.at(-1).body;
    assert.equal(createBody.webhook, "https://example.test/callback");
    assert.equal(createBody.maxAttempts, 4);
    assert.equal(createBody.enableNotifications, false);
    assert.equal(Object.hasOwn(createBody, "model"), false);

    await registered.get("autoqueue_update_task").execute({
      key: "full-create",
      model: "provider/forbidden",
      maxBlockedResumes: 5,
      webhook: "",
      workspace: "workspace-1",
      agentPreset: "unattended",
      enableNotifications: false,
      maxAttempts: 6,
    });
    const updateAction = requests.at(-1).body.action;
    assert.equal(updateAction.maxBlockedResumes, 5);
    assert.equal(updateAction.webhook, "");
    assert.equal(Object.hasOwn(updateAction, "workspace"), false);
    assert.equal(Object.hasOwn(updateAction, "agentPreset"), false);
    assert.equal(updateAction.enableNotifications, false);
    assert.equal(updateAction.maxAttempts, 6);
    assert.equal(Object.hasOwn(updateAction, "model"), false);

    const options = await registered.get("autoqueue_get_options").execute({});
    assert.deepEqual(options.workspaces, []);
    assert.deepEqual(options.presets, []);
    assert.deepEqual(options.models, []);

    const detail = await registered.get("autoqueue_get_task").execute({ key: "compact" });
    assert.equal(detail.body, "# detail");
    assert.equal(Object.hasOwn(detail, "model"), false);

    const config = await registered.get("autoqueue_get_config").execute({});
    assert.equal(config.maxGoalRounds, 40);
    assert.equal(config.maxConcurrent, 2);
    assert.equal(Object.hasOwn(config, "model"), false);
    assert.equal(Object.hasOwn(config, "apiToken"), false);

    await registered.get("autoqueue_update_config").execute({ maxGoalRounds: 60, model: "provider/forbidden" });
    assert.deepEqual(requests.at(-1).body, { maxGoalRounds: 60 });

    await registered.get("autoqueue_force_scan").execute({});
    assert.equal(requests.at(-1).body.action.kind, "force-scan");
    await registered.get("autoqueue_set_concurrency").execute({ maxConcurrent: 4 });
    assert.deepEqual(requests.at(-1).body.action, { kind: "set-concurrency", maxConcurrent: 4 });
    const archived = await registered.get("autoqueue_batch_archive").execute({ keys: ["a", "b"] });
    assert.equal(archived.results.length, 2);

    const rendered = registered.get("autoqueue_stop_task").output.render({ key: "fallback-key" }, { ok: true });
    assert.match(rendered[0].text, /fallback-key/);
    assert.doesNotMatch(rendered[0].text, /undefined/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("plugin auto-registers queue tools by default and protects owned task agents", () => {
  const queueDir = freshQueue();
  const registered = new Map();
  const promptSections = [];
  const guards = [];
  const listeners = new Map();
  const ctx = {
    apiProxy: {},
    sessions: {},
    systemPrompt: { section(section) { promptSections.push(section); } },
    tools: {
      register(tool) { registered.set(tool.name, tool); },
      guard(guard) { guards.push(guard); },
    },
    on(name, listener) { listeners.set(name, listener); return () => {}; },
    effect() {},
  };

  apply(ctx, { queueDir });

  assert.deepEqual([...registered.keys()].sort(), [...AUTOQUEUE_AI_TOOL_NAMES].sort());
  assert.equal(promptSections.length, 1);
  assert.equal(promptSections[0].name, "tool:autoqueue");
  assert.equal(promptSections[0].order, 150);
  assert.match(promptSections[0].text, /任务队列/);
  assert.match(promptSections[0].text, /老登/);
  assert.equal(guards.length, 1);

  const ownedId = ownedSession(901);
  const denied = guards[0]({ name: "autoqueue_create_task", agent: { id: ownedId } });
  assert.match(denied, /unavailable inside AutoQueue-owned task sessions/);
  assert.equal(guards[0]({ name: "autoqueue_create_task", agent: { id: "ordinary-session" } }), undefined);
  assert.equal(guards[0]({ name: "unrelated_tool", agent: { id: ownedId } }), undefined);

  const restrictions = [];
  const scopedPrompts = [];
  listeners.get("agent/created")({
    agent: {
      id: ownedId,
      ctx: {
        tools: { restrict(filter) { restrictions.push(filter); } },
        systemPrompt: { section(section) { scopedPrompts.push(section); } },
      },
    },
  });
  assert.deepEqual(restrictions, [{ deny: [...AUTOQUEUE_AI_TOOL_NAMES] }]);
  assert.deepEqual(scopedPrompts, [{ name: "tool:autoqueue", order: 150, text: "" }]);
});

test("plugin permits an explicit Host AI tool opt-out", () => {
  const queueDir = freshQueue();
  const registered = [];
  const promptSections = [];
  const guards = [];
  let listenerCount = 0;
  apply({
    apiProxy: {},
    sessions: {},
    systemPrompt: { section(section) { promptSections.push(section); } },
    tools: {
      register(tool) { registered.push(tool); },
      guard(guard) { guards.push(guard); },
    },
    on() { listenerCount += 1; return () => {}; },
    effect() {},
  }, { queueDir, enableHostAiTools: false });

  assert.equal(registered.length, 0);
  assert.equal(promptSections.length, 0);
  assert.equal(guards.length, 0);
  assert.equal(listenerCount, 0);
});

function invokeRoute(handler, {
  host,
  remoteAddress,
  origin,
  authorization,
  url = "/api/queue/state",
  method = "GET",
  body,
}) {
  return new Promise(resolve => {
    const headers = { host };
    if (origin) headers.origin = origin;
    if (authorization) headers.authorization = authorization;
    const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
    if (payload) {
      headers["content-type"] = "application/json";
      headers["content-length"] = String(payload.length);
    }
    const responseHeaders = {};
    let statusCode = 200;
    const response = {
      setHeader(name, value) { responseHeaders[name.toLowerCase()] = value; },
      writeHead(code, values = {}) {
        statusCode = code;
        for (const [name, value] of Object.entries(values)) responseHeaders[name.toLowerCase()] = value;
      },
      end(body = "") {
        resolve({
          statusCode,
          headers: responseHeaders,
          body: body ? JSON.parse(Buffer.from(body).toString("utf8")) : null,
        });
      },
    };
    const requestListeners = new Map();
    let requestEmitted = false;
    const request = {
      method,
      url,
      headers,
      socket: { remoteAddress },
      on(event, listener) {
        const listeners = requestListeners.get(event) ?? [];
        listeners.push(listener);
        requestListeners.set(event, listeners);
        if (event === "end" && !requestEmitted) {
          requestEmitted = true;
          queueMicrotask(() => {
            if (payload) for (const dataListener of requestListeners.get("data") ?? []) dataListener(payload);
            for (const endListener of requestListeners.get("end") ?? []) endListener();
          });
        }
      },
      resume() {},
    };
    handler(request, response);
  });
}

test("HTTP auth does not trust forged Origin or a loopback reverse proxy peer", async () => {
  freshQueue();
  const routes = new Map();
  const rpcIds = [];
  const registeredHostTools = new Map();
  const hostPromptSections = [];
  const hostToolGuards = [];
  let rejectModelCatalog = false;
  let disposeEffect = () => {};
  let effectReady = Promise.resolve();
  const ownedPresetContent = injectUnattendedDiscipline(SOURCE_AGENT_PRESET);
  const localPresets = [
    { id: AUTOQUEUE_UNATTENDED_PRESET, path: `/unused/${AUTOQUEUE_UNATTENDED_PRESET}/agent.cordis.yml` },
    { id: AUTOQUEUE_PTC_UNATTENDED_PRESET, path: `/unused/${AUTOQUEUE_PTC_UNATTENDED_PRESET}/agent.cordis.yml` },
  ];
  const agentPresets = {
    async list() { return localPresets; },
    async read(id) {
      assert.ok(localPresets.some(preset => preset.id === id));
      return ownedPresetContent;
    },
    async copy() { throw new Error("owned test presets should not be copied"); },
  };
  const ctx = {
    apiProxy: {
      workspace: { list(request) { rpcIds.push(request.rpcId); return ok({ items: [] }); } },
      agentPresets: { list(request) { rpcIds.push(request.rpcId); return ok({ presets: [] }); } },
      llm: {
        models(request) {
          rpcIds.push(request.rpcId);
          if (rejectModelCatalog) return fail("model-catalog-failed", "catalog unavailable");
          return ok({
            groups: [
              {
                id: "provider-a",
                name: "Provider A",
                models: [
                  { id: "shared-model", name: "Shared A" },
                  { id: "shared-model", name: "Duplicate A" },
                ],
              },
              {
                id: "provider-b",
                name: "Provider B",
                models: [{ id: "shared-model", name: "Shared B" }],
              },
            ],
            failures: [],
          });
        },
      },
    },
    systemPrompt: { section(section) { hostPromptSections.push(section); } },
    tools: {
      register(tool) { registeredHostTools.set(tool.name, tool); },
      guard(guard) { hostToolGuards.push(guard); },
    },
    settings: { get() { return null; } },
    agentPresets,
    sessions: { get() { return undefined; }, async flush() {} },
    get(name) { return name === "agentPresets" ? agentPresets : null; },
    timer: { interval() { return () => {}; } },
    on() { return () => {}; },
    webServer: {
      register(route) {
        routes.set(route.path, route.handler);
        return () => routes.delete(route.path);
      },
    },
    effect(callback) {
      effectReady = Promise.resolve().then(callback).then(disposer => {
        disposeEffect = disposer;
      });
      return effectReady;
    },
  };
  apply(ctx, {
    allowedHosts: ["queue.example"],
    apiToken: "server-secret",
    baseUrl: "http://127.0.0.1:3080",
    enableHostAiTools: false,
  });
  await effectReady;

  try {
    assert.equal(registeredHostTools.size, 0);
    assert.equal(hostPromptSections.length, 0);
    assert.equal(hostToolGuards.length, 0);

    const handler = routes.get("/api/queue/state");
    const forgedOrigin = await invokeRoute(handler, {
      host: "queue.example",
      origin: "http://queue.example",
      remoteAddress: "127.0.0.1",
    });
    assert.equal(forgedOrigin.statusCode, 401);

    const authenticated = await invokeRoute(handler, {
      host: "queue.example",
      origin: "http://queue.example",
      remoteAddress: "127.0.0.1",
      authorization: "Bearer server-secret",
    });
    assert.equal(authenticated.statusCode, 200);

    const directLoopback = await invokeRoute(handler, {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
    });
    assert.equal(directLoopback.statusCode, 401);

    const authenticatedLoopback = await invokeRoute(handler, {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
      authorization: "Bearer server-secret",
    });
    assert.equal(authenticatedLoopback.statusCode, 200);

    upsertEntry("compact-http", {
      status: "pending",
      body: "# Compact HTTP\nlarge private body",
      executions: [],
    });
    const compactState = await invokeRoute(handler, {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
      authorization: "Bearer server-secret",
      url: "/api/queue/state?compact=1",
    });
    assert.equal(compactState.statusCode, 200);
    const compactHttpTask = compactState.body.tasks.find(task => task.key === "compact-http");
    assert.equal(compactHttpTask.summary, "Compact HTTP");
    assert.equal(Object.hasOwn(compactHttpTask, "body"), false);
    assert.equal(Object.hasOwn(compactHttpTask, "executions"), false);

    const invalidCompact = await invokeRoute(handler, {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
      authorization: "Bearer server-secret",
      url: "/api/queue/state?compact=full",
    });
    assert.equal(invalidCompact.statusCode, 400);

    const unauthenticatedCapabilities = await invokeRoute(routes.get("/api/autoqueue/capabilities"), {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
      url: "/api/autoqueue/capabilities",
    });
    assert.equal(unauthenticatedCapabilities.statusCode, 401);

    const capabilities = await invokeRoute(routes.get("/api/autoqueue/capabilities"), {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
      authorization: "Bearer server-secret",
      url: "/api/autoqueue/capabilities",
    });
    assert.equal(capabilities.statusCode, 200);
    assert.equal(capabilities.body.displayName, "任务队列");
    assert.deepEqual(capabilities.body.aliases, ["老登"]);
    assert.equal(capabilities.body.features.taskModelSelection, false);
    assert.equal(capabilities.body.features.foregroundPreemption, true);
    assert.equal(capabilities.body.features.sessionSandboxMode, "workspace-write");
    assert.equal(capabilities.body.features.sessionApprovalPolicy, "never");
    assert.equal(capabilities.body.features.hostAiToolsDefaultEnabled, true);
    assert.equal(capabilities.body.aiToolRegistration.enabled, false);
    assert.equal(capabilities.body.aiToolRegistration.defaultEnabled, true);
    assert.equal(capabilities.body.aiToolRegistration.mode, "automatic");
    assert.equal(capabilities.body.aiToolRegistration.configKey, "enableHostAiTools");
    assert.equal(capabilities.body.aiToolRegistration.disableValue, false);
    assert.ok(capabilities.body.aiTools.includes("autoqueue_batch_archive"));
    assert.equal(capabilities.body.authentication.tokenValuesReturned, false);
    assert.doesNotMatch(JSON.stringify(capabilities.body), /server-secret/);

    const openapi = await invokeRoute(routes.get("/api/autoqueue/openapi.json"), {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
      authorization: "Bearer server-secret",
      url: "/api/autoqueue/openapi.json",
    });
    assert.equal(openapi.statusCode, 200);
    assert.equal(openapi.body.openapi, "3.1.0");
    assert.equal(openapi.body.info.title, "任务队列 HTTP API");
    assert.deepEqual(openapi.body.info["x-natural-language-aliases"], ["老登"]);
    assert.equal(openapi.body.paths["/api/queue/state"].get.operationId, "listAutoqueueTasks");
    assert.equal(Object.hasOwn(openapi.body.components.schemas.CreateTaskRequest.properties, "model"), false);
    assert.deepEqual(openapi.body.components.schemas.UpdateAction.properties.timeoutMs.type, ["integer", "null"]);
    assert.deepEqual(openapi.body.components.schemas.UpdateAction.properties.maxAttempts.type, ["integer", "null"]);
    assert.equal(openapi.body.components.schemas.TaskSummary.properties.foregroundPaused.type, "boolean");
    assert.doesNotMatch(JSON.stringify(openapi.body), /server-secret/);

    const options = await invokeRoute(routes.get("/api/queue/options"), {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
      authorization: "Bearer server-secret",
      url: "/api/queue/options",
    });
    assert.equal(options.statusCode, 200);
    assert.equal(rpcIds.length, 0);
    assert.deepEqual(options.body.workspaces, []);
    assert.deepEqual(options.body.presets, []);
    assert.deepEqual(options.body.models, []);
    assert.equal(options.body.isolation.strict, true);
    assert.deepEqual(options.body.isolation.overridesLocked, ["workspace", "agentPreset", "model"]);

    rejectModelCatalog = true;
    const isolatedOptions = await invokeRoute(routes.get("/api/queue/options"), {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
      authorization: "Bearer server-secret",
      url: "/api/queue/options",
    });
    assert.equal(isolatedOptions.statusCode, 200);
    assert.equal(rpcIds.length, 0, "strict options never touch Host catalog RPCs");

    writeTaskFile("http-clear-policy", "# HTTP clear policy");
    upsertEntry("http-clear-policy", {
      status: "pending",
      body: "# HTTP clear policy",
      raw: "# HTTP clear policy",
      cron: "0 8 * * *",
      deadline: "0 18 * * *",
      webhook: "https://example.test/hook",
      maxGoalRounds: 12,
      maxBlockedResumes: 2,
      timeoutMs: 3_600_000,
      maxAttempts: 4,
    });
    const clearedPolicy = await invokeRoute(routes.get("/api/queue/action"), {
      host: "127.0.0.1:3080",
      remoteAddress: "127.0.0.1",
      authorization: "Bearer server-secret",
      url: "/api/queue/action",
      method: "POST",
      body: {
        requestId: "http-clear-policy-request",
        action: {
          kind: "update",
          key: "http-clear-policy",
          schedule: "",
          cron: "",
          deadline: "",
          webhook: "",
          maxGoalRounds: null,
          maxBlockedResumes: null,
          timeoutMs: null,
          maxAttempts: null,
        },
      },
    });
    assert.equal(clearedPolicy.statusCode, 200);
    assert.deepEqual(clearedPolicy.body, { ok: true, key: "http-clear-policy" });
    for (const field of [
      "schedule", "cron", "deadline", "webhook", "maxGoalRounds",
      "maxBlockedResumes", "timeoutMs", "maxAttempts",
    ]) assert.equal(findByKey("http-clear-policy")[field], null, `${field} should clear through HTTP`);

    upsertEntry("sse-projection", {
      status: "done",
      body: "# SSE summary\nprivate full body",
      raw: "# SSE summary\nprivate full body",
      executions: [{
        id: "exec-sse",
        sessionId: "session-sse",
        attempt: 1,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        result: "done",
      }],
    });
    const eventConnections = [];
    const connectEvents = () => {
      const frames = [];
      let statusCode = 200;
      let endedBody = null;
      let close = () => {};
      const response = {
        setHeader() {},
        writeHead(code) { statusCode = code; },
        write(frame) { frames.push(frame); return true; },
        on() {},
        off() {},
        end(body = "") { endedBody = body ? JSON.parse(Buffer.from(body).toString("utf8")) : null; },
      };
      routes.get("/api/queue/events")({
        method: "GET",
        url: "/api/queue/events?archived=1",
        headers: { host: "127.0.0.1:3080", authorization: "Bearer server-secret" },
        socket: { remoteAddress: "127.0.0.1" },
        on(event, handler) { if (event === "close") close = handler; },
      }, response);
      const connection = { frames, get statusCode() { return statusCode; }, get endedBody() { return endedBody; }, close: () => close() };
      eventConnections.push(connection);
      return connection;
    };

    const firstEvents = connectEvents();
    assert.equal(firstEvents.statusCode, 200);
    const firstFrame = JSON.parse(firstEvents.frames[0].slice("data: ".length).trim());
    const compactTask = firstFrame.tasks.find(task => task.key === "sse-projection");
    assert.equal(compactTask.summary, "SSE summary");
    assert.equal(compactTask.lastSessionId, "session-sse");
    assert.equal(Object.hasOwn(compactTask, "body"), false);
    assert.equal(Object.hasOwn(compactTask, "executions"), false);

    for (let index = 1; index < 8; index += 1) connectEvents();
    const rejectedEvents = connectEvents();
    assert.equal(rejectedEvents.statusCode, 503);
    assert.match(rejectedEvents.endedBody.error, /连接数已达上限/);
    for (const connection of eventConnections.slice(0, 8)) connection.close();
  } finally {
    await disposeEffect();
  }
});

test("ledger capacity rejection is transactional and remains reloadable", () => {
  const queueDir = freshQueue();
  const content = "x".repeat(MAX_TASK_CONTENT_BYTES);
  for (let index = 0; index < 15; index += 1) {
    upsertEntry(`large-${index}`, { status: "pending", body: content, raw: content });
  }
  flushLedger();
  const revisionBefore = snapshot().revision;

  assert.throws(
    () => upsertEntry("large-overflow", { status: "pending", body: content, raw: content }),
    error => error?.code === "ledger-capacity" && error?.statusCode === 507,
  );
  assert.equal(findByKey("large-overflow"), undefined);
  assert.equal(snapshot().revision, revisionBefore);
  flushLedger();
  assert.ok(readFileSync(join(queueDir, "queue-ledger.json")).length <= 64 * 1024 * 1024);
  reloadLedger();
  assert.equal(snapshot().tasks.length, 15);
});

test("dispatch persists its reserved session id before create and rate limits do not consume attempts", async () => {
  const queueDir = freshQueue();
  writeTaskFile("dispatch-reservation", "# dispatch reservation");
  let requestedSessionId;
  const providerRetryAfterMs = 60_000;
  const engine = createEngine({
    workspace: {
      create: async () => ok({ workspace: { workspaceId: "workspace-dispatch" } }),
    },
    sessions: {
      list: idleSessionList,
      create: async request => {
        requestedSessionId = request.payload.sessionId;
        const persisted = JSON.parse(readFileSync(join(queueDir, "queue-ledger.json"), "utf8"))
          .tasks.find(entry => entry.key === "dispatch-reservation");
        assert.equal(persisted.sessionId, requestedSessionId);
        assert.equal(persisted._launchPending, true);
        assert.equal(persisted._orphanCleanupPending, true);
        return fail("RATE_LIMIT", "slow down", { status: 429, providerRetryAfterMs });
      },
      cancel: async () => fail("session-not-found", "explicit create rejection published no session"),
    },
  }, {
    retryBackoffBaseMs: 1_000,
    retryBackoffMaxMs: 10_000,
  });

  const startedAt = Date.now();
  const task = listTaskFiles().find(item => item.key === "dispatch-reservation");
  await engine._dispatch(task);
  assert.equal(findByKey("dispatch-reservation")._cancelAccepted, true);
  await engine.pollRunning();
  await engine.pollRunning();

  const entry = findByKey("dispatch-reservation");
  assert.equal(isAutoqueueSessionId(requestedSessionId), true);
  assert.equal(entry.status, "pending");
  assert.equal(entry.sessionId, null);
  assert.equal(entry.attempts, 0);
  assert.equal(entry._launchPending, false);
  assert.equal(entry._orphanCleanupPending, false);
  assert.ok(entry.nextRetryAt >= startedAt + providerRetryAfterMs);
});

test("retry persists a fresh reserved id before create and rolls back a rate-limited attempt", async () => {
  const queueDir = freshQueue();
  const oldWorkDir = createRunDir("retry-reservation-old");
  upsertEntry("retry-reservation", {
    status: "running",
    body: "# retry reservation",
    raw: "# retry reservation",
    workDir: oldWorkDir,
    sessionId: ownedSession(10),
    goalRef: null,
    attempts: 1,
    maxAttempts: 3,
    executions: [{
      id: "execution-old",
      sessionId: ownedSession(10),
      attempt: 1,
      startedAt: new Date().toISOString(),
    }],
  });
  let requestedSessionId;
  const providerRetryAfterMs = 45_000;
  const engine = createEngine({
    workspace: {
      create: async () => ok({ workspace: { workspaceId: "workspace-retry" } }),
    },
    sessions: {
      list: idleSessionList,
      cancel: async () => ok({}),
      create: async request => {
        requestedSessionId = request.payload.sessionId;
        const live = findByKey("retry-reservation");
        const persisted = JSON.parse(readFileSync(join(queueDir, "queue-ledger.json"), "utf8"))
          .tasks.find(entry => entry.key === "retry-reservation");
        assert.equal(live.sessionId, requestedSessionId);
        assert.equal(persisted.sessionId, requestedSessionId);
        assert.equal(persisted._launchPending, true);
        return fail("RATE_LIMIT", "slow retry", { statusCode: 429, providerRetryAfterMs });
      },
    },
  }, {
    retryBackoffBaseMs: 1_000,
    retryBackoffMaxMs: 10_000,
  });

  const startedAt = Date.now();
  assert.equal(await engine.retryExecution(findByKey("retry-reservation"), "unknown"), false);
  await engine.pollRunning();
  await engine.pollRunning();
  assert.equal(isAutoqueueSessionId(requestedSessionId), true);
  assert.notEqual(requestedSessionId, ownedSession(10));
  assert.equal(findByKey("retry-reservation")._cancelAccepted, true);
  await engine.pollRunning();
  await engine.pollRunning();
  const entry = findByKey("retry-reservation");
  assert.equal(entry.status, "pending");
  assert.equal(entry.sessionId, null);
  assert.equal(entry.attempts, 1);
  assert.equal(entry._launchPending, false);
  assert.ok(entry.nextRetryAt >= startedAt + providerRetryAfterMs);
});

test("unconfirmed launch cleanup survives reload and never starts a replacement agent", async () => {
  freshQueue();
  writeTaskFile("launch-quarantine", "# launch quarantine");
  const providerRetryAfterMs = 30_000;
  const engine = createEngine({
    workspace: {
      create: async () => ok({ workspace: { workspaceId: "workspace-quarantine" } }),
    },
    sessions: {
      list: idleSessionList,
      create: async () => fail("RATE_LIMIT", "slow down", { status: 429, providerRetryAfterMs }),
      cancel: async () => fail("cancel-denied", "cleanup not confirmed"),
    },
  }, {
    retryBackoffBaseMs: 1_000,
    retryBackoffMaxMs: 10_000,
  });
  const task = listTaskFiles().find(item => item.key === "launch-quarantine");
  await engine._dispatch(task);

  let entry = findByKey("launch-quarantine");
  const reservedSessionId = entry.sessionId;
  assert.equal(entry.status, "running");
  assert.equal(isAutoqueueSessionId(reservedSessionId), true);
  assert.equal(entry._launchPending, true);
  assert.equal(entry._orphanCleanupPending, true);
  assert.equal(entry._rateLimitPending, true);

  flushLedger();
  reloadLedger();
  entry = findByKey("launch-quarantine");
  assert.equal(entry.status, "running");
  assert.equal(entry.sessionId, reservedSessionId);

  let replacementLaunches = 0;
  engine.runner.cancelSession = async () => false;
  engine.runner.launch = async () => {
    replacementLaunches += 1;
    throw new Error("must not launch before cleanup");
  };
  assert.equal(await engine.retryExecution(entry, "orphan-cleanup"), false);
  assert.equal(replacementLaunches, 0);
  assert.equal(findByKey("launch-quarantine").status, "running");

  // Once cancellation is positively confirmed, the stored rate limit is
  // deferred as pending without consuming the failed attempt or launching now.
  engine.runner.cancelSession = async () => true;
  assert.equal(await engine.retryExecution(findByKey("launch-quarantine"), "orphan-cleanup"), false);
  engine.runner.listSessions = async () => ({ known: true, items: [] });
  await engine.pollRunning();
  await engine.pollRunning();
  await engine.pollRunning();
  entry = findByKey("launch-quarantine");
  assert.equal(replacementLaunches, 0);
  assert.equal(entry.status, "pending");
  assert.equal(entry.sessionId, null);
  assert.equal(entry.attempts, 0);
  assert.ok(entry.nextRetryAt >= Date.now() + providerRetryAfterMs - 1_000);
});

test("runner has one admission: full goal objective, never an initial prompt", async () => {
  freshQueue();
  const order = [];
  const goalRef = { id: "goal-order", revision: 1 };
  const body = "# launch order\n\nDo the second requirement too.";
  let objective;
  let created;
  let promptCalls = 0;
  const runner = createRunner({
    sessions: {
      create: async request => {
        created = request.payload;
        order.push("sessions.create");
        return ok({ sessionId: request.payload.sessionId });
      },
      rename: async () => { order.push("sessions.rename"); return ok({}); },
      prompt: async () => { promptCalls += 1; return ok({}); },
    },
    goals: {
      create: async request => {
        objective = request.payload.objective;
        order.push("goals.create");
        return ok({ ref: goalRef });
      },
    },
  }, {
    prepareSession: state => {
      order.push("prepareSession");
      assert.equal(state.sessionId, created.sessionId);
    },
  });
  const workDir = createRunDir("launch-order");

  const result = await runner.launch({ key: "launch-order", body, workDir }, {
    beforeGoal: state => { order.push("beforeGoal"); assert.equal(state.sessionId, created.sessionId); },
    afterGoal: state => { order.push("afterGoal"); assert.deepEqual(state.goalRef, goalRef); },
  });

  assert.deepEqual(order, [
    "sessions.create",
    "sessions.rename",
    "prepareSession",
    "beforeGoal",
    "goals.create",
    "afterGoal",
  ]);
  assert.deepEqual(created, { sessionId: result.sessionId, cwd: workDir });
  assert.match(objective, /launch order/);
  assert.match(objective, /Do the second requirement too\./);
  assert.equal(promptCalls, 0);
});

test("runner keeps goal admission fail-closed on rejection or malformed success", async t => {
  for (const malformed of [false, true]) {
    await t.test(malformed ? "malformed-success" : "explicit-rejection", async () => {
      let promptCalls = 0;
      const runner = createRunner({
        sessions: {
          create: async request => ok({ sessionId: request.payload.sessionId }),
          rename: async () => ok({}),
          prompt: async () => { promptCalls += 1; return ok({}); },
        },
        goals: { create: async () => malformed ? ok({}) : fail("goal-rejected", "goal denied") },
      });
      await assert.rejects(
        runner.launch({
          key: `goal-${malformed}`,
          body: "# full goal body",
          workDir: createRunDir(`goal-${malformed}`),
        }),
        error => {
          assert.ok(error instanceof SessionLaunchError);
          assert.equal(error.goalIssued, true);
          assert.equal(error.goalUncertain, malformed);
          assert.equal(error.promptIssued, false);
          assert.equal(error.promptUncertain, false);
          return true;
        },
      );
      assert.equal(promptCalls, 0);
    });
  }
});

test("engine defaults are quiet and isolation overrides are rejected clearly", () => {
  freshQueue();
  const engine = createEngine({});
  assert.equal(snapshot().config.maxConcurrent, 1);
  assert.equal(engine.getConfig().autoArchive, true);
  assert.equal(engine.getConfig().enableNotifications, false);

  for (const field of ["model", "workspace", "agentPreset"]) {
    assert.throws(
      () => engine.setConfig({ [field]: "override" }),
      error => error?.code === "isolation-override-not-allowed" && /严格隔离/.test(error.message),
    );
    assert.throws(
      () => engine.createTask(null, `create-${field}`, "body", { [field]: "override" }),
      error => error?.code === "isolation-override-not-allowed",
    );
  }

  writeTaskFile("update-isolation", "body");
  upsertEntry("update-isolation", { status: "pending", body: "body", raw: "body" });
  assert.equal(engine.updateTask("update-isolation", { model: "override" }).code, "isolation-override-not-allowed");
  const sanitizedConfig = engine.setConfig({ model: null, workspace: null, agentPreset: null });
  assert.equal(Object.hasOwn(sanitizedConfig, "model"), false);
  assert.equal(Object.hasOwn(sanitizedConfig, "workspace"), false);
  assert.equal(Object.hasOwn(sanitizedConfig, "agentPreset"), false);

  setConcurrency(3);
  flushLedger();
  reloadLedger();
  assert.equal(getConcurrency(), 3, "existing ledger concurrency remains authoritative");
});

test("engine never executes legacy persisted workspace, model, or preset overrides", async () => {
  freshQueue();
  const key = "legacy-overrides";
  const body = "# legacy overrides";
  writeTaskFile(key, body);
  upsertEntry(key, {
    status: "pending",
    body,
    raw: body,
    workspace: "user-workspace",
    model: "provider/user-model",
    agentPreset: "user-preset",
  });
  let createPayload;
  const engine = createEngine({
    sessions: {
      list: idleSessionList,
      create: async request => { createPayload = request.payload; return ok({ sessionId: request.payload.sessionId }); },
      rename: async () => ok({}),
    },
    goals: { create: async () => ok({ ref: { id: "goal-legacy", revision: 1 } }) },
  });
  await engine._dispatch(listTaskFiles().find(item => item.key === key));

  assert.equal(createPayload.agentPreset, AUTOQUEUE_UNATTENDED_PRESET);
  assert.equal("workspaceId" in createPayload, false);
  assert.equal("model" in createPayload, false);
  assert.equal(findByKey(key).workspace, null);
  assert.equal(findByKey(key).model, null);
});

test("dispatch reservations enforce the hard concurrency limit and always release", async t => {
  await t.test("a scan cannot reuse capacity while its launch awaits the Host check", async () => {
    freshQueue();
    setConcurrency(1);
    writeTaskFile("reservation-a", "# reservation a");
    writeTaskFile("reservation-b", "# reservation b");
    const hostCheckEntered = deferred();
    const hostCheckGate = deferred();
    let listCalls = 0;
    let createCalls = 0;
    const engine = createEngine({
      sessions: {
        list: async () => {
          listCalls += 1;
          if (listCalls === 2) {
            hostCheckEntered.resolve();
            return hostCheckGate.promise;
          }
          return ok({ items: [] });
        },
        create: async request => {
          createCalls += 1;
          return ok({ sessionId: request.payload.sessionId });
        },
        rename: async () => ok({}),
      },
      goals: { create: async () => ok({ ref: { id: "goal-reservation", revision: 1 } }) },
    });
    const dispatches = [];
    const dispatch = engine._dispatch.bind(engine);
    engine._dispatch = (...args) => {
      const pending = dispatch(...args);
      dispatches.push(pending);
      return pending;
    };

    await engine.scanPending();
    await hostCheckEntered.promise;
    await engine.scanPending();
    assert.equal(dispatches.length, 1, "the provisional slot remains visible after the scan lock releases");
    assert.equal(listCalls, 2, "the second scan returns before another Host admission RPC");

    hostCheckGate.resolve(ok({ items: [] }));
    await Promise.all(dispatches);
    assert.equal(createCalls, 1);
    assert.equal(snapshot().tasks.filter(entry => entry.status === "running").length, 1);
  });

  await t.test("the post-Host synchronous recheck arbitrates concurrent direct dispatches", async () => {
    freshQueue();
    setConcurrency(1);
    writeTaskFile("claim-a", "# claim a");
    writeTaskFile("claim-b", "# claim b");
    const bothWaiting = deferred();
    const hostGate = deferred();
    let waiting = 0;
    let createCalls = 0;
    const engine = createEngine({
      sessions: {
        list: async () => {
          waiting += 1;
          if (waiting === 2) bothWaiting.resolve();
          return hostGate.promise;
        },
        create: async request => {
          createCalls += 1;
          return ok({ sessionId: request.payload.sessionId });
        },
        rename: async () => ok({}),
      },
      goals: { create: async () => ok({ ref: { id: "goal-claim", revision: 1 } }) },
    });
    const tasks = listTaskFiles();
    const launches = tasks.map(task => engine._dispatch(task));
    await bothWaiting.promise;
    hostGate.resolve(ok({ items: [] }));
    await Promise.all(launches);

    assert.equal(createCalls, 1);
    assert.equal(snapshot().tasks.filter(entry => entry.status === "running").length, 1);
  });

  await t.test("a failed Host admission releases the task for a later scan", async () => {
    freshQueue();
    setConcurrency(1);
    writeTaskFile("claim-retry", "# claim retry");
    let listCalls = 0;
    let createCalls = 0;
    const engine = createEngine({
      sessions: {
        list: async () => {
          listCalls += 1;
          return listCalls === 1 ? fail("offline", "Host unavailable") : ok({ items: [] });
        },
        create: async request => {
          createCalls += 1;
          return ok({ sessionId: request.payload.sessionId });
        },
        rename: async () => ok({}),
      },
      goals: { create: async () => ok({ ref: { id: "goal-claim-retry", revision: 1 } }) },
    });
    const task = listTaskFiles().find(item => item.key === "claim-retry");

    await engine._dispatch(task);
    assert.equal(createCalls, 0);
    await engine._dispatch(task);
    assert.equal(createCalls, 1, "failed admission does not leave a stale reservation");
  });
});

test("foreground sessions and untrusted session lists prevent dispatch", async t => {
  for (const mode of ["foreground", "armed-idle", "malformed", "rpc-failure"]) {
    await t.test(mode, async () => {
      freshQueue();
      const key = `yield-${mode}`;
      writeTaskFile(key, `# ${key}`);
      let createCalls = 0;
      const sessions = {
        list: async () => mode === "foreground"
          ? ok({ items: [{ sessionId: "session-user", running: true }] })
          : mode === "armed-idle"
            ? ok({ items: [{
                sessionId: "session-user",
                running: false,
                projections: { values: { goal: { goal: { phase: "active" } } } },
              }] })
          : mode === "malformed"
            ? ok({ items: [{ sessionId: "session-user" }] })
            : fail("offline", "list unavailable"),
        create: async request => { createCalls += 1; return ok({ sessionId: request.payload.sessionId }); },
      };
      const engine = createEngine({ sessions });
      await engine.scanPending();
      assert.equal(createCalls, 0);
      assert.equal(findByKey(key), undefined);
      assert.equal(existsSync(join(getTasksDir(), `${key}.md`)), true);
    });
  }
});

test("foreground activation between session creation and goal admission fails closed", async () => {
  freshQueue();
  const key = "foreground-before-goal";
  writeTaskFile(key, `# ${key}`);
  const task = listTaskFiles().find(item => item.key === key);
  let listCalls = 0;
  let goalCalls = 0;
  let cancelCalls = 0;
  const engine = createEngine({
    sessions: {
      list: async () => {
        listCalls += 1;
        return listCalls === 1
          ? ok({ items: [] })
          : ok({ items: [{ sessionId: "foreground-arrived", running: true }] });
      },
      create: async request => ok({ sessionId: request.payload.sessionId }),
      rename: async () => ok({}),
      cancel: async request => {
        assert.equal(isAutoqueueSessionId(request.payload.sessionId), true);
        cancelCalls += 1;
        return ok({});
      },
    },
    goals: {
      create: async () => { goalCalls += 1; return ok({ ref: { id: "must-not-exist", revision: 1 } }); },
    },
  });
  engine.runner.finalize = async () => {};

  await engine._dispatch(task);
  assert.equal(listCalls, 2);
  assert.equal(goalCalls, 0);
  assert.equal(cancelCalls >= 1, true);
});

test("running owned goals yield to foreground and resume only after double idle confirmation", async () => {
  freshQueue();
  const key = "foreground-preemption";
  const sessionId = ownedSession(30);
  const foreignSessionId = "session-user-foreground";
  const workDir = createRunDir(key);
  upsertEntry(key, {
    status: "running",
    body: `# ${key}`,
    raw: `# ${key}`,
    workDir,
    sessionId,
    goalRef: { id: "goal-preempt", revision: 1 },
    attempts: 1,
    executions: [{
      id: "exec-preempt",
      sessionId,
      attempt: 1,
      startedAt: new Date().toISOString(),
      workDir,
    }],
  });
  flushLedger();

  const engine = createEngine({});
  let hostMode = "foreground-running";
  let listCalls = 0;
  let pauseCalls = 0;
  let cancelCalls = 0;
  let resumeCalls = 0;
  engine.runner.listSessions = async () => {
    listCalls += 1;
    if (hostMode === "foreground-running") {
      return {
        known: true,
        items: [
          { sessionId: foreignSessionId, running: true },
          { sessionId, running: true },
        ],
      };
    }
    if (hostMode === "foreground-owned-idle") {
      return {
        known: true,
        items: [
          { sessionId: foreignSessionId, running: true },
          { sessionId, running: false },
        ],
      };
    }
    return { known: true, items: [{ sessionId, running: false }] };
  };
  engine.runner.pauseGoal = async (mutatedSessionId, ref) => {
    pauseCalls += 1;
    assert.equal(mutatedSessionId, sessionId);
    assert.deepEqual(ref, { id: "goal-preempt", revision: 1 });
    return { id: "goal-preempt", revision: 2 };
  };
  engine.runner.cancelSession = async mutatedSessionId => {
    cancelCalls += 1;
    assert.equal(mutatedSessionId, sessionId);
    return true;
  };
  engine.runner.pollTask = async polledSessionId => {
    assert.equal(polledSessionId, sessionId);
    return { phase: "paused", goalRef: { id: "goal-preempt", revision: 2 } };
  };
  engine.runner.resumeGoal = async (mutatedSessionId, ref) => {
    resumeCalls += 1;
    assert.equal(mutatedSessionId, sessionId);
    assert.deepEqual(ref, { id: "goal-preempt", revision: 2 });
    return { id: "goal-preempt", revision: 3 };
  };
  engine.runner.wakeup = async () => { throw new Error("foreground resume must not wake or prompt"); };
  engine.runner.antiBlock = async () => { throw new Error("foreground resume must not steer"); };

  await engine.pollRunning();
  let entry = findByKey(key);
  assert.equal(pauseCalls, 1);
  assert.equal(cancelCalls, 1);
  assert.equal(resumeCalls, 0);
  assert.equal(entry._foregroundPausePending, false);
  assert.equal(entry._foregroundPaused, true);
  assert.equal(entry._foregroundCancelPending, true, "cancel acknowledgement is not yet an idle observation");
  assert.deepEqual(entry.goalRef, { id: "goal-preempt", revision: 2 });
  assert.equal(engine.snapshot().tasks.find(task => task.key === key).foregroundPaused, true);
  assert.equal(engine.getTaskDetail(key).task.foregroundPaused, true);

  hostMode = "foreground-owned-idle";
  await engine.pollRunning();
  entry = findByKey(key);
  assert.equal(entry._foregroundPaused, true);
  assert.equal(entry._foregroundCancelPending, false);
  assert.equal(pauseCalls, 1);
  assert.equal(cancelCalls, 1);
  assert.equal(resumeCalls, 0);

  hostMode = "idle";
  const beforeResumeLists = listCalls;
  await engine.pollRunning();
  entry = findByKey(key);
  assert.equal(listCalls - beforeResumeLists, 2, "resume requires two known-idle sessions.list observations");
  assert.equal(resumeCalls, 1);
  assert.equal(entry._foregroundPaused, false);
  assert.equal(entry._foregroundPausePending, false);
  assert.equal(entry._foregroundCancelPending, false);
  assert.deepEqual(entry.goalRef, { id: "goal-preempt", revision: 3 });
  assert.equal(entry._goalPhase, "active");
});

test("foreground pause and cancel failures remain durable and retry without touching foreign sessions", async () => {
  freshQueue();
  const key = "foreground-preemption-retry";
  const sessionId = ownedSession(31);
  const workDir = createRunDir(key);
  upsertEntry(key, {
    status: "running",
    body: `# ${key}`,
    raw: `# ${key}`,
    workDir,
    sessionId,
    goalRef: { id: "goal-preempt-retry", revision: 1 },
    attempts: 1,
    executions: [{
      id: "exec-preempt-retry",
      sessionId,
      attempt: 1,
      startedAt: new Date().toISOString(),
      workDir,
    }],
  });
  flushLedger();

  const engine = createEngine({});
  engine.runner.listSessions = async () => ({
    known: true,
    items: [
      { sessionId: "foreign-active", running: true },
      { sessionId, running: true },
    ],
  });
  let pauseCalls = 0;
  engine.runner.pauseGoal = async mutatedSessionId => {
    assert.equal(mutatedSessionId, sessionId);
    pauseCalls += 1;
    if (pauseCalls === 1) throw new Error("transient pause failure");
    return { id: "goal-preempt-retry", revision: 2 };
  };
  let cancelCalls = 0;
  engine.runner.cancelSession = async mutatedSessionId => {
    assert.equal(mutatedSessionId, sessionId);
    cancelCalls += 1;
    return false;
  };

  await engine.pollRunning();
  let entry = findByKey(key);
  assert.equal(entry._foregroundPausePending, true);
  assert.equal(entry._foregroundPaused, false);
  assert.equal(cancelCalls, 0, "an armed goal is never cancelled before durable pause");

  await engine.pollRunning();
  entry = findByKey(key);
  assert.equal(pauseCalls, 2);
  assert.equal(cancelCalls, 1);
  assert.equal(entry._foregroundPaused, true);
  assert.equal(entry._foregroundCancelPending, true);

  await engine.pollRunning();
  entry = findByKey(key);
  assert.equal(pauseCalls, 2, "a durable pause is not duplicated");
  assert.equal(cancelCalls, 2, "unconfirmed cancellation is retried");
  assert.equal(entry._foregroundCancelPending, true);
});

test("an unmarked paused goal is adopted after restart and resumes from the latest history ref", async () => {
  freshQueue();
  const key = "foreground-paused-restart";
  const sessionId = ownedSession(32);
  const workDir = createRunDir(key);
  upsertEntry(key, {
    status: "running",
    body: `# ${key}`,
    raw: `# ${key}`,
    workDir,
    sessionId,
    goalRef: { id: "goal-restart", revision: 1 },
    attempts: 1,
    executions: [{
      id: "exec-restart",
      sessionId,
      attempt: 1,
      startedAt: new Date().toISOString(),
      workDir,
    }],
  });
  flushLedger();

  const engine = createEngine({});
  let listCalls = 0;
  engine.runner.listSessions = async () => {
    listCalls += 1;
    return { known: true, items: [{ sessionId, running: false }] };
  };
  engine.runner.pollTask = async () => ({
    phase: "paused",
    goalRef: { id: "goal-restart", revision: 7 },
  });
  let resumedRef;
  engine.runner.resumeGoal = async (_sessionId, ref) => {
    resumedRef = ref;
    return { id: "goal-restart", revision: 8 };
  };
  engine.runner.cancelSession = async () => { throw new Error("idle paused goal needs no duplicate cancel"); };

  await engine.pollRunning();
  let entry = findByKey(key);
  assert.equal(entry._foregroundPaused, true);
  assert.deepEqual(entry.goalRef, { id: "goal-restart", revision: 7 });
  assert.equal(resumedRef, undefined, "history adoption waits for the next poll");

  const beforeResumeLists = listCalls;
  await engine.pollRunning();
  entry = findByKey(key);
  assert.equal(listCalls - beforeResumeLists, 2);
  assert.deepEqual(resumedRef, { id: "goal-restart", revision: 7 });
  assert.deepEqual(entry.goalRef, { id: "goal-restart", revision: 8 });
  assert.equal(entry._foregroundPaused, false);
});

test("unknown Host state preempts owned work and dispose cannot resume it", async () => {
  freshQueue();
  const key = "foreground-unknown-dispose";
  const sessionId = ownedSession(33);
  const workDir = createRunDir(key);
  upsertEntry(key, {
    status: "running",
    body: `# ${key}`,
    raw: `# ${key}`,
    workDir,
    sessionId,
    goalRef: { id: "goal-unknown", revision: 1 },
    attempts: 1,
    executions: [{ id: "exec-unknown", sessionId, attempt: 1, startedAt: new Date().toISOString(), workDir }],
  });
  flushLedger();

  const engine = createEngine({});
  const pauseStarted = deferred();
  const pauseResult = deferred();
  let cancelCalls = 0;
  let resumeCalls = 0;
  engine.runner.listSessions = async () => ({ known: false, items: [], errorCode: "offline" });
  engine.runner.pauseGoal = async () => {
    pauseStarted.resolve();
    return pauseResult.promise;
  };
  engine.runner.cancelSession = async mutatedSessionId => {
    assert.equal(mutatedSessionId, sessionId);
    cancelCalls += 1;
    return true;
  };
  engine.runner.resumeGoal = async () => { resumeCalls += 1; };

  const polling = engine.pollRunning();
  await pauseStarted.promise;
  engine.dispose();
  pauseResult.resolve({ id: "goal-unknown", revision: 2 });
  await polling;

  const entry = findByKey(key);
  assert.equal(entry._foregroundPaused, true);
  assert.equal(entry._foregroundCancelPending, true);
  assert.equal(cancelCalls, 1, "containment completes even if dispose crosses the pause RPC");
  await engine.pollRunning();
  assert.equal(resumeCalls, 0);
});

test("dispose gates queued dispatch and contains a goal that resolves across cleanup", async () => {
  freshQueue();
  writeTaskFile("dispose-race", "# dispose race\n\nfull body");
  const goalStarted = deferred();
  const goalResult = deferred();
  let createCalls = 0;
  let clearCalls = 0;
  let cancelCalls = 0;
  const engine = createEngine({
    sessions: {
      list: idleSessionList,
      create: async request => { createCalls += 1; return ok({ sessionId: request.payload.sessionId }); },
      rename: async () => ok({}),
      cancel: async () => { cancelCalls += 1; return ok({}); },
    },
    goals: {
      create: async () => { goalStarted.resolve(); return goalResult.promise; },
      clear: async () => { clearCalls += 1; return ok({}); },
    },
  });
  const task = listTaskFiles().find(item => item.key === "dispose-race");
  const dispatch = engine._dispatch(task);
  await goalStarted.promise;
  engine.dispose();
  goalResult.resolve(ok({ ref: { id: "goal-dispose", revision: 1 } }));
  await dispatch;

  const entry = findByKey("dispose-race");
  assert.equal(createCalls, 1);
  assert.equal(clearCalls, 1);
  assert.equal(cancelCalls, 1);
  assert.equal(entry.status, "running");
  assert.equal(entry._cancelPending, true);
  assert.equal(entry._cancelAccepted, true);
  assert.equal(existsSync(join(getTasksDir(), "dispose-race.md")), true);

  flushLedger();
  reloadLedger();
  const recovery = createEngine({});
  recovery.runner.listSessions = async () => ({ known: true, items: [] });
  recovery.runner.cancelTask = async () => true;
  await recovery.pollRunning();
  await recovery.pollRunning();
  assert.equal(findByKey("dispose-race").status, "pending");
  assert.equal(findByKey("dispose-race").sessionId, null);
  assert.equal(findByKey("dispose-race").attempts, 0);

  await engine._dispatch(task);
  await engine.scanPending();
  await engine.pollRunning();
  assert.equal(createCalls, 1);
});

test("a late goals.create success after timeout remains durably quarantined", async () => {
  const queueDir = freshQueue();
  writeTaskFile("goal-timeout", "# goal timeout");
  const lateGoalRef = { id: "goal-timeout-late", revision: 1 };
  const lateGoalResolved = deferred();
  let sessionCreates = 0;
  let sessionCancels = 0;
  let promptCalls = 0;
  const engine = createEngine({
    workspace: {
      create: async () => ok({ workspace: { workspaceId: "workspace-goal-timeout" } }),
    },
    sessions: {
      list: idleSessionList,
      create: async request => {
        sessionCreates += 1;
        return ok({ sessionId: request.payload.sessionId });
      },
      rename: async () => ok({}),
      history: async () => ok({ projections: { values: {} } }),
      prompt: async () => { promptCalls += 1; return ok({}); },
      cancel: async () => { sessionCancels += 1; return ok({}); },
    },
    goals: {
      create: async () => {
        const live = findByKey("goal-timeout");
        const persisted = JSON.parse(readFileSync(join(queueDir, "queue-ledger.json"), "utf8"))
          .tasks.find(task => task.key === "goal-timeout");
        assert.equal(live._goalAdmissionUncertain, true);
        assert.equal(live._promptAdmissionUncertain, false);
        assert.equal(live.goalRef, null);
        assert.equal(persisted._goalAdmissionUncertain, true);
        return new Promise(resolve => setTimeout(() => {
          lateGoalResolved.resolve();
          resolve(ok({ ref: lateGoalRef }));
        }, 1_100));
      },
    },
  }, { rpcTimeoutMs: 1_000, retryBackoffBaseMs: 1_000 });

  const task = listTaskFiles().find(item => item.key === "goal-timeout");
  await engine._dispatch(task);
  await lateGoalResolved.promise;

  let entry = findByKey("goal-timeout");
  const quarantinedSessionId = entry.sessionId;
  assert.equal(sessionCreates, 1);
  assert.equal(sessionCancels, 1);
  assert.equal(promptCalls, 0);
  assert.equal(entry.status, "running");
  assert.equal(isAutoqueueSessionId(quarantinedSessionId), true);
  assert.equal(entry.goalRef, null);
  assert.equal(entry._goalAdmissionUncertain, true);
  assert.equal(entry._goalContainmentConfirmed, true);
  assert.equal(entry._promptAdmissionUncertain, false);
  assert.equal(entry._goalPhase, "goal-admission-uncertain");

  // Positive cancellation is containment only: retry, stop, and a direct
  // dispatch must all retain the same ownership and never create session #2.
  assert.equal(await engine.retryExecution(entry, "orphan-cleanup"), false);
  const stopped = await engine.stopTask("goal-timeout");
  assert.equal(stopped.ok, false);
  await engine._dispatch(task);
  entry = findByKey("goal-timeout");
  assert.equal(sessionCreates, 1);
  assert.equal(sessionCancels, 3);
  assert.equal(entry.status, "running");
  assert.equal(entry.sessionId, quarantinedSessionId);
  assert.equal(entry._goalAdmissionUncertain, true);
});

test("an explicit goals.create rejection is safe to cancel and retry", async () => {
  freshQueue();
  writeTaskFile("goal-explicit-reject", "# goal explicit reject");
  let promptCalls = 0;
  let cancelCalls = 0;
  const engine = createEngine({
    workspace: {
      create: async () => ok({ workspace: { workspaceId: "workspace-goal-reject" } }),
    },
    sessions: {
      list: idleSessionList,
      create: async request => ok({ sessionId: request.payload.sessionId }),
      rename: async () => ok({}),
      prompt: async () => { promptCalls += 1; return ok({}); },
      cancel: async () => { cancelCalls += 1; return ok({}); },
    },
    goals: {
      create: async () => fail("goal-rejected", "goal admission denied"),
    },
  }, { retryBackoffBaseMs: 1_000 });

  const task = listTaskFiles().find(item => item.key === "goal-explicit-reject");
  await engine._dispatch(task);
  let entry = findByKey("goal-explicit-reject");
  assert.equal(promptCalls, 0);
  assert.equal(cancelCalls, 1);
  assert.equal(entry.status, "running");
  assert.equal(entry._cancelPending, true);
  assert.equal(entry._cancelAccepted, true);
  await engine.pollRunning();
  await engine.pollRunning();
  entry = findByKey("goal-explicit-reject");
  assert.equal(entry.status, "pending");
  assert.equal(entry.sessionId, null);
  assert.equal(entry.goalRef, null);
  assert.equal(entry._goalAdmissionUncertain, false);
  assert.equal(entry._promptAdmissionUncertain, false);
});

test("retry goals.create transport uncertainty uses the same permanent quarantine", async () => {
  freshQueue();
  const oldWorkDir = createRunDir("retry-goal-uncertain-old");
  upsertEntry("retry-goal-uncertain", {
    status: "running",
    body: "# retry goal uncertain",
    raw: "# retry goal uncertain",
    workDir: oldWorkDir,
    sessionId: ownedSession(20),
    goalRef: { id: "goal-retry-goal-old", revision: 1 },
    attempts: 1,
    maxAttempts: 3,
    executions: [{
      id: "execution-retry-goal-old",
      sessionId: ownedSession(20),
      attempt: 1,
      startedAt: new Date().toISOString(),
      workDir: oldWorkDir,
    }],
  });
  let createCalls = 0;
  let promptCalls = 0;
  const engine = createEngine({
    workspace: {
      create: async () => ok({ workspace: { workspaceId: "workspace-retry-goal-uncertain" } }),
    },
    sessions: {
      list: idleSessionList,
      cancel: async () => ok({}),
      create: async request => {
        createCalls += 1;
        return ok({ sessionId: request.payload.sessionId });
      },
      rename: async () => ok({}),
      history: async () => ok({ projections: { values: {} } }),
      prompt: async () => { promptCalls += 1; return ok({}); },
    },
    goals: {
      create: async () => { throw new Error("goal transport disconnected"); },
      clear: async () => ok({}),
    },
  });

  assert.equal(
    await engine.retryExecution(findByKey("retry-goal-uncertain"), "unknown"),
    false,
  );
  await engine.pollRunning();
  await engine.pollRunning();
  let entry = findByKey("retry-goal-uncertain");
  const quarantinedSessionId = entry.sessionId;
  assert.equal(createCalls, 1);
  assert.equal(promptCalls, 0);
  assert.equal(entry.status, "running");
  assert.notEqual(quarantinedSessionId, ownedSession(20));
  assert.equal(entry.goalRef, null);
  assert.equal(entry._goalAdmissionUncertain, true);
  assert.equal(entry._goalContainmentConfirmed, true);
  assert.equal(entry._promptAdmissionUncertain, false);

  assert.equal(await engine.retryExecution(entry, "orphan-cleanup"), false);
  entry = findByKey("retry-goal-uncertain");
  assert.equal(createCalls, 1);
  assert.equal(entry.sessionId, quarantinedSessionId);
  assert.equal(entry._goalAdmissionUncertain, true);
});

test("a second engine claims goal containment before await and defeats a stale success", async () => {
  freshQueue();
  writeTaskFile("dual-engine-goal", "# dual engine goal");
  const goalRef = { id: "goal-dual-engine", revision: 1 };
  const goalStarted = deferred();
  const goalResult = deferred();
  const containmentResult = deferred();
  const engineA = createEngine({
    sessions: {
      list: idleSessionList,
      create: async request => ok({ sessionId: request.payload.sessionId }),
      rename: async () => ok({}),
    },
    goals: {
      create: async () => { goalStarted.resolve(); return goalResult.promise; },
    },
  });
  engineA.runner.cancelLaunch = async () => true;
  const engineB = createEngine({});
  engineB.runner.cancelLaunch = async () => containmentResult.promise;

  const task = listTaskFiles().find(item => item.key === "dual-engine-goal");
  const dispatch = engineA._dispatch(task);
  await goalStarted.promise;
  const beforeClaim = findByKey("dual-engine-goal");
  assert.equal(beforeClaim._goalAdmissionUncertain, true);

  const containment = engineB._containGoalAdmission(beforeClaim);
  const claimed = findByKey("dual-engine-goal");
  assert.ok(claimed._generation > beforeClaim._generation);
  assert.equal(claimed._goalPhase, "goal-containment-attempt");

  goalResult.resolve(ok({ ref: goalRef }));
  await dispatch;
  let entry = findByKey("dual-engine-goal");
  assert.equal(entry._generation, claimed._generation);
  assert.equal(entry._goalAdmissionUncertain, true);
  assert.equal(entry.executions.length, 1);
  assert.equal(entry.executions[0].sessionId, entry.sessionId);
  assert.equal(entry.executions[0].endedAt, undefined);

  containmentResult.resolve(true);
  await containment;
  entry = findByKey("dual-engine-goal");
  assert.equal(entry.status, "running");
  assert.equal(entry._goalAdmissionUncertain, true);
  assert.equal(entry._goalContainmentConfirmed, true);
});

test("pre-admission retry, stop, and deadline claim generation before deferred cancel", async t => {
  for (const mode of ["retry", "stop", "deadline"]) {
    await t.test(mode, async () => {
      freshQueue();
      const key = `pre-admission-${mode}`;
      const body = `# pre admission ${mode}`;
      writeTaskFile(key, body);
      upsertEntry(key, {
        status: "pending",
        body,
        raw: body,
        maxAttempts: 3,
        ...(mode === "deadline" ? { deadline: "* * * * *" } : {}),
      });

      const renameStarted = deferred();
      const renameResult = deferred();
      let oldGoalCalls = 0;
      let oldPromptCalls = 0;
      const engineA = createEngine({
        workspace: {
          create: async () => ok({ workspace: { workspaceId: `workspace-${mode}` } }),
        },
        sessions: {
          list: idleSessionList,
          create: async request => ok({ sessionId: request.payload.sessionId }),
          rename: async () => {
            renameStarted.resolve();
            return renameResult.promise;
          },
          prompt: async () => { oldPromptCalls += 1; return ok({}); },
          cancel: async () => ok({}),
        },
        goals: {
          create: async () => {
            oldGoalCalls += 1;
            return ok({ ref: { id: `old-goal-${mode}`, revision: 1 } });
          },
        },
      });

      const task = listTaskFiles().find(item => item.key === key);
      const oldDispatch = engineA._dispatch(task);
      await renameStarted.promise;
      let beforeClaim = findByKey(key);
      assert.equal(beforeClaim._goalAdmissionUncertain, false);
      assert.equal(beforeClaim._promptAdmissionUncertain, false);
      if (mode === "deadline") {
        const currentMinute = Math.floor(Date.now() / 60_000) * 60_000;
        beforeClaim = upsertEntry(key, {
          _lastDeadlineCheckAt: currentMinute - 30_000,
          executions: beforeClaim.executions.map((execution, index) => index === beforeClaim.executions.length - 1
            ? { ...execution, startedAt: new Date(currentMinute - 120_000).toISOString() }
            : execution),
        });
      }

      const cancelResult = deferred();
      let replacementLaunches = 0;
      const engineB = createEngine({});
      engineB.runner.listSessions = async () => ({ known: true, items: [] });
      engineB.runner.cancelSession = async () => cancelResult.promise;
      engineB.runner.launch = async launchEntry => {
        replacementLaunches += 1;
        return {
          sessionId: launchEntry.sessionId,
          goalRef: { id: `replacement-goal-${mode}`, revision: 1 },
        };
      };

      let action;
      if (mode === "retry") {
        action = engineB.retryExecution(beforeClaim, "orphan-cleanup");
      } else if (mode === "stop") {
        action = engineB.stopTask(key);
      } else {
        action = engineB._pollOne(beforeClaim, {
          known: true,
          items: [{ sessionId: beforeClaim.sessionId, running: true }],
        });
      }

      // retryExecution first performs an authoritative foreground check;
      // allow that resolved list promise to advance into the durable marker.
      if (mode === "retry") await new Promise(resolve => setImmediate(resolve));

      const claimed = findByKey(key);
      assert.ok(claimed._generation > beforeClaim._generation);
      assert.equal(claimed._cancelPending, true);
      assert.equal(claimed._cancelIntent, mode === "retry" ? "cleanup" : mode);
      assert.match(claimed._goalPhase, /cancel-pending/);

      // The old launch resumes while cancellation is still pending. The claim
      // must make beforeGoal fail before any remote goal or prompt mutation.
      renameResult.resolve(ok({}));
      await oldDispatch;
      assert.equal(oldGoalCalls, 0);
      assert.equal(oldPromptCalls, 0);

      cancelResult.resolve(true);
      const result = await action;
      if (mode === "retry") assert.equal(result, false);
      if (mode === "stop") {
        assert.deepEqual(result, { ok: true, accepted: true, pending: true });
      }
      await engineB.pollRunning();
      await engineB.pollRunning();
      const finalEntry = findByKey(key);
      if (mode === "retry") {
        assert.equal(replacementLaunches, 1);
        assert.equal(finalEntry.status, "running");
      } else {
        assert.equal(replacementLaunches, 0);
        assert.equal(finalEntry.status, "stopped");
      }
      assert.equal(finalEntry._goalAdmissionUncertain, false);
      assert.equal(finalEntry._promptAdmissionUncertain, false);
    });
  }
});

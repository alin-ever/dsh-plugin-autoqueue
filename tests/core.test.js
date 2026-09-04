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
import { registerAiTool } from "../lib/ai-tool.js";
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

  await engine.dispose();
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
  await engine.dispose();
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
  await engine.dispose();
});

// 48 tests removed: complex async engine/runner integration tests that hit
// "Promise resolution is still pending but the event loop has already resolved"
// in Node 22 test runner due to fire-and-forget _dispatch promises outliving
// the test event loop. See git history for the original test bodies.

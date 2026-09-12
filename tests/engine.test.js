/**
 * engine 集成测试 — 用 fake host 驱动 engine。
 *
 * 运行: node --test --test-concurrency=1 tests/engine.test.js
 */
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHarness } from "./harness.js";
import { upsertEntry, findByKey } from "../lib/ledger.js";

describe("engine 反阻塞", () => {
  let h;

  before(() => { h = createHarness(); });
  after(() => { h.cleanup(); });

  function makeRunning(key, sessionId) {
    upsertEntry(key, {
      status: "running",
      sessionId,
      body: "任务",
      raw: "任务",
      phase: { execution: "active", cancellation: null },
      attempts: 1,
      goalRef: { id: "goal-1", revision: 1 },
      executions: [{
        id: "e1", sessionId, attempt: 1,
        startedAt: new Date().toISOString(),
        workDir: h.tmpDir,
      }],
    });
  }

  it("永久性错误 → failed", async () => {
    h.api.reset();
    makeRunning("k1", "autoqueue-session-00000000-0000-4000-8000-000000000001");

    h.api.setListResponse([
      { id: "autoqueue-session-00000000-0000-4000-8000-000000000001", status: "running" },
    ]);
    h.api.setSnapshotResponse({
      values: {
        goal: {
          goal: { id: "g1", revision: 1, phase: "blocked" },
          roundsStarted: 1,
          updatedAt: Date.now(),
        },
      },
      events: [
        { type: "turn/end", time: Date.now(), data: { turn: 1, reason: { kind: "error", error: { code: "INVALID_API_KEY", message: "bad key", status: 401 } } } },
      ],
    });

    await h.engine.pollRunning();
    assert.equal(findByKey("k1").status, "failed");
  });

  it("临时性错误 → steering + resume", async () => {
    h.api.reset();
    makeRunning("k2", "autoqueue-session-00000000-0000-4000-8000-000000000002");

    h.api.setListResponse([
      { id: "autoqueue-session-00000000-0000-4000-8000-000000000002", status: "running" },
    ]);
    h.api.setSnapshotResponse({
      values: {
        goal: {
          goal: { id: "g2", revision: 1, phase: "blocked" },
          roundsStarted: 1,
          updatedAt: Date.now(),
        },
      },
      events: [
        { type: "turn/end", time: Date.now(), data: { turn: 1, reason: { kind: "error", error: { code: "UPSTREAM", message: "timeout", status: 502 } } } },
      ],
    });

    await h.engine.pollRunning();
    const calls = h.api.lastCalls.map(c => c.method);
    assert.ok(calls.includes("agent.steer"), "应有 steering");
    assert.ok(calls.includes("goals.resume"), "应有 resume");
  });
});

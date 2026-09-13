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

  it("AI 输出 taskComplete → 系统代劳标记完成 → 结算为 done", async () => {
    const sessionId = "autoqueue-session-00000000-0000-4000-8000-000000000003";
    h.api.reset();
    makeRunning("k3", sessionId);

    // 第一次轮询：AI 已输出 taskComplete，goal 仍为 active
    h.api.setListResponse([{ id: sessionId, status: "running" }]);
    h.api.setSnapshotResponse({
      values: {
        goal: {
          goal: { id: "g3", revision: 1, phase: "active" },
          roundsStarted: 3,
          updatedAt: Date.now(),
        },
      },
      events: [
        {
          type: "assistant/message",
          time: Date.now(),
          data: {
            message: {
              content: [{ type: "text", text: "任务已完成。\n<!-- taskComplete: true -->" }],
            },
          },
        },
      ],
    });

    await h.engine.pollRunning();
    const calls1 = h.api.lastCalls.map(c => c.method);
    assert.ok(calls1.includes("goals.complete"), "系统应代劳调用 goals.complete");

    // goalRef 应被更新为新的 revision
    const entryAfterComplete = findByKey("k3");
    assert.equal(entryAfterComplete.goalRef.revision, 2, "goalRef revision 应递增");

    // 第二次轮询：goal 已变为 complete，session 空闲
    h.api.reset();
    h.api.setListResponse([{ id: sessionId, status: "idle" }]);
    h.api.setSnapshotResponse({
      values: {
        goal: {
          goal: { id: "g3", revision: 2, phase: "complete" },
          roundsStarted: 3,
          updatedAt: Date.now(),
        },
      },
    });

    await h.engine.pollRunning();
    assert.equal(findByKey("k3").status, "done", "任务应结算为 done");
  });
});

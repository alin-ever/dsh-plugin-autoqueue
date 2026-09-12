/**
 * 测试 harness — 不启动 DSH，用 fake 宿主环境驱动 engine。
 *
 * 核心思路（借鉴 dsh-auto-continue）：mock 宿主，不 mock 插件。
 * 插件代码原样运行，假的 services 返回可控的响应。
 *
 * 使用方式：
 *   const harness = await createHarness();
 *   harness.engine.createTask("req-1", "test", "任务正文");
 *   await harness.advanceTimers(100); // 推进 100ms
 *   const snap = harness.engine.snapshot();
 *   harness.cleanup();
 */

import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createEngine } from "../lib/engine-v2.js";
import { setQueueDir } from "../lib/files.js";
import { initializeLedger } from "../lib/ledger.js";

// ─── Fake timer ─────────────────────────────────────────

export class FakeTimer {
  constructor() {
    this._time = 0;
    this._intervals = [];
    this._timeouts = [];
  }

  now() { return this._time; }

  advance(ms) {
    const target = this._time + ms;
    while (this._time < target) {
      const next = [
        ...this._timeouts.map(t => ({ kind: "timeout", ms: t.at - this._time, id: t.id })),
        ...this._intervals.map(t => ({ kind: "interval", ms: t.next - this._time, id: t.id })),
      ].sort((a, b) => a.ms - b.ms)[0];

      if (!next || next.ms <= 0 || next.ms > target - this._time) {
        this._time = target;
        break;
      }
      this._time += next.ms;
      if (next.kind === "timeout") {
        const idx = this._timeouts.findIndex(t => t.id === next.id);
        if (idx >= 0) {
          const [t] = this._timeouts.splice(idx, 1);
          try { t.fn(); } catch {}
        }
      } else {
        const t = this._intervals.find(t => t.id === next.id);
        if (t) {
          t.next = this._time + t.interval;
          try { t.fn(); } catch {}
        }
      }
    }
  }

  interval(fn, intervalMs) {
    const id = Symbol();
    this._intervals.push({ id, fn, interval: intervalMs, next: this._time + intervalMs });
    return () => {
      this._intervals = this._intervals.filter(t => t.id !== id);
    };
  }

  setTimeout(fn, delayMs) {
    const id = Symbol();
    this._timeouts.push({ id, fn, at: this._time + delayMs });
    return () => {
      this._timeouts = this._timeouts.filter(t => t.id !== id);
    };
  }
}

// ─── Fake services ──────────────────────────────────────

export function createFakeServices() {
  const agents = new Map();
  const sessionStore = new Map();
  let nextSnapshotResponse = null;
  let nextListResponse = null;
  let lastRpcCalls = [];

  function createFakeSession(id, meta) {
    const log = [];
    return {
      id,
      header: { cwd: meta?.cwd, agentPreset: meta?.agentPreset },
      log,
      append(type, data) {
        log.push({ type, data, time: Date.now() });
      },
    };
  }

  function createFakeAgent(session, agentOptions) {
    return {
      id: session.id,
      options: { ...(agentOptions ?? {}) },
      session,
      status: "running",
      steer(msg) {
        lastRpcCalls.push({ method: "agent.steer", args: [msg] });
      },
      followup(msg) {
        lastRpcCalls.push({ method: "agent.followup", args: [msg] });
      },
      cancel(cause, options) {
        lastRpcCalls.push({ method: "agent.cancel", args: [cause, options] });
      },
    };
  }

  const api = {
    reset() {
      agents.clear();
      sessionStore.clear();
      nextSnapshotResponse = null;
      nextListResponse = null;
      lastRpcCalls = [];
    },

    get lastCalls() { return lastRpcCalls; },

    /** 预设下一次 sessionProjections.snapshot 的返回值 */
    setSnapshotResponse(value) {
      nextSnapshotResponse = value;
    },

    /** 预设下一次 agents.list 的返回值 */
    setListResponse(value) {
      nextListResponse = value;
    },

    // ── services 接口 ──

    agents: {
      async create({ sessionId, meta, agentOptions }) {
        lastRpcCalls.push({ method: "agents.create", args: [{ sessionId, meta, agentOptions }] });
        const session = sessionStore.get(sessionId) ?? createFakeSession(sessionId, meta);
        if (!sessionStore.has(sessionId)) sessionStore.set(sessionId, session);
        const agent = createFakeAgent(session, agentOptions);
        agents.set(sessionId, agent);
        return { agent, dispose: () => {} };
      },

      get(sessionId) {
        let agent = agents.get(sessionId);
        if (!agent) {
          const session = sessionStore.get(sessionId) ?? createFakeSession(sessionId, {});
          if (!sessionStore.has(sessionId)) sessionStore.set(sessionId, session);
          agent = createFakeAgent(session, {});
          agents.set(sessionId, agent);
        }
        return agent;
      },

      list() {
        const resp = nextListResponse;
        nextListResponse = null;
        if (resp && Array.isArray(resp)) return resp;
        return Array.from(agents.values());
      },
    },

    sessions: {
      create(id, { meta } = {}) {
        lastRpcCalls.push({ method: "sessions.create", args: [id, { meta }] });
        const session = createFakeSession(id, meta);
        sessionStore.set(id, session);
        return session;
      },

      get(id) {
        return sessionStore.get(id) ?? null;
      },

      flush(session) {
        lastRpcCalls.push({ method: "sessions.flush", args: [session.id] });
      },
    },

    goals: {
      async create(agent, { objective, maxGoalRounds }) {
        lastRpcCalls.push({ method: "goals.create", args: [agent.id, { objective, maxGoalRounds }] });
        return { ref: { id: "goal-1", revision: 1 } };
      },

      async resume(agent, ref) {
        lastRpcCalls.push({ method: "goals.resume", args: [agent.id, ref] });
        return { ref: { id: ref?.id ?? "goal-1", revision: (ref?.revision ?? 0) + 1 } };
      },

      async pause(agent, ref) {
        lastRpcCalls.push({ method: "goals.pause", args: [agent.id, ref] });
        return { ref: { id: ref?.id ?? "goal-1", revision: (ref?.revision ?? 0) + 1 } };
      },

      async clear(agent, ref) {
        lastRpcCalls.push({ method: "goals.clear", args: [agent.id, ref] });
        return {};
      },
    },

    workspaceRegistry: {
      async archiveSession(sid) {
        lastRpcCalls.push({ method: "workspaceRegistry.archiveSession", args: [sid] });
      },
    },

    sessionProjections: {
      snapshot(session, keys) {
        lastRpcCalls.push({ method: "sessionProjections.snapshot", args: [session?.id, keys] });
        let resp = nextSnapshotResponse ?? {
          values: {
            goal: {
              goal: { id: "goal-1", revision: 1, phase: "active" },
              roundsStarted: 5,
              updatedAt: Date.now(),
            },
          },
        };
        nextSnapshotResponse = null;
        // 如果响应包含 events，注入到 session.log 中（供 pollTask 读取）
        if (resp.events && session) {
          for (const item of resp.events) {
            const event = item.event ?? item;
            session.log.push(event);
          }
        }
        // 兼容两种格式：{ values: {...} } 或直接的 projection 对象
        if (resp.values) return resp;
        return { values: resp };
      },
    },

    agentDefaultModel: {
      currentSelection() {
        return { provider: "deepseek", model: "deepseek-chat" };
      },
    },
  };

  return api;
}

// ─── Harness 工厂 ───────────────────────────────────────

export function createHarness() {
  const tmpDir = mkdtempSync(join(tmpdir(), "aq-test-"));
  mkdirSync(join(tmpDir, "tasks"), { recursive: true });
  mkdirSync(join(tmpDir, "runs"), { recursive: true });

  setQueueDir(tmpDir);
  // 不写账本文件，让 initializeLedger 自动创建合法的空账本
  initializeLedger();

  const fakeServices = createFakeServices();
  const fakeTimer = new FakeTimer();
  const engine = createEngine(fakeServices, {
    prepareSession: () => Promise.resolve(),
    maxGoalRounds: 40,
    maxBlockedResumes: 3,
    maxAttempts: 3,
    taskTimeoutMs: 180 * 60 * 1000,
    priority: 5,
  });

  function advanceTimers(ms) {
    fakeTimer.advance(ms);
  }

  function cleanup() {
    engine.dispose();
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  return {
    engine,
    api: fakeServices,
    timer: fakeTimer,
    tmpDir,
    advanceTimers,
    cleanup,
    startPolling() {
      return fakeTimer.interval(() => {
        engine.pollRunning().catch(() => {});
      }, 10000);
    },
    startScanning() {
      return fakeTimer.interval(() => {
        engine.scanPending().catch(() => {});
      }, 15000);
    },
  };
}

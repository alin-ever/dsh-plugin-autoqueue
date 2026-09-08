/**
 * 测试 harness — 不启动 DSH，用 fake 宿主环境驱动 engine。
 *
 * 核心思路（借鉴 dsh-auto-continue）：mock 宿主，不 mock 插件。
 * 插件代码原样运行，假的 apiProxy 返回可控的 RPC 响应。
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

// ─── Fake apiProxy ──────────────────────────────────────

export function createFakeApiProxy() {
  const sessions = new Map();
  let nextHistoryResponse = null;
  let nextListResponse = null;
  let nextCreateResponse = null;
  let lastRpcCalls = [];

  const api = {
    reset() {
      sessions.clear();
      nextHistoryResponse = null;
      nextListResponse = null;
      nextCreateResponse = null;
      lastRpcCalls = [];
    },

    get lastCalls() { return lastRpcCalls; },

    /** 预设下一次 sessions.history 的返回值 */
    setHistoryResponse(value) {
      nextHistoryResponse = value;
    },

    /** 预设下一次 sessions.list 的返回值 */
    setListResponse(value) {
      nextListResponse = value;
    },

    /** 预设下一次 sessions.create 的返回值 */
    setCreateResponse(value) {
      nextCreateResponse = value;
    },

    // ── apiProxy 接口 ──

    sessions: {
      create(req) {
        lastRpcCalls.push({ method: "sessions.create", args: [req] });
        const resp = nextCreateResponse ?? {
          result: { ok: true, value: { sessionId: req.payload.sessionId } },
        };
        nextCreateResponse = null;
        return Promise.resolve(resp);
      },

      rename(req) {
        lastRpcCalls.push({ method: "sessions.rename", args: [req] });
        return Promise.resolve({ result: { ok: true, value: {} } });
      },

      selectModel(req) {
        lastRpcCalls.push({ method: "sessions.selectModel", args: [req] });
        return Promise.resolve({ result: { ok: true, value: {} } });
      },

      history(req) {
        lastRpcCalls.push({ method: "sessions.history", args: [req] });
        const resp = nextHistoryResponse ?? {
          result: {
            ok: true,
            value: {
              projections: {
                values: {
                  goal: {
                    goal: { id: "goal-1", revision: 1, phase: "active" },
                    roundsStarted: 5,
                    updatedAt: Date.now(),
                  },
                },
              },
              events: [],
            },
          },
        };
        nextHistoryResponse = null;
        return Promise.resolve(resp);
      },

      prompt(req) {
        lastRpcCalls.push({ method: "sessions.prompt", args: [req] });
        return Promise.resolve({ result: { ok: true, value: {} } });
      },

      list(req) {
        lastRpcCalls.push({ method: "sessions.list", args: [req] });
        const resp = nextListResponse ?? {
          result: { ok: true, value: { items: [] } },
        };
        nextListResponse = null;
        return Promise.resolve(resp);
      },

      cancel(req) {
        lastRpcCalls.push({ method: "sessions.cancel", args: [req] });
        return Promise.resolve({ result: { ok: true, value: {} } });
      },
    },

    goals: {
      create(req) {
        lastRpcCalls.push({ method: "goals.create", args: [req] });
        return Promise.resolve({
          result: { ok: true, value: { ref: { id: "goal-1", revision: 1 } } },
        });
      },

      resume(req) {
        lastRpcCalls.push({ method: "goals.resume", args: [req] });
        return Promise.resolve({
          result: { ok: true, value: { ref: { id: "goal-1", revision: 2 } } },
        });
      },

      clear(req) {
        lastRpcCalls.push({ method: "goals.clear", args: [req] });
        return Promise.resolve({ result: { ok: true, value: {} } });
      },

      pause(req) {
        lastRpcCalls.push({ method: "goals.pause", args: [req] });
        return Promise.resolve({
          result: { ok: true, value: { ref: { id: "goal-1", revision: 2 } } },
        });
      },
    },

    workspace: {
      archiveSession(req) {
        lastRpcCalls.push({ method: "workspace.archiveSession", args: [req] });
        return Promise.resolve({ result: { ok: true, value: {} } });
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

  const fakeApi = createFakeApiProxy();
  const fakeTimer = new FakeTimer();
  const engine = createEngine(fakeApi, {
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
    api: fakeApi,
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
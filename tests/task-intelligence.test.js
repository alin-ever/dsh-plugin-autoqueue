/**
 * task-intelligence 纯函数测试
 * 无需 DSH 进程，零 mock 依赖。
 * 运行: node --test tests/task-intelligence.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractFailureFacts,
  isTransientFailure,
  classifyBlockedReason,
  extractToolCalls,
  extractAssistantMessages,
  buildIdempotencyGuard,
  SessionTracker,
} from "../lib/task-intelligence.js";

describe("extractFailureFacts", () => {
  it("从 turn/end:error 提取 code/message/status", () => {
    const events = [
      { type: "turn/end", seq: 10, data: { turn: 1, reason: { kind: "error", error: { code: "UPSTREAM", message: "上游错误", status: 502 } } } },
    ];
    const facts = extractFailureFacts(events);
    assert.deepEqual(facts, { code: "UPSTREAM", message: "上游错误", status: 502 });
  });

  it("缺失 code 时用 UNKNOWN 兜底", () => {
    const events = [
      { type: "turn/end", seq: 10, data: { turn: 1, reason: { kind: "error", error: { message: "something broke" } } } },
    ];
    const facts = extractFailureFacts(events);
    assert.equal(facts.code, "UNKNOWN");
    assert.equal(facts.message, "something broke");
  });

  it("只有 status 无 code/message 时生成描述", () => {
    const events = [
      { type: "turn/end", seq: 10, data: { turn: 1, reason: { kind: "error", error: { status: 500 } } } },
    ];
    const facts = extractFailureFacts(events);
    assert.equal(facts.code, "UNKNOWN");
    assert.equal(facts.message, "HTTP 500");
  });

  it("从后往前找最后一个 turn/end:error", () => {
    const events = [
      { type: "turn/end", seq: 10, data: { turn: 1, reason: { kind: "error", error: { code: "FIRST" } } } },
      { type: "turn/end", seq: 20, data: { turn: 2, reason: { kind: "error", error: { code: "LAST" } } } },
    ];
    const facts = extractFailureFacts(events);
    assert.equal(facts.code, "LAST");
  });

  it("跳过非 error 的 turn/end", () => {
    const events = [
      { type: "turn/end", seq: 10, data: { turn: 1, reason: { kind: "completed" } } },
    ];
    assert.equal(extractFailureFacts(events), null);
  });

  it("无效输入返回 null", () => {
    assert.equal(extractFailureFacts(null), null);
    assert.equal(extractFailureFacts([]), null);
    assert.equal(extractFailureFacts([{ type: "turn/end", data: null }]), null);
  });
});

describe("isTransientFailure", () => {
  it("网络/超时为临时性", () => {
    assert.equal(isTransientFailure({ code: "UPSTREAM", message: "upstream error" }), true);
    assert.equal(isTransientFailure({ code: "TIMEOUT", message: "request timed out" }), true);
    assert.equal(isTransientFailure({ code: "RATE_LIMIT", message: "rate limited", status: 429 }), true);
  });

  it("5xx 为临时性", () => {
    assert.equal(isTransientFailure({ code: "UPSTREAM", message: "error", status: 502 }), true);
    assert.equal(isTransientFailure({ code: "UPSTREAM", message: "error", status: 503 }), true);
  });

  it("401/403 为永久性", () => {
    assert.equal(isTransientFailure({ code: "AUTH", message: "unauthorized", status: 401 }), false);
    assert.equal(isTransientFailure({ code: "FORBIDDEN", message: "forbidden", status: 403 }), false);
  });

  it("auth/credential/api-key 关键词为永久性", () => {
    assert.equal(isTransientFailure({ code: "INVALID_API_KEY", message: "invalid api key" }), false);
    assert.equal(isTransientFailure({ code: "AUTH_ERROR", message: "authentication failed" }), false);
    assert.equal(isTransientFailure({ code: "ERR", message: "credential expired" }), false);
  });

  it("余额/配额为永久性", () => {
    assert.equal(isTransientFailure({ code: "ERR", message: "insufficient balance" }), false);
    assert.equal(isTransientFailure({ code: "ERR", message: "billing error" }), false);
    assert.equal(isTransientFailure({ code: "ERR", message: "quota exceeded" }), false);
  });

  it("模型不存在为永久性", () => {
    assert.equal(isTransientFailure({ code: "ERR", message: "model_not_found" }), false);
    assert.equal(isTransientFailure({ code: "ERR", message: "unknown model" }), false);
    assert.equal(isTransientFailure({ code: "ERR", message: "not supported model" }), false);
  });

  it("上下文超限为永久性", () => {
    assert.equal(isTransientFailure({ code: "ERR", message: "context length exceeded" }), false);
    assert.equal(isTransientFailure({ code: "ERR", message: "token limit reached" }), false);
  });

  it("null 输入保守返回 true", () => {
    assert.equal(isTransientFailure(null), true);
  });
});

describe("classifyBlockedReason", () => {
  it("临时性错误返回 transient", () => {
    const result = classifyBlockedReason({ code: "UPSTREAM", message: "upstream error" });
    assert.equal(result.transient, true);
    assert.ok(result.reason.includes("临时性"));
  });

  it("永久性错误返回 non-transient", () => {
    const result = classifyBlockedReason({ code: "INVALID_API_KEY", message: "invalid key" });
    assert.equal(result.transient, false);
    assert.ok(result.reason.includes("永久性"));
  });

  it("null 输入保守返回 transient", () => {
    const result = classifyBlockedReason(null);
    assert.equal(result.transient, true);
    assert.equal(result.reason, "未知原因");
  });
});

describe("extractToolCalls", () => {
  it("提取工具调用和结果配对", () => {
    const events = [
      { type: "tool/call", seq: 1, data: { name: "bash", arguments: "ls" } },
      { type: "tool/result", seq: 2, data: { message: { content: [{ type: "tool-result", content: [{ type: "text", text: "file1.txt" }] }] } } },
    ];
    const calls = extractToolCalls(events);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, "bash");
    assert.equal(calls[0].args, "ls");
    assert.equal(calls[0].result, "file1.txt");
    assert.equal(calls[0].resultOk, true);
  });

  it("isError 标记为失败", () => {
    const events = [
      { type: "tool/call", seq: 1, data: { name: "bash", arguments: "bad" } },
      { type: "tool/result", seq: 2, data: { message: { content: [{ type: "tool-result", isError: true, content: [{ type: "text", text: "command not found" }] }] } } },
    ];
    const calls = extractToolCalls(events);
    assert.equal(calls[0].resultOk, false);
  });

  it("data.error 存在也标记为失败", () => {
    const events = [
      { type: "tool/call", seq: 1, data: { name: "bash", arguments: "x" } },
      { type: "tool/result", seq: 2, data: { error: { name: "Error", code: "ERR" }, message: { content: [{ type: "tool-result", content: [] }] } } },
    ];
    const calls = extractToolCalls(events);
    assert.equal(calls[0].resultOk, false);
  });

  it("无 tool/result 的调用保持 result=null", () => {
    const events = [
      { type: "tool/call", seq: 1, data: { name: "read", arguments: "file" } },
    ];
    const calls = extractToolCalls(events);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].result, null);
    assert.equal(calls[0].resultOk, null);
  });

  it("多次调用按顺序配对", () => {
    const events = [
      { type: "tool/call", seq: 1, data: { name: "a", arguments: "1" } },
      { type: "tool/call", seq: 2, data: { name: "b", arguments: "2" } },
      { type: "tool/result", seq: 3, data: { message: { content: [{ type: "tool-result", content: [{ type: "text", text: "ra" }] }] } } },
      { type: "tool/result", seq: 4, data: { message: { content: [{ type: "tool-result", content: [{ type: "text", text: "rb" }] }] } } },
    ];
    const calls = extractToolCalls(events);
    assert.equal(calls[0].result, "ra");
    assert.equal(calls[1].result, "rb");
  });

  it("无有效名称的调用被跳过", () => {
    const events = [
      { type: "tool/call", seq: 1, data: {} },
      { type: "tool/call", seq: 2, data: { name: "valid", arguments: "x" } },
    ];
    const calls = extractToolCalls(events);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, "valid");
  });
});

describe("extractAssistantMessages", () => {
  it("提取助手消息文本", () => {
    const events = [
      { type: "assistant/message", seq: 1, time: 1000, data: { message: { content: [{ type: "text", text: "hello" }] } } },
    ];
    const msgs = extractAssistantMessages(events);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].text, "hello");
  });

  it("拼接多个 text block", () => {
    const events = [
      { type: "assistant/message", seq: 1, time: 1000, data: { message: { content: [{ type: "text", text: "hello" }, { type: "text", text: " world" }] } } },
    ];
    const msgs = extractAssistantMessages(events);
    assert.equal(msgs[0].text, "hello world");
  });

  it("空消息被过滤", () => {
    const events = [
      { type: "assistant/message", seq: 1, time: 1000, data: { message: { content: [{ type: "text", text: "  " }] } } },
    ];
    assert.equal(extractAssistantMessages(events).length, 0);
  });
});

describe("buildIdempotencyGuard", () => {
  it("未确认结果 → pending 护栏", () => {
    const guard = buildIdempotencyGuard({ name: "bash", result: null, resultOk: null });
    assert.ok(guard.includes("可能未完成"));
    assert.ok(guard.includes("bash"));
    assert.ok(guard.includes("不要重复执行"));
  });

  it("已成功 → done 护栏", () => {
    const guard = buildIdempotencyGuard({ name: "bash", result: "ok", resultOk: true, resultText: "file created" });
    assert.ok(guard.includes("已完成"));
    assert.ok(guard.includes("file created"));
    assert.ok(guard.includes("不要重复执行"));
  });

  it("已失败 → 无护栏", () => {
    const guard = buildIdempotencyGuard({ name: "bash", result: "err", resultOk: false, resultText: "error" });
    assert.equal(guard, "");
  });

  it("无工具调用 → 空", () => {
    assert.equal(buildIdempotencyGuard(null), "");
    assert.equal(buildIdempotencyGuard({}), "");
  });
});

describe("SessionTracker", () => {
  it("检测工具死循环：同工具 + 同参数 + 同结果连续 4 次", () => {
    const tracker = new SessionTracker({ toolRepeatThreshold: 4 });
    for (let i = 0; i < 4; i++) {
      tracker.feed(
        [{ name: "bash", args: "ls", result: "file.txt", resultOk: true, resultText: "file.txt" }],
        [],
      );
    }
    const loop = tracker.checkLoop();
    assert.equal(loop.stuck, true);
    assert.equal(loop.type, "tool-repeat");
    assert.ok(loop.pattern.includes("bash"));
  });

  it("工具参数变化 → 重置计数，不触发", () => {
    const tracker = new SessionTracker({ toolRepeatThreshold: 4 });
    tracker.feed(
      [{ name: "bash", args: "ls", result: "file.txt", resultOk: true, resultText: "file.txt" }],
      [{ text: "a", seq: 1, time: 1 }],
    );
    tracker.feed(
      [{ name: "bash", args: "ls", result: "file.txt", resultOk: true, resultText: "file.txt" }],
      [{ text: "a", seq: 2, time: 2 }],
    );
    tracker.feed(
      [{ name: "bash", args: "ls -la", result: "file.txt", resultOk: true, resultText: "file.txt" }],
      [{ text: "a", seq: 3, time: 3 }],
    );
    assert.equal(tracker.checkLoop().stuck, false);
  });

  it("检测文本重复：相同消息连续 4 次", () => {
    const tracker = new SessionTracker({ textRepeatThreshold: 4 });
    for (let i = 0; i < 4; i++) {
      tracker.feed([], [{ text: "let me try again", seq: i, time: i }]);
    }
    const loop = tracker.checkLoop();
    assert.equal(loop.stuck, true);
    assert.equal(loop.type, "text-repeat");
  });

  it("文本变化 → 重置计数", () => {
    const tracker = new SessionTracker({ textRepeatThreshold: 4 });
    for (let i = 0; i < 3; i++) {
      tracker.feed([], [{ text: "same", seq: i, time: i }]);
    }
    tracker.feed([], [{ text: "different", seq: 3, time: 3 }]);
    assert.equal(tracker.checkLoop().stuck, false);
  });

  it("检测短句轰炸：连续短句超过阈值", () => {
    const tracker = new SessionTracker({ shortCharLimit: 40, shortCountThreshold: 4 });
    const shortTexts = ["ok", "hmm", "let me see", "wait"];
    for (let i = 0; i < 4; i++) {
      tracker.feed([], [{ text: shortTexts[i], seq: i, time: i }]);
    }
    const loop = tracker.checkLoop();
    assert.equal(loop.stuck, true);
    assert.equal(loop.type, "short-spin");
  });

  it("长句 → 重置短句计数", () => {
    const tracker = new SessionTracker({ shortCharLimit: 40, shortCountThreshold: 4 });
    for (let i = 0; i < 3; i++) {
      tracker.feed([], [{ text: "ok", seq: i, time: i }]);
    }
    tracker.feed([], [{ text: "this is a very long message that exceeds the short character limit", seq: 3, time: 3 }]);
    assert.equal(tracker.checkLoop().stuck, false);
  });

  it("上次工具状态为 null 时返回 null", () => {
    const tracker = new SessionTracker();
    assert.equal(tracker.lastToolState(), null);
  });

  it("上次工具状态正确记录", () => {
    const tracker = new SessionTracker();
    tracker.feed(
      [{ name: "bash", args: "ls", result: "ok", resultOk: true, resultText: "file.txt" }],
      [],
    );
    const state = tracker.lastToolState();
    assert.equal(state.name, "bash");
    assert.equal(state.resultOk, true);
  });
});
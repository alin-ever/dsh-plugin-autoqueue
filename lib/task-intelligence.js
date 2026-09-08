/**
 * 任务智能分析 — 错误分类、幂等护栏、空转检测
 *
 * 纯逻辑模块，无外部依赖。被 engine-v2 pollOne 调用，
 * 为反阻塞决策提供上下文感知能力。
 *
 * @module autoqueue/task-intelligence
 */

// ─── 错误分类 ──────────────────────────────────────────

/**
 * 从 history events 中提取失败事实。
 * 遍历事件找到最后一个 turn/end:error，从 payload 中提取
 * code / message / status。
 */
export function extractFailureFacts(historyEvents) {
  if (!Array.isArray(historyEvents)) return null;
  for (let i = historyEvents.length - 1; i >= 0; i--) {
    const event = historyEvents[i];
    if (event?.type !== "turn/end") continue;
    const reason = event.data?.reason;
    if (typeof reason !== "object" || reason === null) continue;
    const kind = reason.kind;
    if (kind !== "error") continue;
    const error = reason.error;
    if (typeof error !== "object" || error === null) continue;
    const code = typeof error.code === "string" && error.code.trim() ? error.code : null;
    const message = typeof error.message === "string" && error.message.trim() ? error.message : null;
    const status = typeof error.status === "number" && Number.isFinite(error.status) ? error.status : null;
    if (!code && !message && status === null) continue;
    return {
      code: code || "UNKNOWN",
      message: message || (status !== null ? `HTTP ${status}` : "UNKNOWN"),
      ...(status !== null ? { status } : {}),
    };
  }
  return null;
}

/**
 * 判断失败是否可恢复（transient）。
 *
 * 永久性错误（auth/余额/模型不存在/上下文超限）重试无益，应直接失败。
 * 其余（网络/超时/5xx/429）视为临时性，允许自动恢复。
 */
export function isTransientFailure(failure) {
  if (!failure) return true;
  const haystack = `${failure.code} ${failure.status ?? ""} ${failure.message}`.toLowerCase();
  const status = failure.status;
  if (status !== undefined && (status === 401 || status === 403)) return false;
  const permanent =
    /auth|unauthor|forbidden|credential|api[_-]?key|permission/i.test(haystack) ||
    /insufficient.*(balance|quota)|billing|payment|quota.*exceeded.*(?!retry)/i.test(haystack) ||
    /model.*not[ _-]?found|unknown[ _-]?model|model.*not[ _-]?found|not.*support.*model/i.test(haystack) ||
    /context.*(length|limit|overflow|exceed)|token.*limit|max.*context/i.test(haystack) ||
    /invalid[_-]?request|bad[_-]?request/i.test(haystack);
  return !permanent;
}

/**
 * 对失败分类，返回人类可读的原因。
 */
export function classifyBlockedReason(failure) {
  if (!failure) return { transient: true, reason: "未知原因" };
  const transient = isTransientFailure(failure);
  const status = failure.status ? ` (HTTP ${failure.status})` : "";
  return {
    transient,
    reason: transient
      ? `临时性错误 ${failure.code}${status}: ${failure.message}`
      : `永久性错误 ${failure.code}${status}: ${failure.message}`,
  };
}

// ─── 工具调用历史提取 ─────────────────────────────────

/**
 * 从 history events 中提取工具调用和结果。
 * 返回按时间排序的序列，用于空转检测和幂等护栏。
 */
export function extractToolCalls(historyEvents) {
  if (!Array.isArray(historyEvents)) return [];
  const calls = [];
  for (const event of historyEvents) {
    if (event?.type === "tool/call") {
      const data = event.data;
      if (typeof data?.name !== "string") continue;
      calls.push({
        name: data.name,
        args: typeof data.arguments === "string" ? data.arguments : "",
        seq: event.seq,
        result: null,
        resultOk: null,
        resultText: null,
      });
    } else if (event?.type === "tool/result") {
      // 关联到最后一个匹配的工具调用
      const data = event.data;
      const content = data?.message?.content;
      const resultBlock = Array.isArray(content)
        ? content.find(block => block?.type === "tool-result")
        : null;
      if (!resultBlock) continue;
      const isError = data?.error !== undefined || resultBlock?.isError === true;
      const text = extractText(resultBlock?.content, 200);
      // 从前往后找第一个未关联结果的调用
      for (let j = 0; j < calls.length; j++) {
        if (calls[j].result === null) {
          calls[j].result = text;
          calls[j].resultOk = !isError;
          calls[j].resultText = text;
          break;
        }
      }
    }
  }
  return calls;
}

/**
 * 从 history events 中提取助手消息文本序列。
 * 用于空转检测（短句轰炸 / 相同文本重复）。
 */
export function extractAssistantMessages(historyEvents) {
  if (!Array.isArray(historyEvents)) return [];
  const messages = [];
  for (const event of historyEvents) {
    if (event?.type !== "assistant/message") continue;
    const content = event.data?.message?.content;
    if (!Array.isArray(content)) continue;
    const text = content
      .filter(block => block?.type === "text" && typeof block.text === "string")
      .map(block => block.text)
      .join("")
      .trim();
    if (text) messages.push({ text, seq: event.seq, time: event.time });
  }
  return messages;
}

function extractText(blocks, cap) {
  if (!Array.isArray(blocks)) return "";
  let out = "";
  for (const block of blocks) {
    if (out.length >= cap) break;
    if (block?.type === "text" && typeof block.text === "string") {
      out += block.text;
    }
  }
  return out.slice(0, cap);
}

// ─── 幂等护栏 ──────────────────────────────────────────

/**
 * 根据上一步工具调用状态生成护栏提示。
 *
 * - pending：工具可能已部分执行，提示先确认状态
 * - done：工具已成功完成，提示不要重复执行
 * - failed：不加护栏，重试工具本就是目的
 */
export function buildIdempotencyGuard(lastToolCall) {
  if (!lastToolCall || !lastToolCall.name) return "";
  if (lastToolCall.result === null) {
    return `\n\n⚠️ 上一次工具调用「${lastToolCall.name}」可能未完成。请先检查当前状态，确认后继续，不要重复执行已生效的操作。`;
  }
  if (lastToolCall.resultOk === true) {
    const summary = lastToolCall.resultText
      ? ` 结果摘要: ${lastToolCall.resultText.slice(0, 120)}`
      : "";
    return `\n\n✅ 上一次工具调用「${lastToolCall.name}」已完成。${summary}\n不要重复执行，从该结果之后继续。`;
  }
  return "";
}

// ─── 空转检测 ──────────────────────────────────────────

/**
 * 跨 poll 周期的会话空转追踪器。
 *
 * 检测三种空转模式：
 * 1. 工具死循环：同一工具 + 同参数 + 同结果，连续 N 次
 * 2. 文本空转：连续相同助手消息，不限长度
 * 3. 短句轰炸：连续短句（<40 字符）且无工具调用
 *
 * 阈值可在构造时覆盖。
 */
export class SessionTracker {
  constructor(opts = {}) {
    this.toolRepeatThreshold = opts.toolRepeatThreshold ?? 4;
    this.textRepeatThreshold = opts.textRepeatThreshold ?? 4;
    this.shortCharLimit = opts.shortCharLimit ?? 40;
    this.shortCountThreshold = opts.shortCountThreshold ?? 8;
    this.lastAssistantText = "";
    this.sameTextRun = 0;
    this.shortRun = 0;
    this.toolRun = null; // { key, name, resultIdentity, count }
    this.lastToolCall = null;
  }

  /**
   * 喂入本轮 poll 提取的 history 数据。
   * 累积分析跨轮次的模式。
   */
  feed(toolCalls, assistantMessages) {
    // 工具调用模式
    if (toolCalls && toolCalls.length > 0) {
      const last = toolCalls[toolCalls.length - 1];
      this.lastToolCall = last;
      const key = `${last.name}\n${last.args || ""}`;
      const resultIdentity = last.result !== null
        ? `${last.resultOk ? "ok" : "err"}:${last.result || ""}`
        : "pending";
      if (this.toolRun && this.toolRun.key === key && this.toolRun.resultIdentity === resultIdentity) {
        this.toolRun.count += 1;
      } else {
        this.toolRun = { key, name: last.name, resultIdentity, count: 1 };
      }
    }

    // 助手消息模式
    if (assistantMessages && assistantMessages.length > 0) {
      const lastMsg = assistantMessages[assistantMessages.length - 1];
      const text = lastMsg.text;
      if (text && text === this.lastAssistantText) {
        this.sameTextRun += 1;
      } else {
        this.lastAssistantText = text || "";
        this.sameTextRun = 1;
      }
      if (text && text.length < this.shortCharLimit) {
        this.shortRun += 1;
      } else {
        this.shortRun = 0;
      }
    }
  }

  /**
   * 检测是否空转。返回检测结果和模式描述。
   */
  checkLoop() {
    if (this.toolRun && this.toolRun.count >= this.toolRepeatThreshold) {
      return {
        stuck: true,
        pattern: `工具「${this.toolRun.name}」连续 ${this.toolRun.count} 次使用相同参数并获得相同结果`,
        type: "tool-repeat",
      };
    }
    if (this.shortRun >= this.shortCountThreshold) {
      return {
        stuck: true,
        pattern: `连续 ${this.shortRun} 次输出短句且无实质进展，可能空转`,
        type: "short-spin",
      };
    }
    if (this.sameTextRun >= this.textRepeatThreshold) {
      return {
        stuck: true,
        pattern: `连续 ${this.sameTextRun} 次输出相同文本，可能陷入循环`,
        type: "text-repeat",
      };
    }
    return { stuck: false, pattern: null, type: null };
  }

  /**
   * 获取上一步工具调用的状态，供幂等护栏使用。
   */
  lastToolState() {
    return this.lastToolCall;
  }
}
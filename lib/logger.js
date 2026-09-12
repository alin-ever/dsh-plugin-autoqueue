/**
 * 轻量日志 — 追加写入 queueDir/autoqueue.log，避免污染 DSH 主进程 stdout/stderr。
 * @module autoqueue/logger
 */
import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { getQueueDir } from "./files.js";

function write(level, ...args) {
  const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;
  try {
    appendFileSync(join(getQueueDir(), "autoqueue.log"), line, { encoding: "utf8" });
  } catch {
    // 静默丢弃，避免递归错误或污染 stdout
  }
}

export const logger = {
  info: (...args) => write("INFO", ...args),
  warn: (...args) => write("WARN", ...args),
  error: (...args) => write("ERROR", ...args),
};

/**
 * 轻量日志 — 追加写入 queueDir/autoqueue.log，避免污染 DSH 主进程 stdout/stderr。
 * 支持按天轮转和多行消息压成单行。
 * @module autoqueue/logger
 */
import { appendFileSync, existsSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { getQueueDir } from "./files.js";

const MAX_LOG_SIZE = 50 * 1024 * 1024;
let lastLogDate = "";

function rotateIfNeeded() {
  const queueDir = getQueueDir();
  const current = join(queueDir, "autoqueue.log");
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

  if (lastLogDate && lastLogDate !== date && existsSync(current)) {
    try { renameSync(current, join(queueDir, `autoqueue-${lastLogDate}.log`)); } catch {}
  }
  lastLogDate = date;

  try {
    if (existsSync(current) && statSync(current).size > MAX_LOG_SIZE) {
      try { renameSync(current, join(queueDir, `autoqueue-${date}-${Date.now()}.log`)); } catch {}
    }
  } catch {}

  return current;
}

function write(level, ...args) {
  const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  // 多行消息压成单行，避免破坏日志格式
  const singleLine = msg.replace(/\r?\n/g, "\\n");
  const line = `[${new Date().toISOString()}] [${level}] ${singleLine}\n`;
  try {
    appendFileSync(rotateIfNeeded(), line, { encoding: "utf8" });
  } catch {
    // 静默丢弃，避免递归错误或污染 stdout
  }
}

export const logger = {
  info: (...args) => write("INFO", ...args),
  warn: (...args) => write("WARN", ...args),
  error: (...args) => write("ERROR", ...args),
};

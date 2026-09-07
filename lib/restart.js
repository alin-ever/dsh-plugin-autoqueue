/**
 * 自重启：脱离当前进程，启动一个完全相同的 DSH 实例
 * 从 dshmarket 的 restart.js 移植，适配 autoqueue 上下文
 * @module autoqueue/restart
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";

// ─── 启动信息捕获 ──────────────────────────────────────

function nodeExecutable() {
  if (process.argv0 && isAbsolute(process.argv0) && existsSync(process.argv0))
    return process.argv0;
  return process.execPath;
}

function restartLaunch() {
  // 始终使用 dsh 命令重启，避免 node/bin.js 路径在 PowerShell 包装中丢失参数
  const args = [...process.argv.slice(2)];
  if (!args.includes("--no-open")) args.push("--no-open");
  return {
    file: "dsh",
    args,
    cwd: process.cwd(),
    viaShell: process.platform === "win32",
  };
}

// ─── 平台正确的 spawn 参数 ──────────────────────────────

function respawnInvocation(launch) {
  if (process.platform !== "win32") {
    return { file: launch.file, args: launch.args, viaShell: launch.viaShell, detached: true };
  }
  // Windows: 用 PowerShell 隐藏窗口包装，避免弹出控制台
  const quote = (part) => `'${part.replace(/'/g, "''")}'`;
  const file = launch.viaShell && !/\.(?:cmd|bat)$/iu.test(launch.file)
    ? `${launch.file}.cmd`
    : launch.file;
  return {
    file: "powershell.exe",
    args: ["-NoProfile", "-WindowStyle", "Hidden", "-Command",
      [`& ${quote(file)}`, ...launch.args.map(quote)].join(" ")],
    viaShell: false,
    detached: false,
  };
}

// ─── 脱离进程的 helper 脚本 ─────────────────────────────

function restartHelperSource(spawned, launch, logs, port) {
  return [
    "const { spawn } = require('node:child_process')",
    "const fs = require('node:fs')",
    "const net = require('node:net')",
    `const file = ${JSON.stringify(spawned.file)}`,
    `const args = ${JSON.stringify(spawned.args)}`,
    `const cwd = ${JSON.stringify(launch.cwd)}`,
    `const viaShell = ${JSON.stringify(spawned.viaShell)}`,
    `const detached = ${JSON.stringify(spawned.detached)}`,
    `const logOut = ${JSON.stringify(logs.out)}`,
    `const logErr = ${JSON.stringify(logs.err)}`,
    `const port = ${JSON.stringify(port)}`,
    "const sleep = (ms) => new Promise(r => setTimeout(r, ms))",
    "const note = (line) => { try { fs.appendFileSync(logErr, `[autoqueue] ${line}\\n`) } catch {} }",
    "const listening = () => new Promise((resolve) => {",
    "  const probe = net.connect({ host: '127.0.0.1', port })",
    "  const done = (value) => { probe.destroy(); resolve(value) }",
    "  probe.on('connect', () => done(true))",
    "  probe.on('error', () => done(false))",
    "  setTimeout(() => done(false), 500)",
    "})",
    "const main = async () => {",
    "  if (port) {",
    "    const until = Date.now() + 30000",
    "    while (Date.now() < until && await listening()) await sleep(250)",
    "    if (await listening()) note(`port ${port} was still in use after 30s; starting anyway`)",
    "    await sleep(300)",
    "  } else {",
    "    await sleep(1500)",
    "  }",
    "  let child",
    "  try {",
    "    const out = fs.openSync(logOut, 'a')",
    "    const err = fs.openSync(logErr, 'a')",
    "    child = spawn(file, args, { cwd, detached, stdio: ['ignore', out, err], env: process.env, shell: viaShell, windowsHide: true })",
    "    child.on('error', (error) => note(`could not start the replacement: ${error && error.message ? error.message : error}`))",
    "    child.unref()",
    "  } catch (error) {",
    "    note(`could not start the replacement: ${error && error.message ? error.message : error}`)",
    "    return",
    "  }",
    "  if (!port) { await sleep(3000); return }",
    "  const upBy = Date.now() + 20000",
    "  while (Date.now() < upBy && !(await listening())) await sleep(500)",
    "  if (!(await listening())) note(`the replacement did not bind port ${port} within 20s — see the output log beside this one`)",
    "}",
    "main()",
  ].join("\n");
}

// ─── 公开 API ──────────────────────────────────────────

/**
 * 安排重启：写 helper 脚本 → 脱离 spawn → 500ms 后终止当前进程
 * @param {number|null} port - 当前服务端口，用于 helper 等待释放
 */
export function scheduleRestart(port = null) {
  const launch = restartLaunch();
  const spawned = respawnInvocation(launch);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logOut = join(tmpdir(), `dsh-autoqueue-restart-${stamp}.out.log`);
  const logErr = join(tmpdir(), `dsh-autoqueue-restart-${stamp}.err.log`);

  const helper = spawn(nodeExecutable(), ["-e", restartHelperSource(spawned, launch, { out: logOut, err: logErr }, port)], {
    detached: true,
    stdio: "ignore",
    env: process.env,
    windowsHide: true,
  });
  helper.unref();
  setTimeout(() => process.kill(process.pid, "SIGTERM"), 500);
  return { pid: process.pid, helperPid: helper.pid, logOut, logErr };
}
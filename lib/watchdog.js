/**
 * DSH 进程守护（watchdog）
 *
 * 设计原则：
 * - 手动退出（exitCode === 0 或 graceful 标志）→ 不重启，watchdog 停止
 * - 异常退出（exitCode !== 0）→ 自动拉起 DSH
 * - 拉起失败后记录失败状态，供下次 DSH 启动时提示用户
 * - watchdog 本身以 detached 进程运行，独立于 DSH
 * - 跨平台：Windows / macOS / Linux
 *
 * @module autoqueue/watchdog
 */
import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WATCHDOG_PID_FILE = join(tmpdir(), "dsh-autoqueue-watchdog.pid");
const GRACEFUL_FLAG = join(tmpdir(), "dsh-autoqueue-watchdog-graceful.flag");
const SESSION_FILE = join(tmpdir(), "dsh-autoqueue-watchdog-session.json");
const FAILURE_FILE = join(tmpdir(), "dsh-autoqueue-watchdog-failure.json");

const __dirname = dirname(fileURLToPath(import.meta.url));
const WATCHDOG_TASK_NAME = "DSH-Watchdog";

// ─── macOS / Linux 开机自启常量 ────────────────────────

const MACOS_PLIST_LABEL = "com.dsh.autoqueue.watchdog";
const MACOS_PLIST_PATH = join(homedir(), "Library/LaunchAgents", `${MACOS_PLIST_LABEL}.plist`);
const LINUX_SERVICE_NAME = "dsh-watchdog";
const LINUX_SERVICE_PATH = join(homedir(), ".config/systemd/user", `${LINUX_SERVICE_NAME}.service`);

// ─── 启动信息捕获（复用 restart.js 逻辑）─────────────────

function nodeExecutable() {
  if (process.argv0 && isAbsolute(process.argv0) && existsSync(process.argv0))
    return process.argv0;
  return process.execPath;
}

// ─── watchdog 脚本源码（作为独立进程运行）───────────────

function buildWatchdogSource(config) {
  const maxRetries = config.maxRetries ?? 5;
  const backoffSeconds = config.backoffSeconds ?? 3;
  // 捕获外部进程的 DSH 启动参数，内嵌脚本无法访问原始 argv
  const originalArgs = JSON.stringify([...process.argv.slice(2)]);

  return `
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PID_FILE = ${JSON.stringify(WATCHDOG_PID_FILE)};
const GRACEFUL_FLAG = ${JSON.stringify(GRACEFUL_FLAG)};
const SESSION_FILE = ${JSON.stringify(SESSION_FILE)};
const FAILURE_FILE = ${JSON.stringify(FAILURE_FILE)};
const MAX_RETRIES = ${maxRetries};
const BACKOFF_SECONDS = ${backoffSeconds};

function log(line) {
  const ts = new Date().toISOString();
  console.log('[watchdog] ' + line);
  try {
    fs.appendFileSync(PID_FILE.replace('.pid', '.log'), '[' + ts + '] ' + line + '\\n');
  } catch {}
}

function readSession() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  } catch { return null; }
}

function writeSession(data) {
  try { fs.writeFileSync(SESSION_FILE, JSON.stringify(data)); } catch {}
}

function recordFailure(reason) {
  try {
    fs.writeFileSync(FAILURE_FILE, JSON.stringify({
      failed: true,
      reason: reason || 'unknown',
      failedAt: new Date().toISOString(),
    }));
  } catch {}
}

function clearFailure() {
  try { if (fs.existsSync(FAILURE_FILE)) fs.unlinkSync(FAILURE_FILE); } catch {}
}

function clearGracefulFlag() {
  try { if (fs.existsSync(GRACEFUL_FLAG)) fs.unlinkSync(GRACEFUL_FLAG); } catch {}
}

function launchConfig() {
  const args = [...${originalArgs}];
  if (!args.includes('--no-open')) args.push('--no-open');
  const viaShell = process.platform === 'win32';
  if (process.platform !== 'win32') {
    return { file: 'dsh', args, cwd: process.cwd(), viaShell, detached: true };
  }
  const quote = (p) => "'" + p.replace(/'/g, "''") + "'";
  const f = viaShell && !/\\.(?:cmd|bat)$/iu.test('dsh') ? 'dsh.cmd' : 'dsh';
  return {
    file: 'powershell.exe',
    args: ['-NoProfile', '-WindowStyle', 'Hidden', '-Command',
      ['& ' + quote(f), ...args.map(quote)].join(' ')],
    cwd: process.cwd(),
    viaShell: false,
    detached: false,
  };
}

let retries = 0;

function validateDshProcess(pid) {
  try {
    const { execSync } = require('node:child_process');
    if (process.platform === 'win32') {
      const name = execSync('powershell -NoProfile -Command "(Get-Process -Id ' + pid + ' -ErrorAction SilentlyContinue).ProcessName"', { encoding: 'utf8', timeout: 3000 }).trim().toLowerCase();
      return name.includes('node') || name.includes('dsh');
    } else {
      const name = execSync('ps -p ' + pid + ' -o comm= 2>/dev/null', { encoding: 'utf8', timeout: 3000 }).trim().toLowerCase();
      return name.includes('node') || name.includes('dsh');
    }
  } catch { return false; }
}

function killPortOccupier(port) {
  try {
    const { execSync } = require('node:child_process');
    let pids = [];
    if (process.platform === 'win32') {
      const cmd = 'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ' + port + ' -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne 0 } | Select-Object -ExpandProperty OwningProcess -Unique"';
      const stdout = execSync(cmd, { encoding: 'utf8', timeout: 10000 }).trim();
      if (!stdout) return;
      pids = stdout.split('\\r\\n').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n !== process.pid);
    } else {
      const cmd = 'lsof -ti:' + port;
      const stdout = execSync(cmd, { encoding: 'utf8', timeout: 10000 }).trim();
      if (!stdout) return;
      pids = stdout.split('\\n').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n !== process.pid);
    }
    for (const pid of pids) {
      try {
        process.kill(pid, 0);
        if (!validateDshProcess(pid)) {
          log('Skipping non-DSH process ' + pid + ' on port ' + port);
          continue;
        }
        process.kill(pid, 'SIGTERM');
        log('Killed process ' + pid + ' occupying port ' + port);
      } catch (e) {}
    }
  } catch (e) {}
}

function waitForPortRelease(port, timeoutMs = 60000) {
  return new Promise((resolve) => {
    const start = Date.now();
    function check() {
      const server = require('node:net').createServer();
      server.once('error', (err) => {
        server.close();
        if (err.code === 'EADDRINUSE') {
          if (Date.now() - start > timeoutMs) {
            resolve(false);
            return;
          }
          setTimeout(check, 3000);
        } else {
          resolve(true);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port, '127.0.0.1');
    }
    check();
  });
}

function isDshAlive() {
  return new Promise((resolve) => {
    const req = require('node:http').get('http://127.0.0.1:3080/api/queue/watchdog', (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

let monitorInterval = null;

function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

async function monitorDsh() {
  log('Entering monitor mode...');
  monitorInterval = setInterval(async () => {
    const alive = await isDshAlive();
    if (!alive) {
      stopMonitoring();
      // graceful 标志由 stopWatchdog() 在 DSH 退出前写入，无需长时间等待
      // 仅给 50ms 文件系统同步缓冲
      await new Promise(r => setTimeout(r, 50));
      const wasGraceful = fs.existsSync(GRACEFUL_FLAG);
      if (wasGraceful) {
        clearGracefulFlag();
        log('DSH exited normally. Watchdog stopping.');
        try { fs.unlinkSync(PID_FILE); } catch {}
        process.exit(0);
      }
      log('DSH stopped unexpectedly. Cleaning up...');
      killPortOccupier(3080);
      run();
    }
  }, 5000);
}

async function run() {
  stopMonitoring();
  clearGracefulFlag();
  clearFailure();
  retries++;

  // 无论第几次运行，先检查 DSH 是否已经在运行（可能被其他机制如 restart helper 重启）
  const dshAlive = await isDshAlive();
  if (dshAlive) {
    log('DSH is already running. Entering monitor mode.');
    monitorDsh();
    return;
  }

  // 等待 3080 端口释放（旧 DSH 进程或残留子进程可能还在占用）
  const portFree = await waitForPortRelease(3080);
  if (!portFree) {
    log('Port 3080 still in use after timeout. Retry later.');
    if (retries >= MAX_RETRIES) {
      recordFailure('Port 3080 still in use after timeout');
      try { fs.unlinkSync(PID_FILE); } catch {}
      process.exit(1);
    }
    const delay = Math.min(BACKOFF_SECONDS * Math.pow(2, retries - 1), 30);
    log('Restarting in ' + delay + 's...');
    setTimeout(run, delay * 1000);
    return;
  }

  const launch = launchConfig();
  log('Starting DSH (attempt ' + retries + '/' + MAX_RETRIES + ')');

  const child = spawn(launch.file, launch.args, {
    cwd: launch.cwd,
    detached: launch.detached,
    stdio: ['ignore', 'ignore', 'pipe'],
    env: process.env,
    shell: false,
    windowsHide: true,
  });

  if (child.stderr) {
    child.stderr.on('data', (data) => {
      log('DSH stderr: ' + data.toString().trim());
    });
  }

  writeSession({ pid: child.pid, startTime: Date.now(), stopRequested: false });

  child.on('exit', (code, signal) => {
    // 给主进程短暂窗口写 graceful 标志
    setTimeout(() => {
      stopMonitoring();
      const session = readSession();
      const wasGraceful = fs.existsSync(GRACEFUL_FLAG);
      if (wasGraceful) clearGracefulFlag();

      const isNormalExit = (code === 0 && !signal) || wasGraceful;

      if (!isNormalExit) {
        log('DSH crashed, cleaning up port occupiers...');
        killPortOccupier(3080);
      }

      if (isNormalExit) {
        log('DSH exited normally (code=' + code + ', signal=' + signal + '). Watchdog stopping.');
        try { fs.unlinkSync(PID_FILE); } catch {}
        process.exit(0);
      }

      if (retries >= MAX_RETRIES) {
        const reason = 'DSH crashed ' + MAX_RETRIES + ' times (last code=' + code + ', signal=' + signal + ')';
        log(reason + '. Giving up.');
        recordFailure(reason);
        try { fs.unlinkSync(PID_FILE); } catch {}
        process.exit(1);
      }

      const delay = Math.min(BACKOFF_SECONDS * Math.pow(2, retries - 1), 30);
      log('DSH crashed (code=' + code + ', signal=' + signal + '). Restarting in ' + delay + 's...');
      setTimeout(run, delay * 1000);
    }, 500);
  });

  child.on('error', (err) => {
    stopMonitoring();
    const errMsg = err?.message || String(err);
    log('Failed to spawn DSH: ' + errMsg);
    if (retries >= MAX_RETRIES) {
      recordFailure('Failed to spawn DSH: ' + errMsg);
      try { fs.unlinkSync(PID_FILE); } catch {}
      process.exit(1);
    }
    const delay = Math.min(BACKOFF_SECONDS * Math.pow(2, retries - 1), 30);
    setTimeout(run, delay * 1000);
  });
}

// 记录 watchdog PID
fs.writeFileSync(PID_FILE, JSON.stringify({ pid: process.pid, startTime: Date.now() }));
log('Watchdog started (pid=' + process.pid + ')');
run();
`;
}

// ─── 公开 API ──────────────────────────────────────────

/**
 * 以 detached 进程启动 watchdog。
 * 如果已有 watchdog 在运行，则跳过。
 */
export function startWatchdog(config = {}) {
  if (isWatchdogRunning()) {
    return { ok: false, error: "watchdog 已在运行" };
  }

  // 清理残留标志
  try {
    if (existsSync(GRACEFUL_FLAG)) unlinkSync(GRACEFUL_FLAG);
    if (existsSync(SESSION_FILE)) unlinkSync(SESSION_FILE);
  } catch {}

  const source = buildWatchdogSource(config);
  const helper = spawn(nodeExecutable(), ["-e", source], {
    detached: true,
    stdio: "ignore",
    env: process.env,
    windowsHide: true,
  });
  helper.unref();

  return { ok: true, pid: helper.pid };
}

/**
 * 请求 watchdog 停止（写 graceful 标志）。
 * watchdog 检测到后，DSH 下次退出时不再重启。
 */
export function stopWatchdog() {
  try {
    writeFileSync(GRACEFUL_FLAG, Date.now().toString());
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * 获取指定 PID 的进程启动时间（跨平台）。
 * 用于防止 PID 回收导致的假阳性。
 */
function getProcessStartTime(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try {
    if (process.platform === "win32") {
      const cmd = `powershell -NoProfile -Command "(Get-Process -Id ${pid} -ErrorAction SilentlyContinue).StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')"`;
      const stdout = execSync(cmd, { encoding: "utf8", timeout: 5000 }).trim();
      return new Date(stdout).getTime();
    } else {
      const stdout = execSync(`ps -p ${pid} -o lstart= 2>/dev/null`, { encoding: "utf8", timeout: 5000 }).trim();
      return new Date(stdout).getTime();
    }
  } catch {
    return null;
  }
}

/**
 * 检查 watchdog 进程是否存活。
 * 除 signal 0 探测外，还验证进程启动时间，防止 PID 回收假阳性。
 */
export function isWatchdogRunning() {
  if (!existsSync(WATCHDOG_PID_FILE)) return false;

  // 尝试读取新格式（JSON）
  try {
    const data = JSON.parse(readFileSync(WATCHDOG_PID_FILE, "utf8"));
    const pid = data.pid;
    const startTime = data.startTime;
    if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(startTime)) return false;
    process.kill(pid, 0);
    const actualStartTime = getProcessStartTime(pid);
    if (actualStartTime === null) return false;
    if (Math.abs(actualStartTime - startTime) > 10000) return false; // 10 秒容差
    return true;
  } catch {
    // 兼容旧格式（纯 PID 数字）
    try {
      const pid = parseInt(readFileSync(WATCHDOG_PID_FILE, "utf8"), 10);
      if (!Number.isInteger(pid) || pid <= 0) return false;
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 读取 watchdog 失败记录（供 DSH 启动时提示用户）。
 */
export function readWatchdogFailure() {
  try {
    if (existsSync(FAILURE_FILE)) {
      return JSON.parse(readFileSync(FAILURE_FILE, "utf8"));
    }
  } catch {}
  return null;
}

/**
 * 清除 watchdog 失败记录。
 */
export function clearWatchdogFailure() {
  try {
    if (existsSync(FAILURE_FILE)) unlinkSync(FAILURE_FILE);
  } catch {}
}

// ─── 跨平台开机自启 ────────────────────────────────────

function installScriptPath() {
  return join(__dirname, "..", "bin", "install-watchdog.ps1");
}

function escapeShellSingleQuote(str) {
  return str.replace(/'/g, "'\"'\"'");
}

function buildMacOSPlist() {
  const workingDir = process.cwd();
  const logDir = join(homedir(), "Library/Logs");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${MACOS_PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>-lc</string>
    <string>cd '${escapeShellSingleQuote(workingDir)}' &amp;&amp; exec dsh --no-open</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>${join(logDir, "dsh-watchdog.log")}</string>
  <key>StandardErrorPath</key>
  <string>${join(logDir, "dsh-watchdog.error.log")}</string>
</dict>
</plist>`;
}

function buildLinuxService() {
  const workingDir = process.cwd();
  return `[Unit]
Description=DSH Watchdog
After=network.target

[Service]
Type=simple
WorkingDirectory=${workingDir}
ExecStart=dsh --no-open
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target`;
}

// ─── macOS launchd ─────────────────────────────────────

function installMacOSWatchdog() {
  if (isWatchdogTaskInstalled()) return { ok: true, alreadyInstalled: true };
  try {
    const plist = buildMacOSPlist();
    const plistDir = dirname(MACOS_PLIST_PATH);
    if (!existsSync(plistDir)) mkdirSync(plistDir, { recursive: true });
    writeFileSync(MACOS_PLIST_PATH, plist, { encoding: "utf8", mode: 0o600 });
    execSync(`launchctl load -w "${MACOS_PLIST_PATH}"`, { encoding: "utf8", timeout: 10000, stdio: "pipe" });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.stderr?.toString?.() || err.message || "macOS 安装失败" };
  }
}

function uninstallMacOSWatchdog() {
  if (!isWatchdogTaskInstalled()) return { ok: true, alreadyUninstalled: true };
  try {
    execSync(`launchctl unload -w "${MACOS_PLIST_PATH}"`, { encoding: "utf8", timeout: 10000, stdio: "pipe" });
    if (existsSync(MACOS_PLIST_PATH)) unlinkSync(MACOS_PLIST_PATH);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.stderr?.toString?.() || err.message || "macOS 卸载失败" };
  }
}

// ─── Linux systemd ─────────────────────────────────────

function installLinuxWatchdog() {
  if (isWatchdogTaskInstalled()) return { ok: true, alreadyInstalled: true };
  try {
    const service = buildLinuxService();
    const serviceDir = dirname(LINUX_SERVICE_PATH);
    if (!existsSync(serviceDir)) mkdirSync(serviceDir, { recursive: true });
    writeFileSync(LINUX_SERVICE_PATH, service, { encoding: "utf8", mode: 0o600 });
    execSync("systemctl --user daemon-reload", { encoding: "utf8", timeout: 10000, stdio: "pipe" });
    execSync(`systemctl --user enable --now ${LINUX_SERVICE_NAME}`, { encoding: "utf8", timeout: 10000, stdio: "pipe" });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.stderr?.toString?.() || err.message || "Linux 安装失败" };
  }
}

function uninstallLinuxWatchdog() {
  if (!isWatchdogTaskInstalled()) return { ok: true, alreadyUninstalled: true };
  try {
    execSync(`systemctl --user disable --now ${LINUX_SERVICE_NAME}`, { encoding: "utf8", timeout: 10000, stdio: "pipe" });
    if (existsSync(LINUX_SERVICE_PATH)) unlinkSync(LINUX_SERVICE_PATH);
    execSync("systemctl --user daemon-reload", { encoding: "utf8", timeout: 10000, stdio: "pipe" });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.stderr?.toString?.() || err.message || "Linux 卸载失败" };
  }
}

// ─── 统一入口 ──────────────────────────────────────────

/**
 * 检查当前平台是否已安装 watchdog 开机自启任务。
 */
export function isWatchdogTaskInstalled() {
  if (process.platform === "win32") {
    try {
      execSync(
        `powershell -NoProfile -Command "Get-ScheduledTask -TaskName '${WATCHDOG_TASK_NAME}' -ErrorAction SilentlyContinue | Out-Null; $?"`,
        { encoding: "utf8", timeout: 5000, stdio: "pipe" },
      );
      return true;
    } catch {
      return false;
    }
  }
  if (process.platform === "darwin") {
    try {
      execSync(`launchctl list ${MACOS_PLIST_LABEL}`, { encoding: "utf8", timeout: 5000, stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }
  if (process.platform === "linux") {
    try {
      execSync(`systemctl --user is-enabled ${LINUX_SERVICE_NAME}`, { encoding: "utf8", timeout: 5000, stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 将 watchdog 安装为当前平台的开机自启任务。
 * Windows: 任务计划程序；macOS: launchd；Linux: systemd。
 */
export function installWatchdogStartup() {
  if (process.platform === "win32") {
    if (isWatchdogTaskInstalled()) return { ok: true, alreadyInstalled: true };
    try {
      const script = installScriptPath();
      const output = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}"`,
        { encoding: "utf8", timeout: 30000, stdio: "pipe" },
      );
      return { ok: true, output: output.trim() };
    } catch (err) {
      return { ok: false, error: err.stderr?.toString?.() || err.message || "安装失败" };
    }
  }
  if (process.platform === "darwin") return installMacOSWatchdog();
  if (process.platform === "linux") return installLinuxWatchdog();
  return { ok: false, error: `开机自启暂不支持平台: ${process.platform}` };
}

/**
 * 卸载当前平台的 watchdog 开机自启任务。
 */
export function uninstallWatchdogStartup() {
  if (process.platform === "win32") {
    if (!isWatchdogTaskInstalled()) return { ok: true, alreadyUninstalled: true };
    try {
      const script = installScriptPath();
      const output = execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -Uninstall`,
        { encoding: "utf8", timeout: 30000, stdio: "pipe" },
      );
      return { ok: true, output: output.trim() };
    } catch (err) {
      return { ok: false, error: err.stderr?.toString?.() || err.message || "卸载失败" };
    }
  }
  if (process.platform === "darwin") return uninstallMacOSWatchdog();
  if (process.platform === "linux") return uninstallLinuxWatchdog();
  return { ok: false, error: `开机自启暂不支持平台: ${process.platform}` };
}

/**
 * 获取 watchdog 状态信息。
 */
export function getWatchdogStatus() {
  const running = isWatchdogRunning();
  let session = null;
  let failure = null;
  try {
    if (existsSync(SESSION_FILE)) {
      session = JSON.parse(readFileSync(SESSION_FILE, "utf8"));
    }
  } catch {}
  try {
    if (existsSync(FAILURE_FILE)) {
      failure = JSON.parse(readFileSync(FAILURE_FILE, "utf8"));
    }
  } catch {}
  return {
    running,
    startupInstalled: isWatchdogTaskInstalled(),
    session,
    failure,
  };
}

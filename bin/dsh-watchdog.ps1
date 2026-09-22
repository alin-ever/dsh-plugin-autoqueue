#Requires -Version 5.1
<#
.DESCRIPTION
  DSH 守护进程 —— Windows 任务计划程序专用 watchdog
  异常退出自动重启，手动退出正常停止。

.USAGE
  # 安装为计划任务（开机自动启动）
  .\bin\install-watchdog.ps1

  # 手动运行（前台，调试用）
  .\bin\dsh-watchdog.ps1

  # 请求优雅停止（不会触发重启）
  .\bin\dsh-watchdog.ps1 -Stop

.PARAMETER Stop
  向正在运行的 watchdog 发送停止请求，DSH 退出后不再重启。

.PARAMETER DshPath
  dsh 可执行文件路径，默认从 PATH 查找。

.PARAMETER DshArgs
  传递给 dsh 的额外参数。

.PARAMETER MaxRetries
  最大连续重启次数，默认 5。

.PARAMETER BackoffSeconds
  首次重启等待秒数，默认 3，每次翻倍，上限 30。
#>
[CmdletBinding()]
param(
  [switch]$Stop,
  [string]$DshPath = "",
  [string[]]$DshArgs = @("--no-open"),
  [int]$MaxRetries = 5,
  [int]$BackoffSeconds = 3
)

$ErrorActionPreference = "Stop"

# ─── 常量 ──────────────────────────────────────────────
$ScriptDir = Split-Path -Parent $PSScriptRoot
$FlagFile = Join-Path $env:LOCALAPPDATA "dsh-watchdog-stop.flag"
$LogDir = Join-Path $env:LOCALAPPDATA "dsh-watchdog-logs"
$LogFile = Join-Path $LogDir "watchdog-$(Get-Date -Format 'yyyyMMdd').log"

function Write-Log {
  param([string]$Message, [string]$Level = "INFO")
  $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $line = "[$ts] [$Level] $Message"
  Write-Host $line
  try {
    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }
    Add-Content -Path $LogFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue
  } catch {}
}

function Find-Dsh {
  if ($DshPath -and (Test-Path $DshPath)) { return $DshPath }
  $fromPath = Get-Command "dsh" -ErrorAction SilentlyContinue
  if ($fromPath) { return $fromPath.Source }
  # 常见安装位置回退
  $candidates = @(
    "$env:APPDATA\npm\dsh.cmd",
    "$env:LOCALAPPDATA\pnpm\dsh.cmd",
    "$env:ProgramFiles\nodejs\dsh.cmd"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }
  throw "找不到 dsh 可执行文件。请确保 dsh 在 PATH 中，或显式指定 -DshPath"
}

function Request-Stop {
  if (Test-Path $FlagFile) {
    Write-Log "停止标志已存在，watchdog 将在 DSH 下次退出后停止" "WARN"
    return
  }
  New-Item -ItemType File -Path $FlagFile -Force | Out-Null
  Write-Log "已创建停止标志。正在运行的 DSH 退出后 watchdog 将正常停止。" "INFO"
}

function Clear-StopFlag {
  if (Test-Path $FlagFile) {
    Remove-Item $FlagFile -Force -ErrorAction SilentlyContinue
  }
}

function Test-StopRequested {
  return Test-Path $FlagFile
}

# ─── 主逻辑 ────────────────────────────────────────────

if ($Stop) {
  Request-Stop
  exit 0
}

# 启动时清理残留标志
Clear-StopFlag

$dshExe = Find-Dsh
Write-Log "Watchdog 启动 | dsh=$dshExe | maxRetries=$MaxRetries | backoff=${BackoffSeconds}s"

$retries = 0
$running = $true

while ($running) {
  if (Test-StopRequested) {
    Write-Log "检测到停止标志，watchdog 正常退出" "INFO"
    Clear-StopFlag
    exit 0
  }

  $retries++
  try {
    Write-Log "启动 DSH (attempt $retries)" "INFO"

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $dshExe
    $psi.Arguments = $DshArgs -join " "
    $psi.WorkingDirectory = $ScriptDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi

    # 异步读取输出避免缓冲区阻塞
    $stdoutHandler = { param($s, $e) if ($e.Data) { Write-Log "[DSH-OUT] $($e.Data)" "DEBUG" } }
    $stderrHandler = { param($s, $e) if ($e.Data) { Write-Log "[DSH-ERR] $($e.Data)" "ERROR" } }
    Register-ObjectEvent -InputObject $proc -EventName OutputDataReceived -Action $stdoutHandler | Out-Null
    Register-ObjectEvent -InputObject $proc -EventName ErrorDataReceived -Action $stderrHandler | Out-Null

    [void]$proc.Start()
    $proc.BeginOutputReadLine()
    $proc.BeginErrorReadLine()

    Write-Log "DSH PID=$($proc.Id) 已启动" "INFO"

    # 等待进程退出
    while (-not $proc.HasExited) {
      Start-Sleep -Milliseconds 500
      if (Test-StopRequested) {
        Write-Log "收到停止请求，正在终止 DSH (PID=$($proc.Id))..." "INFO"
        try { $proc.Kill() } catch { Write-Log "终止 DSH 失败: $_" "WARN" }
        # 等待进程真正退出
        $proc.WaitForExit(5000) | Out-Null
        break
      }
    }

    $exitCode = if ($proc.HasExited) { $proc.ExitCode } else { -1 }
    Write-Log "DSH 已退出，exitCode=$exitCode" "INFO"

    # 正常退出 (0) 或收到停止请求 → 不重启
    if ($exitCode -eq 0 -or (Test-StopRequested)) {
      Write-Log "DSH 正常退出或收到停止请求，watchdog 停止" "INFO"
      Clear-StopFlag
      exit 0
    }

    # 超过最大重试次数
    if ($retries -ge $MaxRetries) {
      Write-Log "DSH 已连续崩溃 $MaxRetries 次，watchdog 放弃重启" "FATAL"
      exit 1
    }

    # 指数退避
    $delay = [Math]::Min($BackoffSeconds * [Math]::Pow(2, $retries - 1), 30)
    Write-Log "DSH 异常退出 (code=$exitCode)，${delay}秒后第 $($retries + 1) 次重启..." "WARN"
    Start-Sleep -Seconds $delay

  } catch {
    Write-Log "Watchdog 异常: $_" "FATAL"
    if ($retries -ge $MaxRetries) { exit 1 }
    Start-Sleep -Seconds $BackoffSeconds
  }
}

#Requires -Version 5.1
<#
.DESCRIPTION
  将 DSH watchdog 安装为 Windows 任务计划程序任务。
  支持开机自动启动、异常崩溃自动重启、手动停止后不重启。

.USAGE
  # 默认安装（当前用户，开机启动）
  .\bin\install-watchdog.ps1

  # 卸载
  .\bin\install-watchdog.ps1 -Uninstall

  # 系统级安装（所有用户，需管理员权限）
  .\bin\install-watchdog.ps1 -System

.PARAMETER Uninstall
  卸载已安装的任务计划程序任务。

.PARAMETER System
  安装为系统级任务（所有用户），需要管理员权限运行 PowerShell。

.PARAMETER TaskName
  任务名称，默认 "DSH-Watchdog"。
#>
[CmdletBinding()]
param(
  [switch]$Uninstall,
  [switch]$System,
  [switch]$Force,
  [string]$TaskName = "DSH-Watchdog",
  [string]$DshPath = ""
)

$ErrorActionPreference = "Stop"

$WatchdogScript = Join-Path $PSScriptRoot "dsh-watchdog.ps1"
if (-not (Test-Path $WatchdogScript)) {
  throw "找不到 watchdog 脚本: $WatchdogScript"
}

# 兼容 Windows PowerShell 5.1 与 PowerShell 7+
function Get-ScheduledTaskCompat {
  param([string]$Name)
  try { return Get-ScheduledTask -TaskName $Name -ErrorAction Stop } catch { return $null }
}
function Unregister-ScheduledTaskCompat {
  param([string]$Name, [switch]$Confirm)
  try { Unregister-ScheduledTask -TaskName $Name -Confirm:$Confirm -ErrorAction Stop } catch {}
}

function Find-Dsh {
  if ($DshPath -and (Test-Path $DshPath)) { return $DshPath }

  # 1) 优先按可执行文件名查找
  $fromPath = Get-Command "dsh.cmd" -ErrorAction SilentlyContinue
  if ($fromPath) { return $fromPath.Source }

  $fromPath = Get-Command "dsh.exe" -ErrorAction SilentlyContinue
  if ($fromPath) { return $fromPath.Source }

  # 2) 遍历 Get-Command dsh -All，过滤出真正可执行的 Application
  $all = Get-Command "dsh" -All -ErrorAction SilentlyContinue
  if ($all) {
    foreach ($cmd in $all) {
      if ($cmd.CommandType -eq "Application") {
        $src = $cmd.Source
        if ($src -match '\.(cmd|bat|exe)$') { return $src }
        if ($src -match '\.(ps1|sh)$') { continue }
        if ($src -notmatch '\.') { continue }
      }
    }
  }

  # 3) 常见安装位置回退
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

# ─── 卸载 ──────────────────────────────────────────────
if ($Uninstall) {
  $existing = Get-ScheduledTaskCompat $TaskName
  if ($existing) {
    Unregister-ScheduledTaskCompat $TaskName -Confirm:$false
    Write-Host "已卸载任务: $TaskName" -ForegroundColor Green
  } else {
    Write-Host "任务不存在: $TaskName" -ForegroundColor Yellow
  }

  # 同时清理停止标志，避免残留
  $flag = Join-Path $env:LOCALAPPDATA "dsh-watchdog-stop.flag"
  if (Test-Path $flag) { Remove-Item $flag -Force }
  exit 0
}

# ─── 检查是否已存在 ────────────────────────────────────
$existing = Get-ScheduledTaskCompat $TaskName
if ($existing -and -not $Force) {
  Write-Host "任务 '$TaskName' 已存在。如需重新安装，请使用 -Force 参数或先运行: .\bin\install-watchdog.ps1 -Uninstall" -ForegroundColor Yellow
  exit 1
}

# 解析 dsh 路径（注册时写死，避免运行时探测出错）
$resolvedDshPath = Find-Dsh

# ─── 构建触发器与设置 ──────────────────────────────────
# 开机启动（系统级用 SYSTEM，用户级用当前用户登录）
if ($System) {
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  $trigger = New-ScheduledTaskTrigger -AtStartup
} else {
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
  $trigger = New-ScheduledTaskTrigger -AtLogon -User "$env:USERDOMAIN\$env:USERNAME"
}

# 操作：隐藏窗口运行 PowerShell watchdog（Once 模式：只负责首次启动，持续监控由插件内 JS watchdog 负责）
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$WatchdogScript`" -Once -DshPath `"$resolvedDshPath`""

# 设置：异常退出后自动重启（由 watchdog 脚本自己控制，这里设得宽松一些）
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -Hidden `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0 -Minutes 0)  # 不限制运行时间

# 注册任务
Register-ScheduledTask `
  -TaskName $TaskName `
  -Trigger $trigger `
  -Action $action `
  -Settings $settings `
  -Principal $principal `
  -Description "DSH 守护进程：异常退出自动重启，手动退出正常停止。`n安装路径: $WatchdogScript`ndsh路径: $resolvedDshPath" `
  -Force | Out-Null

Write-Host ""
Write-Host "任务 '$TaskName' 安装成功!" -ForegroundColor Green
Write-Host ""
Write-Host "  启动方式: $(if ($System) { '系统启动' } else { '用户登录' })"
Write-Host "  Watchdog: $WatchdogScript"
Write-Host "  日志目录: $env:LOCALAPPDATA\dsh-watchdog-logs"
Write-Host ""
Write-Host "常用命令:" -ForegroundColor Cyan
Write-Host "  启动任务 : Start-ScheduledTask -TaskName '$TaskName'"
Write-Host "  停止任务 : Stop-ScheduledTask  -TaskName '$TaskName'"
Write-Host "  查看状态 : Get-ScheduledTask    -TaskName '$TaskName'"
Write-Host "  查看日志 : Get-Content '$env:LOCALAPPDATA\dsh-watchdog-logs\watchdog-$(Get-Date -Format 'yyyyMMdd').log' -Tail 20"
Write-Host "  卸载     : .\bin\install-watchdog.ps1 -Uninstall"
Write-Host ""
Write-Host "优雅停止 DSH（不触发重启）:" -ForegroundColor Cyan
Write-Host "  powershell -File $WatchdogScript -Stop"
Write-Host ""

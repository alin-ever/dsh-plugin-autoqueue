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
  [string]$TaskName = "DSH-Watchdog"
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
if ($existing) {
  Write-Host "任务 '$TaskName' 已存在。如需重新安装，请先运行: .\bin\install-watchdog.ps1 -Uninstall" -ForegroundColor Yellow
  exit 1
}

# ─── 构建触发器与设置 ──────────────────────────────────
# 开机启动（系统级用 SYSTEM，用户级用当前用户登录）
if ($System) {
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  $trigger = New-ScheduledTaskTrigger -AtStartup
} else {
  $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest
  $trigger = New-ScheduledTaskTrigger -AtLogon -User "$env:USERDOMAIN\$env:USERNAME"
}

# 操作：隐藏窗口运行 PowerShell watchdog
$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$WatchdogScript`""

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
  -Description "DSH 守护进程：异常退出自动重启，手动退出正常停止。`n安装路径: $WatchdogScript" `
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

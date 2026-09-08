# restart-dsh.ps1 — 独立于 DSH 进程的停+启脚本
# 用法: pwsh -File restart-dsh.ps1
$ErrorActionPreference = "Stop"

$dshHome = "C:\Users\admin\.dsh"
$profile = "web"
$port = 3080

Write-Host "=== DSH 重启脚本 ==="
Write-Host "DSH_HOME: $dshHome"
Write-Host "Profile: $profile"
Write-Host "Port: $port"

# 1. 停止旧进程（通过端口查找 PID）
Write-Host "`n[1/3] 停止旧 DSH 进程..."
$dshPid = $null
try {
    $netstat = netstat -ano 2>$null | Select-String ":$port .*LISTENING"
    if ($netstat) {
        $dshPid = [int]($netstat -split '\s+')[-1]
        $proc = Get-Process -Id $dshPid -ErrorAction Stop
        $proc.Kill()
        Write-Host "  已终止 PID $dshPid"
    } else {
        Write-Host "  没有找到监听 $port 的进程"
    }
} catch {
    Write-Host "  进程已不存在或无法终止: $_"
}

# 2. 等待端口释放
Write-Host "`n[2/3] 等待端口 $port 释放..."
$maxWait = 30
for ($i = 0; $i -lt $maxWait; $i++) {
    $listening = netstat -ano 2>$null | Select-String ":$port " | Select-String "LISTENING"
    if (-not $listening) {
        Write-Host "  端口已释放 (等待 $i 秒)"
        break
    }
    Start-Sleep 1
}
if ($i -ge $maxWait) {
    Write-Host "  警告: 端口未在 ${maxWait}s 内释放，继续尝试启动"
}

# 3. 启动新进程
Write-Host "`n[3/3] 启动新 DSH 进程..."
$env:DSH_HOME = $dshHome

$proc = Start-Process -FilePath "dsh" -ArgumentList "web" -NoNewWindow -PassThru

Write-Host "  新进程 PID: $($proc.Id)"
Write-Host "  等待 DSH 就绪..."

# 等待 API 就绪
$maxWait = 60
for ($i = 0; $i -lt $maxWait; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:${port}/api/queue/state" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        Write-Host "  DSH 已就绪！(等待 $i 秒)"
        Write-Host "  autoqueue state: $($r.StatusCode)"
        break
    } catch {
        # 还没就绪，继续等
    }
    Start-Sleep 1
}
if ($i -ge $maxWait) {
    Write-Host "  警告: DSH 未在 ${maxWait}s 内就绪，请手动检查 http://127.0.0.1:${port}"
} else {
    Write-Host "`n=== 重启完成 ==="
    Write-Host "Web GUI: http://127.0.0.1:${port}"
    Write-Host "插件状态: http://127.0.0.1:${port}/api/queue/state"
}
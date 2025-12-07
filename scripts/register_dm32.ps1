# 说明：使用 32 位注册器 SysWOW64\regsvr32.exe 注册指定的 32 位 DLL（默认 src\lib\dm.dll）
# 中文注释仅在代码中；终端输出使用 ASCII，减少乱码风险。

param(
    [string]$DllPath = "src\lib\dm.dll"
)

# 获取 SystemRoot（中文说明：若环境变量缺失则回退到 C:\Windows）
$SystemRoot = $env:SystemRoot
if (-not $SystemRoot) { $SystemRoot = "C:\\Windows" }

$Regsvr32x86 = Join-Path $SystemRoot "SysWOW64\regsvr32.exe"
if (-not (Test-Path $Regsvr32x86)) {
    Write-Host "[Error] 32-bit regsvr32 not found: $Regsvr32x86" -ForegroundColor Red
    exit 1
}

# 解析 DLL 路径，支持基于脚本目录的回退（中文说明：保证在不同工作目录下也能找到默认 DLL）
$FullPath = $null
if (Test-Path -Path $DllPath) {
    $FullPath = (Resolve-Path -Path $DllPath).Path
} else {
    $fallback = Join-Path $PSScriptRoot "..\src\lib\dm.dll"
    if (Test-Path -Path $fallback) { $FullPath = (Resolve-Path -Path $fallback).Path }
}
if (-not $FullPath) {
    Write-Host "[Error] DLL not found: $DllPath" -ForegroundColor Red
    exit 2
}

Write-Host ("[Info] DLL: " + $FullPath)
Write-Host ("[Info] Using: " + $Regsvr32x86)

# 执行注册（中文说明：尝试以管理员权限运行，UAC 弹窗请点击“是”）
$args = '"' + $FullPath + '"'
$proc = $null
$exitCode = 0
try {
    $proc = Start-Process -FilePath $Regsvr32x86 -ArgumentList $args -Verb RunAs -PassThru
    $proc.WaitForExit()
    $exitCode = $proc.ExitCode
} catch {}

if ($exitCode -eq 0) {
    Write-Host "[OK] regsvr32 returned success." -ForegroundColor Green
} else {
    Write-Host ("[Warn] regsvr32 exit code: " + $exitCode) -ForegroundColor Yellow
    Write-Host "[Hint] If UAC was denied, run PowerShell as Administrator." -ForegroundColor Yellow
}

# 验证注册（中文说明：检查 HKCR\dm.dmsoft 是否存在）
$exists = $false
try { $exists = Test-Path -Path "Registry::HKEY_CLASSES_ROOT\dm.dmsoft" } catch { $exists = $false }
Write-Host ("[Check] Registry present: " + $exists)

if ($exists) {
    Write-Host "[OK] dm.dmsoft registered in HKCR." -ForegroundColor Green
    exit 0
} else {
    Write-Host "[Warn] dm.dmsoft not found. Registration may have failed." -ForegroundColor Yellow
    exit 4
}
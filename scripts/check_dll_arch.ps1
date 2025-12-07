# 说明：检测指定 DLL 的位数（x86 或 x64），默认检测项目内 src\lib\dm.dll
# 为避免解析问题，尽量使用简单结构与 ASCII 输出；中文注释仅在代码中。

param(
    [string]$DllPath = "src\lib\dm.dll"
)

# 路径解析（中文说明：将相对路径转换为绝对路径；若当前工作目录不在项目根，回退到基于脚本目录的相对路径）
$FullPath = $null
if (Test-Path -Path $DllPath) {
    $FullPath = (Resolve-Path -Path $DllPath).Path
} else {
    # 回退：脚本目录 + ..\src\lib\dm.dll
    $fallback = Join-Path $PSScriptRoot "..\src\lib\dm.dll"
    if (Test-Path -Path $fallback) {
        $FullPath = (Resolve-Path -Path $fallback).Path
    }
}

if (-not $FullPath) {
    Write-Host "[Error] DLL not found: $DllPath" -ForegroundColor Red
    Write-Host ("[Hint] Tried: " + $DllPath + " and script-relative fallback.") -ForegroundColor Yellow
    exit 1
}

# 读取 PE 头以判断位数（中文说明：检查 MZ 与 PE 签名以及 Machine 字段）
$fs = $null
$br = $null
try {
    $fs = [System.IO.File]::Open($FullPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
    $br = New-Object System.IO.BinaryReader($fs)

    $mz = $br.ReadUInt16()
    if ($mz -ne 0x5A4D) {
        Write-Host "[Error] Not a valid PE file (missing MZ)" -ForegroundColor Red
        $br.Close(); $fs.Close(); exit 2
    }

    $fs.Seek(0x3C, [System.IO.SeekOrigin]::Begin) | Out-Null
    $e_lfanew = $br.ReadInt32()

    $fs.Seek($e_lfanew, [System.IO.SeekOrigin]::Begin) | Out-Null
    $sig = $br.ReadUInt32()
    if ($sig -ne 0x00004550) {
        Write-Host "[Error] Invalid PE signature" -ForegroundColor Red
        $br.Close(); $fs.Close(); exit 3
    }

    $machine = $br.ReadUInt16()
}
finally {
    if ($br) { $br.Close() }
    if ($fs) { $fs.Close() }
}

# 判定架构并输出提示（中文说明：根据 Machine 值给出注册器建议）
$arch = "unknown"
switch ($machine) {
    0x014c { $arch = "x86" }
    0x8664 { $arch = "x64" }
    default { $arch = "unknown(0x" + ($machine.ToString("X")) + ")" }
}

Write-Host ("[OK] File: " + $FullPath)
Write-Host ("[OK] Architecture: " + $arch) -ForegroundColor Green

$hint = ""
$exitCode = 0
switch ($arch) {
    "x86" { $hint = "[Hint] Use SysWOW64\\regsvr32.exe to register (32-bit)."; $exitCode = 0 }
    "x64" { $hint = "[Hint] Use System32\\regsvr32.exe to register (64-bit)."; $exitCode = 0 }
    default { $hint = "[Warn] Unknown machine type, please re-check file."; $exitCode = 4 }
}
Write-Host $hint -ForegroundColor Yellow
exit $exitCode
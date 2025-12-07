# 环境综合校验（不依赖 Electron Forge，中文注释）
# 校验项：Electron 版本(从 package.json 读取)、Python 版本、VS2022 MSBuild 是否存在、dm.dll 位数

param()
$ErrorActionPreference = 'Stop'

function Write-ItemResult([string]$name, [bool]$ok, [string]$msg) {
  $status = if ($ok) { 'OK' } else { 'FAIL' }
  Write-Host ("- {0}: {1} | {2}" -f $name, $status, $msg) -ForegroundColor (if ($ok) { 'Green' } else { 'Red' })
}

# 1) Electron 版本（读取 package.json）
$pkgPath = Join-Path (Get-Location) 'package.json'
$electronOk = $false
$electronMsg = '未安装 Electron'
$electronVer = ''
if (Test-Path $pkgPath) {
  $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
  $devDeps = $pkg.devDependencies
  if ($devDeps -and $devDeps.PSObject.Properties.Name -contains 'electron') {
    $electronVer = $devDeps.electron
    $electronOk = ($electronVer -like '*13.6.9*' -or $electronVer -like '13.*')
    $electronMsg = "Electron(devDep): $electronVer，要求 13.6.9 或 13.x"
  } else {
    $electronMsg = 'devDependencies 未包含 electron（建议安装 electron@13.6.9）'
  }
}
Write-ItemResult 'Electron 版本(从 package.json)' $electronOk $electronMsg

# 2) Python 版本（优先 .npmrc 指定）
$npmrcPath = Join-Path (Get-Location) '.npmrc'
$pythonExe = 'python'
$msvsVersion = ''
if (Test-Path $npmrcPath) {
  $lines = Get-Content $npmrcPath
  foreach ($line in $lines) {
    if ($line -match '^\s*python\s*=\s*(.+)$') { $pythonExe = $Matches[1].Trim() }
    if ($line -match '^\s*msvs_version\s*=\s*(.+)$') { $msvsVersion = $Matches[1].Trim() }
  }
}
$pyOk = $false
$pyMsg = ''
try {
  $out = & $pythonExe --version 2>&1
  if ($out -match 'Python\s+(\d+)\.(\d+)\.(\d+)') {
    $ver = "$($Matches[1]).$($Matches[2]).$($Matches[3])"
    $pyOk = ([int]$Matches[1] -ge 3 -and [int]$Matches[2] -ge 10)
    $pyMsg = if ($pyOk) { "Python 版本满足要求: $ver" } else { "Python 版本过低: $ver，建议 >= 3.10（推荐 3.12）" }
  } else {
    $pyMsg = "无法解析 Python 版本输出: $out"
  }
} catch {
  $pyMsg = "获取 Python 版本失败: $($_.Exception.Message)"
}
Write-ItemResult 'Python 版本' $pyOk $pyMsg

# 3) VS2022 Build Tools（通过 msvs_version + MSBuild 路径）
$msbuildCandidates = @(
  'C:\Program Files\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe',
  'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe',
  'C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe'
)
$msbuildFound = $false
foreach ($p in $msbuildCandidates) { if (Test-Path $p) { $msbuildFound = $true; break } }
$vsOk = ($msvsVersion -eq '2022' -and $msbuildFound)
$vsMsg = (if ($msvsVersion -eq '2022') { 'msvs_version=2022 已设置' } else { 'msvs_version 未设置为 2022' }) + '，' + (if ($msbuildFound) { '检测到 VS2022 MSBuild' } else { '未检测到 VS2022 MSBuild' })
Write-ItemResult 'VS2022 Build Tools' $vsOk $vsMsg

# 4) dm.dll 位数（解析 PE 头 Machine）
$dllPath = Join-Path (Get-Location) 'src/lib/dm.dll'
$dllOk = $false
$dllMsg = ''
$dllArch = ''
if (Test-Path $dllPath) {
  try {
    $bytes = [System.IO.File]::ReadAllBytes($dllPath)
    $peOffset = [BitConverter]::ToInt32($bytes, 0x3c)
    $sig = [System.Text.Encoding]::ASCII.GetString($bytes, $peOffset, 4)
    if ($sig -ne 'PE'+[char]0+[char]0) { throw "PE 头签名无效" }
    $machine = [BitConverter]::ToUInt16($bytes, $peOffset + 4)
    if ($machine -eq 0x014c) { $dllArch = 'x86' } elseif ($machine -eq 0x8664) { $dllArch = 'x64' } else { $dllArch = "未知(0x{0})" -f ($machine.ToString('X')) }
    $dllOk = ($dllArch -eq 'x86') # 期望 32 位
    $dllMsg = "dm.dll 架构: $dllArch（期望 x86 与 Electron ia32 匹配）"
  } catch {
    $dllMsg = "解析 dm.dll 失败: $($_.Exception.Message)"
  }
} else {
  $dllMsg = "未找到 dm.dll: $dllPath"
}
Write-ItemResult 'dm.dll 位数匹配(期望 x86)' $dllOk $dllMsg

# 综合结果
$overall = $electronOk -and $pyOk -and $vsOk -and $dllOk
if ($overall) {
  Write-Host '== 环境校验通过 ✅ ==' -ForegroundColor Green
  exit 0
} else {
  Write-Host '== 环境校验未通过 ❌ ==' -ForegroundColor Red
  exit 1
}
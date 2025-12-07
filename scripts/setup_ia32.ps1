# 一键切换到 32 位环境（Electron ia32 + 重建 winax ia32）
# 说明：本脚本将安装 32 位 Electron@13.6.9，使用 VS2022 工具链重建 winax（32 位），并给出 dm.dll 注册指引。
# 注意：请先确保已安装 VS2022 Build Tools，并包含 MSVC v143（x86/x64）和最新 Windows SDK。

$ErrorActionPreference = 'Stop'

# 为避免控制台乱码，仅设置输出为 UTF-8（不影响脚本逻辑）
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

Write-Host '==> Set mirror and arch: ia32' -ForegroundColor Cyan
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
$env:npm_config_arch = 'ia32'

Write-Host '==> Configure node-gyp/VS environment' -ForegroundColor Cyan
$env:GYP_MSVS_VERSION = '2022'
$env:VISUALSTUDIOVERSION = '17.0'
$env:npm_config_openssl_fips = '0'

# 尝试添加 VS2022 MSBuild 到 PATH（仅当前进程），便于 node-gyp 找到正确的 MSBuild
$msbuildCandidates = @(
  'C:\Program Files\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin',
  'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin',
  'C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin'
)
foreach ($p in $msbuildCandidates) {
  if (Test-Path $p) {
    Write-Host "   -> Found MSBuild: $p" -ForegroundColor DarkGreen
    $env:Path = "$p;" + $env:Path
  }
}

# 尝试结束可能占用 electron 文件的进程（如 electron.exe）
$proc = Get-Process -Name electron -ErrorAction SilentlyContinue
if ($proc) {
  Write-Host '==> Kill running electron processes' -ForegroundColor Yellow
  $proc | Stop-Process -Force
}

# 删除旧的 electron 目录以确保拉取到 ia32 版本（失败则跳过）
Write-Host '==> Clean old electron module' -ForegroundColor Cyan
$electronDir = Join-Path (Get-Location) 'node_modules/electron'
if (Test-Path $electronDir) {
  try {
    Remove-Item -Recurse -Force $electronDir
    Write-Host '   -> Removed node_modules/electron' -ForegroundColor DarkGreen
  } catch {
    Write-Host "   -> Skip deletion: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Write-Host '==> Install Electron@13.6.9 (ia32)' -ForegroundColor Cyan
npm install -D electron@13.6.9 --force

Write-Host '==> Rebuild winax for Electron 13.6.9 (ia32)' -ForegroundColor Cyan
# 使用 npm rebuild 指定 electron 头文件与目标版本；架构由 npm_config_arch 控制为 ia32
npm rebuild winax --runtime=electron --target=13.6.9 --dist-url=https://electronjs.org/headers --build-from-source

Write-Host '==> Done: Electron ia32 + winax ia32 rebuild success.' -ForegroundColor Green

Write-Host 'Next (REQUIRED): register dm.dll (32-bit) with SysWOW64\\regsvr32.exe' -ForegroundColor Yellow
Write-Host '1) dm.dll must be PE32 (32-bit), NOT PE32+ (64-bit).'
Write-Host '2) Admin: C:\\Windows\\SysWOW64\\regsvr32.exe "C:\\path\\to\\dm.dll"'
Write-Host '3) Verify: reg query HKCR\\dm.dmsoft /s'
Write-Host '4) Start dev (UTF-8 logs): npm run start:utf8'

Write-Host 'Tip: process.arch should be ia32 after start.' -ForegroundColor DarkCyan
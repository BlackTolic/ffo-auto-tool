# 启动脚本：将控制台切换为 UTF-8 并启动开发环境（中文注释）
# 说明：Windows 终端默认非 UTF-8，中文日志可能出现乱码；本脚本设置 UTF-8。

$ErrorActionPreference = 'Stop'

try {
  # 切换代码页到 UTF-8（65001）
  chcp.com 65001 | Out-Null
  # 设置 PowerShell 输入/输出编码为 UTF-8
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
  [Console]::InputEncoding  = [System.Text.UTF8Encoding]::new()
  Write-Host "编码设置完成: UTF-8" -ForegroundColor Green
} catch {
  Write-Warning "编码设置失败: $($_.Exception.Message)"
}

# 启动 Electron Forge 开发环境（与现有 npm 流程一致）
Write-Host "启动 Electron Forge 开发环境..." -ForegroundColor Cyan
# 兼容 winax 的 node-gyp 配置：关闭 openssl_fips 变量导致的条件判断
$env:npm_config_openssl_fips = '0'
# 如需强制使用 32 位 Electron 环境，可同时设置架构（若之前已用 setup:ia32 切换，可保留）
# $env:npm_config_arch = 'ia32'
# 进一步兼容 node-gyp：设置 GYP_DEFINES 和 openssl_fips 变量
$env:GYP_DEFINES = 'openssl_fips=0'
$env:openssl_fips = '0'

# 中文注释：为避免 Electron 二进制下载的 TLS/网络问题，使用国内镜像加速
$env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
# 中文注释：允许 electron-get 走系统代理（若有）
$env:ELECTRON_GET_USE_PROXY = 'true'

npm run start
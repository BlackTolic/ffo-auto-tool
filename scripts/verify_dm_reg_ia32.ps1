# 32 位环境验证脚本：检查大漠插件 dm.dmsoft 是否注册成功（中文注释）
# 步骤：
# 1) 查询注册表 HKCR\dm.dmsoft 是否存在（ProgID 是否已写入）
# 2) 使用 32 位 PowerShell 尝试创建 COM 对象（New-Object -ComObject dm.dmsoft）

$ErrorActionPreference = 'Stop'

Write-Host '==> Verify registry: HKCR\dm.dmsoft' -ForegroundColor Cyan
$regOk = $false
try {
  $null = reg query HKCR\dm.dmsoft /s
  if ($LASTEXITCODE -eq 0) { $regOk = $true }
} catch {
  $regOk = $false
}
Write-Host ("   -> Registry present: {0}" -f ($regOk)) -ForegroundColor DarkGreen

# 32 位 PowerShell 路径（SysWOW64）
$winRoot = $env:SystemRoot
if ([string]::IsNullOrWhiteSpace($winRoot)) { $winRoot = 'C:\Windows' }
$wowPS = "$winRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe"
if ([string]::IsNullOrWhiteSpace($wowPS) -or !(Test-Path $wowPS)) {
  Write-Warning "32-bit PowerShell not found: $wowPS"
  exit 1
}

Write-Host '==> Try COM instantiate via 32-bit PowerShell' -ForegroundColor Cyan
$scriptBlock = @'
try {
  $dm = New-Object -ComObject dm.dmsoft
  $ver = $dm.ver()
  Write-Host "[COM] Create success. Version: $ver"
  exit 0
} catch {
  Write-Host "[COM] Create failed: $($_.Exception.Message)"
  exit 1
}
'@

& $wowPS -NoProfile -ExecutionPolicy Bypass -Command $scriptBlock
$code = $LASTEXITCODE

if ($code -eq 0 -and $regOk) {
  Write-Host '==> Verify result: OK (registry exists, COM create succeeded)' -ForegroundColor Green
  exit 0
} elseif ($code -eq 0 -and -not $regOk) {
  Write-Host '==> Verify result: Partial OK (COM created, but registry query failed)' -ForegroundColor Yellow
  exit 0
} else {
  Write-Host '==> Verify result: FAILED (see logs above)' -ForegroundColor Red
  Write-Host 'Hint: Use SysWOW64\regsvr32.exe to register 32-bit dm.dll with Administrator.' -ForegroundColor Yellow
  exit 1
}
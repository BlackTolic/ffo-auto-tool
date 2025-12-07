#!/usr/bin/env node
/**
 * 环境综合校验（Node 脚本，中文注释，UTF-8）
 * 校验项：Electron 版本(从 package.json 读取)、Python 版本、VS2022 MSBuild 是否存在、dm.dll 位数
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/** 打印单项结果（中文输出） */
function printItem(name, ok, msg) {
  const status = ok ? 'OK' : 'FAIL';
  const mark = ok ? '✅' : '❌';
  console.log(`- ${name}: ${status} ${mark} | ${msg}`);
}

// 1) Electron 版本（读取 package.json）
const pkgPath = path.join(process.cwd(), 'package.json');
let electronOk = false;
let electronMsg = '未安装 Electron';
let electronVer = '';
try {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const devDeps = pkg.devDependencies || {};
  if (devDeps.electron) {
    electronVer = devDeps.electron;
    electronOk = /^(\^|~)?13(\.|$)/.test(electronVer);
    electronMsg = `Electron(devDep): ${electronVer}，要求 13.6.9 或 13.x`;
  } else {
    electronMsg = 'devDependencies 未包含 electron（建议安装 electron@13.6.9）';
  }
} catch (e) {
  electronMsg = `读取 package.json 失败: ${e.message}`;
}
printItem('Electron 版本(从 package.json)', electronOk, electronMsg);

// 2) Python 版本（优先 .npmrc 指定）
const npmrcPath = path.join(process.cwd(), '.npmrc');
let pythonExe = 'python';
let msvsVersion = '';
if (fs.existsSync(npmrcPath)) {
  const lines = fs.readFileSync(npmrcPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m1 = line.match(/^\s*python\s*=\s*(.+)$/);
    if (m1) pythonExe = m1[1].trim();
    const m2 = line.match(/^\s*msvs_version\s*=\s*(.+)$/);
    if (m2) msvsVersion = m2[1].trim();
  }
}
let pyOk = false;
let pyMsg = '';
try {
  const out = execFileSync(pythonExe, ['--version'], { encoding: 'utf8' });
  const m = out.match(/Python\s+(\d+)\.(\d+)\.(\d+)/);
  if (m) {
    const ver = `${m[1]}.${m[2]}.${m[3]}`;
    pyOk = Number(m[1]) >= 3 && Number(m[2]) >= 10;
    pyMsg = pyOk ? `Python 版本满足要求: ${ver}` : `Python 版本过低: ${ver}，建议 >= 3.10（推荐 3.12）`;
  } else {
    pyMsg = `无法解析 Python 版本输出: ${out.trim()}`;
  }
} catch (e) {
  pyMsg = `获取 Python 版本失败: ${e.message}`;
}
printItem('Python 版本', pyOk, pyMsg);

// 3) VS2022 Build Tools（通过 msvs_version + MSBuild 路径）
const msbuildCandidates = [
  'C:/Program Files/Microsoft Visual Studio/2022/BuildTools/MSBuild/Current/Bin/MSBuild.exe',
  'C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/MSBuild/Current/Bin/MSBuild.exe',
  'C:/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe'
];
let msbuildFound = msbuildCandidates.some(p => fs.existsSync(p));
let vsOk = msvsVersion === '2022' && msbuildFound;
let vsMsg = (msvsVersion === '2022' ? 'msvs_version=2022 已设置' : 'msvs_version 未设置为 2022') + '，' + (msbuildFound ? '检测到 VS2022 MSBuild' : '未检测到 VS2022 MSBuild');
printItem('VS2022 Build Tools', vsOk, vsMsg);

// 4) dm.dll 位数（解析 PE 头 Machine）
const dllPath = path.join(process.cwd(), 'src/lib/dm.dll');
let dllOk = false;
let dllMsg = '';
let dllArch = '';
if (fs.existsSync(dllPath)) {
  try {
    const bytes = fs.readFileSync(dllPath);
    const peOffset = bytes.readUInt32LE(0x3c);
    const sig = bytes.slice(peOffset, peOffset + 4).toString('ascii');
    if (sig !== 'PE\x00\x00') throw new Error('PE 头签名无效');
    const machine = bytes.readUInt16LE(peOffset + 4);
    if (machine === 0x014c) dllArch = 'x86';
    else if (machine === 0x8664) dllArch = 'x64';
    else dllArch = `未知(0x${machine.toString(16).toUpperCase()})`;
    dllOk = dllArch === 'x86'; // 期望 32 位
    dllMsg = `dm.dll 架构: ${dllArch}（期望 x86 与 Electron ia32 匹配）`;
  } catch (e) {
    dllMsg = `解析 dm.dll 失败: ${e.message}`;
  }
} else {
  dllMsg = `未找到 dm.dll: ${dllPath}`;
}
printItem('dm.dll 位数匹配(期望 x86)', dllOk, dllMsg);

// 综合结果
const overall = electronOk && pyOk && vsOk && dllOk;
if (overall) {
  console.log('== 环境校验通过 ✅ ==');
  process.exit(0);
} else {
  console.log('== 环境校验未通过 ❌ ==');
  process.exit(1);
}
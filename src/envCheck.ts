/*
 * 运行时环境校验（中文注释）
 * 目标：在 Electron 主进程启动前检查与大漠插件（dm.dll + winax）相关的关键环境是否满足要求。
 * 校验项包含：
 * - Electron 架构与版本（需 32 位 ia32，建议 Electron 13.6.9）
 * - winax 原生模块是否可加载（用于 COM 调用 dm.dmsoft）
 * - Python 版本（node-gyp 构建依赖，建议 >= 3.10，示例为 3.12）
 * - Visual Studio Build Tools 版本（建议 2022，对应 GYP_MSVS_VERSION=2022）
 * - dm.dll 的位数（需与 Electron 进程位数匹配，常见为 32 位）
 */

import fs from 'fs';
import path from 'path';
import cp from 'child_process';

// 校验结果类型
export type EnvCheckItem = {
  name: string; // 校验项名称
  ok: boolean;  // 是否通过
  message: string; // 详细信息（中文）
};

export type EnvCheckResult = {
  ok: boolean; // 是否整体通过
  items: EnvCheckItem[]; // 逐项结果
};

// 读取 .npmrc 的 python 与 msvs_version 配置（如果存在）
function readNpmrcConfig(cwd: string): { pythonPath?: string; msvsVersion?: string } {
  const npmrcPath = path.resolve(cwd, '.npmrc');
  if (!fs.existsSync(npmrcPath)) return {};
  const content = fs.readFileSync(npmrcPath, 'utf-8');
  let pythonPath: string | undefined;
  let msvsVersion: string | undefined;
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([^=]+)\s*=\s*(.+)\s*$/);
    if (!m) continue;
    const key = m[1].trim();
    const val = m[2].trim();
    if (key.toLowerCase() === 'python') pythonPath = val;
    if (key.toLowerCase() === 'msvs_version') msvsVersion = val;
  }
  return { pythonPath, msvsVersion };
}

// 调用指定 Python 获取版本号
function getPythonVersion(pythonExe?: string): { ok: boolean; version?: string; message: string } {
  try {
    const exe = pythonExe && fs.existsSync(pythonExe) ? pythonExe : 'python';
    const out = cp.execFileSync(exe, ['--version'], { encoding: 'utf-8' }).trim();
    // 常见输出："Python 3.12.x"
    const m = out.match(/Python\s+(\d+)\.(\d+)\.(\d+)/i);
    if (!m) {
      return { ok: false, message: `无法解析 Python 版本输出: ${out}` };
    }
    const version = `${m[1]}.${m[2]}.${m[3]}`;
    const major = parseInt(m[1], 10);
    const minor = parseInt(m[2], 10);
    const ok = major >= 3 && minor >= 10; // 建议 Python >= 3.10（兼容 node-gyp 新版本）
    return {
      ok,
      version,
      message: ok
        ? `Python 版本满足要求: ${version}`
        : `Python 版本过低: ${version}，请安装 Python >= 3.10（建议 3.12）`
    };
  } catch (err: any) {
    return { ok: false, message: `获取 Python 版本失败: ${String(err?.message || err)}` };
  }
}

// 检测 VS2022 Build Tools（简单判断 msbuild 是否存在 + 版本号）
function checkVSBuildTools(msvsVersion?: string): { ok: boolean; message: string } {
  // 需要 GYP_MSVS_VERSION=2022 或 .npmrc 中设置 msvs_version=2022
  const expect = '2022';
  const versionOk = (msvsVersion || '').trim() === expect;

  // 常见 MSBuild 路径（任一存在即可）
  const candidates = [
    'C:/Program Files/Microsoft Visual Studio/2022/BuildTools/MSBuild/Current/Bin/MSBuild.exe',
    'C:/Program Files (x86)/Microsoft Visual Studio/2022/BuildTools/MSBuild/Current/Bin/MSBuild.exe',
    'C:/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/MSBuild.exe'
  ];
  const found = candidates.some(p => fs.existsSync(p));

  const ok = versionOk && found;
  const msgParts = [] as string[];
  msgParts.push(versionOk ? 'msvs_version=2022 已设置' : 'msvs_version 未设置为 2022');
  msgParts.push(found ? '检测到 VS2022 MSBuild' : '未检测到 VS2022 MSBuild（请安装 VS2022 Build Tools）');
  return { ok, message: msgParts.join('，') };
}

// 解析 PE 头判断 dm.dll 为 32/64 位
function detectDllArch(dllPath: string): { ok: boolean; arch?: 'x86' | 'x64'; message: string } {
  try {
    if (!fs.existsSync(dllPath)) {
      return { ok: false, message: `未找到 dm.dll: ${dllPath}` };
    }
    const buf = fs.readFileSync(dllPath);
    // 读取 DOS 头中 e_lfanew 偏移（0x3C 处的 4 字节）
    const peOffset = buf.readUInt32LE(0x3c);
    const peSig = buf.toString('ascii', peOffset, peOffset + 4);
    if (peSig !== 'PE\u0000\u0000') {
      return { ok: false, message: 'PE 头签名无效，可能不是标准 PE 文件' };
    }
    const machine = buf.readUInt16LE(peOffset + 4); // IMAGE_FILE_HEADER.Machine
    // 0x014C = x86，0x8664 = x64
    const arch = machine === 0x014c ? 'x86' : machine === 0x8664 ? 'x64' : undefined;
    if (!arch) {
      return { ok: false, message: `未知的 PE Machine 值: 0x${machine.toString(16)}` };
    }
    return { ok: true, arch, message: `dm.dll 架构: ${arch}` };
  } catch (err: any) {
    return { ok: false, message: `解析 dm.dll 失败: ${String(err?.message || err)}` };
  }
}

// 检测 Electron 架构与版本
function checkElectronRuntime(expectedVersion = '13.6.9', expectedArch: NodeJS.Architecture = 'ia32') {
  const actualVersion = process.versions.electron;
  const actualArch = process.arch;
  const versionOk = actualVersion === expectedVersion || (actualVersion?.startsWith('13.'));
  const archOk = actualArch === expectedArch;
  const ok = versionOk && archOk;
  const message = `Electron 版本: ${actualVersion}，架构: ${actualArch}，要求版本: ${expectedVersion}（或 13.x），要求架构: ${expectedArch}`;
  return { ok, message };
}

// 检测 winax 是否可加载
function checkWinaxLoad(): { ok: boolean; message: string } {
  try {
    // 仅尝试 require，不进行 COM 实例化（实例化留给业务逻辑）
    // 如果 native 模块位数与进程不匹配，require 通常会失败
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const winax = require('winax');
    if (!winax) {
      return { ok: false, message: 'winax 模块不可用（require 返回空）' };
    }
    return { ok: true, message: 'winax 模块加载成功' };
  } catch (err: any) {
    return { ok: false, message: `winax 加载失败: ${String(err?.message || err)}` };
  }
}

// 主校验入口：整合所有检查
export function validateEnvironment(): EnvCheckResult {
  const cwd = process.cwd(); // forge 开发模式下，cwd 即项目根目录
  const items: EnvCheckItem[] = [];

  // 1) Electron 版本与架构
  {
    const r = checkElectronRuntime('13.6.9', 'ia32');
    items.push({ name: 'Electron 版本/架构', ok: r.ok, message: r.message });
  }

  // 2) winax 原生模块加载
  {
    const r = checkWinaxLoad();
    items.push({ name: 'winax 原生模块', ok: r.ok, message: r.message });
  }

  // 3) Python 版本（仅在开发环境下检查，或者如果能读取到配置才检查）
  // 生产环境通常不需要 Python，除非业务强依赖。
  // 我们通过检查是否能读取到 .npmrc 来隐式判断是否处于开发源码环境。
  const npmrc = readNpmrcConfig(cwd);
  // 如果是打包后的环境（通常没有 .npmrc），且 winax 已加载成功，则跳过构建工具检查
  const isProduction = !npmrc.pythonPath && !npmrc.msvsVersion && process.resourcesPath;

  if (!isProduction) {
    {
      const r = getPythonVersion(npmrc.pythonPath);
      items.push({ name: 'Python 版本 (Dev)', ok: r.ok, message: r.message });
    }

    // 4) VS2022 Build Tools（通过 msvs_version + MSBuild 路径）
    {
      const r = checkVSBuildTools(npmrc.msvsVersion);
      items.push({ name: 'VS2022 Build Tools (Dev)', ok: r.ok, message: r.message });
    }
  } else {
    // 生产环境，直接标记为忽略或通过
    items.push({ name: 'Python 环境', ok: true, message: '运行时无需 Python (Production)' });
    items.push({ name: '编译工具链', ok: true, message: '运行时无需 VS Build Tools (Production)' });
  }

  // 5) dm.dll 位数（要求与 Electron 进程架构一致）
  {
    // 在生产环境，dm.dll 可能位于 resources/app/src/lib 或其他位置
    // 简单起见，我们尝试在当前目录及常见的打包路径寻找
    let dllPath = path.resolve(cwd, 'src', 'lib', 'dm.dll'); // 中文注释：开发模式路径
    if (!fs.existsSync(dllPath) && process.resourcesPath) {
        // 中文注释：常见打包路径（asar:false）
        const candidate1 = path.resolve(process.resourcesPath, 'app', 'src', 'lib', 'dm.dll');
        // 中文注释：兜底路径，某些打包器可能直接将资源放在 resources\src\lib
        const candidate2 = path.resolve(process.resourcesPath, 'src', 'lib', 'dm.dll');
        dllPath = fs.existsSync(candidate1) ? candidate1 : candidate2;
    }
    
    const r = detectDllArch(dllPath); // 中文注释：检测 dm.dll 位数
    const archMatch = r.arch ? ((r.arch === 'x86' && process.arch === 'ia32') || (r.arch === 'x64' && process.arch === 'x64')) : false;
    const ok = r.ok && archMatch;
    const message = r.message + (r.ok ? (archMatch ? '（与进程位数匹配）' : '（与进程位数不匹配）') : '');
    items.push({ name: 'dm.dll 位数匹配', ok, message });
  }

  // 汇总
  const ok = items.every(i => i.ok);
  return { ok, items };
}
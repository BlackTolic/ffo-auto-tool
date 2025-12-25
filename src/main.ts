import cp from 'child_process';
import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import { ensureDamo, registerDamoOnce } from './damo/damo';
import { damoBindingManager, ffoEvents } from './ffo/events'; // 中文注释：引入事件总线与大漠绑定管理器
import { registerBoundEventHandlers } from './init/event-register';
import { registerGlobalHotkeys } from './init/hotkey-register';
import { registerIpcHandlers } from './init/ipc-handle-register'; // 中文注释：集中管理 IPC 注册的模块

// 中文注释：运行时 COM 注册尝试结果接口（用于日志与排查）
interface DmRegRuntimeAttempt {
  // 中文注释：是否已注册（可成功创建 COM 对象）
  alreadyRegistered: boolean;
  // 中文注释：是否找到 dm.dll（资源路径）
  dllFound: boolean;
  // 中文注释：dm.dll 的路径（用于日志与提示）
  dllPath?: string;
  // 中文注释：是否已启动管理员提权注册流程（弹出 UAC 并调用 regsvr32）
  elevationStarted: boolean;
  // 中文注释：详细信息（中文）
  message: string;
}

// 中文注释：在应用首次运行时，若未注册 dm.dmsoft，则尝试以管理员提权注册 dm.dll（32 位）
// 说明：不依赖 Squirrel 事件，适用于 MSI 安装后的首次启动场景
function ensureDmComRegisteredAtRuntime(): DmRegRuntimeAttempt {
  try {
    // 中文注释：优先尝试创建 COM 对象，若成功说明已注册，无需重复
    try {
      const ax = require('winax');
      new ax.Object('dm.dmsoft');
      return { alreadyRegistered: true, dllFound: true, elevationStarted: false, message: 'dm.dmsoft 已注册，无需重复' };
    } catch {
      // 中文注释：未注册则继续定位 dm.dll 并尝试提权注册
    }

    // 中文注释：定位安装目录内的 dm.dll（基于已打包资源路径）
    const exeDir = path.dirname(process.execPath);
    const candidate1 = path.join(exeDir, 'resources', 'app', 'src', 'lib', 'dm.dll'); // 中文注释：常规路径（asar=false）
    const candidate2 = path.join(exeDir, 'resources', 'src', 'lib', 'dm.dll');        // 中文注释：兜底路径
    const fs = require('fs');
    const dllPath = fs.existsSync(candidate1) ? candidate1 : (fs.existsSync(candidate2) ? candidate2 : undefined);

    if (!dllPath) {
      return { alreadyRegistered: false, dllFound: false, elevationStarted: false, message: '未找到 dm.dll（请检查打包阶段是否复制 src\\lib）' };
    }

    // 中文注释：以管理员提权调用 SysWOW64\\regsvr32.exe 注册 32 位 dm.dll
    // 注意：必须使用 SysWOW64 下的 regsvr32 以匹配 ia32 进程架构
    const psArgs = [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command',
      `Start-Process 'C:\\Windows\\SysWOW64\\regsvr32.exe' -ArgumentList @('"${dllPath}"') -Verb runAs`,
    ];
    cp.spawn('powershell.exe', psArgs, { detached: true, stdio: 'ignore' }).unref();

    return {
      alreadyRegistered: false,
      dllFound: true,
      dllPath,
      elevationStarted: true,
      message: `已尝试以管理员权限注册 dm.dll：${dllPath}`,
    };
  } catch (e) {
    return {
      alreadyRegistered: false,
      dllFound: false,
      elevationStarted: false,
      message: `运行时注册流程启动失败：${(e as any)?.message || e}`,
    };
  }
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};

function setupAppLifecycle() {
  app.on('ready', () => {
    createWindow();
    console.log('[应用生命周期] 窗口创建完成');
    // 中文注释：IPC 注册已集中到 ipc-handle.ts，这里仅委托调用，避免重复注册与代码分散
    registerIpcHandlers({ ensureDamo, damoBindingManager });
    console.log('[应用生命周期] IPC 处理程序注册完成');
    registerBoundEventHandlers();
    console.log('[应用生命周期] 绑定事件处理程序注册完成');
    // 中文注释：将全局快捷键注册集中到 hotkey-register.ts
    registerGlobalHotkeys();
    console.log('[应用生命周期] 全局快捷键注册完成');
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 中文注释：在应用退出前（before-quit）执行清理，解绑窗口、移除 IPC 与事件
  app.on('before-quit', () => {
    try {
      // 中文注释：解绑所有已绑定的大漠窗口（防止残留绑定）
      damoBindingManager.unbindAll();
    } catch (e) {
      console.warn('[退出清理] 解绑所有窗口失败:', String((e as any)?.message || e));
    }

    try {
      // 中文注释：移除所有事件总线监听器，防止内存泄漏
      ffoEvents.removeAllListeners();
    } catch (e) {
      console.warn('[退出清理] 移除事件监听失败:', String((e as any)?.message || e));
    }

    try {
      // 中文注释：移除主进程的 IPC handler，避免多次注册或残留
      const channels = [
        'env:check',
        'damo:ver',
        'damo:getForegroundWindow',
        'damo:bindWindow',
        'damo:unbindWindow',
        'damo:getClientRect',
        'damo:clientToScreen',
        'damo:screenToClient',
        'damo:getWindowRect',
        'damo:getWindowInfo',
        'damo:clientCssToScreenPx',
        'damo:screenPxToClientCss',
        'damo:getDictInfo',
        'autoKey:toggle',
        'ffo:bindForeground',
        'damo:register', // 中文注释：新增手动注册通道的清理
      ];
      channels.forEach((ch) => ipcMain.removeHandler(ch));
    } catch (e) {
      console.warn('[退出清理] 移除 IPC 失败:', String((e as any)?.message || e));
    }

    try {
      // 中文注释：移除所有全局快捷键
      globalShortcut.unregisterAll();
    } catch (e) {
      console.warn('[退出清理] 取消快捷键失败:', String((e as any)?.message || e));
    }
  });
}

// 中文注释：Squirrel 安装事件处理所需的模块与工具

// 中文注释：Squirrel 安装事件处理返回结果接口（用于日志与分支判断）
interface SquirrelEventResult {
  // 中文注释：是否捕获并处理了某个 Squirrel 事件（install/updated/uninstall/obsolete）
  handled: boolean;
  // 中文注释：事件名称（install/updated/uninstall/obsolete/none）
  event: 'install' | 'updated' | 'uninstall' | 'obsolete' | 'none';
  // 中文注释：人类可读的中文描述，便于快速排查
  message: string;
}

// 中文注释：安装阶段注册 dm.dll 的尝试结果接口
interface DmRegInstallAttempt {
  // 中文注释：是否找到 dm.dll（安装路径）
  dllFound: boolean;
  // 中文注释：dm.dll 的绝对路径（用于日志与提示）
  dllPath?: string;
  // 中文注释：是否已成功启动管理员提权注册流程（仅代表已弹出 UAC 并调用 regsvr32，不保证用户授权）
  elevationStarted: boolean;
  // 中文注释：详细信息（中文）
  message: string;
}

// 中文注释：安装/更新阶段尝试管理员提权注册 dm.dll（32 位）
// 注意：依赖 UAC 提权，用户需点击“是”授权；未授权则无法完成注册
function registerDmOnInstall(): DmRegInstallAttempt {
  try {
    // 中文注释：Squirrel 安装后的主程序路径位于 %LocalAppData%\\<appName>\\app-<version>\\<exe>
    // 资源位于同目录下的 resources\\app\\src\\lib\\dm.dll（前提：打包时已复制 src\\lib）
    const exeDir = path.dirname(process.execPath);
    const candidate1 = path.join(exeDir, 'resources', 'app', 'src', 'lib', 'dm.dll'); // 中文注释：常规路径（asar=false）
    const candidate2 = path.join(exeDir, 'resources', 'src', 'lib', 'dm.dll'); // 中文注释：兜底路径（某些打包器）
    const dllPath = require('fs').existsSync(candidate1) ? candidate1 : require('fs').existsSync(candidate2) ? candidate2 : undefined;

    if (!dllPath) {
      return { dllFound: false, elevationStarted: false, message: '未找到 dm.dll（请检查 forge.config.js 的资源复制配置）' };
    }

    // 中文注释：通过 PowerShell 的 Start-Process 以管理员提权运行 SysWOW64\\regsvr32.exe 注册 32 位 dm.dll
    // 说明：必须使用 SysWOW64 下的 regsvr32，以匹配 32 位 Electron（ia32）
    const psArgs = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Start-Process 'C:\\Windows\\SysWOW64\\regsvr32.exe' -ArgumentList @('"${dllPath}"') -Verb runAs`];
    cp.spawn('powershell.exe', psArgs, { detached: true, stdio: 'ignore' }).unref();

    return {
      dllFound: true,
      dllPath,
      elevationStarted: true,
      message: `已尝试以管理员权限注册 dm.dll：${dllPath}`,
    };
  } catch (e) {
    return {
      dllFound: false,
      elevationStarted: false,
      message: `注册流程启动失败：${(e as any)?.message || e}`,
    };
  }
}

// 中文注释：处理 Squirrel 安装事件（install/updated/uninstall/obsolete）
// - install/updated：创建快捷方式 + 尝试注册 dm.dll（弹 UAC）
// - uninstall：删除快捷方式 + 可选卸载 dm.dll
// - obsolete：退出
function handleSquirrelEvents(): SquirrelEventResult {
  const argv = process.argv;
  // 中文注释：electron-squirrel-startup 会在 install/updated 时返回 true（建议先退出快速返回）
  if (require('electron-squirrel-startup')) {
    return { handled: true, event: 'updated', message: '由 electron-squirrel-startup 处理，主进程退出' };
  }

  // 中文注释：直接分析 argv，做更细致的动作（创建/删除快捷方式，注册/卸载 dm.dll）
  const exeDir = path.dirname(process.execPath);
  const updateExe = path.resolve(exeDir, '..', 'Update.exe');
  const targetExeName = path.basename(process.execPath);

  const runUpdate = (args: string[]) => {
    try {
      cp.spawn(updateExe, args, { detached: true, stdio: 'ignore' }).unref();
    } catch {}
  };

  if (argv.includes('--squirrel-install') || argv.includes('--squirrel-updated')) {
    // 中文注释：创建开始菜单/桌面快捷方式
    runUpdate(['--createShortcut', targetExeName]);

    // 中文注释：尝试注册 dm.dll（需要管理员授权）
    const reg = registerDmOnInstall();
    return {
      handled: true,
      event: argv.includes('--squirrel-install') ? 'install' : 'updated',
      message: `已处理 ${argv.includes('--squirrel-install') ? '安装' : '更新'} 事件；${reg.message}`,
    };
  }

  if (argv.includes('--squirrel-uninstall')) {
    // 中文注释：删除快捷方式
    runUpdate(['--removeShortcut', targetExeName]);

    // 中文注释：如需卸载 COM 注册，可在此处调用 regsvr32 /u（通常不强制卸载，以免影响其他程序）
    return { handled: true, event: 'uninstall', message: '已处理卸载事件并移除快捷方式' };
  }

  if (argv.includes('--squirrel-obsolete')) {
    return { handled: true, event: 'obsolete', message: '已处理过期事件，将退出' };
  }

  return { handled: false, event: 'none', message: '无 Squirrel 安装事件，继续正常启动' };
}

function getCurrentCursorPosition() {
  //获取当前坐标位置
  //  s = dm.Ocr(1241,110,1441,135,"e8f0e8-111111",1.0)
  // s = dm.Ocr(287,483,340,523,"e8f0e8-111111",1.0)
  // s = dm.Ocr(247,569,300,609,"e8f0e8-111111",1.0)
  // s = dm.Ocr(919,791,972,831,"e8f0e8-111111",1.0)
  // s = dm.Ocr(1298,766,1351,806,"e8f0e8-111111",1.0)
  // s = dm.Ocr(784,807,837,847,"e8f0e8-111111",1.0)
  // s = dm.Ocr(947,804,1000,844,"e8f0e8-111111",1.0)
  // s = dm.Ocr(1200,775,1253,815,"e8f0e8-111111",1.0)
  // s = dm.Ocr(965,759,1018,799,"e8f0e8-111111",1.0)
  // s = dm.Ocr(261,694,314,734,"e8f0e8-111111",1.0)
  // 二郎神杨戬 s = dm.Ocr(664,305,788,502,"00f000-111111",1.0)
  // 选择面板s = dm.Ocr(583,426,844,521,"e8f0e8-111111",1.0)
  // 查找面板 s = dm.Ocr(1106,851,1494,901,"a87848-111111|201010-000000",1.0)
  // 桃溪 仓库145/51 ，飞机 151，17
}

// 中文注释：启动入口（优先处理 Squirrel 安装事件；如果已处理则退出，否则继续正常启动）
const squirrel = handleSquirrelEvents();
if (squirrel.handled) {
  console.log(`[安装事件] ${squirrel.message}`);
  app.quit();
} else {
  // 中文注释：手动注册大漠插件（仅一次；非安装阶段，普通运行时）
  registerDamoOnce();
  // 中文注释：应用入口
  setupAppLifecycle();
}

import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { ensureDamo, registerDamoOnce } from './damo/damo';
import { damoBindingManager, ffoEvents } from './ffo/events'; // 中文注释：引入事件总线与大漠绑定管理器
import { registerBoundEventHandlers } from './init/event-register';
import { registerGlobalHotkeys } from './init/hotkey-register';
import { registerIpcHandlers } from './init/ipc-handle-register'; // 中文注释：集中管理 IPC 注册的模块

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

// 中文注释：手动注册大漠插件（仅一次）
registerDamoOnce();
// 中文注释：应用入口
setupAppLifecycle();

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

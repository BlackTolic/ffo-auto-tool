import { app, BrowserWindow, globalShortcut, ipcMain, Notification, screen } from 'electron';
import fs from 'fs'; // 中文注释：读取字典文件
import path from 'path'; // 中文注释：拼接字典路径
import { SCREENSHOT_PATH } from './constant/config';
import { Damo } from './damo/damo';
import { validateEnvironment } from './envCheck'; // 中文注释：引入运行时环境校验
import { damoBindingManager, ffoEvents } from './ffo/events'; // 中文注释：引入事件总线与大漠绑定管理器
import { stopAutoCombat } from './ffo/utils/auto-combat';
import { startKeyPress, stopKeyPress } from './ffo/utils/key-press'; // 中文注释：自动按键模块（启动/停止）
import { registerGlobalHotkeys } from './init/hotkey-register';

// 中文注释：记录最近绑定成功的窗口句柄（供部分逻辑使用）
let lastBoundHwnd: number | null = null;
// 中文注释：记录每个窗口当前是否开启了自动按键
const autoKeyOnByHwnd = new Map<number, boolean>();

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

// 中文注释：懒加载并缓存 Damo 包装实例
let damo: Damo | null = null;
function ensureDamo(): Damo {
  if (!damo) {
    try {
      damo = new Damo();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Damo] 初始化失败:', msg);
      throw e;
    }
  }
  return damo;
}

// 中文注释：切换自动按键（仅作用于“当前前台窗口”，必须已绑定）
function toggleAutoKey(
  keyName: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' = 'F1',
  intervalMs: number = 200
): { ok: boolean; running?: boolean; hwnd?: number; key?: string; intervalMs?: number; message?: string } {
  // 中文注释：获取当前前台窗口句柄（操作系统层面的活动窗口）
  let hwnd = 0;
  try {
    const dm = ensureDamo();
    hwnd = dm.getForegroundWindow();
  } catch (e) {
    const msg = (e as any)?.message || String(e);
    return { ok: false, message: `获取前台窗口失败：${msg}` };
  }

  if (!hwnd || hwnd <= 0) {
    return { ok: false, message: '未检测到前台窗口，无法切换自动按键' };
  }

  // 中文注释：只对已绑定的前台窗口生效
  if (!damoBindingManager.isBound(hwnd)) {
    return { ok: false, hwnd, message: '当前前台窗口未绑定，请先绑定后再切换' };
  }

  const rec = damoBindingManager.get(hwnd);
  if (!rec) {
    return { ok: false, hwnd, message: `找不到绑定记录：hwnd=${hwnd}` };
  }

  const currentlyOn = autoKeyOnByHwnd.get(hwnd) === true;
  if (currentlyOn) {
    try {
      stopKeyPress(hwnd);
    } catch (e) {
      // 中文注释：停止失败不影响状态切换的结果，但记录日志
      console.warn('[自动按键] 停止失败：', (e as any)?.message || e);
    }
    autoKeyOnByHwnd.set(hwnd, false);
    return { ok: true, running: false, hwnd };
  } else {
    try {
      startKeyPress(keyName, intervalMs, rec);
    } catch (e) {
      const msg = (e as any)?.message || String(e);
      return { ok: false, hwnd, message: `启动失败：${msg}` };
    }
    autoKeyOnByHwnd.set(hwnd, true);
    return { ok: true, running: true, hwnd, key: keyName, intervalMs };
  }
}

// 中文注释：统一注册所有 IPC 通道的函数
function setupIpcHandlers() {
  ipcMain.handle('env:check', () => validateEnvironment());
  ipcMain.handle('damo:ver', () => ensureDamo().ver());
  ipcMain.handle('damo:getForegroundWindow', () => ensureDamo().getForegroundWindow());
  ipcMain.handle('damo:bindWindow', (_event, hwnd: number, display: string, mouse: string, keypad: string, mode: number) => {
    return ensureDamo().bindWindow(hwnd, display, mouse, keypad, mode);
  });
  ipcMain.handle('damo:unbindWindow', () => ensureDamo().unbindWindow());
  ipcMain.handle('damo:getClientRect', (_event, hwnd: number) => ensureDamo().getClientRect(hwnd));
  ipcMain.handle('damo:clientToScreen', (_event, hwnd: number, x: number, y: number) => ensureDamo().clientToScreen(hwnd, x, y));
  ipcMain.handle('damo:screenToClient', (_event, hwnd: number, x: number, y: number) => ensureDamo().screenToClient(hwnd, x, y));
  ipcMain.handle('damo:getWindowRect', (_event, hwnd: number) => ensureDamo().getWindowRect(hwnd));
  ipcMain.handle('damo:getWindowInfo', async (_event, hwnd: number) => {
    const dm = ensureDamo();
    const windowRect = await dm.getWindowRect(hwnd);
    const clientRect = await dm.getClientRect(hwnd);
    const displayInfo = screen.getDisplayNearestPoint({ x: windowRect.x, y: windowRect.y });
    const scaleFactor = displayInfo.scaleFactor;
    return { windowRect, clientRect, scaleFactor };
  });
  ipcMain.handle('damo:clientCssToScreenPx', async (_event, hwnd: number, xCss: number, yCss: number) => {
    const dm = ensureDamo();
    const windowRect = await dm.getWindowRect(hwnd);
    const displayInfo = screen.getDisplayNearestPoint({ x: windowRect.x, y: windowRect.y });
    const sf = displayInfo.scaleFactor;
    const xClientPx = Math.round(xCss * sf);
    const yClientPx = Math.round(yCss * sf);
    return dm.clientToScreen(hwnd, xClientPx, yClientPx);
  });
  ipcMain.handle('damo:screenPxToClientCss', async (_event, hwnd: number, x: number, y: number) => {
    const dm = ensureDamo();
    const windowRect = await dm.getWindowRect(hwnd);
    const displayInfo = screen.getDisplayNearestPoint({ x: windowRect.x, y: windowRect.y });
    const sf = displayInfo.scaleFactor;
    const clientPx = await dm.screenToClient(hwnd, x, y);
    return { x: clientPx.x / sf, y: clientPx.y / sf };
  });
  ipcMain.handle('damo:getDictInfo', (_event, hwnd?: number) => {
    if (typeof hwnd === 'number' && hwnd > 0) {
      const rec = damoBindingManager.get(hwnd);
      if (rec && typeof rec.ffoClient.getCurrentDictInfo === 'function') {
        return rec.ffoClient.getCurrentDictInfo();
      }
      return { activeIndex: null, source: { type: 'unknown' } };
    }
    const dm = ensureDamo();
    if (typeof (dm as any).getCurrentDictInfo === 'function') {
      return (dm as any).getCurrentDictInfo();
    }
    return { activeIndex: null, source: { type: 'unknown' } };
  });

  // 中文注释：自动按键切换的 IPC 处理（渲染层调用时也只作用当前前台窗口）
  ipcMain.handle('autoKey:toggle', (_event, keyName: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' = 'F1', intervalMs: number = 200) => {
    return toggleAutoKey(keyName, intervalMs);
  });

  // 中文注释：新增一键绑定前台窗口所属进程（通过绑定管理器），便于用户从渲染层触发绑定
  ipcMain.handle('ffo:bindForeground', async () => {
    try {
      const dm = ensureDamo();
      const hwnd = dm.getForegroundWindow();
      if (!hwnd || hwnd <= 0) {
        return { ok: false, message: '未检测到前台窗口' };
      }
      // 中文注释：通过底层 DM 获取前台窗口所属 PID
      const pid = (dm as any).dm?.GetWindowProcessId?.(hwnd);
      if (!pid || pid <= 0) {
        return { ok: false, hwnd, message: '无法获取前台窗口 PID' };
      }
      const count = await damoBindingManager.bindWindowsForPid(pid);
      return { ok: count > 0, count, hwnd, pid, message: count > 0 ? '绑定成功' : '未找到可绑定窗口' };
    } catch (e) {
      return { ok: false, message: (e as any)?.message || String(e) };
    }
  });
}

// 中文注释：向所有渲染进程广播字库信息更新
function broadcastDictInfoUpdated(hwnd: number, info: any) {
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('damo:dictInfoUpdated', { hwnd, info }));
}

// 中文注释：为绑定成功事件注册处理逻辑（加载字库、调试输出、截图与 OCR 示例）
function registerBoundEventHandlers() {
  ffoEvents.on('bound', async ({ pid, hwnd }) => {
    new Notification({ title: '绑定成功', body: `PID=${pid} HWND=${hwnd}` }).show();
    lastBoundHwnd = hwnd; // 中文注释：记录最近绑定的窗口句柄（供其他逻辑参考，不参与快捷键切换）
    const rec = damoBindingManager.get(hwnd);
    if (!rec) return;
    try {
      const dm = rec?.ffoClient?.dm;
      const dictPath = path.join(process.cwd(), '/src/lib/font/1_cn.txt');
      let dictLoaded = false;
      if (fs.existsSync(dictPath)) {
        try {
          const ret = await rec?.ffoClient?.loadDictFromFileAsync(0, dictPath);
          if (ret === 1) {
            dm?.UseDict(0);
            console.log(`[OCR字典] 已加载 ${path.basename(dictPath)} 并启用索引 0`);
            dictLoaded = true;
            const info = rec?.ffoClient?.getCurrentDictInfo?.();
            broadcastDictInfoUpdated(hwnd, info);
          } else {
            console.warn(`[OCR字典] SetDict 返回值=${ret} | 路径=${dictPath}`);
          }
        } catch (err) {
          console.warn(`[OCR字典] 加载失败: ${dictPath} | ${String((err as any)?.message || err)}`);
        }
      }
      if (!dictLoaded) {
        dm?.UseDict(0);
        console.log('[OCR字典] 使用默认字典索引 0（未找到或加载失败）');
      }

      // 中文注释：示例截图（可选）
      try {
        const bmpPath = path.join(SCREENSHOT_PATH, 'ocr_debug.bmp');
        const pngPath = path.join(SCREENSHOT_PATH, 'ocr_debug.png');
        const cap = dm?.CapturePng?.(0, 0, 800, 600, pngPath);
        const cap2 = dm?.CaptureBmp?.(0, 0, 800, 600, bmpPath);
        console.log(`[截图] PNG=${cap} BMP=${cap2} | ${pngPath}`);
      } catch {}
    } catch (err) {
      console.warn(`[绑定事件] 处理失败: ${String((err as any)?.message || err)}`);
    }
  });

  // 中文注释：解绑事件处理（停止定时器与清理状态）
  ffoEvents.on('unbind', async ({ hwnd }) => {
    try {
      // 中文注释：停止自动打怪（释放定时器）
      stopAutoCombat(hwnd);
      // 中文注释：停止自动按键（释放定时器）
      stopKeyPress(hwnd);
      // 中文注释：更新自动按键状态并重置最近绑定句柄
      autoKeyOnByHwnd.delete(hwnd);
      if (lastBoundHwnd === hwnd) lastBoundHwnd = null;
    } catch (err) {
      console.warn(`[解绑事件] 清理失败: ${String((err as any)?.message || err)}`);
    }
  });
}

function setupAppLifecycle() {
  console.log('[应用生命周期] 开始初始化');
  app.on('ready', () => {
    createWindow();
    console.log('[应用生命周期] 窗口创建完成');
    setupIpcHandlers();
    console.log('[应用生命周期] IPC 处理程序注册完成');
    registerBoundEventHandlers();
    console.log('[应用生命周期] 绑定事件处理程序注册完成');
    // 中文注释：将全局快捷键注册集中到 hotkey-register.ts
    registerGlobalHotkeys({ toggleAutoKey, ensureDamo });
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

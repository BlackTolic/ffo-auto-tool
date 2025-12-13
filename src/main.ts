import cp from 'child_process';
import { app, BrowserWindow, ipcMain, Notification, screen } from 'electron';
import fs from 'fs'; // 中文注释：读取字典文件
import path from 'path'; // 中文注释：拼接字典路径
import { SCREENSHOT_PATH } from './constant/config';
import { Damo } from './damo/damo';
import { validateEnvironment } from './envCheck'; // 中文注释：引入运行时环境校验
import { damoBindingManager, ffoEvents } from './ffo/events'; // 中文注释：引入事件总线与大漠绑定管理器
import { stopAutoCombat } from './ffo/utils/autoCombat';

// 中文注释：移除未使用的窗口查找辅助函数（逻辑已不再使用，避免冗余）

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

// Initialize Damo wrapper safely
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
}

// 中文注释：向所有渲染进程广播字库信息更新
function broadcastDictInfoUpdated(hwnd: number, info: any) {
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('damo:dictInfoUpdated', { hwnd, info }));
}

// 中文注释：为绑定成功事件注册处理逻辑（加载字库、调试输出、截图与 OCR 示例）
function registerBoundEventHandlers() {
  ffoEvents.on('bound', async ({ pid, hwnd }) => {
    new Notification({ title: '绑定成功', body: `PID=${pid} HWND=${hwnd}` }).show();
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
        const info = rec?.ffoClient?.getCurrentDictInfo?.();
        broadcastDictInfoUpdated(hwnd, info);
      }

      // 中文注释：启动自动打怪（默认配置，可在 autoCombat.ts 中调整）
      // startAutoCombat(rec);

      // 中文注释：示例移动窗口
      rec?.ffoClient?.dm?.MoveWindow(hwnd, 0, 0);

      // 中文注释：获取客户区矩形，输出调试
      const rect = rec?.ffoClient?.getClientRect(hwnd);
      console.log(rect, 'clientRect');

      // 中文注释：调试截图确认识别区域
      const screen_w = dm.GetScreenWidth();
      const screen_h = dm.GetScreenHeight();
      dm?.Capture(0, 150, 400, 450, SCREENSHOT_PATH + '/ocr_debug.png');
      // dm?.Capture(0, 0, screen_w - 1, screen_h - 1, SCREENSHOT_PATH + '/ocr_debug.png');

      const ocrResult = dm?.Ocr(0, 150, 400, 450, '000000-111111', 1.0);
      console.log('[左上角文字识别]', ocrResult);
    } catch (e) {
      console.warn('[OCR识别错误]', String((e as any)?.message || e));
    }
  });
  ffoEvents.on('error', (payload: any) => {
    const msg = typeof payload?.error === 'string' ? payload.error : payload?.error?.message || String(payload?.error);
    console.warn(`[事件错误] pid=${payload?.pid ?? '-'} hwnd=${payload?.hwnd ?? '-'} | ${msg}`);
  });
  ffoEvents.on('unbind', ({ hwnd }) => {
    console.log(`[解绑完成] hwnd=${hwnd}`);
    // 中文注释：停止自动打怪（释放定时器）
    stopAutoCombat(hwnd);
  });
}

// 中文注释：扫描进程并触发绑定（按名称过滤）
function scanProcessesAndBind(targetName: string) {
  cp.exec('tasklist', async function (error, stdout) {
    if (error) {
      console.log(error);
      return;
    }
    if (!stdout) return;
    const list = stdout.split('\n');
    for (const line of list) {
      const processMessage = line.trim().split(/\s+/);
      const processName = processMessage[0];
      if (processName === targetName) {
        const pid = parseInt(processMessage[1]);
        new Notification({ title: '注入幻想进程', body: pid.toString() }).show();
        ffoEvents.emit('bind:pid', { pid });
      }
    }
  });
}

// 中文注释：应用启动入口，负责环境校验、创建窗口、注册事件与进程扫描
function bootstrapApp() {
  const env = validateEnvironment();
  const envCheckOnly = process.env.ENV_CHECK_ONLY === '1';

  console.log('== 环境校验结果 ==');
  for (const item of env.items) {
    console.log(`- ${item.name}: ${item.ok ? 'OK' : 'FAIL'} | ${item.message}`);
  }
  if (!env.ok) {
    console.error('环境校验未通过，程序将退出。');
    new Notification({ title: '环境校验失败', body: '请查看控制台日志并修复环境后重试。' }).show();
    app.quit();
    return;
  }
  if (envCheckOnly) {
    console.log('仅校验模式，应用不创建窗口，退出。');
    app.quit();
    return;
  }

  createWindow();
  registerBoundEventHandlers();
  scanProcessesAndBind('Notepad.exe'); // 中文注释：按需替换目标进程名
}

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
    ];
    channels.forEach((ch) => {
      try {
        ipcMain.removeHandler(ch);
      } catch {}
    });
  } catch (e) {
    console.warn('[退出清理] 移除 IPC handler 失败:', String((e as any)?.message || e));
  }
});

import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import { Damo } from './damo/damo';
import cp from 'child_process'
import { validateEnvironment } from './envCheck'; // 中文注释：引入运行时环境校验
import { screen } from 'electron'; // 中文注释：用于获取显示器 DPI 缩放因子
import { ffoEvents, damoBindingManager } from './ffo/events'; // 中文注释：引入事件总线与大漠绑定管理器
import fs from 'fs'; // 中文注释：读取字典文件
import path from 'path'; // 中文注释：拼接字典路径

// 中文注释：按 PID 查找顶层可见窗口句柄，带重试与枚举回退
async function findHandleByPidWithRetry(dm: any, pid: number, attempts = 5, delayMs = 500): Promise<number> {
  // 中文注释：循环尝试，优先使用 FindWindowByProcessId（可见顶层窗口），失败则使用枚举接口回退
  for (let i = 0; i < attempts; i++) {
    try {
      // 中文注释：首先尝试直接查找顶层可见窗口
      const hwnd = dm.FindWindowByProcessId(pid, '', '');
      if (hwnd && hwnd > 0) {
        return hwnd;
      }
      // 中文注释：回退到枚举（过滤 8=顶级窗口，16=可见窗口），拿到第一个候选
      const listStr: string = dm.EnumWindowByProcessId(pid, '', '', 8 + 16);
      const candidates = String(listStr || '')
        .split(',')
        .map(s => parseInt(s))
        .filter(n => Number.isFinite(n) && n > 0);
      if (candidates.length > 0) {
        return candidates[0];
      }
      // 中文注释：再回退一次，仅匹配顶级窗口（可能目标窗口当前不可见）
      const listTopOnly: string = dm.EnumWindowByProcessId(pid, '', '', 8);
      const topOnly = String(listTopOnly || '')
        .split(',')
        .map(s => parseInt(s))
        .filter(n => Number.isFinite(n) && n > 0);
      if (topOnly.length > 0) {
        return topOnly[0];
      }
    } catch (e) {
      // 中文注释：忽略单次错误，继续重试
      console.warn(`[FindWindowByPID] 尝试 ${i + 1}/${attempts} 失败: ${String((e as any)?.message || e)}`);
    }
    // 中文注释：等待后再次尝试，给窗口创建与显示留时间
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return 0;
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

// 新增：环境校验的 IPC（渲染进程可主动拉取校验结果）
ipcMain.handle('env:check', () => {
  // 中文注释：返回一次性的校验结果对象（包含逐项详情）
  return validateEnvironment();
});

// IPC handlers to access Damo from renderer via preload
ipcMain.handle('damo:ver', () => {
  return ensureDamo().ver();
});

ipcMain.handle('damo:getForegroundWindow', () => {
  return ensureDamo().getForegroundWindow();
});

ipcMain.handle(
  'damo:bindWindow',
  (_event, hwnd: number, display: string, mouse: string, keypad: string, mode: number) => {
    return ensureDamo().bindWindow(hwnd, display, mouse, keypad, mode);
  }
);

ipcMain.handle('damo:unbindWindow', () => {
  return ensureDamo().unbindWindow();
});

ipcMain.handle('damo:getClientRect', (_event, hwnd: number) => {
  // 中文注释：通过 IPC 暴露客户区矩形查询
  return ensureDamo().getClientRect(hwnd);
});

ipcMain.handle('damo:clientToScreen', (_event, hwnd: number, x: number, y: number) => {
  // 中文注释：客户区坐标 -> 屏幕坐标
  return ensureDamo().clientToScreen(hwnd, x, y);
});

ipcMain.handle('damo:screenToClient', (_event, hwnd: number, x: number, y: number) => {
  // 中文注释：屏幕坐标 -> 客户区坐标
  return ensureDamo().screenToClient(hwnd, x, y);
});
ipcMain.handle('damo:getWindowRect', (_event, hwnd: number) => {
  // 中文注释：通过 IPC 暴露窗口矩形查询，返回 x/y/width/height
  return ensureDamo().getWindowRect(hwnd);
});

ipcMain.handle('damo:getWindowInfo', async (_event, hwnd: number) => {
  // 中文注释：聚合返回窗口矩形、客户区矩形和所在显示器的缩放因子
  const dm = ensureDamo();
  const windowRect = await dm.getWindowRect(hwnd);
  const clientRect = await dm.getClientRect(hwnd);
  // 根据窗口左上角找到最近的显示器，获取其 DPI 缩放因子
  const display = screen.getDisplayNearestPoint({ x: windowRect.x, y: windowRect.y });
  const scaleFactor = display.scaleFactor; // 例如 1.25、1.5 等
  return { windowRect, clientRect, scaleFactor };
});

ipcMain.handle('damo:clientCssToScreenPx', async (_event, hwnd: number, xCss: number, yCss: number) => {
  // 中文注释：把客户区 CSS(DIP) 坐标转换为屏幕像素坐标
  const dm = ensureDamo();
  const windowRect = await dm.getWindowRect(hwnd);
  const display = screen.getDisplayNearestPoint({ x: windowRect.x, y: windowRect.y });
  const sf = display.scaleFactor;
  // 先把 CSS(DIP) 转为客户区像素坐标，再用插件转换为屏幕像素坐标
  const xClientPx = Math.round(xCss * sf);
  const yClientPx = Math.round(yCss * sf);
  return dm.clientToScreen(hwnd, xClientPx, yClientPx);
});

ipcMain.handle('damo:screenPxToClientCss', async (_event, hwnd: number, xScreenPx: number, yScreenPx: number) => {
  // 中文注释：把屏幕像素坐标转换为客户区 CSS(DIP) 坐标
  const dm = ensureDamo();
  const windowRect = await dm.getWindowRect(hwnd);
  const display = screen.getDisplayNearestPoint({ x: windowRect.x, y: windowRect.y });
  const sf = display.scaleFactor;
  // 先用插件把屏幕像素转换为客户区像素，再除以缩放因子得到 CSS(DIP)
  const clientPx = await dm.screenToClient(hwnd, xScreenPx, yScreenPx);
  return { x: clientPx.x / sf, y: clientPx.y / sf };
});
ipcMain.handle('damo:getDictInfo', (_event, hwnd?: number) => {
  // 中文注释：查询当前 OCR 使用的字库信息；优先按窗口句柄查询对应实例
  if (typeof hwnd === 'number' && hwnd > 0) {
    const rec = damoBindingManager.get(hwnd);
    if (rec && typeof rec.ffoClient.getCurrentDictInfo === 'function') {
      return rec.ffoClient.getCurrentDictInfo();
    }
    return { activeIndex: null, source: { type: 'unknown' } };
  }
  // 中文注释：否则返回主进程默认实例的字库信息（若存在）
  const dm = ensureDamo();
  if (typeof (dm as any).getCurrentDictInfo === 'function') {
    return (dm as any).getCurrentDictInfo();
  }
  return { activeIndex: null, source: { type: 'unknown' } };
});
app.whenReady().then(() => {
  // 中文注释：启动前进行环境版本与架构校验（在创建窗口与扫描进程之前执行）
  const env = validateEnvironment();
  const envCheckOnly = process.env.ENV_CHECK_ONLY === '1'; // 中文注释：仅校验模式，不创建窗口

  // 打印逐项结果（无论通过与否，都输出便于观察）
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

  // 如果仅校验模式，直接退出，不创建窗口与后续逻辑
  if (envCheckOnly) {
    console.log('仅校验模式，应用不创建窗口，退出。');
    app.quit();
    return;
  }

  // 创建主窗口（环境校验通过后）
  createWindow();

  // 中文注释：在环境校验通过后再进行进程扫描与大漠绑定逻辑
  cp.exec('tasklist', async function (error, stdout) {
    if (error) {
      console.log(error)
      return
    }
    // console.log('进程列表:', stdout)
    if (!stdout) return
    const list = stdout.split('\n')
    for (const line of list) {
      const processMessage = line.trim().split(/\s+/)
      const processName = processMessage[0] // 中文注释：processMessage[0]进程名称 ， processMessage[1]进程id
      // if (processName === 'qqfo.exe') {
        if (processName === 'Notepad.exe') {
        // 中文注释：判断进程为 wegame.exe，拿到进程 id（注意可能存在多个 wegame 实例，可按需扩展条件）
        const pid = parseInt(processMessage[1])
        // Electron 的系统通知功能
        new Notification({ title: '注入幻想进程', body: pid.toString() }).show()
        // 中文注释：通过事件总线触发按 PID 的多窗口绑定（每个窗口独立实例化大漠对象）
        ffoEvents.emit('bind:pid', { pid });
      }
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  // 中文注释：注册事件监听，便于观察绑定成功与错误
  ffoEvents.on('bound', async ({ pid, hwnd }) => {
    // 中文注释：绑定成功通知并做一个简单示例：移动窗口到(0,0)
    new Notification({ title: '绑定成功', body: `PID=${pid} HWND=${hwnd}` }).show();
    const rec = damoBindingManager.get(hwnd);
    if (!rec) return;
    try {
      // 中文注释：优先从候选路径加载字典，按顺序尝试；成功后启用索引 0
      const dm = rec?.ffoClient?.dm; // 中文注释：底层大漠 COM 对象
      const dictCandidates = [
        // path.join(process.cwd(), 'ocr.dict'),
        // path.join(process.cwd(), 'src', 'lib', 'test.dict.txt'),
         path.join(process.cwd(), 'src', 'lib', 'test.dict.txt'),
      ];
      let dictLoaded = false;
      for (const p of dictCandidates) {
        if (fs.existsSync(p)) {
          try {
            const ret = await rec?.ffoClient?.loadDictFromFileAsync(0, p);
            if (ret === 1) {
              dm?.UseDict(0);
              console.log(`[OCR字典] 已加载 ${path.basename(p)} 并启用索引 0`);
              dictLoaded = true;
              // 中文注释：字库加载成功后，向渲染进程广播当前字库信息
              const info = rec?.ffoClient?.getCurrentDictInfo?.();
              BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('damo:dictInfoUpdated', { hwnd, info }));
              break;
            } else {
              console.warn(`[OCR字典] SetDict 返回值=${ret} | 路径=${p}`);
            }
          } catch (err) {
            console.warn(`[OCR字典] 加载失败: ${p} | ${String((err as any)?.message || err)}`);
          }
        }
      }
      if (!dictLoaded) {
        dm?.UseDict(0);
        console.log('[OCR字典] 使用默认字典索引 0（未找到或加载失败）');
        // 中文注释：即便未加载成功，也广播当前字库信息（通常为默认索引）
        const info = rec?.ffoClient?.getCurrentDictInfo?.();
        BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('damo:dictInfoUpdated', { hwnd, info }));
      }

      // 中文注释：示例移动窗口
      rec?.ffoClient?.dm?.MoveWindow(hwnd, 0, 0);

      // 中文注释：获取客户区矩形，输出调试
      const rect = rec?.ffoClient?.getClientRect(hwnd);
      console.log(rect, 'clientRect');

      // 中文注释：调试截图确认识别区域
      dm?.Capture(0, 150, 400, 450, 'ocr_debug.bmp');

      // 中文注释：在识别区域内抽样取色，确认前景文字是否为黑字或白字
      const sampleColors = [
        dm?.GetColor(10, 160),
        dm?.GetColor(200, 300),
        dm?.GetColor(390, 440),
      ];
      console.log('[OCR取色样本]', sampleColors);

      // 中文注释：辅助函数：把 RRGGBB 转为亮度（0~255），用于判断前景是白字还是黑字
      const toBrightness = (hex: any): number => {
        const s = String(hex || '000000');
        const r = parseInt(s.slice(0, 2), 16) || 0;
        const g = parseInt(s.slice(2, 4), 16) || 0;
        const b = parseInt(s.slice(4, 6), 16) || 0;
        // 中文注释：使用加权亮度公式（更符合人眼感知）
        return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      };
      const brightnessList = sampleColors.map(c => toBrightness(c));
      const avgBrightness = Math.round(
        brightnessList.reduce((a, b) => a + b, 0) / (brightnessList.length || 1)
      );
      console.log('[OCR亮度统计] 点亮度=', brightnessList, '平均亮度=', avgBrightness);

      // 中文注释：根据平均亮度估计文字颜色（深色文本 vs 浅色文本），并准备候选掩码
      const isWhiteText = avgBrightness >= 180; // 中文注释：>=180 认为区域主要是浅色（白字）
      const maskCandidates = isWhiteText
        ? ['D0D0D0-FFFFFF', 'C0C0C0-FFFFFF'] // 中文注释：白字掩码（含抗锯齿浅灰）
        : ['000000-202020', '000000-303030']; // 中文注释：黑字掩码（含抗锯齿深灰）

      // 中文注释：相似度阈值候选，从宽到严，逐步尝试提高命中概率
      const simCandidates = [0.55, 0.5, 0.6];

      // 中文注释：遍历掩码与相似度组合，直到获得非空识别结果
      let ocrResult: string = '';
      outer: for (const mask of maskCandidates) {
        for (const sim of simCandidates) {
          const r = dm?.Ocr(0, 150, 400, 450, mask, sim);
          console.log(`[OCR尝试] mask=${mask} sim=${sim} =>`, r);
          if (r && String(r).trim().length > 0) {
            ocrResult = String(r);
            break outer;
          }
        }
      }

      // 中文注释：若仍为空，最后再用默认黑字掩码+更低相似度兜底
      if (!ocrResult || ocrResult.trim().length === 0) {
        const fallback = dm?.Ocr(0, 150, 400, 450, '000000-202020', 0.48);
        console.log('[OCR兜底] mask=000000-202020 sim=0.48 =>', fallback);
        if (fallback && String(fallback).trim().length > 0) {
          ocrResult = String(fallback);
        }
      }

      console.log('[左上角文字识别]', ocrResult);
    } catch (e) {
      // 中文注释：忽略单次错误，继续
      console.warn('[OCR识别错误]', String((e as any)?.message || e));
    }
  });
  ffoEvents.on('error', (payload: any) => {
    const msg = typeof payload?.error === 'string' ? payload.error : (payload?.error?.message || String(payload?.error));
    console.warn(`[事件错误] pid=${payload?.pid ?? '-'} hwnd=${payload?.hwnd ?? '-'} | ${msg}`);
  });
  ffoEvents.on('unbind', ({ hwnd }) => {
    console.log(`[解绑完成] hwnd=${hwnd}`);
  });
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
    ];
    channels.forEach((ch) => {
      try { ipcMain.removeHandler(ch); } catch {}
    });
  } catch (e) {
    console.warn('[退出清理] 移除 IPC handler 失败:', String((e as any)?.message || e));
  }
});

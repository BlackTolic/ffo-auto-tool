import { ipcMain, screen } from 'electron';
import { validateEnvironment } from '../envCheck';

// 中文注释：集中注册主进程的所有 IPC 通道，避免分散在各处导致结构混乱
export function registerIpcHandlers(deps: {
  // 中文注释：获取（或懒加载）单例大漠实例的方法
  ensureDamo: () => any;
  // 中文注释：大漠绑定管理器（用于按 PID 绑定多个窗口等）
  damoBindingManager: any;
  // 中文注释：自动按键切换函数（用于 Alt+W 逻辑的渲染层 IPC）
  // toggleAutoKey: (keyName?: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10', intervalMs?: number) => any;
}) {
  const { ensureDamo, damoBindingManager } = deps;

  // 环境校验
  ipcMain.handle('env:check', () => validateEnvironment());

  // 大漠版本
  ipcMain.handle('damo:ver', () => ensureDamo().ver());

  // 获取前台窗口句柄
  ipcMain.handle('damo:getForegroundWindow', () => ensureDamo().getForegroundWindow());

  // 绑定窗口
  ipcMain.handle('damo:bindWindow', (_event, hwnd: number, display: string, mouse: string, keypad: string, mode: number) => {
    return ensureDamo().bindWindow(hwnd, display, mouse, keypad, mode);
  });

  // 解绑窗口
  ipcMain.handle('damo:unbindWindow', () => ensureDamo().unbindWindow());

  // 获取客户区矩形
  ipcMain.handle('damo:getClientRect', (_event, hwnd: number) => ensureDamo().getClientRect(hwnd));

  // 客户区坐标转换为屏幕坐标
  ipcMain.handle('damo:clientToScreen', (_event, hwnd: number, x: number, y: number) => ensureDamo().clientToScreen(hwnd, x, y));

  // 屏幕坐标转换为客户区坐标
  ipcMain.handle('damo:screenToClient', (_event, hwnd: number, x: number, y: number) => ensureDamo().screenToClient(hwnd, x, y));

  // 获取窗口矩形（含边框）
  ipcMain.handle('damo:getWindowRect', (_event, hwnd: number) => ensureDamo().getWindowRect(hwnd));

  // 获取窗口信息（窗口矩形、客户矩形、缩放因子）
  ipcMain.handle('damo:getWindowInfo', async (_event, hwnd: number) => {
    const dm = ensureDamo();
    const windowRect = await dm.getWindowRect(hwnd);
    const clientRect = await dm.getClientRect(hwnd);
    const displayInfo = screen.getDisplayNearestPoint({ x: windowRect.x, y: windowRect.y });
    const scaleFactor = displayInfo.scaleFactor;
    return { windowRect, clientRect, scaleFactor };
  });

  // CSS 像素坐标（客户端）转屏幕像素坐标
  ipcMain.handle('damo:clientCssToScreenPx', async (_event, hwnd: number, xCss: number, yCss: number) => {
    const dm = ensureDamo();
    const windowRect = await dm.getWindowRect(hwnd);
    const displayInfo = screen.getDisplayNearestPoint({ x: windowRect.x, y: windowRect.y });
    const sf = displayInfo.scaleFactor;
    const xClientPx = Math.round(xCss * sf);
    const yClientPx = Math.round(yCss * sf);
    return dm.clientToScreen(hwnd, xClientPx, yClientPx);
  });

  // 屏幕像素坐标转 CSS 像素坐标（客户端）
  ipcMain.handle('damo:screenPxToClientCss', async (_event, hwnd: number, x: number, y: number) => {
    const dm = ensureDamo();
    const windowRect = await dm.getWindowRect(hwnd);
    const displayInfo = screen.getDisplayNearestPoint({ x: windowRect.x, y: windowRect.y });
    const sf = displayInfo.scaleFactor;
    const clientPx = await dm.screenToClient(hwnd, x, y);
    return { x: clientPx.x / sf, y: clientPx.y / sf };
  });

  // 获取当前字库信息（支持按 hwnd 获取绑定实例字库）
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

  // 自动按键切换（渲染层调用）
  // ipcMain.handle('autoKey:toggle', (_event, keyName: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' = 'F1', intervalMs: number = 200) => toggleAutoKey(keyName, intervalMs));

  // 绑定前台窗口所属进程的所有子窗口（通过绑定管理器）
  ipcMain.handle('ffo:bindForeground', async () => {
    try {
      const dm = ensureDamo();
      const hwnd = dm.getForegroundWindow();
      if (!hwnd || hwnd <= 0) {
        return { ok: false, message: '未检测到前台窗口' };
      }
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

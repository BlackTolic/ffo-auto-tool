import { ipcMain, screen } from 'electron';
import { execSync } from 'child_process'; // 中文注释：用于在缺少路径时回退查询进程名
// 中文注释：使用大漠插件进行枚举（不再依赖天使插件）
import { validateEnvironment } from '../envCheck';

// 中文注释：可绑定窗口的信息接口（在主进程内部使用）
interface BindableWindowInfo {
  hwnd: number; // 中文注释：窗口句柄（用于后续绑定）
  pid: number; // 中文注释：所属进程 PID（用于分组/日志）
  title: string; // 中文注释：窗口标题（便于用户识别）
  className: string; // 中文注释：窗口类名（便于技术筛选）
  processPath?: string; // 中文注释：所属进程的可执行文件全路径
  exeName?: string; // 中文注释：所属进程的可执行文件名（例如 fo.exe）
}

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
      const pid = dm.getWindowProcessId?.(hwnd) ?? (dm as any).dm?.GetWindowProcessId?.(hwnd);
      if (!pid || pid <= 0) {
        return { ok: false, hwnd, message: '无法获取前台窗口 PID' };
      }
      const count = await damoBindingManager.bindWindowsForPid(pid);
      return { ok: count > 0, count, hwnd, pid, message: count > 0 ? '绑定成功' : '未找到可绑定窗口' };
    } catch (e) {
      return { ok: false, message: (e as any)?.message || String(e) };
    }
  });

  // 新增：列出“当前可绑定”的窗口信息（全局顶层可见窗口）
  ipcMain.handle('ffo:listBindableWindows', async (): Promise<BindableWindowInfo[]> => {
    try {
      const dm = ensureDamo();
      // 中文注释：使用大漠插件枚举所有顶层且可见的窗口
      const raw = String(dm.enumWindow?.(0, '', '', 8 + 16) || '');
      const hwnds = raw
        .split(',')
        .map(s => parseInt(s))
        .filter(n => Number.isFinite(n) && n > 0);

      // 中文注释：回退解析函数 - 通过 tasklist 获取 PID 对应的 exe 名称
      const resolveExeByPid = (pid: number): { exeName?: string; processPath?: string } => {
        try {
          const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV`, { encoding: 'utf8' });
          const lines = out.trim().split(/\r?\n/);
          if (lines.length >= 2) {
            const row = lines[1];
            const parts = row.split(',').map(s => s.replace(/^\"|\"$/g, ''));
            const image = parts[0] || '';
            // 中文注释：tasklist不提供路径，这里仅填充exe名
            return { exeName: image || undefined };
          }
        } catch {}
        return {};
      };

      const items: BindableWindowInfo[] = [];
      for (const h of hwnds) {
        const pid = dm.getWindowProcessId?.(h) ?? (dm as any).dm?.GetWindowProcessId?.(h) ?? 0;
        // 中文注释：获取进程路径与可执行名（若接口存在）
        const processPath: string = String((dm as any).dm?.GetWindowProcessPath?.(h) || '');
        let exeName: string = processPath ? require('path').basename(processPath) : '';
        if (!exeName && pid) {
          // 中文注释：回退到 tasklist 解析 exe 名
          const resolved = resolveExeByPid(pid);
          exeName = resolved.exeName || '';
        }
        items.push({
          hwnd: h,
          pid,
          title: String(dm.getWindowTitle?.(h) || ''),
          className: String(dm.getWindowClass?.(h) || ''),
          processPath: processPath || undefined,
          exeName: exeName || undefined,
        });
      }

      // 中文注释：去重处理，避免极少数重复句柄
      const seen = new Set<number>();
      const dedup = items.filter(it => {
        if (seen.has(it.hwnd)) return false;
        seen.add(it.hwnd);
        return true;
      });

      return dedup;
    } catch (e) {
      // 中文注释：异常时返回空数组，避免渲染层报错
      return [];
    }
  });

  // 新增：列出当前已绑定窗口信息（通过绑定管理器）
  ipcMain.handle('ffo:listBoundWindows', async (): Promise<BindableWindowInfo[]> => {
    try {
      // 中文注释：从绑定管理器获取已绑定记录，并补充标题/类名
      const list = damoBindingManager.list();
      const items: BindableWindowInfo[] = [];
      const dm = ensureDamo();
      const resolveExeByPid = (pid: number): { exeName?: string } => {
        try {
          const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV`, { encoding: 'utf8' });
          const lines = out.trim().split(/\r?\n/);
          if (lines.length >= 2) {
            const row = lines[1];
            const parts = row.split(',').map(s => s.replace(/^\"|\"$/g, ''));
            const image = parts[0] || '';
            return { exeName: image || undefined };
          }
        } catch {}
        return {};
      };
      for (const rec of list) {
        const hwnd = rec.hwnd;
        const pid = rec.pid;
        // 中文注释：优先使用对应客户端获取信息，兼容性更好
        const client = rec.ffoClient;
        const title = String(client.getWindowTitle?.(hwnd) || '');
        const className = String(client.getWindowClass?.(hwnd) || '');
        // 中文注释：补充进程路径与可执行文件名
        const processPath: string = String((dm as any).dm?.GetWindowProcessPath?.(hwnd) || '');
        let exeName: string = processPath ? require('path').basename(processPath) : '';
        if (!exeName && pid) {
          exeName = resolveExeByPid(pid).exeName || '';
        }
        items.push({ hwnd, pid, title, className, processPath: processPath || undefined, exeName: exeName || undefined });
      }
      return items;
    } catch (e) {
      return [];
    }
  });

  // 新增：按选定句柄执行绑定（通过绑定管理器）
  ipcMain.handle('ffo:bindHwnd', async (_event, hwnd: number) => {
    try {
      const ok = await damoBindingManager.bindWindow(hwnd);
      return { ok, hwnd, message: ok ? '绑定成功' : '绑定失败' };
    } catch (e) {
      return { ok: false, hwnd, message: (e as any)?.message || String(e) };
    }
  });

  // 新增：按选定句柄执行解绑（通过绑定管理器）
  ipcMain.handle('ffo:unbindHwnd', async (_event, hwnd: number) => {
    try {
      const ok = await damoBindingManager.unbindWindow(hwnd);
      return { ok, hwnd, message: ok ? '解绑成功' : '解绑失败，未找到绑定记录' };
    } catch (e) {
      return { ok: false, hwnd, message: (e as any)?.message || String(e) };
    }
  });
}

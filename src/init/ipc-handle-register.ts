import { execSync } from 'child_process'; // 中文注释：用于在缺少路径时回退查询进程名
import { BrowserWindow, ipcMain, screen } from 'electron';
// 中文注释：使用大漠插件进行枚举（不再依赖天使插件）
import { validateEnvironment } from '../envCheck';
import { pauseCurActive as pauseWuLeiNanJiao, stopCurActive as stopWuLeiNanJiao, toggleWuLeiNanJiao } from '../ffo/events/game-actions/wu-lei-nan-jiao'; // 中文注释：引入无泪南郊切换/暂停/停止逻辑供 IPC 调用

// 中文注释：可绑定窗口的信息接口（在主进程内部使用）
interface BindableWindowInfo {
  hwnd: number; // 中文注释：窗口句柄（用于后续绑定）
  pid: number; // 中文注释：所属进程 PID（用于分组/日志）
  title: string; // 中文注释：窗口标题（便于用户识别）
  className: string; // 中文注释：窗口类名（便于技术筛选）
  processPath?: string; // 中文注释：所属进程的可执行文件全路径
  exeName?: string; // 中文注释：所属进程的可执行文件名（例如 fo.exe）
  name?: string;
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
        const processPath: string = String((dm as any).dm?.GetWindowProcessPath?.(h) || '');
        let exeName: string = processPath ? require('path').basename(processPath) : '';
        if (!exeName && pid) {
          const resolved = resolveExeByPid(pid);
          exeName = resolved.exeName || '';
        }
        let name: string | undefined;
        try {
          const role = typeof damoBindingManager.getRole === 'function' ? damoBindingManager.getRole(h) : undefined;
          if (role && typeof role.getName === 'function') {
            name = role.getName() || undefined;
          }
        } catch {}
        items.push({
          hwnd: h,
          pid,
          title: String(dm.getWindowTitle?.(h) || ''),
          className: String(dm.getWindowClass?.(h) || ''),
          processPath: processPath || undefined,
          exeName: exeName || undefined,
          name,
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
        const client = rec.ffoClient;
        const title = String(client.getWindowTitle?.(hwnd) || '');
        const className = String(client.getWindowClass?.(hwnd) || '');
        const processPath: string = String((dm as any).dm?.GetWindowProcessPath?.(hwnd) || '');
        let exeName: string = processPath ? require('path').basename(processPath) : '';
        if (!exeName && pid) {
          exeName = resolveExeByPid(pid).exeName || '';
        }
        let name: string | undefined;
        try {
          const role = typeof damoBindingManager.getRole === 'function' ? damoBindingManager.getRole(hwnd) : undefined;
          if (role && typeof role.getName === 'function') {
            name = role.getName() || undefined;
          }
        } catch {}
        items.push({ hwnd, pid, title, className, processPath: processPath || undefined, exeName: exeName || undefined, name });
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

  // 新增：批量清空所有已绑定窗口（通过绑定管理器）
  ipcMain.handle('ffo:unbindAll', async () => {
    try {
      // 中文注释：记录清空前的绑定数量，便于反馈给渲染层
      const before = Array.isArray(damoBindingManager.list()) ? damoBindingManager.list().length : 0;
      // 中文注释：逐个调用解绑，确保插件状态一致
      await damoBindingManager.unbindAll();
      return { ok: true, count: before, message: '已清空所有绑定窗口' };
    } catch (e) {
      return { ok: false, message: (e as any)?.message || String(e) };
    }
  });

  // 设置当前选中的窗口句柄
  ipcMain.handle('damo:setSelectHwnd', (_event, hwnd: number | null) => {
    damoBindingManager.selectHwnd = hwnd;
    return { ok: true };
  });
}

// 新增：窗口控制 - 最小化当前窗口
ipcMain.handle('window:minimize', event => {
  // 中文注释：通过事件的 sender 找到对应的 BrowserWindow
  const win = BrowserWindow.fromWebContents(event.sender);
  // 中文注释：若找到窗口则执行最小化
  win?.minimize();
});

// 新增：窗口控制 - 关闭当前窗口
ipcMain.handle('window:close', event => {
  // 中文注释：通过事件的 sender 找到对应的 BrowserWindow
  const win = BrowserWindow.fromWebContents(event.sender);
  // 中文注释：若找到窗口则执行关闭
  win?.close();
});

// 中文注释：无泪南郊 - 切换自动寻路（渲染进程调用）
ipcMain.handle('ffo:wuLeiNanJiao:toggle', async () => {
  try {
    const ret = toggleWuLeiNanJiao();
    return ret; // 中文注释：返回切换结果（含running/错误信息）
  } catch (e) {
    return { ok: false, message: (e as any)?.message || String(e) };
  }
});

// 中文注释：无泪南郊 - 暂停当前动作（渲染进程调用）
ipcMain.handle('ffo:wuLeiNanJiao:pause', async () => {
  try {
    pauseWuLeiNanJiao();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as any)?.message || String(e) };
  }
});

// 中文注释：无泪南郊 - 停止当前动作（渲染进程调用）
ipcMain.handle('ffo:wuLeiNanJiao:stop', async () => {
  try {
    stopWuLeiNanJiao();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as any)?.message || String(e) };
  }
});

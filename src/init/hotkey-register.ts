import { globalShortcut, Notification } from 'electron';
import type { Damo } from '../damo/damo';
import { damoBindingManager } from '../ffo/events';

// 中文注释：集中管理全局快捷键的注册逻辑，避免分散在 main.ts
// - Alt+W：切换自动按键，仅作用当前前台且已绑定的窗口
// - Alt+B：绑定当前前台窗口所属进程的所有候选窗口
// 通过依赖注入复用主进程已有方法，避免循环依赖
export function registerGlobalHotkeys(deps: {
  // 中文注释：切换自动按键（由主进程提供实现）
  toggleAutoKey: (
    keyName?: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10',
    intervalMs?: number
  ) => { ok: boolean; running?: boolean; hwnd?: number; key?: string; intervalMs?: number; message?: string };
  // 中文注释：提供大漠实例的工厂函数（主进程懒加载实例）
  ensureDamo: () => Damo;
}) {
  // 中文注释：Alt+W 切换自动按键
  try {
    const ok = globalShortcut.register('Alt+W', () => {
      const ret = deps.toggleAutoKey('F1', 200);
      const msg = ret.ok ? `[快捷键] Alt+W 切换成功 | hwnd=${ret.hwnd} running=${ret.running}` : `[快捷键] Alt+W 切换失败 | ${ret.message}`;
      console.log(msg);
    });
    if (!ok) console.warn('[快捷键] Alt+W 注册失败');
  } catch (e) {
    console.warn('[快捷键] Alt+W 注册异常：', (e as any)?.message || e);
  }

  // 中文注释：Alt+B 绑定当前前台窗口所属进程
  try {
    const okBind = globalShortcut.register('Alt+B', async () => {
      try {
        const dm = deps.ensureDamo();
        const hwnd = dm.getForegroundWindow();
        if (!hwnd || hwnd <= 0) {
          console.log('[快捷键] Alt+B 失败 | 未检测到前台窗口');
          return;
        }
        const pid = (dm as any).dm?.GetWindowProcessId?.(hwnd);
        if (!pid || pid <= 0) {
          console.log(`[快捷键] Alt+B 失败 | 无法获取 PID | hwnd=${hwnd}`);
          return;
        }
        const count = await damoBindingManager.bindWindowsForPid(pid);
        const msg = count > 0 ? `[快捷键] Alt+B 绑定成功 | pid=${pid} hwnd=${hwnd} count=${count}` : `[快捷键] Alt+B 未找到可绑定窗口 | pid=${pid} hwnd=${hwnd}`;
        console.log(msg);
        new Notification({ title: count > 0 ? '绑定成功' : '绑定失败', body: `PID=${pid} HWND=${hwnd} COUNT=${count}` }).show();
      } catch (err) {
        console.warn('[快捷键] Alt+B 异常：', (err as any)?.message || err);
      }
    });
    if (!okBind) console.warn('[快捷键] Alt+B 注册失败');
  } catch (e) {
    console.warn('[快捷键] Alt+B 注册异常：', (e as any)?.message || e);
  }
}

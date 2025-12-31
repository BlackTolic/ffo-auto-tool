import { globalShortcut } from 'electron';
import { ensureDamo } from '../damo/damo';
import { damoBindingManager } from '../ffo/events';
import { formTo, moveToNearAim } from '../ffo/utils/base-opr/move';
import { startKeyPress, stopKeyPress } from '../ffo/utils/key-press';
import { startRolePositionPolling } from '../ffo/utils/ocr-check/role-position';

// 中文注释：记录每个窗口当前是否开启了自动按键
const autoKeyOnByHwnd = new Map<number, boolean>();

// 负责控制按键按下、停止、检查是否先于绑定
export const toggleAutoKey = (
  keyName: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' = 'F1',
  intervalMs: number = 90
): { ok: boolean; running?: boolean; hwnd?: number; key?: string; intervalMs?: number; message?: string } => {
  // 中文注释：获取当前前台窗口句柄（操作系统层面的活动窗口）
  let hwnd = 0;
  try {
    const dm = ensureDamo();
    // 中文注释：获取当前前台窗口句柄（操作系统层面的活动窗口）
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

  // 中文注释：获取绑定记录
  const rec = damoBindingManager.get(hwnd);
  if (!rec) {
    return { ok: false, hwnd, message: `找不到绑定记录：hwnd=${hwnd}` };
  }

  // 中文注释：根据当前状态判断是否需要启动或停止自动按键
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
    // 中文注释：记录按键状态
    autoKeyOnByHwnd.set(hwnd, true);
    return { ok: true, running: true, hwnd, key: keyName, intervalMs };
  }
};

// 中文注释：集中管理全局快捷键的注册逻辑，避免分散在 main.ts
// - Alt+W：切换自动按键，仅作用当前前台且已绑定的窗口
// - Alt+B：绑定当前前台窗口所属进程的所有候选窗口（修复原 Alt+Q 冲突）
// - Alt+R：启动当前前台窗口的角色坐标轮询（每秒一次）
// 通过依赖注入复用主进程已有方法，避免循环依赖
export function registerGlobalHotkeys() {
  // 中文注释：Alt+W 切换自动按键
  try {
    const ok = globalShortcut.register('Alt+W', () => {
      const ret = toggleAutoKey('F1', 90);
      const msg = ret.ok ? `[快捷键] Alt+W 切换成功 | hwnd=${ret.hwnd} running=${ret.running}` : `[快捷键] Alt+W 切换失败 | ${ret.message}`;
      console.log(msg);
    });
    if (!ok) console.warn('[快捷键] Alt+W 注册失败', ok);
  } catch (e) {
    console.warn('[快捷键] Alt+W 注册异常：', (e as any)?.message || e);
  }

  // 中文注释：Alt+B 绑定当前前台窗口所属进程（避免 Alt+Q 导致部分输入法/系统热键冲突）
  try {
    const okBind = globalShortcut.register('Alt+Q', async () => {
      try {
        const dm = ensureDamo();
        // 中文注释：获取当前前台窗口句柄
        const hwnd = dm.getForegroundWindow();
        console.log('[快捷键] Alt+Q 检测到前台窗口', hwnd);
        if (!hwnd || hwnd <= 0) {
          console.log('[快捷键] Alt+Q 失败 | 未检测到前台窗口');
          return;
        }
        // 中文注释：获取窗口所属进程 ID
        const pid = (dm as any).dm?.GetWindowProcessId?.(hwnd);
        console.log('[快捷键] Alt+Q 检测到 PID', pid);
        if (!pid || pid <= 0) {
          console.log(`[快捷键] Alt+Q 失败 | 无法获取 PID | hwnd=${hwnd}`);
          return;
        }
        // 中文注释：避免绑定自身 Electron 主进程窗口，防止钩子影响稳定性
        if (pid === process.pid) {
          console.log('[快捷键] Alt+Q 忽略 | 当前前台窗口属于本程序，请先激活游戏窗口');
          return;
        }
        const count = await damoBindingManager.bindWindowsForPid(pid);
        console.log('[绑定次数', count);
        const msg = count > 0 ? `[快捷键] Alt+Q 绑定成功 | pid=${pid} hwnd=${hwnd} count=${count}` : `[快捷键] Alt+Q 未找到可绑定窗口 | pid=${pid} hwnd=${hwnd}`;
        console.log(msg);
      } catch (err) {
        console.warn('[快捷键] Alt+Q 异常：', (err as any)?.message || err);
      }
    });
    if (!okBind) console.warn('[快捷键] Alt+Q 注册失败');
  } catch (e) {
    console.warn('[快捷键] Alt+B 注册异常：', (e as any)?.message || e);
  }

  // 中文注释：Alt+R 启动当前前台窗口的角色坐标轮询（每秒一次）
  try {
    const okRole = globalShortcut.register('Alt+R', () => {
      try {
        const dm = ensureDamo();
        const hwnd = dm.getForegroundWindow();
        if (!hwnd || hwnd <= 0) {
          console.log('[快捷键] Alt+R 失败 | 未检测到前台窗口', hwnd);
          return;
        }
        if (!damoBindingManager.isBound(hwnd)) {
          console.log('[快捷键] Alt+R 失败 | 当前前台窗口未绑定');
          return;
        }
        console.log(`[快捷键] Alt+R 开始轮询 | hwnd=${hwnd}`);
        const rec = damoBindingManager.get(hwnd);

        if (!rec) {
          console.log(`[快捷键] Alt+R 失败 | 找不到绑定记录 | hwnd=${hwnd}`);
          return;
        }

        const posCallback = (pos: any) => {
          console.log(`[角色坐标] 轮询到坐标 | hwnd=${hwnd}`, pos);
          // upLeftMoveTo();
          // leftMoveTo(rec.ffoClient.dm);

          formTo(rec.ffoClient.dm, pos.x, pos.y, 191, 90);
          if (pos && moveToNearAim(rec.ffoClient.dm, pos.x, pos.y, 191, 90, 10)) {
            console.log('已到达目的地：', pos);
            return;
          }
          if (pos) {
            console.log(`[角色坐标] x=${pos.x} y=${pos.y} | text=${pos.text}`);
            // 中文注释：获取到角色坐标后，尝试移动到目标坐标
            if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
              // 中文注释：假设目标坐标为 (pos.x + 100, pos.y + 50)，可根据实际需求调整
              try {
                // 中文注释：移动鼠标到目标坐标并点击
                // leftMoveTo();
                console.log(`[角色坐标] 已移动到目标坐标 | x=${pos.x} y=${pos.y}`);
              } catch (moveErr) {
                console.warn('[角色坐标] 移动失败：', (moveErr as any)?.message || moveErr);
              }
            } else {
              console.warn('[角色坐标] 坐标无效，无法移动');
            }
          } else {
            console.warn('[角色坐标] 未识别到坐标');
          }
        };

        // 中文注释：启动每秒轮询角色坐
        startRolePositionPolling({ rec, onUpdate: posCallback, intervalMs: 1000 });
        console.log(`[快捷键] Alt+R 已启动坐标轮询 | hwnd=${hwnd}`);
      } catch (err) {
        console.warn('[快捷键] Alt+R 异常：', (err as any)?.message || err);
      }
    });
    if (!okRole) console.warn('[快捷键] Alt+R 注册失败');
  } catch (e) {
    console.warn('[快捷键] Alt+R 注册异常：', (e as any)?.message || e);
  }
}

import { globalShortcut } from 'electron';
import { ensureDamo } from '../damo/damo';
import { damoBindingManager } from '../ffo/events';
import { MoveActions } from '../ffo/events/move';
import { AttackActions } from '../ffo/events/skills';
import { startKeyPress, stopKeyPress } from '../ffo/utils/key-press';

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
      // 中文注释：Alt+R 切换自动寻路（第一次开启，第二次关闭）
      // const ret = toggleAutoRoute({
      //   // path: FeiJiToYangJian,
      //   path: [
      //     // { x: 106, y: 48 },
      //     // { x: 127, y: 57 },
      //     // { x: 144, y: 49 },
      //     // { x: 123, y: 38 },
      //     // 天泉
      //     { x: 169, y: 73 },
      //     { x: 193, y: 111 },
      //     { x: 140, y: 117 },
      //     { x: 93, y: 73 },
      //     { x: 101, y: 55 },
      //     { x: 155, y: 37 },
      //     { x: 231, y: 71 },
      //     { x: 247, y: 62 },
      //     { x: 222, y: 42 },
      //     { x: 190, y: 30 },
      //     { x: 183, y: 21 },
      //     { x: 135, y: 18 },
      //     { x: 86, y: 39 },
      //     { x: 52, y: 66 },
      //     { x: 65, y: 91 },
      //     { x: 73, y: 96 },
      //   ],
      // });
      // {193 12}
      // 自动打怪
      // const ret = toggleAutoAttack();
      // const msg = ret.ok ? `[快捷键] Alt+R 切换自动打怪成功 | hwnd=${ret.hwnd} running=${ret.running}` : `[快捷键] Alt+R 切换自动打怪失败 | ${ret.message}`;
      // console.log(msg);
    });
    if (!okRole) console.warn('[快捷键] Alt+R 注册失败');
  } catch (e) {
    console.warn('[快捷键] Alt+R 注册异常：', (e as any)?.message || e);
  }
}

// 中文注释：记录每个窗口的自动寻路操作实例（用于 Alt+R 开/关切换）
const autoRouteActionsByHwnd = new Map<number, MoveActions>();

// 中文注释：记录每个窗口的自动打怪操作实例（用于 Alt+R 开/关切换）
const autoAttackActionsByHwnd = new Map<number, AttackActions>();

// 中文注释：自动寻路启动参数接口
export interface AutoRouteStartOptions {
  path?: Array<{ x: number; y: number }>; // 中文注释：寻路目标点数组（客户区坐标），默认使用两个示例点
  intervalMs?: number; // 中文注释：轮询间隔（毫秒），用于内部调用（当前实现固定 300ms）
}

// 中文注释：自动寻路切换返回结果
export interface AutoRouteToggleResult {
  ok: boolean; // 中文注释：操作是否成功
  running?: boolean; // 中文注释：当前是否处于运行状态
  hwnd?: number; // 中文注释：本次操作作用的窗口句柄
  message?: string; // 中文注释：失败或提示信息
}

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleAutoRoute = (opts?: AutoRouteStartOptions): AutoRouteToggleResult => {
  try {
    const dm = ensureDamo();
    const hwnd = dm.getForegroundWindow();
    if (!hwnd || hwnd <= 0) {
      return { ok: false, message: '未检测到前台窗口' };
    }
    if (!damoBindingManager.isBound(hwnd)) {
      return { ok: false, hwnd, message: '当前前台窗口未绑定' };
    }

    const role = damoBindingManager.getRole(hwnd);
    if (!role) {
      return { ok: false, hwnd, message: `找不到角色记录：hwnd=${hwnd}` };
    }

    // 中文注释：获取或创建持久化的 MoveActions 实例
    let actions = autoRouteActionsByHwnd.get(hwnd);
    if (!actions) {
      actions = new MoveActions(role);
      autoRouteActionsByHwnd.set(hwnd, actions);
    }

    // 中文注释：若已有定时器在运行，则本次切换为“关闭”
    if (actions.timer) {
      actions.stopAutoFindPath();
      return { ok: true, hwnd, running: false };
    }

    // 中文注释：否则启动自动寻路
    // const defaultPath = [
    //   { x: 305, y: 72 },
    //   { x: 335, y: 126 },
    // ];
    const path = opts?.path?.length ? opts.path : [];
    const active = new AttackActions(role);
    actions.startAutoFindPath(path, active).then(res => {
      setTimeout(() => {
        console.log('完成跑步后对话', role.position);
        // const conversation = new Conversation(role);
        // conversation.YangJian();
        active.scanMonster().then(res => {
          console.log('当前已经没有怪物了', role.position);
          setTimeout(() => {
            console.log('回城', role.position);
          }, 1000);
        });
      }, 1000);
    });
    return { ok: true, hwnd, running: true };
  } catch (err) {
    return { ok: false, message: String((err as any)?.message || err) };
  }
};

export const toggleAutoAttack = () => {
  try {
    const dm = ensureDamo();
    const hwnd = dm.getForegroundWindow();
    if (!hwnd || hwnd <= 0) {
      return { ok: false, message: '未检测到前台窗口' };
    }
    if (!damoBindingManager.isBound(hwnd)) {
      return { ok: false, hwnd, message: '当前前台窗口未绑定' };
    }

    const role = damoBindingManager.getRole(hwnd);
    if (!role) {
      return { ok: false, hwnd, message: `找不到角色记录：hwnd=${hwnd}` };
    }

    // 中文注释：获取或创建持久化的 AttackActions 实例
    let actions = autoAttackActionsByHwnd.get(hwnd);
    if (!actions) {
      actions = new AttackActions(role);
      autoAttackActionsByHwnd.set(hwnd, actions);
    }

    // 中文注释：若已有定时器在运行，则本次切换为“关闭”
    if (actions.timer) {
      actions.stopAutoSkill();
      console.log('[快捷键] Alt+R 停止自动打怪');
      return { ok: true, hwnd, running: false };
    }

    // 中文注释：否则启动自动打怪
    actions.attackNearestMonster();
    return { ok: true, hwnd, running: true };
  } catch (err) {
    return { ok: false, message: String((err as any)?.message || err) };
  }
};

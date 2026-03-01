import { globalShortcut } from 'electron';
import { ensureDamo } from '../auto-plugin/index';
import { OCR_NAN_JIAO_MONSTER } from '../ffo/constant/monster-feature';
import { damoBindingManager } from '../ffo/events';
import { AttackActions } from '../ffo/events/attack-action';
import { toggleYunHuang1West } from '../ffo/events/game-actions/yun1';
import { startKeyPress, stopKeyPress } from '../ffo/utils/key-press';
import { logger } from '../utils/logger';

// 中文注释：记录每个窗口当前是否开启了自动按键
const autoKeyOnByHwnd = new Map<number, boolean>();

// 注册快捷键
const registerHotkey = (keyName: string, callback: (dm?: any, pid?: number) => any) => {
  try {
    const ok = globalShortcut.register(keyName, () => {
      if (typeof callback !== 'function') {
        return;
      }
      const dm = ensureDamo();
      // 中文注释：获取当前前台窗口句柄
      const hwnd = dm.getForegroundWindow();
      damoBindingManager.selectHwnd = hwnd;
      if (!hwnd || hwnd <= 0) {
        logger.warn('[快捷键] 未检测到前台窗口');
        return;
      }
      // 中文注释：获取窗口所属进程 ID
      const pid = (dm as any).dm?.GetWindowProcessId?.(hwnd);
      const ret = callback(dm, pid);
      if (ret) logger.info(`[快捷键] ${keyName} 触发`, ret);
    });
    if (!ok) logger.warn(`[快捷键] ${keyName} 注册失败`, ok);
  } catch (e) {
    logger.warn(`[快捷键] ${keyName} 注册异常：`, (e as any)?.message || e);
  }
};

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
      logger.warn('[自动按键] 停止失败：', (e as any)?.message || e);
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

// 通过依赖注入复用主进程已有方法，避免循环依赖
export function registerGlobalHotkeys() {
  // Alt+Q绑定句柄
  registerHotkey('Alt+Q', async (dm, pid) => {
    if (!pid || pid <= 0) {
      logger.info('[快捷键] Alt+Q 失败 | 无法获取 PID');
      return;
    }
    return await damoBindingManager.bindWindowsForPid(pid);
  });

  // registerHotkey('Alt+1', async (dm, pid) => {
  //   if (!pid || pid <= 0) {
  //     logger.info('[快捷键] Alt+1 失败 | 无法获取 PID');
  //     return;
  //   }
  //   return await damoBindingManager.bindWindowsForPid(pid);
  // });

  // 中文注释：Alt+W 切换自动按键
  // registerHotkey('Alt+W', () => toggleAutoKey('F1', 90));

  // Alt+1 跑名誉
  // registerHotkey('Alt+1', () => toggleMingYu());

  // Alt + S 云荒1层刷怪
  registerHotkey('Alt+S', () => toggleYunHuang1West());

  // 幻幽平原刷怪
  // registerHotkey('Alt+2', () => toggleHuanYouPinYuan1());
}

// 中文注释：记录每个窗口的自动打怪操作实例（用于 Alt+R 开/关切换）
const autoAttackActionsByHwnd = new Map<number, AttackActions>();

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
      actions = new AttackActions(role, OCR_NAN_JIAO_MONSTER);
      autoAttackActionsByHwnd.set(hwnd, actions);
    }

    // 中文注释：若已有定时器在运行，则本次切换为“关闭”
    if (actions.timer) {
      actions.stopAutoSkill();
      logger.info('[快捷键] Alt+R 停止自动打怪');
      return { ok: true, hwnd, running: false };
    }

    // 中文注释：否则启动自动打怪
    actions.attackNearestMonster();
    return { ok: true, hwnd, running: true };
  } catch (err) {
    return { ok: false, message: String((err as any)?.message || err) };
  }
};

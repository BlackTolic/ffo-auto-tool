// 刷天泉

import { damoBindingManager } from '..';
import { logger } from '../../../utils/logger';
import { OCR_NAN_JIAO_MONSTER } from '../../constant/monster-feature';
import { isArriveAimNear } from '../../utils/common';
import { MoveActions } from '../move';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';

const LOOP_INIT_POS = { x: 227, y: 53 };

const pos = [
  // 无泪南郊
  { x: 178, y: 47 },
  { x: 143, y: 55 },
  { x: 102, y: 71 },
  { x: 70, y: 68 },
  { x: 76, y: 99 },
  { x: 117, y: 102 },
  { x: 156, y: 120 },
  { x: 211, y: 119 },
  { x: 202, y: 146 },
  { x: 262, y: 110 },
  { x: 257, y: 77 },
  { x: 182, y: 85 },
  { x: 175, y: 50 },
  LOOP_INIT_POS,
];

// 中文注释：自动寻路切换返回结果
export interface AutoRouteToggleResult {
  ok: boolean; // 中文注释：操作是否成功
  running?: boolean; // 中文注释：当前是否处于运行状态
  hwnd?: number; // 中文注释：本次操作作用的窗口句柄
  message?: string; // 中文注释：失败或提示信息
}

export class WuLeiNanJiaoAction {
  private static instanceMap = new Map<number, WuLeiNanJiaoAction>();
  public role: Role;
  private actions: MoveActions;
  private active: AttackActions;

  constructor(role: Role) {
    this.role = role;
    this.actions = new MoveActions(role);
    this.active = new AttackActions(role, OCR_NAN_JIAO_MONSTER);
  }

  public static getInstance(): WuLeiNanJiaoAction | null {
    const hwnd = damoBindingManager.selectHwnd;
    if (!hwnd || !damoBindingManager.isBound(hwnd)) {
      logger.info('未选择已绑定的窗口', hwnd);
      return null;
    }
    const role = damoBindingManager.getRole(hwnd);
    if (!role) {
      return null;
    }

    if (!this.instanceMap.has(hwnd)) {
      this.instanceMap.set(hwnd, new WuLeiNanJiaoAction(role));
    }
    return this.instanceMap.get(hwnd)!;
  }

  public start() {
    // 在(227,53)附近开启循环
    this.role.addIntervalActive({
      taskName: '无泪南郊练级',
      loopOriginPos: LOOP_INIT_POS,
      action: () => {
        logger.info('无泪南郊练级任务启动！', this.role.position);
        this.actions.startAutoFindPath(pos, this.active).then(res => {
          this.role.updateTaskStatus('done');
          logger.info('无泪南郊练级任务完成！', this.role.position);
        });
      },
      interval: 5000,
    });
  }

  public stop() {
    this.role.clearIntervalActive();
    this.actions.stopAutoFindPath();
  }

  public isRunning(): boolean {
    return !!(this.actions.timer || this.role.hasActiveTask());
  }

  public pause() {
    this.actions.stopAutoFindPath();
  }

  public restart() {
    this.actions.startAutoFindPath(pos, this.active);
  }
}

let curAction: WuLeiNanJiaoAction | null = null;

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleWuLeiNanJiao = (): AutoRouteToggleResult => {
  try {
    curAction = WuLeiNanJiaoAction.getInstance();
    if (!curAction) {
      return { ok: false, message: '未检测到前台窗口角色' };
    }
    // 检查当前位置是否是在无泪南郊循环触发点
    if (!isArriveAimNear(curAction.role.position, LOOP_INIT_POS, 10)) {
      return { ok: false, message: '当前位置不在无泪南郊循环触发点，无法开启自动寻路' };
    }
    if (curAction?.isRunning()) {
      curAction.stop();
      return { ok: true, running: false };
    } else {
      curAction?.start();
      return { ok: true, running: true };
    }
  } catch (err) {
    return { ok: false, message: String((err as any)?.message || err) };
  }
};

export const pauseCurActive = () => {
  curAction?.pause();
};

export const restartCurActive = () => {
  curAction?.restart();
};

// 中文注释：停止当前激活的无泪南郊动作（清空任务并停止自动寻路）
export const stopCurActive = () => {
  curAction?.stop();
};

// 刷天泉

import { damoBindingManager } from '..';
import { logger } from '../../../utils/logger';
import { OCR_BI_YI_WEI_MONSTER } from '../../constant/monster-feature';
import { isArriveAimNear } from '../../utils/common';
import { AttackActions } from '../attack-action';
import { AutoFindPathConfig, MoveActions } from '../move-action';
import { Role } from '../rolyer';

const LOOP_INIT_POS = { x: 52, y: 83 };

const pos = [
  // 无泪南郊
  { x: 64, y: 78 },
  { x: 75, y: 71 },
  { x: 91, y: 66 },
  { x: 103, y: 61 },
  { x: 117, y: 69 },
  { x: 112, y: 85 },
  { x: 84, y: 93 },
  { x: 88, y: 108 },
  { x: 102, y: 112 },
  { x: 119, y: 108 },
  { x: 119, y: 92 },
  { x: 99, y: 89 },
  { x: 76, y: 87 },
  LOOP_INIT_POS,
];

// 中文注释：自动寻路切换返回结果
export interface AutoRouteToggleResult {
  ok: boolean; // 中文注释：操作是否成功
  running?: boolean; // 中文注释：当前是否处于运行状态
  hwnd?: number; // 中文注释：本次操作作用的窗口句柄
  message?: string; // 中文注释：失败或提示信息
}

export class BiYiCityNorthAction {
  private static instanceMap = new Map<number, BiYiCityNorthAction>();
  public role: Role;
  private moveAction: MoveActions;
  private attackAction: AttackActions;

  constructor(role: Role) {
    this.role = role;
    this.moveAction = new MoveActions(role, { offsetR: 250 });
    this.attackAction = new AttackActions(role, { monsterFeature: OCR_BI_YI_WEI_MONSTER, findMosterOffset: { x: 10, y: 80 } });
  }

  public static getInstance(): BiYiCityNorthAction | null {
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
      this.instanceMap.set(hwnd, new BiYiCityNorthAction(role));
    }
    return this.instanceMap.get(hwnd)!;
  }

  public start() {
    const autoFindPathConfig: AutoFindPathConfig = {
      toPos: pos,
      actions: this.attackAction,
      attackMode: 'moveAndAttack',
      refreshTime: 300,
    };
    // 添加buff
    this.attackAction.addBuff();
    // 在(227,53)附近开启循环
    this.role.addIntervalActive({
      taskName: '比翼练级',
      loopOriginPos: LOOP_INIT_POS,
      action: () => {
        const { x, y } = this.role.position || { x: 'null', y: 'null' };
        logger.info(`[比翼练级] 比翼练级任务启动！, 当前位置: ${x}, ${y}`);
        this.moveAction.startAutoFindPath(autoFindPathConfig).then(res => {
          this.role.updateTaskStatus('done');
          logger.info(`[比翼练级] 比翼练级任务完成！, 当前位置: ${this.role.position?.x || 'null'}, ${this.role.position?.y || 'null'}`);
        });
      },
      interval: 5000,
    });
  }

  public stop() {
    this.role.clearIntervalActive();
    this.moveAction.stopAutoFindPath();
  }

  public isRunning(): boolean {
    return this.role.hasActiveTask();
  }

  public pause() {
    this.moveAction.stopAutoFindPath();
  }

  public restart() {
    const autoFindPathConfig = {
      toPos: pos,
      actions: this.attackAction,
    };
    this.moveAction.startAutoFindPath(autoFindPathConfig);
  }
}

let curAction: BiYiCityNorthAction | null = null;

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleBiYiCityNorth = (): AutoRouteToggleResult => {
  try {
    curAction = BiYiCityNorthAction.getInstance();
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

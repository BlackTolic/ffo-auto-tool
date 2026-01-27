// 刷天泉

import { damoBindingManager } from '..';
import { OCR_PAN_GUI_MONSTER } from '../../constant/monster-feature';
import { isArriveAimNear } from '../../utils/common';
import { MoveActions } from '../move';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';

const LOOP_INIT_POS = { x: 154, y: 44 };

const pos = [
  // 无泪南郊
  { x: 184, y: 42 },
  { x: 176, y: 51 },
  { x: 194, y: 31 },
  { x: 219, y: 41 },
  { x: 224, y: 60 },
  { x: 210, y: 79 },
  { x: 193, y: 62 },
  { x: 170, y: 51 },
  { x: 158, y: 58 },
  LOOP_INIT_POS,
];

// 中文注释：自动寻路切换返回结果
export interface AutoRouteToggleResult {
  ok: boolean; // 中文注释：操作是否成功
  running?: boolean; // 中文注释：当前是否处于运行状态
  hwnd?: number; // 中文注释：本次操作作用的窗口句柄
  message?: string; // 中文注释：失败或提示信息
}

export class HuanYouPinYuan1Action {
  private static instanceMap = new Map<number, HuanYouPinYuan1Action>();
  public role: Role;
  private actions: MoveActions;
  private active: AttackActions;

  constructor(role: Role) {
    this.role = role;
    this.actions = new MoveActions(role);
    this.active = new AttackActions(role, OCR_PAN_GUI_MONSTER);
  }

  public static getInstance(): HuanYouPinYuan1Action | null {
    const hwnd = damoBindingManager.selectHwnd;
    if (!hwnd || !damoBindingManager.isBound(hwnd)) {
      console.log('未选择已绑定的窗口', hwnd);
      return null;
    }
    const role = damoBindingManager.getRole(hwnd);
    console.log(role, 'role,');
    if (!role) {
      return null;
    }

    if (!this.instanceMap.has(hwnd)) {
      this.instanceMap.set(hwnd, new HuanYouPinYuan1Action(role));
    }
    return this.instanceMap.get(hwnd)!;
  }

  public start() {
    // 在(227,53)附近开启循环
    this.role.addIntervalActive({
      taskName: '幻幽平原一层练级',
      loopOriginPos: LOOP_INIT_POS,
      action: () => {
        console.log('幻幽平原一层练级任务启动！', this.role.position);
        this.actions.startAutoFindPath(pos, this.active).then(res => {
          this.role.updateTaskStatus('done');
          console.log('幻幽平原一层练级任务完成！', this.role.position);
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

let curAction: HuanYouPinYuan1Action | null = null;

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleHuanYouPinYuan1 = (): AutoRouteToggleResult => {
  try {
    curAction = HuanYouPinYuan1Action.getInstance();
    if (!curAction) {
      return { ok: false, message: '未检测到前台窗口角色' };
    }
    console.log(curAction.role.position, LOOP_INIT_POS, 'curAction.role.position,');
    // 检查当前位置是否是在无泪南郊循环触发点
    if (!isArriveAimNear(curAction.role.position, LOOP_INIT_POS, 10)) {
      return { ok: false, message: '当前位置不在幻幽平原一层循环触发点，无法开启自动寻路' };
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

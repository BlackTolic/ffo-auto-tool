// 刷天泉

import { damoBindingManager } from '..';
import { ensureDamo } from '../../../auto-plugin/index';
import { OCR_MONSTER } from '../../constant/monster-feature';
import { TianDu } from '../../constant/NPC_position';
import { isArriveAimNear } from '../../utils/common';
import { BaseAction } from '../base-action';
import { Conversation } from '../conversation';
import { MoveActions } from '../move';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';

const pos = [
  // 天泉
  { x: 169, y: 73 },
  { x: 193, y: 111 },
  { x: 140, y: 117 },
  { x: 93, y: 73 },
  { x: 101, y: 55 },
  { x: 155, y: 37 },
  { x: 231, y: 71 },
  { x: 251, y: 69 },
  { x: 227, y: 48 },
  { x: 190, y: 30 },
  { x: 183, y: 21 },
  { x: 135, y: 18 },
  { x: 86, y: 39 },
  { x: 52, y: 66 },
  { x: 65, y: 91 },
  { x: 72, y: 92 },
];

// 中文注释：自动寻路切换返回结果
export interface AutoRouteToggleResult {
  ok: boolean; // 中文注释：操作是否成功
  running?: boolean; // 中文注释：当前是否处于运行状态
  hwnd?: number; // 中文注释：本次操作作用的窗口句柄
  message?: string; // 中文注释：失败或提示信息
}

export class TianQuanAction {
  private static instanceMap = new Map<number, TianQuanAction>();
  private role: Role;
  private actions: MoveActions;
  private active: AttackActions;

  constructor(role: Role) {
    this.role = role;
    this.actions = new MoveActions(role);
    this.active = new AttackActions(role, OCR_MONSTER);
  }

  public static getInstance(hwnd: number): TianQuanAction | null {
    if (!damoBindingManager.isBound(hwnd)) {
      return null;
    }
    const role = damoBindingManager.getRole(hwnd);
    if (!role) {
      return null;
    }

    if (!this.instanceMap.has(hwnd)) {
      this.instanceMap.set(hwnd, new TianQuanAction(role));
    }
    return this.instanceMap.get(hwnd)!;
  }

  public start() {
    const loopAction = () => {
      console.log('开始跑步', this.role.position);
      new MoveActions(this.role).startAutoFindPath(TianDu.杨戬).then(() => {
        if (isArriveAimNear(this.role.position, TianDu.杨戬)) {
          console.log('到达位置杨戬位置', this.role.position);
          new Conversation(this.role).YangJian().then(res => {
            console.log('完成与杨戬的对话');
            this.actions.startAutoFindPath(pos, this.active).then(res => {
              setTimeout(() => {
                this.active.scanMonster().then(res => {
                  console.log('当前已经没有怪物了', this.role.position);
                  setTimeout(() => {
                    new BaseAction(this.role).backCity({ x: 291, y: 124 });
                  }, 1000);
                });
              }, 1000);
            });
          });
        }
      });
    };
    // 在仓库管理员处进行循环
    this.role.addIntervalActive({ taskName: '刷天泉', loopOriginPos: { x: 291, y: 124 }, action: loopAction, interval: 10000 });
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

let curAction: TianQuanAction | null = null;

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleTianquan = (): AutoRouteToggleResult => {
  try {
    const dm = ensureDamo();
    const hwnd = dm.getForegroundWindow();
    curAction = TianQuanAction.getInstance(hwnd);
    if (curAction?.isRunning()) {
      curAction.stop();
      return { ok: true, hwnd, running: false };
    } else {
      curAction?.start();
      return { ok: true, hwnd, running: true };
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

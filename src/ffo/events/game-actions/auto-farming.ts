import { damoBindingManager } from '..';
import { OCR_NAN_JIAO_MONSTER } from '../../constant/monster-feature';
import { isArriveAimNear } from '../../utils/common';
import { MoveActions, Pos } from '../move';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';

// 中文注释：自动寻路切换返回结果
export interface AutoRouteToggleResult {
  ok: boolean; // 中文注释：操作是否成功
  running?: boolean; // 中文注释：当前是否处于运行状态
  hwnd?: number; // 中文注释：本次操作作用的窗口句柄
  message?: string; // 中文注释：失败或提示信息
}

export class AutoFarmingAction {
  private static instanceMap = new Map<number, AutoFarmingAction>();
  public role: Role;
  private actions: MoveActions; // 移动
  private active: AttackActions; // 攻击
  private initPos: Pos; // 初始化位置
  private pathPos: Pos[]; // 寻路位置
  private taskName: string; // 任务名称

  constructor(initPos: Pos, pathPos: Pos[], taskName: string) {
    const hwnd = damoBindingManager.selectHwnd;
    if (!hwnd || !damoBindingManager.isBound(hwnd)) {
      console.log('未选择已绑定的窗口', hwnd);
      throw new Error('未选择已绑定的窗口');
    }
    const role = damoBindingManager.getRole(hwnd);
    if (!role) {
      throw new Error('未选择已绑定的窗口');
    }
    this.role = role;
    this.initPos = initPos;
    this.pathPos = [...pathPos, initPos];
    this.actions = new MoveActions(role);
    this.active = new AttackActions(role, OCR_NAN_JIAO_MONSTER);
    this.taskName = taskName;
  }

  public static getInstance(initPos: Pos, pathPos: Pos[], taskName: string): AutoFarmingAction {
    const hwnd = damoBindingManager.selectHwnd;
    if (!hwnd || !damoBindingManager.isBound(hwnd)) {
      console.log('未选择已绑定的窗口', hwnd);
      throw new Error('未选择已绑定的窗口');
    }
    const role = damoBindingManager.getRole(hwnd);
    if (!role) {
      throw new Error('未选择已绑定的窗口');
    }

    if (!this.instanceMap.has(hwnd)) {
      const action = new AutoFarmingAction(initPos, pathPos, taskName);
      this.instanceMap.set(hwnd, action);
      return action;
    }
    return this.instanceMap.get(hwnd)!;
  }

  public start(loopAction?: () => void) {
    // 中文注释：在(154,44)附近开启循环
    this.role.addIntervalActive({
      taskName: this.taskName,
      loopOriginPos: this.initPos,
      action:
        typeof loopAction === 'function'
          ? loopAction
          : () => {
              console.log(`${this.taskName}任务启动！`, this.role.position);
              this.actions.startAutoFindPath(this.pathPos, this.active).then(res => {
                this.role.updateTaskStatus('done');
                console.log(`本轮${this.taskName}任务完成！`, this.role.position);
              });
            },
      interval: 5000,
    });
  }

  // 中文注释：停止自动寻路
  public stop() {
    this.role.clearIntervalActive();
    this.actions.stopAutoFindPath();
  }

  // 中文注释：检查是否正在运行
  public isRunning(): boolean {
    return !!(this.actions.timer || this.role.hasActiveTask());
  }

  // 中文注释：暂停自动寻路
  public pause() {
    this.actions.stopAutoFindPath();
  }

  // 中文注释：重新启动自动寻路
  public restart() {
    this.actions.startAutoFindPath(this.pathPos, this.active);
  }

  // 中文注释：切换自动寻路（第一次开启，第二次关闭）
  public toggle(): AutoRouteToggleResult {
    try {
      if (!isArriveAimNear(this.role.position, this.initPos, 10)) {
        return { ok: false, message: `当前位置不在${this.taskName}循环触发点，无法开启自动寻路` };
      }
      if (this.isRunning()) {
        this.stop();
        return { ok: true, running: false };
      } else {
        this.start();
        return { ok: true, running: true };
      }
    } catch (err) {
      return { ok: false, message: String((err as any)?.message || err) };
    }
  }
}

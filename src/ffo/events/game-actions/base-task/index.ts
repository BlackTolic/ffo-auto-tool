import { isArriveAimNear } from '../../../utils/common';
import { AttackActions, AttackActionsOptions } from '../../attack-action';
import { MoveActions, MoveConfig } from '../../move-action';
import { Role } from '../../rolyer';

/**
 * 打怪方式：
 * 1. 一边移动一边攻击
 * 2. 达到目标点后开启扫描攻击
 *
 * 攻击方式
 * 1. 直接普通攻击
 * 2. 近战群攻
 * 3. 远程群攻
 * 4. 单体攻击
 */

export interface InitLoopPos {
  x: number;
  y: number;
  map: string;
}

export interface BaseTaskConfig {
  taskName: string;
  role: Role;
  moveActionConfig?: MoveConfig;
  attackActionConfig?: AttackActionsOptions;
}

export interface TaskProp {
  taskName: string;
  initLoopPos: InitLoopPos;
  action: () => void;
  interval: number;
}

export class BaseTask {
  public taskName: string;
  public role: Role;
  public moveAction: MoveActions;
  public attackAction: AttackActions;
  private taskList: TaskProp[] = [];
  private currentTask: TaskProp | null = null;

  constructor(props: BaseTaskConfig) {
    const { taskName, role, moveActionConfig, attackActionConfig } = props;
    this.taskName = taskName;
    this.role = role;
    this.moveAction = new MoveActions(role, moveActionConfig);
    this.attackAction = new AttackActions(role, attackActionConfig);
  }

  // 注册任务列表
  registerTaskList(taskList: TaskProp[]) {
    // this.role.addIntervalActive(taskList);
    this.taskList = taskList;
    this.loopTask();
  }

  // 到达循环点后循环执行任务
  loopTask() {
    // 任务队列执行
    if (!this.taskList?.length) return;
    // 过滤出可执行的任务
    const takeTask = this.taskList.filter(item => isArriveAimNear(this.role.position, item.initLoopPos, 10));
    if (takeTask.length) {
      this.currentTask = takeTask[0];
      this.currentTask.action();
      // 继续执行循环任务
      this.loopTask();
    }
  }
}

import logger from '../../../utils/logger';
import { debounce } from '../../../utils/tool';
import { OCR_MING_YU_BOSS } from '../../constant/monster-feature';
import { createStuckChecker } from '../../utils/common/rolyer';
import { AttackActions } from '../attack-action';
import { BaseAction } from '../base-action';
import { MoveActions } from '../move-action';
import { Role } from '../rolyer';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '虚空之境刷怪';

const INIT_POS = { x: 278, y: 79 };
// const INIT_POS = { x: 155, y: 25 };

const PATH_POS = [
  { x: 326, y: 92 },
  { x: 175, y: 50 },
  { x: 194, y: 31 },
  { x: 219, y: 41 },
  { x: 224, y: 60 },
  { x: 210, y: 79 },
  { x: 193, y: 62 },
  { x: 170, y: 51 },
  { x: 158, y: 58 },
];

const delay5S = debounce((fn: (...args: any[]) => void, ...args: any[]) => fn.apply(this, args), 5 * 1000, true);
// const delay1M = debounce((fn: (...args: any[]) => void, ...args: any[]) => fn.apply(this, args), 60 * 1000, true);

interface RoleTaskItem {
  role: Role | null;
  moveActions?: MoveActions | null;
  baseAction?: BaseAction | null;
  attackActions?: AttackActions | null;
}

export default class MingYuTask {
  private taskName = TASK_NAME;
  private autoFarmingAction: AutoFarmingAction | null = null; // 自动寻路操作
  private baseAction: BaseAction | null = null;
  private moveActions: MoveActions | null = null;
  private attackActions: AttackActions | null = null;

  constructor(private role?: Role) {
    if (!role) {
      throw new Error('请先注册角色');
    }
    this.role = role;
    this.baseAction = new BaseAction(role);
    this.moveActions = new MoveActions(role);
    this.attackActions = new AttackActions(role);
  }

  // 启动任务分工
  startMingYuTask() {
    try {
      this.autoFarmingAction = AutoFarmingAction.getInstance({
        initPos: INIT_POS,
        pathPos: PATH_POS,
        ocrMonster: OCR_MING_YU_BOSS,
        taskName: TASK_NAME,
      });
      if (!this.role) {
        throw new Error('请先注册角色');
      }
      // 挂机前置操作
      this.baseAction?.preMount();
      // 回城并且重置任务
      const goBackCityAndResetTask = async () => {
        try {
          // 停止正在执行的任务
          await this.moveActions?.stopAutoFindPath({ x: 610, y: 630 });
          // 回城
          logger.info('[静止检查] 执行回城并且重置任务 - goBackCityAndResetTask');
          await this.baseAction?.backCity(INIT_POS, 'F9', true);
          this.role?.updateTaskStatus('done');
        } catch (e) {
          // 按esc键退出任务
          this.baseAction?.pressKeyboard('esc');
          logger.error('回城并且重置任务失败', e);
        }
      };

      // 检查名誉是否卡住
      const checkMingYuStuck = createStuckChecker(this.role);
      // 添加组队拒绝
      const soldierRole = this.role;
      this.role.updateTeamApplyCall(async closePos => {
        // 拒绝组队
        if (closePos) {
          await soldierRole.bindPlugin?.moveToClick(closePos.x, closePos.y);
        }
      });
      // 注册全局任务
      this.role.addGlobalStrategyTask([
        {
          // 3分钟检查一次跑名誉是否卡住，然后回城重置任务
          name: '跑名誉过程中2分钟静止不动',
          condition: () => checkMingYuStuck(2),
          callback: () => delay5S(goBackCityAndResetTask),
        },
      ]);

      // 这里只需要调用soldier一个人的循环任务就行了，其他人作为辅助
      // const taskList = [{ taskName: this.taskName, loopOriginPos: INIT_POS, action: () => this.loopAction(), interval: 2000 }];
      return this.autoFarmingAction.toggle();
    } catch (e) {
      // 按ESC键退出任务
      this.baseAction?.pressKeyboard('esc');
      logger.error('启动任务分工失败', e);
    }
  }

  // 循环任务
  async loopAction() {
    if (!this.role || !this.moveActions || !this.baseAction) {
      throw new Error('请先注册角色');
    }
    const soldierAttackActions = this.attackActions;
    const soldierRole = this.role;
    const soldierMoveActions = this.moveActions;
    const soldierBaseAction = this.baseAction;
    try {
      const dm = soldierRole.bindPlugin;
      // 屏蔽所有人
      await soldierBaseAction.blockAllPlayers();

      // 更新状态
      soldierRole.updateTaskStatus('done');
    } catch (e) {
      logger.error('跑名誉任务失败', e);
    }
  }
}

export const mingYuTask = new MingYuTask();

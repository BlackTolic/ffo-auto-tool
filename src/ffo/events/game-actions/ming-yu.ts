import logger from '../../../utils/logger';
import { debounce } from '../../../utils/tool';
import { OCR_MING_YU_BOSS } from '../../constant/monster-feature';
import { createStuckChecker, getBindWindowInfo } from '../../utils/common/rolyer';
import { checkMountedByRoleSpeed } from '../../utils/ocr-check/base';
import { AttackActions, AttackActionsOptions } from '../attack-action';
import { BaseAction } from '../base-action';
import { Conversation } from '../conversation';
import { MoveActions } from '../move-action';
import {
  fromAntHillToSunsetDune,
  fromChengJiaoToMingYuNPC,
  fromLostTempleToMingYuBoss,
  fromLouLanToChengJiao,
  fromMingYuNPCToAntHill,
  fromSunsetDuneToSunsetDuneWest,
  fromSunsetDuneWestToSphinx,
} from '../move-action/lou-lan';
import { Role } from '../rolyer';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '跑名誉';

const INIT_POS = { x: 278, y: 79 };

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

const skillGroup: AttackActionsOptions['skillGroup'] = [
  { key: 'F1', interval: 6 * 1000, sort: 2, type: 'delay' }, // 攻击技能
  { key: 'F2', interval: 5 * 1000, sort: 3, type: 'delay' }, // 攻击技能
  { key: 'F4', interval: 1 * 700, sort: 1, type: 'lock' },
]; // 攻击技能

// let autoFarmingAction: AutoFarmingAction | null = null;

const delay5S = debounce((fn: (...args: any[]) => void, ...args: any[]) => fn.apply(this, args), 5 * 1000, true);
// const delay1M = debounce((fn: (...args: any[]) => void, ...args: any[]) => fn.apply(this, args), 60 * 1000, true);

// // 名誉回调任务
// const loopAction = async (role: Role, moveActions: MoveActions) => {
//   let atackActions = new AttackActions(role, { monsterFeature: OCR_MING_YU_BOSS, skillGroup });
//   const baseAction = new BaseAction(role);
//   try {
//     const dm = role.bindPlugin;
//     // 屏蔽所有人
//     baseAction.blockAllPlayers();
//     // 宠物激活,需要使用的宠物必须放在第一个格子上
//     await baseAction.openPetBoxAndActivePet();
//     // 喂养宠物
//     await baseAction.openPetBoxAndFeed();
//     // 检查当前是否是坐骑状态
//     const isMounted = checkMountedByRoleSpeed(dm, role.bindWindowSize);
//     if (!isMounted) {
//       // 上马
//       await baseAction.pressSecondSkillBarSkill('F9');
//     }
//     const isArriveChengJiao = await fromLouLanToChengJiao(moveActions);
//     if (!isArriveChengJiao) {
//       throw new Error('未到达城郊');
//     }
//     // 从城郊到名誉NPC
//     const isArriveMingYuNPC = await fromChengJiaoToMingYuNPC(moveActions);
//     if (!isArriveMingYuNPC) {
//       throw new Error('未到达名誉NPC');
//     }
//     const isConversationRongGuang = await new Conversation(role).RongGuang();
//     if (!isConversationRongGuang) {
//       throw new Error('未完成领取名誉任务');
//     }
//     // 从名誉NPC到蚂蚁沙地北边
//     const isArriveAntHill = await fromMingYuNPCToAntHill(moveActions);
//     if (!isArriveAntHill) {
//       throw new Error('未到达蚂蚁沙地北边');
//     }
//     // 从蚂蚁沙地北到落日沙丘
//     const isArriveSunsetDune = await fromAntHillToSunsetDune(moveActions);
//     if (!isArriveSunsetDune) {
//       throw new Error('未到达落日沙丘');
//     }
//     // 从落日沙丘到落日沙丘西
//     const isArriveSunsetDuneWest = await fromSunsetDuneToSunsetDuneWest(moveActions);
//     if (!isArriveSunsetDuneWest) {
//       throw new Error('未到达落日沙丘西');
//     }
//     // 从落日沙丘西到斯芬尼克
//     const isArriveSphinx = await fromSunsetDuneWestToSphinx(moveActions);
//     if (!isArriveSphinx) {
//       throw new Error('未到达斯芬尼克');
//     }
//     // 与斯芬尼克对话
//     const isConversationSphinx = await new Conversation(role).Sphinx();
//     if (!isConversationSphinx) {
//       throw new Error('未完成与斯芬尼克对话');
//     }
//     // 从斯芬尼克出口到失落神殿BOSS
//     const isArriveLostTemple = await fromLostTempleToMingYuBoss(moveActions);
//     if (!isArriveLostTemple) {
//       throw new Error('未到达失落神殿BOSS');
//     }
//     // 下马
//     await baseAction.pressSecondSkillBarSkill('F9');
//     // role.bindDm.delay(1000);
//     // 添加buff
//     // atackActions.addBuff();
//     // 开始攻击怪物
//     await atackActions.scanMonster({ attackType: 'single', attackRange: { x: 321, y: 130, r: 15 } });
//     // 停止添加buff
//     // atackActions.stopAddBuff();
//     // role.bindDm.delay(2000);
//     logger.info('当前已经没有怪物了', role.position);
//     role.bindDm.delay(1000);
//     // 回城
//     await new BaseAction(role).backCity({ x: 278, y: 79 }, 'F9');
//     role.bindDm.delay(2000);
//     // 更新状态
//     role.updateTaskStatus('done');
//   } catch (e) {
//     logger.error('跑名誉任务失败', e);
//   }
// };

// // 中文注释：切换自动寻路（第一次开启，第二次关闭）
// export const toggleMingYu = () => {
//   autoFarmingAction = AutoFarmingAction.getInstance({
//     initPos: INIT_POS,
//     pathPos: PATH_POS,
//     ocrMonster: OCR_MING_YU_BOSS,
//     taskName: TASK_NAME,
//   });

//   const { role } = getBindWindowInfo();
//   const baseAction = new BaseAction(role);
//   const moveActions = new MoveActions(role);

//   // 挂机前置操作
//   baseAction.preMount();

//   // 回城并且重置任务
//   const goBackCityAndResetTask = async () => {
//     // 停止正在执行的任务
//     moveActions.stopAutoFindPath();
//     // 回城
//     logger.info('[静止检查] 执行回城并且重置任务 - goBackCityAndResetTask');
//     await baseAction.backCity(INIT_POS, 'F9', true);
//     role.updateTaskStatus('done');
//   };

//   // 检查名誉是否卡住
//   const checkMingYuStuck = createStuckChecker(role);
//   // 添加组队拒绝
//   role.updateTeamApplyCall(closePos => {
//     // 拒绝组队
//     closePos && role.bindPlugin.moveToClick(closePos.x, closePos.y);
//   });
//   // 注册全局任务
//   role.addGlobalStrategyTask([
//     {
//       // 3分钟检查一次跑名誉是否卡住，然后回城重置任务
//       name: '跑名誉过程中3分钟静止不动',
//       condition: () => checkMingYuStuck(3),
//       callback: () => delay5S(goBackCityAndResetTask),
//     },
//     // {
//     //   // 安全锁弹出之后，输入密码
//     //   name: '安全锁弹出之后，输入密码',
//     //   condition: () => checkPasswordLock(role.bindPlugin, role.bindWindowSize || '1600*900'),
//     //   callback: () => delay1M(() => baseAction.inputPassword('666666')),
//     // },
//   ]);

//   const taskList = [{ taskName: '楼兰跑名誉', loopOriginPos: INIT_POS, action: () => loopAction(role, moveActions), interval: 2000 }];
//   return autoFarmingAction.toggle(taskList);
// };

// export const pauseCurActive = () => {
//   autoFarmingAction?.pause();
// };

// export const restartCurActive = () => {
//   autoFarmingAction?.restart();
// };

// // 中文注释：停止当前激活的无泪南郊动作（清空任务并停止自动寻路）
// export const stopCurActive = () => {
//   autoFarmingAction?.stop();
// };

interface RoleTaskItem {
  role: Role | null;
  moveActions?: MoveActions | null;
  baseAction?: BaseAction | null;
  attackActions?: AttackActions | null;
}

export default class MingYuTask {
  private taskName = TASK_NAME;
  private soldier: RoleTaskItem = { role: null, moveActions: null, baseAction: null, attackActions: null }; // 士兵
  private assistant: RoleTaskItem = { role: null, moveActions: null, baseAction: null }; // 辅助
  private customers: RoleTaskItem[] = []; // 客户
  private autoFarmingAction: AutoFarmingAction | null = null; // 自动寻路操作

  constructor(private role?: Role) {}

  // 注册角色分工任务
  public registerSoldierTask(selectHwnd?: number) {
    const { role } = getBindWindowInfo(selectHwnd);
    this.soldier.role = role;
    this.soldier.moveActions = new MoveActions(role);
    this.soldier.baseAction = new BaseAction(role);
    this.soldier.attackActions = new AttackActions(role, { monsterFeature: OCR_MING_YU_BOSS, skillGroup });
    logger.info('注册士兵任务');
  }
  registerAssistantTask(selectHwnd?: number) {
    const { role } = getBindWindowInfo(selectHwnd);
    this.assistant.role = role;
    this.assistant.moveActions = new MoveActions(role);
    this.assistant.baseAction = new BaseAction(role);
    logger.info('注册辅助任务');
  }
  registerCustomerTask(selectHwnd?: number) {
    const { role } = getBindWindowInfo(selectHwnd);
    this.customers.push({ role: role, moveActions: null, baseAction: null });
    logger.info('注册客户任务');
  }

  // 启动任务分工
  startMingYuTask() {
    this.autoFarmingAction = AutoFarmingAction.getInstance({
      initPos: INIT_POS,
      pathPos: PATH_POS,
      ocrMonster: OCR_MING_YU_BOSS,
      taskName: TASK_NAME,
    });
    if (!this.soldier.role || !this.soldier.moveActions || !this.soldier.baseAction) {
      throw new Error('请先注册士兵');
    }
    // 挂机前置操作
    this.soldier.baseAction.preMount();
    // 回城并且重置任务
    const goBackCityAndResetTask = async () => {
      // 停止正在执行的任务
      this.soldier?.moveActions?.stopAutoFindPath();
      // 回城
      logger.info('[静止检查] 执行回城并且重置任务 - goBackCityAndResetTask');
      await this.soldier?.baseAction?.backCity(INIT_POS, 'F9', true);
      this.soldier?.role?.updateTaskStatus('done');
    };

    // 检查名誉是否卡住
    const checkMingYuStuck = createStuckChecker(this.soldier.role);
    // 添加组队拒绝
    const soldierRole = this.soldier.role;
    this.soldier.role.updateTeamApplyCall(closePos => {
      // 拒绝组队
      closePos && soldierRole.bindPlugin?.moveToClick(closePos.x, closePos.y);
    });
    // 注册全局任务
    this.soldier.role.addGlobalStrategyTask([
      {
        // 3分钟检查一次跑名誉是否卡住，然后回城重置任务
        name: '跑名誉过程中3分钟静止不动',
        condition: () => checkMingYuStuck(3),
        callback: () => delay5S(goBackCityAndResetTask),
      },
      // {
      //   // 安全锁弹出之后，输入密码
      //   name: '安全锁弹出之后，输入密码',
      //   condition: () => checkPasswordLock(role.bindPlugin, role.bindWindowSize || '1600*900'),
      //   callback: () => delay1M(() => baseAction.inputPassword('666666')),
      // },
    ]);

    // 这里只需要调用soldier一个人的循环任务就行了，其他人作为辅助
    const taskList = [{ taskName: this.taskName, loopOriginPos: INIT_POS, action: () => this.loopAction(), interval: 2000 }];
    return this.autoFarmingAction.toggle(taskList);
  }

  // 循环任务
  async loopAction() {
    if (!this.soldier.role || !this.soldier.moveActions || !this.soldier.baseAction || !this.soldier.attackActions) {
      throw new Error('请先注册士兵');
    }
    const soldierRole = this.soldier.role;
    const soldierAttackActions = this.soldier.attackActions;
    const soldierBaseAction = this.soldier.baseAction;
    try {
      const dm = soldierRole.bindPlugin;
      // 屏蔽所有人
      soldierBaseAction.blockAllPlayers();
      // 宠物激活,需要使用的宠物必须放在第一个格子上
      await soldierBaseAction.openPetBoxAndActivePet();
      // 喂养宠物
      await soldierBaseAction.openPetBoxAndFeed('F7', 'F8', 'F10');
      // 检查当前是否是坐骑状态
      const isMounted = checkMountedByRoleSpeed(dm, soldierRole.bindWindowSize);
      if (!isMounted) {
        // 上马
        await soldierBaseAction.pressSecondSkillBarSkill('F9');
      }
      // 从城郊到名誉NPC
      const isArriveMingYuNPC = await fromChengJiaoToMingYuNPC(this.soldier.moveActions);
      if (!isArriveMingYuNPC) {
        throw new Error('未到达名誉NPC');
      }
      const isConversationRongGuang = await new Conversation(this.soldier.role).RongGuang();
      if (!isConversationRongGuang) {
        throw new Error('未完成领取名誉任务');
      }
      // 如果绑定了辅助角色，就传送去斯芬尼克，否则跑图去斯芬尼克
      if (this.assistant.role) {
        // 传送去斯芬尼克
        await this.sendToLostTemple(this.soldier, this.assistant);
      } else {
        // 跑步去斯芬尼克
        await this.runToLostTemple(this.soldier);
      }

      // 与斯芬尼克对话
      const isConversationSphinx = await new Conversation(soldierRole).Sphinx();
      if (!isConversationSphinx) {
        throw new Error('未完成与斯芬尼克对话');
      }
      // 从斯芬尼克出口到失落神殿BOSS
      const isArriveLostTemple = await fromLostTempleToMingYuBoss(this.soldier.moveActions);
      if (!isArriveLostTemple) {
        throw new Error('未到达失落神殿BOSS');
      }
      // 下马
      await soldierBaseAction.pressSecondSkillBarSkill('F9');
      // soldierRole.bindDm.delay(1000);
      // 添加buff
      // soldierAttackActions.addBuff();
      // 开始攻击怪物
      await soldierAttackActions.scanMonster({ attackType: 'single', attackRange: { x: 321, y: 130, r: 15 } });
      // 停止添加buff
      // soldierAttackActions.stopAddBuff();
      // soldierRole.bindDm.delay(2000);
      logger.info('当前已经没有怪物了', soldierRole.position);
      soldierRole.bindDm.delay(1000);
      // 回城
      await soldierBaseAction.backCity({ x: 278, y: 79 }, 'F9');
      soldierRole.bindDm.delay(2000);
      // 更新状态
      soldierRole.updateTaskStatus('done');
    } catch (e) {
      logger.error('跑名誉任务失败', e);
    }
  }

  // 两种方式从城郊到失落神殿
  // 1、自己跑图到失落神殿BOSS
  async runToLostTemple(soldier: RoleTaskItem) {
    if (!soldier.role || !soldier.moveActions || !soldier.baseAction || !soldier.attackActions) {
      throw new Error('请先注册士兵');
    }

    const isArriveChengJiao = await fromLouLanToChengJiao(soldier.moveActions);
    if (!isArriveChengJiao) {
      throw new Error('未到达城郊');
    }

    // 从名誉NPC到蚂蚁沙地北边
    const isArriveAntHill = await fromMingYuNPCToAntHill(soldier.moveActions);
    if (!isArriveAntHill) {
      throw new Error('未到达蚂蚁沙地北边');
    }
    // 从蚂蚁沙地北到落日沙丘
    const isArriveSunsetDune = await fromAntHillToSunsetDune(soldier.moveActions);
    if (!isArriveSunsetDune) {
      throw new Error('未到达落日沙丘');
    }
    // 从落日沙丘到落日沙丘西
    const isArriveSunsetDuneWest = await fromSunsetDuneToSunsetDuneWest(soldier.moveActions);
    if (!isArriveSunsetDuneWest) {
      throw new Error('未到达落日沙丘西');
    }
    // 从落日沙丘西到斯芬尼克
    const isArriveSphinx = await fromSunsetDuneWestToSphinx(soldier.moveActions);
    if (!isArriveSphinx) {
      throw new Error('未到达斯芬尼克');
    }
  }

  // 2、辅助传送到失落神殿BOSS
  private async sendToLostTemple(soldier: RoleTaskItem, assistant: RoleTaskItem) {
    if (!soldier.role || !soldier.moveActions || !soldier.baseAction || !soldier.attackActions) {
      throw new Error('请先注册士兵');
    }
    if (!assistant.role) {
      throw new Error('请先注册辅助角色');
    }
    const soldierRole = this.soldier.role;
    const soldierAttackActions = this.soldier.attackActions;
    const soldierBaseAction = this.soldier.baseAction;
    try {
    } catch (e) {
      logger.error('跑名誉任务失败', e);
    }
  }
}

export const mingYuTask = new MingYuTask();

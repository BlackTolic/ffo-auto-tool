import logger from '../../../utils/logger';
import { debounce } from '../../../utils/tool';
import { OCR_MING_YU_BOSS } from '../../constant/monster-feature';
import { createStuckChecker, getBindWindowInfo } from '../../utils/common/rolyer';
import { checkMountedByRoleSpeed, checkPetActive } from '../../utils/ocr-check/base';
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
// const INIT_POS = { x: 191, y: 45 };
// const INIT_POS = { x: 235, y: 53 };
// const INIT_POS = { x: 218, y: 214 };
// const INIT_POS = { x: 26, y: 95 };
// const INIT_POS = { x: 318, y: 136 };
// const INIT_POS = { x: 161, y: 78 };
// const INIT_POS = { x: 75, y: 78 };

// const INIT_POS = { x: 257, y: 152 };

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

let autoFarmingAction: AutoFarmingAction | null = null;

const delay5S = debounce((fn: (...args: any[]) => void, ...args: any[]) => fn.apply(this, args), 5 * 1000, true);

// 名誉回调任务
const loopAction = async (role: Role, moveActions: MoveActions) => {
  let atackActions = new AttackActions(role, { monsterFeature: OCR_MING_YU_BOSS, skillGroup });
  const baseAction = new BaseAction(role);
  try {
    const dm = role.bindPlugin;
    // 屏蔽所有人
    baseAction.blockAllPlayers();
    // 检查宠物是否激活
    const isPetActive = checkPetActive(dm, role.bindWindowSize);
    if (!isPetActive) {
      // 需要使用的宠物必须放在第一个格子上
      await baseAction.openPetBoxAndActivePet();
    }
    // 检查当前是否是坐骑状态
    const isMounted = checkMountedByRoleSpeed(dm, role.bindWindowSize);
    if (!isMounted) {
      // 上马
      await baseAction.pressSecondSkillBarSkill('F9');
    }
    const isArriveChengJiao = await fromLouLanToChengJiao(moveActions);
    if (!isArriveChengJiao) {
      throw new Error('未到达城郊');
    }
    // 从城郊到名誉NPC
    const isArriveMingYuNPC = await fromChengJiaoToMingYuNPC(moveActions);
    if (!isArriveMingYuNPC) {
      throw new Error('未到达名誉NPC');
    }
    const isConversationRongGuang = await new Conversation(role).RongGuang();
    if (!isConversationRongGuang) {
      throw new Error('未完成领取名誉任务');
    }
    // 从名誉NPC到蚂蚁沙地北边
    const isArriveAntHill = await fromMingYuNPCToAntHill(moveActions);
    if (!isArriveAntHill) {
      throw new Error('未到达蚂蚁沙地北边');
    }
    // 从蚂蚁沙地北到落日沙丘
    const isArriveSunsetDune = await fromAntHillToSunsetDune(moveActions);
    if (!isArriveSunsetDune) {
      throw new Error('未到达落日沙丘');
    }
    // 从落日沙丘到落日沙丘西
    const isArriveSunsetDuneWest = await fromSunsetDuneToSunsetDuneWest(moveActions);
    if (!isArriveSunsetDuneWest) {
      throw new Error('未到达落日沙丘西');
    }
    // 从落日沙丘西到斯芬尼克
    const isArriveSphinx = await fromSunsetDuneWestToSphinx(moveActions);
    if (!isArriveSphinx) {
      throw new Error('未到达斯芬尼克');
    }
    // 与斯芬尼克对话
    const isConversationSphinx = await new Conversation(role).Sphinx();
    if (!isConversationSphinx) {
      throw new Error('未完成与斯芬尼克对话');
    }
    // 从斯芬尼克出口到失落神殿BOSS
    const isArriveLostTemple = await fromLostTempleToMingYuBoss(moveActions);
    if (!isArriveLostTemple) {
      throw new Error('未到达失落神殿BOSS');
    }
    // 下马
    await baseAction.pressSecondSkillBarSkill('F9');
    // role.bindDm.delay(1000);
    // 添加buff
    // atackActions.addBuff();
    // 开始攻击怪物
    await atackActions.scanMonster({ attackType: 'single', attackRange: { x: 321, y: 130, r: 15 } });
    // 停止添加buff
    // atackActions.stopAddBuff();
    role.bindDm.delay(2000);
    logger.info('当前已经没有怪物了', role.position);
    role.bindDm.delay(1000);
    // 回城
    await new BaseAction(role).backCity({ x: 278, y: 79 }, 'F9');
    role.bindDm.delay(2000);
    // 更新状态
    role.updateTaskStatus('done');
  } catch (e) {
    logger.error('跑名誉任务失败', e);
  }
};

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleMingYu = () => {
  autoFarmingAction = AutoFarmingAction.getInstance({
    initPos: INIT_POS,
    pathPos: PATH_POS,
    ocrMonster: OCR_MING_YU_BOSS,
    taskName: TASK_NAME,
  });

  const { role } = getBindWindowInfo();
  const baseAction = new BaseAction(role);
  const moveActions = new MoveActions(role);
  // 回城并且重置任务
  const goBackCityAndResetTask = async () => {
    // 停止正在执行的任务
    moveActions.stopAutoFindPath();
    // 回城
    logger.info('[静止检查] 执行回城并且重置任务 - goBackCityAndResetTask');
    await baseAction.backCity(INIT_POS, 'F9', true);
    role.updateTaskStatus('done');
  };

  // 检查名誉是否卡住
  const checkMingYuStuck = createStuckChecker(role);
  // 添加组队拒绝
  role.updateTeamApplyCall(closePos => {
    // 拒绝组队
    role.bindPlugin.moveToClick(closePos.x, closePos.y);
  });
  // 注册全局任务
  role.addGlobalStrategyTask([
    {
      // 3分钟检查一次跑名誉是否卡住，然后回城重置任务
      name: '跑名誉过程中3分钟静止不动',
      condition: () => checkMingYuStuck(3),
      callback: () => delay5S(goBackCityAndResetTask),
    },
  ]);

  const taskList = [{ taskName: '楼兰跑名誉', loopOriginPos: INIT_POS, action: () => loopAction(role, moveActions), interval: 2000 }];
  return autoFarmingAction.toggle(taskList);
};

export const pauseCurActive = () => {
  autoFarmingAction?.pause();
};

export const restartCurActive = () => {
  autoFarmingAction?.restart();
};

// 中文注释：停止当前激活的无泪南郊动作（清空任务并停止自动寻路）
export const stopCurActive = () => {
  autoFarmingAction?.stop();
};

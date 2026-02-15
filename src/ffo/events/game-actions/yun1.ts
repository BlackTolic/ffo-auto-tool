import { damoBindingManager } from '..';
import { OCR_YUN_HUAN_1_MONSTER } from '../../constant/monster-feature';
import { isItemBoxOpen } from '../../utils/ocr-check/base';
import { BaseAction } from '../base-action';
import { MoveActions } from '../move';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '云荒打怪捡装备';
// const INIT_POS = { x: 91, y: 114 };
const INIT_POS = { x: 148, y: 96 };
const PATH_POS = [
  { x: 146, y: 79 },
  { x: 119, y: 58 },
  { x: 40, y: 91 },
];
const checkTime = 1;
const stationR = 8;

let autoFarmingAction: AutoFarmingAction | null = null;
let i = 0;

// 循环打怪
const autoAttackInWest = (role: Role, moveActions: MoveActions, atackActions: AttackActions) => {
  // 添加buff
  atackActions.addBuff();
  return moveActions
    .startAutoFindPath({ toPos: [{ x: 143, y: 81 }], stationR, delay: 100 })
    .then(() => {
      return atackActions.scanMonster({ attackType: 'single', times: checkTime, attackRange: { x: 143, y: 81, r: stationR } });
    })
    .then(() => {
      return moveActions.startAutoFindPath({ toPos: { x: 114, y: 58 }, stationR, delay: 100 });
    })
    .then(() => {
      return atackActions.scanMonster({ attackType: 'single', times: checkTime, attackRange: { x: 114, y: 58, r: stationR } });
    })
    .then(() => {
      return moveActions.startAutoFindPath({ toPos: { x: 40, y: 91 }, stationR, delay: 100 });
    })
    .then(() => {
      return atackActions.scanMonster({ attackType: 'single', times: checkTime, attackRange: { x: 40, y: 91, r: stationR } });
    })
    .then(() => {
      return moveActions.startAutoFindPath({ toPos: { x: 91, y: 114 }, stationR, delay: 100 });
    })
    .then(() => {
      return atackActions.scanMonster({ attackType: 'single', times: checkTime, attackRange: { x: 91, y: 114, r: stationR } });
    })
    .then(() => {
      role.updateTaskStatus('done');
      i++;
    })
    .catch(err => {
      console.log('云荒打怪失败', err);
    });
};

const loopAction = () => {
  const hwnd = damoBindingManager.selectHwnd;
  if (!hwnd || !damoBindingManager.isBound(hwnd)) {
    console.log('未选择已绑定的窗口', hwnd);
    throw new Error('未选择已绑定的窗口');
  }
  const role = damoBindingManager.getRole(hwnd);
  if (!role) {
    console.log('未获取到角色', hwnd);
    throw new Error('未获取到角色');
  }
  console.log(`当前开始执行第${i + 1}次任务`, role.position);

  let atackActions = new AttackActions(role, OCR_YUN_HUAN_1_MONSTER);
  let moveActions = new MoveActions(role);
  let baseAction = new BaseAction(role);

  // const isOpen = isItemBoxOpen(role.bindDm, role.bindWindowSize);
  // const gold = getCurrentGold(role.bindDm, role.bindWindowSize);

  // 检查装备是否已经损坏
  // const isEquipBroken = checkEquipBroken(role.bindDm, role.bindWindowSize);
  // if (isEquipBroken) {
  //   console.log('装备栏已经损坏');
  //   return;
  // }

  // 检查物品栏是否已经打开
  const box = isItemBoxOpen(role.bindDm, role.bindWindowSize);
  if (!box) {
    console.log('物品栏未打开');
    // 打开物品栏并且切换到装备页面
    baseAction.openItemBox('equip');
  }
  if (box !== '装备') {
    console.log('物品栏不是装备页面');
    // 切换到装备页面
    baseAction.openItemBox('equip');
  }

  // // 检查装备是否已经填满
  // const isEquipFull = checkEquipFull(role.bindDm, role.bindWindowSize);
  // if (isEquipFull) {
  //   console.log('装备栏已经填满');
  //   return;
  // }

  // return autoAttackInWest(role, moveActions, atackActions);
};

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleYunHuang1West = () => {
  autoFarmingAction = AutoFarmingAction.getInstance(INIT_POS, PATH_POS, OCR_YUN_HUAN_1_MONSTER, TASK_NAME);
  return autoFarmingAction.toggle(loopAction);
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

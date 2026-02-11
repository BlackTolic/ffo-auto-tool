import { damoBindingManager } from '..';
import { OCR_YUN_HUAN_1_MONSTER } from '../../constant/monster-feature';
import { MoveActions } from '../move';
import { AttackActions } from '../skills';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '云荒打怪捡装备';
const INIT_POS = { x: 91, y: 114 };
// const INIT_POS = { x: 114, y: 94 };
const PATH_POS = [
  { x: 146, y: 79 },
  { x: 119, y: 58 },
  { x: 40, y: 92 },
];
const checkTime = 2;
const stationR = 3;

let autoFarmingAction: AutoFarmingAction | null = null;
let i = 0;

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
  // 添加buff
  atackActions.addBuff();
  return moveActions
    .startAutoFindPath({ toPos: [{ x: 146, y: 79 }] })
    .then(() => {
      return atackActions.scanMonster('single', checkTime);
    })
    .then(() => {
      return moveActions.startAutoFindPath({ toPos: { x: 119, y: 58 }, stationR });
    })
    .then(() => {
      return atackActions.scanMonster('single', checkTime);
    })
    .then(() => {
      return moveActions.startAutoFindPath({ toPos: { x: 48, y: 88 }, stationR });
    })
    .then(() => {
      return atackActions.scanMonster('single', checkTime);
    })
    .then(() => {
      moveActions.startAutoFindPath({ toPos: { x: 91, y: 114 }, stationR });
      atackActions.scanMonster('single', checkTime);
    })
    .then(() => {
      role.updateTaskStatus('done');
      i++;
    })
    .catch(err => {
      console.log('云荒打怪失败', err);
    });
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

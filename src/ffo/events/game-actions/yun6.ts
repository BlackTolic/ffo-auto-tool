import { damoBindingManager } from '..';
import { OCR_PAN_GUI_MONSTER } from '../../constant/monster-feature';
import { MoveActions } from '../move';
import { AttackActions } from '../skills';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '云荒6层打怪捡装备';
const INIT_POS = { x: 154, y: 44 };
const PATH_POS = [
  { x: 184, y: 42 },
  { x: 176, y: 51 },
  { x: 194, y: 31 },
  { x: 219, y: 41 },
  { x: 224, y: 60 },
  { x: 210, y: 79 },
  { x: 193, y: 62 },
  { x: 170, y: 51 },
  { x: 158, y: 58 },
];

let autoFarmingAction: AutoFarmingAction | null = null;

const loopAction = () => {
  const hwnd = damoBindingManager.selectHwnd;
  if (!hwnd || !damoBindingManager.isBound(hwnd)) {
    console.log('未选择已绑定的窗口', hwnd);
    throw new Error('未选择已绑定的窗口');
  }
  const role = damoBindingManager.getRole(hwnd);
  if (!role) {
    throw new Error('未选择已绑定的窗口');
  }
  const actions = new MoveActions(role);
  const attackActions = new AttackActions(role, OCR_PAN_GUI_MONSTER);
  console.log(`${TASK_NAME}任务启动！`, role.position);
  actions.startAutoFindPath(PATH_POS, attackActions).then(res => {
    role.updateTaskStatus('done');
    console.log(`本轮${TASK_NAME}任务完成！`, role.position);
  });
};

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleYun6 = () => {
  autoFarmingAction = AutoFarmingAction.getInstance(INIT_POS, PATH_POS, OCR_PAN_GUI_MONSTER, TASK_NAME);
  autoFarmingAction.toggle(loopAction);
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

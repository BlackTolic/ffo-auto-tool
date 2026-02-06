import { damoBindingManager } from '..';
import { OCR_PAN_GUI_MONSTER } from '../../constant/monster-feature';
import { Conversation } from '../conversation';
import { fromChengJiaoToMingYuNPC } from '../move/lou-lan';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '跑名誉';
// const INIT_POS = { x: 281, y: 77 };
const INIT_POS = { x: 191, y: 45 };
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

let autoFarmingAction: AutoFarmingAction | null = null;

// 名誉回调任务
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
  // 从楼兰城郊到城郊
  // fromLouLanToChengJiao(role)
  //   .then(res => {
  //     // 从城郊到名誉NPC
  //     return fromChengJiaoToMingYuNPC(role);
  //   })
  fromChengJiaoToMingYuNPC(role).then(res => {
    console.log('从城交到名誉NPC111', res);
    return new Conversation(role).RongGuang();
  });
};

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleMingYu = () => {
  autoFarmingAction = AutoFarmingAction.getInstance(INIT_POS, PATH_POS, OCR_PAN_GUI_MONSTER, TASK_NAME);
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

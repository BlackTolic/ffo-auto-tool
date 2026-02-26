import { OCR_PAN_GUI_MONSTER_3 } from '../../constant/monster-feature';
import { AutoFarmingAction, AutoFarmingInstance } from './auto-farming';

const TASK_NAME = '幻幽平原三层练级';
const INIT_POS = { x: 154, y: 44 };
const PATH_POS = [
  { x: 184, y: 42 },
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

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleHuanYouPinYuan3 = () => {
  const instance: AutoFarmingInstance = {
    initPos: INIT_POS,
    pathPos: PATH_POS,
    ocrMonster: OCR_PAN_GUI_MONSTER_3,
    taskName: TASK_NAME,
  };
  autoFarmingAction = AutoFarmingAction.getInstance(instance);
  return autoFarmingAction.toggle();
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

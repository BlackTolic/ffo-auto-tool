import { damoBindingManager } from '..';
import { OCR_MING_YU_BOSS, OCR_PAN_GUI_MONSTER } from '../../constant/monster-feature';
import { BaseAction } from '../base-action';
import { Conversation } from '../conversation';
import {
  fromAntHillToSunsetDune,
  fromChengJiaoToMingYuNPC,
  fromLostTempleToMingYuBoss,
  fromLouLanToChengJiao,
  fromMingYuNPCToAntHill,
  fromSunsetDuneToSunsetDuneWest,
  fromSunsetDuneWestToSphinx,
} from '../move/lou-lan';
import { AttackActions } from '../skills';
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

// const INIT_POS = { x: 27, y: 95 };

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
  const test = true;
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
  // if (test) {
  //   fromLostTempleToMingYuBoss(role);
  //   return;
  // }
  let atackActions = new AttackActions(role, OCR_MING_YU_BOSS);
  // 从楼兰城郊到城郊;
  fromLouLanToChengJiao(role)
    .then(res => {
      if (!res) {
        throw new Error('未到达城郊');
      }
      // 从城郊到名誉NPC
      return fromChengJiaoToMingYuNPC(role);
    })
    .then(res => {
      if (!res) {
        throw new Error('未到达名誉NPC');
      }
      console.log('完成从城郊到名誉NPC', res);
      return res && new Conversation(role).RongGuang();
    })
    .then(res => {
      if (!res) {
        throw new Error('未完成领取名誉任务');
      }
      console.log('完成领取名誉任务', res);
      return res && fromMingYuNPCToAntHill(role);
    })
    .then(res => {
      if (!res) {
        throw new Error('未完成从名誉NPC到蚂蚁沙地北');
      }
      console.log('完成从名誉NPC到蚂蚁沙地北', res);
      return res && fromAntHillToSunsetDune(role);
    })
    .then(res => {
      if (!res) {
        throw new Error('未完成从蚂蚁沙地北到落日沙丘');
      }
      console.log('完成从蚂蚁沙地北到落日沙丘 ', res);
      return res && fromSunsetDuneToSunsetDuneWest(role);
    })
    .then(res => {
      if (!res) {
        throw new Error('未完成从落日沙丘到落日沙丘西');
      }
      console.log('完成从落日沙丘到落日沙丘西', res);
      return res && fromSunsetDuneWestToSphinx(role);
    })
    .then(res => {
      if (!res) {
        throw new Error('未完成从落日沙丘西到斯芬尼克');
      }
      console.log('完成从落日沙丘西到斯芬尼克', res);
      return res && new Conversation(role).Sphinx();
    })
    .then(res => {
      if (!res) {
        throw new Error('未完成与斯芬尼克对话');
      }
      console.log('完成与斯芬尼克对话', res);
      return res && fromLostTempleToMingYuBoss(role);
    })
    .then(res => {
      if (!res) {
        throw new Error('未完成从失落神殿一层前往名誉BOSS');
      }
      console.log('从失落神殿一层前往名誉BOSS', res);
      // 下马
      atackActions.startKeyPress({ key: 'F5', interval: null });
      role.bindDm.delay(1000);
      // 添加buff
      atackActions.addBuff();
      // 杀怪
      return atackActions.scanMonster({ attackType: 'single' }).then(res => {
        // 停止添加buff
        atackActions.stopAddBuff();
        role.bindDm.delay(2000);
      });
      // }
    })
    .then(res => {
      console.log('当前已经没有怪物了', role.position);
      role.bindDm.delay(1000);
      return new BaseAction(role).backCity({ x: 278, y: 79 }, 'F9');
    })
    .then(res => {
      console.log('成功回城', res);
      // 上马
      atackActions.startKeyPress({ key: 'F5', interval: null });
      role.bindDm.delay(2000);
      role.updateTaskStatus('done');
    })
    .catch(err => {
      console.log('完成名誉任务失败', err);
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

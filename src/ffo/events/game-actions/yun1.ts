import { damoBindingManager } from '..';
import { OCR_YUN_HUAN_1_MONSTER } from '../../constant/monster-feature';
import { checkEquipBroken, checkEquipCount, checkItemBoxItemCount, checkPetActive, getCurrentGold } from '../../utils/ocr-check/base';
import { BaseAction } from '../base-action';
import { Conversation } from '../conversation';
import { MoveActions } from '../move';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '云荒打怪捡装备';
// const INIT_POS = { x: 91, y: 114 };
const INIT_POS = { x: 148, y: 96 };
// const INIT_POS = { x: 168, y: 81 };
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

const loopAction = async () => {
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
  const rec = damoBindingManager.get(hwnd);
  console.log(`当前开始执行第${i + 1}次任务`, role.position);

  let atackActions = new AttackActions(role, OCR_YUN_HUAN_1_MONSTER);
  let moveActions = new MoveActions(role);
  let baseAction = new BaseAction(role);
  let test = false;
  if (test) {
    // 与道具商人对话
    const buyOk = await new Conversation(role).ItemMerchant([
      { task: 'buy', item: '长白参', count: 50 },
      { task: 'buy', item: '(大)法力药水', count: 50 },
    ]);
    if (!buyOk) {
      console.log('道具商人购买蓝药失败');
      return;
    }
  }

  const gold = getCurrentGold(role.bindDm, role.bindWindowSize);
  const dm = rec?.ffoClient || role.bindDm;

  // 检查宠物是否激活
  const isPetActive = checkPetActive(dm, role.bindWindowSize);
  if (!isPetActive) {
    await baseAction.openPetBoxAndActivePet();
  }
  // 上马
  atackActions.startKeyPress({ key: 'F5', interval: null });
  // 检查物品栏是否已经打开
  await baseAction.openItemBox('消耗');
  // 检查红、蓝、回城数量
  const redCount = checkItemBoxItemCount(dm, role.bindWindowSize, 1, '蓝药');
  const blueCount = checkItemBoxItemCount(dm, role.bindWindowSize, 2, '人参');
  const returnCount = checkItemBoxItemCount(dm, role.bindWindowSize, 3, '回城卷轴');
  const petFoodCount = checkItemBoxItemCount(dm, role.bindWindowSize, 4, '宠物食物');
  console.log(`蓝药数量`, redCount);
  console.log(`人参数量`, blueCount);
  console.log(`回城卷轴数量`, returnCount);
  console.log(`宠物食物数量`, petFoodCount);
  // 检查装备是否已经损坏
  const isEquipBroken = checkEquipBroken(dm, role.bindWindowSize);
  // 鼠标归位，防止影响下一次识别
  dm.moveTo(role.position?.x || 0, role.position?.y || 0);
  dm.delay(300);
  // 检查物品栏是否已经打开
  await baseAction.openItemBox('装备');
  // 检查装备栏装备是否超过15件
  const equipCount = checkEquipCount(dm, role.bindWindowSize);
  console.log(`装备数量`, equipCount);
  const needMoney = redCount < 50 || blueCount < 50 || returnCount < 10 || petFoodCount < 10 || equipCount > 15;
  if (equipCount > 15 || needMoney) {
    // 去仓库管理员取钱
    await moveActions.startAutoFindPath({ toPos: { x: 200, y: 98 }, stationR, delay: 2000 });
    // 与仓库管理员对话
    const withdrawOk = await new Conversation(role).StoreManager(needMoney ? { task: 'withdraw', money: '5' } : undefined);
    if (!withdrawOk) {
      console.log('仓库管理员取款失败');
      return;
    }
  }
  // 买药、修装备
  if (needMoney) {
    await moveActions.startAutoFindPath({ toPos: { x: 167, y: 78 }, stationR, delay: 2000 });
    // 与道具商人对话
    const buyOk = await new Conversation(role).ItemMerchant([
      { task: 'buy', item: '长白参', count: 50 },
      { task: 'buy', item: '(大)法力药水', count: 50 },
    ]);
    if (!buyOk) {
      console.log('道具商人购买蓝药失败');
      return;
    }
  }
  if (isEquipBroken) {
    console.log('装备栏已经损坏');
  }

  // if (box !== '装备') {
  //   console.log('物品栏不是装备页面');
  //   // 切换到装备页面
  //   baseAction.openItemBox('equip');
  // }

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

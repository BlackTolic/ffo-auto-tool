import { damoBindingManager } from '..';
import { OCR_YUN_HUAN_1_MONSTER } from '../../constant/monster-feature';
import { checkEquipBroken, checkEquipCount, checkItemBoxItemCount, checkPetActive, getCurrentGold } from '../../utils/ocr-check/base';
import { BaseAction } from '../base-action';
import { Conversation, ItemMerchantConfig } from '../conversation';
import { MoveActions } from '../move';
import { AttackActions } from '../skills';
import { AutoFarmingAction } from './auto-farming';

const TASK_NAME = '云荒打怪捡装备';
const INIT_POS_YUN1 = { x: 91, y: 114 };
const INIT_POS_ROUTE = { x: 148, y: 96 };
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
const loopAutoAttackInWest = () => {
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

// 循环检查状态，前往云荒1
const loopCheckStatus = async () => {
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

  // await new Promise(resolve => {
  //   setTimeout(() => {
  //     resolve(true);
  //   }, 2000);
  // });

  const dm = rec?.ffoClient || role.bindDm;
  let atackActions = new AttackActions(role, OCR_YUN_HUAN_1_MONSTER);
  let moveActions = new MoveActions(role);
  let baseAction = new BaseAction(role);

  // 检查宠物是否激活
  const isPetActive = checkPetActive(dm, role.bindWindowSize);
  if (!isPetActive) {
    await baseAction.openPetBoxAndActivePet();
  }
  // 上马
  // atackActions.startKeyPress({ key: 'F5', interval: null });
  await baseAction.pressSecondSkillBarSkill('F10');
  // 检查物品栏是否已经打开
  await baseAction.openItemBox('消耗');
  // 检查红、蓝、回城数量
  const redCount = checkItemBoxItemCount(dm, role.bindWindowSize, 1, '蓝药');
  const blueCount = checkItemBoxItemCount(dm, role.bindWindowSize, 2, '人参');
  const returnCount = checkItemBoxItemCount(dm, role.bindWindowSize, 3, '回城卷轴');
  const petFoodCount = checkItemBoxItemCount(dm, role.bindWindowSize, 4, '宠物食物');
  // 检查装备是否已经损坏
  const isEquipBroken = checkEquipBroken(dm, role.bindWindowSize);
  console.log(`蓝药数量`, redCount);
  console.log(`人参数量`, blueCount);
  console.log(`回城卷轴数量`, returnCount);
  console.log(`宠物食物数量`, petFoodCount);
  console.log(`装备是否已损坏`, isEquipBroken);
  // 鼠标归位，防止影响下一次识别
  dm.moveTo(role.position?.x || 0, role.position?.y || 0);
  dm.delay(300);
  // 检查物品栏是否已经打开
  await baseAction.openItemBox('装备');
  // 检查装备栏装备是否超过15件
  const equipCount = checkEquipCount(dm, role.bindWindowSize);
  console.log(`装备数量`, equipCount);
  const needMoney = redCount < 50 || blueCount < 50 || returnCount < 10 || petFoodCount < 10 || isEquipBroken;
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
      ...(isEquipBroken ? [{ task: 'fix' }] : []),
      ...(redCount < 50 ? [{ task: 'buy', item: '长白参', count: 200 - redCount }] : []),
      ...(blueCount < 50 ? [{ task: 'buy', item: '(大)法力药水', count: 400 - blueCount }] : []),
    ] as ItemMerchantConfig[]);
    if (!buyOk) {
      console.log('道具商人购买药失败');
      return;
    }
  }

  // 存钱
  const gold = getCurrentGold(role.bindDm, role.bindWindowSize);
  console.log(`当前金币数量`, gold);
  if (Number(gold) > 0) {
    // 去仓库管理员取钱
    await moveActions.startAutoFindPath({ toPos: { x: 200, y: 98 }, stationR, delay: 2000 });
    // 与仓库管理员对话
    const depositOk = await new Conversation(role).StoreManager({ task: 'deposit', money: '999' });
    if (!depositOk) {
      console.log('仓库管理员存款失败');
      return;
    }
  }

  // 前往云荒1打怪
  await moveActions.startAutoFindPath({ toPos: { x: 258, y: 119 }, stationR: 1, delay: 2000 });
  await moveActions.startAutoFindPath({ toPos: INIT_POS_YUN1, stationR, delay: 2000 });
  // 下马
  await baseAction.pressSecondSkillBarSkill('F9');
  // 开始执行循环
  role.updateTaskStatus('done');
};

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleYunHuang1West = () => {
  autoFarmingAction = AutoFarmingAction.getInstance(INIT_POS_YUN1, PATH_POS, OCR_YUN_HUAN_1_MONSTER, TASK_NAME);
  const taskList = [
    { taskName: '云荒打怪捡装备', loopOriginPos: INIT_POS_YUN1, action: loopAutoAttackInWest, interval: 2000 },
    { taskName: '云荒打怪状态补给', loopOriginPos: INIT_POS_ROUTE, action: loopCheckStatus, interval: 4000 },
  ];
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

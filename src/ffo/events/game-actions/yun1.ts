import { damoBindingManager } from '..';
import { OCR_YUN_HUAN_1_MONSTER } from '../../constant/monster-feature';
import { VK_F } from '../../constant/virtual-key-code';
import { checkEquipBroken, checkEquipCount, checkItemBoxItemCount, checkPetActive, getCurrentGold } from '../../utils/ocr-check/base';
import { BaseAction } from '../base-action';
import { Conversation, ItemMerchantConfig, StoreManagerConfig } from '../conversation';
import { MoveActions } from '../move';
import { AttackActions } from '../skills';
import { AutoFarmingAction } from './auto-farming';

const validEquip = [
  { type: '戒指' },
  { type: '项链', attrName: '力量|智慧|体质|魔抗|护甲值' },
  { type: '法杖|双手剑|长剑|双刃|暗器|长枪', attrName: '风象伤害(概率石化)|雷象伤害(概率定身)|物理攻击力|魔法攻击力|智慧|伤害' },
  { type: '头盔', attrName: '生命最大值|力量|魔抗|体质|伤害|智慧' },
  { type: '手套', attrName: '物理攻击力|魔法攻击力|力量|体质|智慧' },
  { type: '服装', attrName: '生命最大值|体质|护甲值|力量|智慧' },
  { type: '鞋子', attrName: '力量|智慧|体质|体质|敏捷' },
  { type: '面饰', attrName: '力量|智慧|体质|体质|敏捷' },
  { type: '背包', attrName: '力量|智慧|体质|体质|敏捷|最大负重' },
  { type: '盾牌', attrName: '力量|体质|魔抗|护甲值' },
];

const TASK_NAME = '云荒打怪捡装备';
// const INIT_POS_YUN1 = { x: 91, y: 114 };
const INIT_POS_YUN1 = { x: 132, y: 136 };
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
  let baseAction = new BaseAction(role);
  // 添加buff
  atackActions.addBuff();
  // 检查角色是群攻还是单攻击
  const attackType = role.job === 'SS' ? 'group' : 'single';
  return (
    moveActions
      // .startAutoFindPath({ toPos: [{ x: 143, y: 81 }], stationR, delay: 100 })
      .startAutoFindPath({ toPos: [{ x: 132, y: 136 }], stationR, delay: 100 })
      .then(() => {
        return atackActions.scanMonster({ attackType, times: checkTime, attackRange: { x: 132, y: 136, r: stationR }, map: '云泽秘径' });
      })
      .then(() => {
        return moveActions.startAutoFindPath({ toPos: { x: 174, y: 105 }, stationR, delay: 100, map: '云泽秘径' });
      })
      .then(() => {
        return atackActions.scanMonster({ attackType, times: checkTime, attackRange: { x: 174, y: 105, r: stationR }, map: '云泽秘径' });
      })
      .then(() => {
        return moveActions.startAutoFindPath({ toPos: { x: 144, y: 81 }, stationR, delay: 100, map: '云泽秘径' });
      })
      .then(() => {
        return atackActions.scanMonster({ attackType, times: checkTime, attackRange: { x: 144, y: 81, r: stationR }, map: '云泽秘径' });
      })
      .then(() => {
        return moveActions.startAutoFindPath({ toPos: { x: 120, y: 56 }, stationR, delay: 100, map: '云泽秘径' });
      })
      .then(() => {
        return atackActions.scanMonster({ attackType, times: checkTime, attackRange: { x: 120, y: 56, r: stationR }, map: '云泽秘径' });
      })
      .then(() => {
        return moveActions.startAutoFindPath({ toPos: { x: 40, y: 91 }, stationR, delay: 100, map: '云泽秘径' });
      })
      .then(() => {
        return atackActions.scanMonster({ attackType, times: checkTime, attackRange: { x: 40, y: 91, r: stationR }, map: '云泽秘径' });
      })
      .then(() => {
        return moveActions.startAutoFindPath({ toPos: { x: 100, y: 120 }, stationR, delay: 100, map: '云泽秘径' });
      })
      .then(() => {
        return atackActions.scanMonster({ attackType, times: checkTime, attackRange: { x: 100, y: 120, r: stationR }, map: '云泽秘径' });
      })
      .then(() => {
        return moveActions.startAutoFindPath({ toPos: INIT_POS_YUN1, stationR, delay: 100, map: '云泽秘径' });
      })
      .then(() => {
        return atackActions.scanMonster({ attackType, times: 4, attackRange: { ...INIT_POS_YUN1, r: stationR }, map: '云泽秘径' });
      })
      .then(() => {
        // 检查装备栏是否已经满了
        const equipCount = checkEquipCount(role.bindPlugin, role.bindWindowSize);
        console.log(equipCount, '当前装备数量');
        if (equipCount.length >= 24) {
          return baseAction.backCity({ x: 148, y: 96 }, 'F9');
        }
        return false;
      })
      .then(() => {
        console.log('重置成功');
        // 当前地图是云荒才开始循环
        role.updateTaskStatus('done');
        i++;
      })
      .catch(async err => {
        console.log('云荒打怪失败', err);
        // 添加buff
        // atackActions.stopAddBuff();
        // setTimeout(async () => {
        //   // 移动到云荒1
        //   await baseAction.backCity({ x: 148, y: 96 }, 'F9');
        //   role.updateTaskStatus('done');
        // }, 10 * 1000);
      })
  );
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

  const dm = rec?.ffoClient || role.bindDm;
  // let atackActions = new AttackActions(role, OCR_YUN_HUAN_1_MONSTER);
  let moveActions = new MoveActions(role);
  let baseAction = new BaseAction(role);

  await new Promise(res => setTimeout(res, 5 * 1000));
  // 屏蔽所有人
  baseAction.blockAllPlayers();
  // 检查宠物是否激活
  const isPetActive = checkPetActive(dm, role.bindWindowSize);
  if (!isPetActive) {
    await baseAction.openPetBoxAndActivePet();
  }
  // 上马
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
  console.log(`装备数量`, equipCount.length);
  const needMoney = redCount < 50 || blueCount < 50 || returnCount < 10 || petFoodCount < 10 || isEquipBroken;
  if (equipCount.length > 15 || needMoney) {
    // 去仓库管理员取钱
    await moveActions.startAutoFindPath({ toPos: { x: 200, y: 98 }, stationR, delay: 2000 });
    // 与仓库管理员对话
    const config = Object.assign(
      needMoney ? { task: 'withdraw', money: '5' } : {},
      equipCount.length > 15 ? { saveEquipCall: () => baseAction.pickUpUsefulEquip(validEquip, 'saveEquip') } : {}
    ) as StoreManagerConfig;
    const withdrawOk = await new Conversation(role).StoreManager(config);
    if (!withdrawOk) {
      console.log('仓库管理员取款失败');
      return;
    }
    dm.delay(1000);
  }

  // 买药、修装备
  if (needMoney) {
    await moveActions.startAutoFindPath({
      toPos: [
        { x: 217, y: 83 },
        { x: 167, y: 78 },
      ],
      stationR,
      delay: 2000,
    });
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
    dm.delay(1000);
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
  await moveActions.startAutoFindPath({ toPos: { x: 263, y: 120 }, stationR: 1, delay: 2000, aimPos: '云泽秘径', refreshTime: 1000 });
  await moveActions.startAutoFindPath({ toPos: INIT_POS_YUN1, stationR, delay: 2000 });
  // 下马
  await baseAction.pressSecondSkillBarSkill('F9');
  // 开始执行循环
  role.updateTaskStatus('done');
};

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleYunHuang1West = () => {
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
  let baseAction = new BaseAction(role);
  let attackActions = new AttackActions(role);
  // 死亡时回调
  const deadCall = () => {
    console.log('云荒打怪死亡');
    const deadTimer = setTimeout(
      () => {
        // 关闭物品栏
        role.bindPlugin.keyPress(VK_F['alt']);
        role.bindPlugin.keyPress(VK_F['i']);
        role.bindPlugin.delay(1000);
        // 移动到云荒1
        baseAction.backCity({ x: 148, y: 96 }, 'F9');
        // 关闭相关的定时设置
        role.clearAllActionTimer();
        // 结束buff
        attackActions.addBuff();
        // 重新更新循环状态
        role.updateTaskStatus('done');
        clearTimeout(deadTimer);
      },
      20 * 60 * 1000
    );
  };
  autoFarmingAction = AutoFarmingAction.getInstance(INIT_POS_YUN1, PATH_POS, OCR_YUN_HUAN_1_MONSTER, TASK_NAME);
  // 注册死亡回调
  role.addDeadCall(deadCall);
  const taskList = [
    { taskName: '云荒打怪捡装备', loopOriginPos: INIT_POS_YUN1, action: loopAutoAttackInWest, interval: 2000 },
    { taskName: '云荒打怪状态补给', loopOriginPos: INIT_POS_ROUTE, action: loopCheckStatus, interval: 8000 },
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

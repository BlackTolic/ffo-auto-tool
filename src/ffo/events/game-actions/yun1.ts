import { damoBindingManager } from '..';
import logger from '../../../utils/logger';
import { debounce } from '../../../utils/tool';
import { OCR_YUN_HUAN_1_MONSTER } from '../../constant/monster-feature';
import { isArriveAimNear } from '../../utils/common';
import { checkEquipBroken, checkEquipCount, checkExpBar, checkItemBoxItemCount, checkMounted, checkPetActive, getCurrentGold } from '../../utils/ocr-check/base';
import { AttackActions } from '../attack-action';
import { BaseAction, ValidEquip } from '../base-action';
import { Conversation, ItemMerchantConfig, StoreManagerConfig } from '../conversation';
import { MoveActions } from '../move-action';
import { AutoFarmingAction, AutoFarmingInstance } from './auto-farming';

const validEquip: ValidEquip = [
  { type: '戒指', attrName: '力量|智慧|体质|生命最大值|魔法攻击力|物理攻击力' },
  { type: '项链', attrName: '力量|智慧|体质|魔抗|护甲值' },
  { type: '法杖|双手剑|长剑|双刃|暗器|长枪', attrName: '风象伤害(概率石化)|雷象伤害(概率定身)|物理攻击力' },
  { type: '法杖|双手剑|长剑|双刃|暗器|长枪', level: '102', attrName: '风象伤害(概率石化)|雷象伤害(概率定身)|物理攻击力|魔法攻击力|智慧|伤害|力量|体质' },
  { type: '头盔', attrName: '生命最大值|力量|魔抗|体质|伤害|智慧' },
  { type: '手套', attrName: '物理攻击力|魔法攻击力|力量|体质|智慧' },
  { type: '服装', attrName: '生命最大值|体质|护甲值|智慧' },
  { type: '鞋子', attrName: '力量|智慧|体质|体质|敏捷' },
  { type: '面饰', attrName: '力量|智慧|体质|体质|敏捷' },
  { type: '背包', attrName: '力量|智慧|体质|体质|敏捷|最大负重' },
  { type: '盾牌', attrName: '力量|体质|魔抗|护甲值' },
];

const TASK_NAME = '云荒打怪捡装备';

// 坐标常量定义
const COORDS = {
  INIT_POS_YUN1: { x: 132, y: 132 }, // 云1启动点
  INIT_POS_ROUTE: { x: 148, y: 96 }, //  云荒部落启动点
  STORE_NPC: { x: 203, y: 101 }, // 仓库管理员
  RED_NAME_POS: { x: 183, y: 160 }, // 云1门口
  STORE_PATH_POINT: { x: 200, y: 98 }, // 仓库管理员
  MERCHANT_PATH: [
    { x: 217, y: 83 },
    { x: 167, y: 78 },
  ], // 道具商人
  ENTER_MAP_POS: { x: 261, y: 119 }, // 云荒部落出城点
};

const PATH_POS = [
  { x: 146, y: 79 },
  { x: 119, y: 58 },
  { x: 40, y: 91 },
]; // 自动点 暂时无用

const CONSTANTS = {
  CHECK_TIME: 2, // 扫描怪物时间 3次，每次1S左右
  STATION_R: 6, // 半径
  CHECK_EQUIP_COUNT: 23, // 检查装备的数量
  DEAD_CALL_TIME: 28 * 60 * 1000, // 死亡后等待时间，之后重新启动
  YUN_HUANG_CALL_STATIC_TIME: 20, // 云荒静止多少秒后开始回调移动（单位：分钟）
};

const MAP_NAME = {
  YUN_ZE: '云泽秘径',
  YUN_HUANG: '云荒部落',
};

// 巡逻路径配置
const PATROL_CONFIG = [
  { pos: COORDS.INIT_POS_YUN1, r: 6, times: 3 }, // 原点
  { pos: { x: 172, y: 99 }, r: 6, times: 3 },
  { pos: { x: 144, y: 81 }, r: 6, times: 3, scanR: 4 },
  { pos: { x: 114, y: 57 }, r: 6, times: 3 },
  { pos: { x: 40, y: 91 }, r: 6, times: 3 },
  { pos: { x: 100, y: 120 }, r: 7, times: 3 },
  { pos: COORDS.INIT_POS_YUN1, r: 6, times: 3 },
];

const delay10S = debounce((fn: (...args: any[]) => void, ...args: any[]) => fn.apply(this, args), 10 * 1000, true);
const delay5S = debounce((fn: (...args: any[]) => void, ...args: any[]) => fn.apply(this, args), 5 * 1000, true);

let autoFarmingAction: AutoFarmingAction | null = null;
let executionCount = 0;

// 获取绑定角色
const getBoundRole = () => {
  const hwnd = damoBindingManager.selectHwnd;
  if (!hwnd || !damoBindingManager.isBound(hwnd)) {
    const msg = `未选择已绑定的窗口 ${hwnd}`;
    logger.error(msg);
    throw new Error(msg);
  }
  const role = damoBindingManager.getRole(hwnd);
  if (!role) {
    const msg = `未获取到角色 ${hwnd}`;
    logger.error(msg);
    throw new Error(msg);
  }
  return role;
};

// 选择回城方式
const selectGoBackCity = async (baseAction: BaseAction, moveActions: MoveActions) => {
  // 进行红名检验
  const res = await baseAction.backCity(COORDS.INIT_POS_ROUTE, 'F9', true);
  if (res === 'redName') {
    return new Promise(async res => {
      await moveActions.startAutoFindPath({ toPos: COORDS.RED_NAME_POS, stationR: CONSTANTS.STATION_R, delay: 100, map: MAP_NAME.YUN_ZE });
      await moveActions.startAutoFindPath({ toPos: COORDS.STORE_NPC, stationR: CONSTANTS.STATION_R, delay: 100 });
      res('红名操作');
    });
  }
  return res;
};

// 循环打怪
const loopAutoAttackInWest = async (attackActions?: AttackActions) => {
  try {
    const role = getBoundRole();
    logger.info(`当前开始执行第${executionCount + 1}次任务`, role.position);

    // const attackActions = new AttackActions(role, OCR_YUN_HUAN_1_MONSTER);
    const moveActions = new MoveActions(role, { offsetR: 300 }); // 将鼠标半径调整为300
    const baseAction = new BaseAction(role);

    // 添加buff
    attackActions?.addBuff();
    // 检查角色是群攻还是单攻击
    const attackType = role.job === 'SS' ? 'group' : 'single';

    // 执行巡逻打怪
    for (const item of PATROL_CONFIG) {
      await moveActions.startAutoFindPath({
        toPos: item.pos,
        stationR: CONSTANTS.STATION_R,
        delay: 100,
        map: MAP_NAME.YUN_ZE,
      });
      const attackRange = { ...item.pos, r: item.scanR || CONSTANTS.STATION_R };
      await attackActions?.scanMonster({
        attackType,
        times: item.times,
        attackRange,
        map: MAP_NAME.YUN_ZE,
      });
    }

    // 检查装备栏是否已经满了
    const equipCount = checkEquipCount(role.bindPlugin, role.bindWindowSize);
    logger.info(`[云荒打怪] 检查当前装备数量: ${equipCount.length}`);
    if (equipCount.length >= CONSTANTS.CHECK_EQUIP_COUNT) {
      // 结束buff
      attackActions?.stopAddBuff();
      // 选择回城方式
      const res = await selectGoBackCity(baseAction, moveActions);
      if (res === '红名操作') {
        loopCheckStatus();
        return;
      }
    }

    // 这里避免与上面的任务临界冲突
    role.updateTaskStatus('done');
    executionCount++;
    logger.info(`[云荒打怪] 已完成第${executionCount}次任务,下一轮重置开始`);
  } catch (err) {
    logger.error(err);
  }
};

// 循环检查状态，前往云荒1
const loopCheckStatus = async () => {
  const role = getBoundRole();
  const rec = damoBindingManager.get(role.hwnd as number);
  logger.info(`当前开始执行第${executionCount + 1}次任务`, role.position);

  const dm = rec?.ffoClient || role.bindDm;
  const moveActions = new MoveActions(role);
  const baseAction = new BaseAction(role);

  await new Promise(res => setTimeout(res, 5 * 1000));
  // 屏蔽所有人
  baseAction.blockAllPlayers();
  // 检查宠物是否激活
  const isPetActive = checkPetActive(dm, role.bindWindowSize);
  if (!isPetActive) {
    await baseAction.openPetBoxAndActivePet();
  }
  // 检查当前是否是坐骑状态
  const isMounted = checkMounted(dm, role.bindWindowSize);
  if (!isMounted) {
    // 上马
    await baseAction.pressSecondSkillBarSkill('F10');
  }
  // 打开物品栏中的“消耗”页
  await baseAction.openItemBox('消耗');
  // 检查红、蓝、回城数量
  const blueCount = checkItemBoxItemCount(dm, role.bindWindowSize, 1, '蓝药');
  const redCount = checkItemBoxItemCount(dm, role.bindWindowSize, 2, '人参');
  const returnCount = checkItemBoxItemCount(dm, role.bindWindowSize, 3, '回城卷轴');

  // 检查装备是否已经损坏
  const isEquipBroken = checkEquipBroken(dm, role.bindWindowSize);
  logger.info(`[云荒检查] 装备情况:${isEquipBroken ? '已损坏' : '未损坏'};蓝药数量${blueCount};人参数量${redCount};回城卷轴数量${returnCount};`);

  // 鼠标归位，防止影响下一次识别
  dm.moveTo(role.position?.x || 0, role.position?.y || 0);
  dm.delay(300);

  // 打开物品栏中的“装备”页
  await baseAction.openItemBox('装备');
  // 检查装备栏装备是否超过15件
  const equipCount = checkEquipCount(dm, role.bindWindowSize);
  logger.info(`[云荒检查] 装备数量${equipCount.length}`);

  let needMoney = redCount === 0 && blueCount === 0 ? false : redCount < 50 || blueCount < 200 || isEquipBroken;

  if (equipCount.length > 14 || needMoney) {
    // 去仓库管理员取钱
    await moveActions.startAutoFindPath({ toPos: COORDS.STORE_PATH_POINT, stationR: CONSTANTS.STATION_R, delay: 4000 });
    // 与仓库管理员对话
    const config = Object.assign(
      needMoney ? { task: 'withdraw', money: '5' } : {},
      equipCount.length > 14 ? { saveEquipCall: () => baseAction.pickUpUsefulEquip(validEquip, 'saveEquip') } : {}
    ) as StoreManagerConfig;
    const withdrawOk = await new Conversation(role).YunHuangStoreManager(config);
    if (!withdrawOk) {
      logger.error('仓库管理员取款失败');
      return;
    }
    dm.delay(1000);
  }

  // 买药、修装备
  if (needMoney) {
    await moveActions.startAutoFindPath({
      toPos: COORDS.MERCHANT_PATH,
      stationR: CONSTANTS.STATION_R,
      delay: 2000,
    });
    // 与道具商人对话
    const buyOk = await new Conversation(role).ItemMerchant([
      ...(isEquipBroken ? [{ task: 'fix' }] : []),
      ...(redCount < 50 ? [{ task: 'buy', item: '长白参', count: 200 - redCount }] : []),
      ...(blueCount < 200 ? [{ task: 'buy', item: '(大)法力药水', count: 600 - blueCount }] : []),
    ] as ItemMerchantConfig[]);
    if (!buyOk) {
      logger.error('道具商人购买药失败');
      return;
    }
    dm.delay(1000);
  }

  // 存钱
  const gold = getCurrentGold(role.bindDm, role.bindWindowSize);
  logger.info(`[云荒检查] 当前金币数量`, gold);
  if (Number(gold) > 0) {
    // 去仓库管理员取钱
    await moveActions.startAutoFindPath({ toPos: COORDS.STORE_NPC, stationR: CONSTANTS.STATION_R, delay: 2000 });
    // 与仓库管理员对话
    const depositOk = await new Conversation(role).YunHuangStoreManager({ task: 'deposit', money: '999' });
    if (!depositOk) {
      logger.error('仓库管理员存款失败');
      return;
    }
  }

  const isPassYZ = async () => {
    // 确保进入地图
    if (role.map === MAP_NAME.YUN_ZE) {
      return;
    }
    await moveActions.startAutoFindPath({
      toPos: COORDS.ENTER_MAP_POS,
      stationR: 1,
      delay: 2000,
      aimPos: MAP_NAME.YUN_ZE,
      refreshTime: 1000,
    });
    dm.delay(1000);
    return isPassYZ();
  };

  // 前往云荒1打怪
  await isPassYZ();
  await moveActions.startAutoFindPath({ toPos: COORDS.INIT_POS_YUN1, stationR: CONSTANTS.STATION_R, delay: 500 });
  // 下马
  await baseAction.pressSecondSkillBarSkill('F9');
  // 开始执行循环
  role.updateTaskStatus('done');
};

// 中文注释：切换自动寻路（第一次开启，第二次关闭）
export const toggleYunHuang1West = () => {
  const role = getBoundRole();
  let baseAction = new BaseAction(role);
  let attackActions = new AttackActions(role, { monsterFeature: OCR_YUN_HUAN_1_MONSTER });

  // 死亡时回调
  const deadCall = () => {
    logger.info(`[云荒检查] 云荒打怪死亡开始进行死亡回调 ${CONSTANTS.DEAD_CALL_TIME / 1000} 秒后执行`);
    // 关闭相关的定时设置
    role.clearAllActionTimer();
    // 结束buff
    attackActions.stopAddBuff();
    setTimeout(async () => {
      logger.info(`[云荒检查] 云荒打怪死亡开始执行死亡回调`);
      // 移动到云荒1
      goBackCityAndResetTask();
      // 重新更新循环状态
      role.updateTaskStatus('done');
    }, CONSTANTS.DEAD_CALL_TIME);
    // 注册定时器以便清理
    // role.addActionTimer('deadCallTimer', deadTimer);
  };

  const instance: AutoFarmingInstance = {
    initPos: COORDS.INIT_POS_YUN1,
    pathPos: PATH_POS,
    ocrMonster: OCR_YUN_HUAN_1_MONSTER,
    taskName: TASK_NAME,
  };

  autoFarmingAction = AutoFarmingAction.getInstance(instance);
  // 注册死亡回调
  role.addDeadCall(deadCall);
  // 添加组队拒绝
  role.updateTeamApplyCall(closePos => {
    // 拒绝组队
    role.bindPlugin.moveToClick(closePos.x, closePos.y);
  });

  // 检查是否卡住（未移动）- 工厂函数，生成独立的状态闭包
  const createStuckChecker = () => {
    let lastMoveTime = 0;
    let lastPos = { x: 0, y: 0 };

    return (min: number, map: string) => {
      // 地图不匹配直接返回
      if (role.map !== map) return false;

      // 每隔 min 分钟检查一次
      if (Date.now() - lastMoveTime > min * 60 * 1000) {
        const curX = role.position?.x ?? 0;
        const curY = role.position?.y ?? 0;
        logger.info(`[云荒检查] 每隔${min}分钟获取一次${map}地图坐标, 上一次坐标: (${lastPos.x},${lastPos.y}), 当前坐标: (${curX},${curY})`);
        const isStuck = lastPos.x === curX && lastPos.y === curY && lastPos.x !== 0 && lastPos.y !== 0;
        // 无论是否卡住，都更新时间和坐标，开始下一个周期的计时
        // 这样可以避免返回 true 后，因为时间未更新而导致在下一帧无限触发 true，进而导致 debounce 被无限重置无法执行回调
        lastMoveTime = Date.now();
        lastPos.x = curX;
        lastPos.y = curY;
        if (isStuck) {
          logger.info(`[云荒检查] ${map} 地图卡住了，开始执行相关回调任务`);
          return true; // 卡住了
        }
      }
      return false;
    };
  };

  const checkYunZeStuck = createStuckChecker();
  const checkYunHuangStuck = createStuckChecker();

  // 回城并且重置任务
  const goBackCityAndResetTask = async () => {
    logger.info('[云荒检查] 执行回城并且重置任务 - goBackCityAndResetTask');
    const moveActions = new MoveActions(role);
    const res = await baseAction.backCity(COORDS.INIT_POS_ROUTE, 'F9', true);
    if (res === 'redName') {
      logger.info('[云荒检查] 红名自动前往仓库管理员处');
      await moveActions.startAutoFindPath({ toPos: COORDS.STORE_NPC, stationR: CONSTANTS.STATION_R, delay: 100 });
      loopCheckStatus();
      return;
    }
    role.updateTaskStatus('done');
  };

  // 检查经验是否已经快满了
  const isLevelUp = () => {
    return checkExpBar(role.bindPlugin, role.bindWindowSize);
  };

  // 关闭循环任务
  const closeLoopTask = async () => {
    await baseAction.backCity(COORDS.INIT_POS_ROUTE, 'F9');
    role.updateTaskStatus('doing');
    role.unregisterRole();
    logger.info('[云荒检查] 经验快满了，终止打怪！！');
  };

  // 清除旧的全局策略任务
  role.clearGlobalStrategyTask();
  role.addGlobalStrategyTask([
    {
      // 3分钟检查一次云泽是否卡住，然后回城重置任务
      name: '云泽卡住检查重置回城',
      condition: () => checkYunZeStuck(3, MAP_NAME.YUN_ZE),
      callback: () => delay5S(goBackCityAndResetTask),
    },
    {
      name: '升级停止任务',
      condition: isLevelUp,
      callback: () => delay10S(closeLoopTask),
    },
    {
      name: '云荒卡住检查重置回城',
      condition: () => checkYunHuangStuck(CONSTANTS.YUN_HUANG_CALL_STATIC_TIME, MAP_NAME.YUN_HUANG) && !isArriveAimNear(role.position, COORDS.INIT_POS_ROUTE, CONSTANTS.STATION_R),
      callback: () => delay10S(goBackCityAndResetTask),
    },
  ]);

  const taskList = [
    { taskName: '云荒打怪捡装备', loopOriginPos: COORDS.INIT_POS_YUN1, action: () => loopAutoAttackInWest(attackActions), interval: 2000 },
    { taskName: '云荒打怪状态补给', loopOriginPos: COORDS.INIT_POS_ROUTE, action: () => loopCheckStatus(), interval: 8000 },
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
  if (autoFarmingAction) {
    autoFarmingAction.stop();
    // 清理全局策略任务和死亡回调
    autoFarmingAction.role.clearGlobalStrategyTask();
    autoFarmingAction.role.addDeadCall(null);
    autoFarmingAction.role.clearAllActionTimer();
  }
};

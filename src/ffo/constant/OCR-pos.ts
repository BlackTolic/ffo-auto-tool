import { MONSTER_GREEN, MONSTER_RED, MONSTER_WHITE, MONSTER_YELLOW } from './monster-feature';

const DEFAULT_COLOR = 'e8f0e8-111111';
const DEFAULT_MONSTER_COLOR = 'a8a8a0-111111';
const DEFAULT_SIM = 1.0;
const DEFAULT_COLOR_RED = 'e85048-111111';

// 地图名称
export const DEFAULT_ADDRESS_NAME = {
  '1200*900': { x1: 1166, y1: 2, x2: 1226, y2: 20, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1600*900': { x1: 1458, y1: 0, x2: 1563, y2: 20, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 1159, y1: 2, x2: 1226, y2: 19, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
};

// 角色坐标
export const DEFAULT_ROLE_POSITION = {
  '1600*900': { x1: 1487, y1: 39, x2: 1551, y2: 59, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 1167, y1: 39, x2: 1218, y2: 56, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
};

// 原点坐标
export const ORIGIN_POSITION = {
  '1600*900': { x: 800, y: 450, r: 350, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x: 633, y: 399, r: 350, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
};

// 怪物名称
export const DEFAULT_MONSTER_NAME = {
  '1600*900': { x1: 95, y1: 109, x2: 200, y2: 144, color: `${MONSTER_GREEN} | ${MONSTER_YELLOW} |${MONSTER_WHITE} |${MONSTER_RED}`, sim: DEFAULT_SIM },
  '1280*800': { x1: 95, y1: 109, x2: 200, y2: 144, color: `${MONSTER_GREEN} | ${MONSTER_YELLOW} |${MONSTER_WHITE} |${MONSTER_RED}`, sim: DEFAULT_SIM },
};

// 血量状态（获取指定区域颜色均值）
export const DEFAULT_BLOOD_STATUS = {
  // 检测当前位置是黄色和绿色，如果没有黄色和绿色，说明血条空了
  '1600*900': { x1: 116, y1: 12, x2: 139, y2: 39, color: 'e89828-111111|e89828-111111', sim: DEFAULT_SIM },
  '1280*800': { x1: 116, y1: 12, x2: 139, y2: 39, color: 'e89828-111111|e89828-111111', sim: DEFAULT_SIM },
};

// 神医验证码
export const DEFAULT_VERIFY_CODE = {
  '1600*900': { x1: 0, y1: 113, x2: 1598, y2: 835, color: 'e80000-111111', sim: DEFAULT_SIM },
  '1280*800': { x1: 12, y1: 116, x2: 1267, y2: 730, color: 'e80000-111111', sim: DEFAULT_SIM },
};

// 服务器中断
export const DEFAULT_SERVER_DISCONNECT = {
  '1600*900': { x1: 630, y1: 383, x2: 968, y2: 516, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 630, y1: 383, x2: 968, y2: 516, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
};

export interface VerifyCodeTextPos {
  I: { x: number; y: number };
  II: { x: number; y: number };
  III: { x: number; y: number };
}

// 验证码文本坐标
export const DEFAULT_VERIFY_CODE_TEXT: Record<string, VerifyCodeTextPos> = {
  '1600*900': { I: { x: 180, y: 47 }, II: { x: 180, y: 67 }, III: { x: 180, y: 87 } },
  '1280*800': { I: { x: 182, y: 45 }, II: { x: 182, y: 65 }, III: { x: 182, y: 85 } },
};

// 菜单栏坐标
export const DEFAULT_MENUS_POS = {
  '1600*900': {
    // 角色栏
    roles: { x: 1245, y: 858, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    // 物品栏
    items: { x: 1290, y: 862, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    // 交友
    friend: { x: 1328, y: 861, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    // 家族
    family: { x: 1371, y: 857, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    //技能
    skill: { x: 1415, y: 861, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    // 任务
    task: { x: 1452, y: 859, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    // 信件
    letter: { x: 1496, y: 862, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    // 货架
    shelf: { x: 1542, y: 862, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    // 设置
    setting: { x: 1581, y: 860, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  },
};

// 状态图标坐标
export const DEFAULT_STATUS_ICON_POS = {
  '1600*900': {
    // 血量
    blood: { x: 1245, y: 858, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    // 状态-人参
    status_blood: { x: 1496, y: 254, x2: 1595, y2: 637, color: '90a070-11111|a0a080-11111|28ac48-11111', sim: DEFAULT_SIM },
  },
  '1280*800': {
    // 血量
    blood: { x: 1245, y: 858, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
    // 状态-人参
    status_blood: { x: 1496, y: 254, x2: 1595, y2: 637, color: '90a070-11111|a0a080-11111|28ac48-11111', sim: DEFAULT_SIM },
  },
};

// 与怪物有隔离
export const DEFAULT_ISOLATE = {
  '1600*900': { x1: 26, y1: 760, x2: 393, y2: 864, color: DEFAULT_COLOR_RED, sim: DEFAULT_SIM },
  '1280*800': { x1: 26, y1: 760, x2: 393, y2: 864, color: DEFAULT_COLOR_RED, sim: DEFAULT_SIM },
};

// 检查是否有物品栏打开
export const DEFAULT_ITEM_BOX = {
  '1600*900': { x1: 1245, y1: 858, x2: 1344, y2: 957, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 857, y1: 438, x2: 1279, y2: 472, color: 'd8e4d8-111111|b8c0b8-111111', sim: DEFAULT_SIM },
};

// 检查物品栏切换的tab页
export const DEFAULT_ITEM_BOX_TAB = {
  '1600*900': { x1: 1245, y1: 858, x2: 1344, y2: 957, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 867, y1: 471, x2: 1270, y2: 507, color: 'e8e4e0-111111', sim: DEFAULT_SIM },
};

// 金币
export const DEFAULT_GOLD = {
  '1600*900': { x1: 872, y1: 713, x2: 986, y2: 729, color: 'e8f0e8-111111|d0a028-111111|989490-000000|986450-555555', sim: DEFAULT_SIM },
  '1280*800': { x1: 872, y1: 713, x2: 986, y2: 729, color: 'e8f0e8-111111|d0a028-111111|989490-000000|986450-555555', sim: DEFAULT_SIM },
};

// 检查宠物是否激活
export const DEFAULT_PET_ACTIVE = {
  '1600*900': { x1: 1245, y1: 858, x2: 1344, y2: 957, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 857, y1: 438, x2: 1279, y2: 472, color: 'd8e4d8-111111|b8c0b8-111111', sim: DEFAULT_SIM },
};

// 检查装备是否损坏
export const DEFAULT_EQUIP_DAMAGE = {
  '1600*900': { x1: 1245, y1: 858, x2: 1344, y2: 957, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 857, y1: 438, x2: 1279, y2: 472, color: 'd8e4d8-111111|b8c0b8-111111', sim: DEFAULT_SIM },
};

// 检查红药数量
export const DEFAULT_RED_PILL = {
  '1600*900': { x1: 1245, y1: 858, x2: 1344, y2: 957, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 857, y1: 438, x2: 1279, y2: 472, color: 'd8e4d8-111111|b8c0b8-111111', sim: DEFAULT_SIM },
};

// 检查角色名称
export const DEFAULT_ROLE_NAME = {
  '1600*900': { x1: 74, y1: 6, x2: 172, y2: 48, color: 'e8c020-111111', sim: DEFAULT_SIM },
  '1280*800': { x1: 857, y1: 438, x2: 1279, y2: 472, color: 'd8e4d8-111111|b8c0b8-111111', sim: DEFAULT_SIM },
};

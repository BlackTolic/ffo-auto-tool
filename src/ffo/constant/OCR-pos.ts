const DEFAULT_COLOR = 'e8f0e8-111111';
const DEFAULT_MONSTER_COLOR = 'a8a8a0-111111';
const DEFAULT_SIM = 1.0;

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
  '1600*900': { x: 800, y: 450, r: 300, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x: 633, y: 399, r: 350, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
};

// 怪物名称
export const DEFAULT_MONSTER_NAME = {
  '1600*900': { x1: 95, y1: 109, x2: 200, y2: 144, color: DEFAULT_MONSTER_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 95, y1: 109, x2: 200, y2: 144, color: DEFAULT_MONSTER_COLOR, sim: DEFAULT_SIM },
};

// 血量状态（获取指定区域颜色均值）
export const DEFAULT_BLOOD_STATUS = {
  '1600*900': { x1: 117, y1: 31 },
  '1280*800': { x1: 1167, y1: 39, x2: 1218, y2: 56, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
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

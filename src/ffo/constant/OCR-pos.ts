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
  '1280*800': { x: 640, y: 400, r: 300, color: DEFAULT_COLOR, sim: DEFAULT_SIM },
};

// 怪物名称
export const DEFAULT_MONSTER_NAME = {
  '1600*900': { x1: 95, y1: 109, x2: 200, y2: 144, color: DEFAULT_MONSTER_COLOR, sim: DEFAULT_SIM },
  '1280*800': { x1: 95, y1: 109, x2: 200, y2: 144, color: DEFAULT_MONSTER_COLOR, sim: DEFAULT_SIM },
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

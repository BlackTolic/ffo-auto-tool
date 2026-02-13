export const MONSTER_GREEN = '40bc00-111111';
export const MONSTER_YELLOW = 'd8cc18-111111';
export const MONSTER_RED = 'e85048-111111';
export const MONSTER_WHITE = 'a8a8a0-111111';

export const MONSTER_FEATURE: Record<string, string> = {
  QQ糖: 'QQ糖',
  精英: '精英',
  头目: '头目',
  天泉怪物: '精英|头目',
  南郊怪物: '盾卫者|石魈|吞噬|灵|敏',
  幻幽平原一层怪物: '丧气|浊液|灰翼|鬼蝠|速|敏',
  幻幽平原三层怪物: ' 剧毒鬼蝎|剧毒|鬼蝎|抛石|小|鬼|速|敏',
  镜湖北岸怪物: '剧毒鬼蝎|黑翼鬼蝠|黑翼|灵斑蜥|山魔|灵|剧毒|鬼蝎|蜥|速',
  怨灵: '被缚的|怨灵|执念|之眼|幻影|侍卫|被',
  云荒一层: '堕灵玄鸟|冥蜘蛛|堕灵|鸟|蜘蛛|怒风',
};

export interface MonsterFeature {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  string: string;
  color: string;
  sim: number;
}

// 攻击范围1
export const AttackRange1 = { x1: 574, y1: 236, x2: 1026, y2: 578 };
// 攻击范围2
export const AttackRange2 = { x1: 364, y1: 152, x2: 1293, y2: 677 };
// 天泉怪物
export const OCR_MONSTER = { ...AttackRange1, string: MONSTER_FEATURE['天泉怪物'], color: MONSTER_WHITE, sim: 1.0 };
// 无泪南郊怪物
export const OCR_NAN_JIAO_MONSTER = { ...AttackRange1, string: MONSTER_FEATURE['南郊怪物'], color: MONSTER_WHITE, sim: 1.0 };
// 幻幽平原一层怪物
export const OCR_PAN_GUI_MONSTER = { ...AttackRange1, string: MONSTER_FEATURE['幻幽平原一层怪物'], color: MONSTER_WHITE, sim: 1.0 };
// 幻幽平原三层怪物
export const OCR_PAN_GUI_MONSTER_3 = { ...AttackRange1, string: MONSTER_FEATURE['幻幽平原三层怪物'], color: MONSTER_WHITE, sim: 1.0 };
// 镜湖北岸怪物
export const OCR_JIN_HU_BEI_AN_MONSTER = { ...AttackRange1, string: MONSTER_FEATURE['镜湖北岸怪物'], color: MONSTER_WHITE, sim: 1.0 };
// 名誉BOSS
export const OCR_MING_YU_BOSS = { ...AttackRange2, string: MONSTER_FEATURE['怨灵'], color: MONSTER_WHITE, sim: 1.0 };
// 云荒一层
export const OCR_YUN_HUAN_1_MONSTER = { ...AttackRange2, string: MONSTER_FEATURE['云荒一层'], color: `${MONSTER_GREEN} | ${MONSTER_YELLOW}| ${MONSTER_RED}`, sim: 1.0 };

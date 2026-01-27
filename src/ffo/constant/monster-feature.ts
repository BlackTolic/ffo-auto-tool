export const MONSTER_FEATURE: Record<string, string> = {
  QQ糖: 'QQ糖',
  精英: '精英',
  头目: '头目',
  天泉怪物: '精英|头目',
  南郊怪物: '盾卫者|石魈|吞噬|灵|敏',
  幻幽平原一层怪物: '丧气|浊液|灰翼|鬼蝠|速|敏',
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
export const OCR_MONSTER = { ...AttackRange1, string: MONSTER_FEATURE['天泉怪物'], color: 'a8a8a0-111111', sim: 1.0 };
// 无泪南郊怪物
export const OCR_NAN_JIAO_MONSTER = { ...AttackRange1, string: MONSTER_FEATURE['南郊怪物'], color: 'a8a8a0-111111', sim: 1.0 };
// 幻幽平原一层怪物
export const OCR_PAN_GUI_MONSTER = { ...AttackRange1, string: MONSTER_FEATURE['幻幽平原一层怪物'], color: 'a8a8a0-111111', sim: 1.0 };

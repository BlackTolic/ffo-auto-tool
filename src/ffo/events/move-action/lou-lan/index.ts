import { MoveActions } from '..';
import { Role } from '../../rolyer';

export const fromLouLanToChengJiao = (role: Role) => {
  return new MoveActions(role).startAutoFindPath({ toPos: [{ x: 325, y: 95 }], aimPos: '楼兰城郊' });
};

// 中文注释：从城交到名誉NPC
export const fromChengJiaoToMingYuNPC = (role: Role) => {
  return new MoveActions(role).startAutoFindPath({
    toPos: [
      { x: 71, y: 64 },
      { x: 111, y: 57 },
      { x: 190, y: 47 },
      { x: 158, y: 25 },
    ],
  });
};

// 从名誉NPC到蚂蚁沙地北边
export const fromMingYuNPCToAntHill = (role: Role) => {
  return new MoveActions(role).startAutoFindPath({
    toPos: [
      { x: 169, y: 33 },
      { x: 190, y: 44 },
      { x: 245, y: 52 },
      { x: 250, y: 70 },
      { x: 223, y: 81 },
      { x: 166, y: 106 },
      { x: 134, y: 120 },
      { x: 196, y: 126 },
      { x: 243, y: 106 },
      { x: 277, y: 106 },
      { x: 293, y: 112 },
    ],
    aimPos: '蚂蚁沙地北',
  });
};

// 从蚂蚁沙地北到落日沙丘
export const fromAntHillToSunsetDune = (role: Role) => {
  return new MoveActions(role).startAutoFindPath({
    toPos: [
      { x: 235, y: 53 },
      { x: 258, y: 45 },
    ],
    aimPos: '落日沙丘',
  });
};

// 从落日沙丘到落日沙丘西
export const fromSunsetDuneToSunsetDuneWest = (role: Role) => {
  return new MoveActions(role).startAutoFindPath({
    toPos: [
      // { x: 161, y: 78 },
      { x: 160, y: 58 },
    ],
    aimPos: '落日沙丘西',
  });
};

// 从落日沙丘西到斯芬尼克
export const fromSunsetDuneWestToSphinx = (role: Role) => {
  return new MoveActions(role).startAutoFindPath({ toPos: [{ x: 255, y: 148 }] });
};

// 从失落神殿一层前往名誉BOSS
export const fromLostTempleToMingYuBoss = (role: Role) => {
  // 距离短但是雷多
  const route1 = [
    { x: 44, y: 94 },
    { x: 127, y: 134 },
    { x: 151, y: 115 },
    { x: 184, y: 135 },
    { x: 257, y: 106 },
    { x: 314, y: 119 },
  ];
  // 距离长但是安全
  const route2 = [
    { x: 44, y: 94 },
    { x: 127, y: 134 },
    { x: 151, y: 115 },
    { x: 252, y: 168 },
    { x: 270, y: 158 },
    { x: 228, y: 138 },
    { x: 238, y: 142 },
    { x: 241, y: 132 },
    { x: 298, y: 145 },
    { x: 298, y: 145 },
    { x: 258, y: 122 },
    { x: 271, y: 117 },
    { x: 314, y: 139 },
    { x: 321, y: 130 },
  ];
  const route3 = [
    { x: 44, y: 95 },
    { x: 120, y: 132 },
    { x: 145, y: 121 },
    { x: 248, y: 167 },
    { x: 260, y: 158 },
    { x: 237, y: 138 },
    { x: 245, y: 127 },
    { x: 292, y: 142 },
    { x: 266, y: 128 },
    { x: 286, y: 127 },
    { x: 314, y: 139 },
    { x: 321, y: 130 },
  ];
  return new MoveActions(role).startAutoFindPath({ toPos: route2 });
};

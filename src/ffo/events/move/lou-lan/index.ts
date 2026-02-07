import { MoveActions } from '..';
import { Role } from '../../rolyer';

export const fromLouLanToChengJiao = (role: Role) => {
  return new MoveActions(role).startAutoFindPath([{ x: 325, y: 95 }], undefined, '楼兰城郊').then(res => {});
};

// 中文注释：从城交到名誉NPC
export const fromChengJiaoToMingYuNPC = (role: Role) => {
  console.log('从城交到名誉NPC1111', role.map);
  return new MoveActions(role).startAutoFindPath([
    // { x: 71, y: 64 },
    // { x: 111, y: 57 },
    // { x: 190, y: 47 },
    { x: 158, y: 25 },
  ]);
};

// 从名誉NPC到蚂蚁沙地北边
export const fromMingYuNPCToAntHill = (role: Role) => {
  console.log('从名誉NPC到蚂蚁沙地北边1111', role.map);
  return new MoveActions(role).startAutoFindPath(
    [
      { x: 169, y: 33 },
      { x: 190, y: 44 },
      { x: 255, y: 53 },
      { x: 250, y: 70 },
      { x: 223, y: 81 },
      { x: 166, y: 106 },
      { x: 134, y: 120 },
      { x: 196, y: 126 },
      { x: 243, y: 106 },
      { x: 277, y: 106 },
      { x: 293, y: 112 },
    ],
    undefined,
    '蚂蚁沙地北'
  );
};

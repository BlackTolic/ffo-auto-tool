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

import { MoveActions } from '..';
import { Role } from '../../rolyer';

// 从云荒部落到云荒一层西角
export const fromCityToYun1West = (role: Role) => {
  return new MoveActions(role).startAutoFindPath([{ x: 325, y: 95 }], undefined, '楼兰城郊');
};

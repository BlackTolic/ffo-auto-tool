import { MoveActions } from '..';
import { Role } from '../../rolyer';

export const fromLouLanToChengJiao = (role: Role) => {
  new MoveActions(role).fromTo(role.pos, [
    { x: 281, y: 77 },
    { x: 281, y: 100 },
    { x: 250, y: 100 },
    { x: 250, y: 77 },
  ]);
};

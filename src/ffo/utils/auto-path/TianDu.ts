import { formTo } from '../base-opr/move';

// 飞机到杨戬
export const FeiJiToYangJian = (dm: any, curPos: { x: number; y: number }) => {
  const pos1 = { x: 305, y: 72 };
  const pos2 = { x: 335, y: 126 };
  formTo(dm, curPos, [pos1, pos2]);
};

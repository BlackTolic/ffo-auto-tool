import { ensureDamo } from '../../../damo/damo';

// r(397,135,897,635,"e8f0e8-111111",1.0)
// (397,125) (897,635)
const x1 = 397;
const y1 = 125;
const x2 = 897;
const y2 = 635;

// 左移
export const leftMoveTo = () => {
  const { dm } = ensureDamo();
  dm.moveTo(x1, (y1 + y2) / 2);
  dm.leftClick();
};

// 右移
export const rightMoveTo = () => {
  const { dm } = ensureDamo();
  dm.moveTo(x2, (y1 + y2) / 2);
  dm.leftClick();
};

// 上移
export const upMoveTo = () => {
  const { dm } = ensureDamo();
  dm.moveTo((x1 + x2) / 2, y1);
  dm.leftClick();
};

// 下移
export const downMoveTo = () => {
  const { dm } = ensureDamo();
  dm.moveTo((x1 + x2) / 2, y2);
  dm.leftClick();
};

// 左上
export const upLeftMoveTo = () => {
  const { dm } = ensureDamo();
  dm.moveTo(x1, y1);
  dm.leftClick();
};

// 右上
export const upRightMoveTo = () => {
  const { dm } = ensureDamo();
  dm.moveTo(x2, y1);
  dm.leftClick();
};

// 左下
export const downLeftMoveTo = () => {
  const { dm } = ensureDamo();
  dm.moveTo(x1, y2);
  dm.leftClick();
};

// 右下
export const downRightMoveTo = () => {
  const { dm } = ensureDamo();
  dm.moveTo(x2, y2);
  dm.leftClick();
};

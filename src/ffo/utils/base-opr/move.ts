const x1 = 442;
const y1 = 177;
const x2 = 842;
const y2 = 577;

// 左移
export const leftMoveTo = (dm: any) => {
  console.log(x1, (y1 + y2) / 2);
  dm.MoveTo(x1, (y1 + y2) / 2);
  setTimeout(() => {
    dm.LeftClick();
  }, 500);
};

// 右移
export const rightMoveTo = (dm: any) => {
  console.log(x2, (y1 + y2) / 2);
  dm.MoveTo(x2, (y1 + y2) / 2);
  setTimeout(() => {
    dm.LeftClick();
  }, 500);
};

// 上移
export const upMoveTo = (dm: any) => {
  dm.MoveTo((x1 + x2) / 2, y1);
  setTimeout(() => {
    dm.LeftClick();
  }, 500);
};

// 下移
export const downMoveTo = (dm: any) => {
  dm.MoveTo((x1 + x2) / 2, y2);
  setTimeout(() => {
    dm.LeftClick();
  }, 500);
};

// 左上
export const upLeftMoveTo = (dm: any) => {
  dm.MoveTo(x1, y1);
  setTimeout(() => {
    dm.LeftClick();
  }, 500);
};

// 右上
export const upRightMoveTo = (dm: any) => {
  dm.MoveTo(x2, y1);
  setTimeout(() => {
    dm.LeftClick();
  }, 500);
};

// 左下
export const downLeftMoveTo = (dm: any) => {
  dm.MoveTo(x1, y2);
  setTimeout(() => {
    dm.LeftClick();
  }, 500);
};

// 右下
export const downRightMoveTo = (dm: any) => {
  dm.MoveTo(x2, y2);
  setTimeout(() => {
    dm.LeftClick();
  }, 500);
};

const x1 = 442;
const y1 = 177;
const x2 = 842;
const y2 = 577;

const initX = 800;
const initY = 450;
const radius = 300;

// 左移
export const leftMoveTo = (dm: any) => {
  setTimeout(() => {
    // dm.LeftClick();
    dm.leftDown();
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

// 计算两点之间的角度（角度制）
export const getAngle = (x1: number, y1: number, x2: number, y2: number) => {
  const x = x2 - x1;
  const y = y2 - y1;
  return (Math.atan2(y, x) * 180) / Math.PI;
};

function getCirclePoint(angle: number) {
  // 角度转弧度（JavaScript Math.sin/cos需弧度）
  const rad = (angle * Math.PI) / 180;
  const x = initX + radius * Math.cos(rad);
  const y = initY + radius * Math.sin(rad);
  // 四舍五入为整数（适配鼠标坐标）
  return { x: Math.round(x), y: Math.round(y) };
}

// 从当前位置移动到指定位置 146/115； 191/90
export const formTo = (dm: any, x1: number, y1: number, x2: number, y2: number) => {
  const angle = getAngle(x1, y1, x2, y2);
  console.log(angle, 'angle');
  const { x, y } = getCirclePoint(angle);
  dm.MoveTo(x, y);
  console.log(x, y, 'MoveTo');
  dm.leftDown();
};

// 从(x1,y1)移动到以(x2,y2)为中心,r为半径的范围内
export const moveToNearAim = (dm: any, x1: number, y1: number, x2: number, y2: number, r: number) => {
  const isArrive = (x1 - x2) ** 2 + (y1 - y2) ** 2 <= r ** 2;
  if (isArrive) {
    dm.leftDown();
  }
  return isArrive;
};

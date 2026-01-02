import { ORIGIN_POSITION } from '../../constant/OCR-pos';

const x1 = 442;
const y1 = 177;
const x2 = 842;
const y2 = 577;

// const initX = ORIGIN_POSITION[global.windowSize].x;
// const initY = ORIGIN_POSITION[global.windowSize].y;
// const radius = ORIGIN_POSITION[global.windowSize].r;

export interface Pos {
  x: number;
  y: number;
}

const getInitPos = () => {
  const initPos = ORIGIN_POSITION[global.windowSize];
  return { x: initPos.x, y: initPos.y, r: initPos.r };
};

let status = 'stop';
let recordAimPos: Pos = { x: 0, y: 0 };
let recordAimPosIndex = 0;

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
  const pos = getInitPos();
  const initX = pos.x;
  const initY = pos.y;
  const radius = pos.r;
  const rad = (angle * Math.PI) / 180;
  const x = initX + radius * Math.cos(rad);
  const y = initY + radius * Math.sin(rad);
  // 四舍五入为整数（适配鼠标坐标）
  return { x: Math.round(x), y: Math.round(y) };
}

// 从当前位置移动到指定位置 146/115； 191/90
export const formTo = (dm: any, curPos: Pos, aimPos: Pos[] | Pos) => {
  if (!Array.isArray(aimPos)) {
    aimPos = [aimPos];
  }
  if (recordAimPosIndex === 0 && !isArriveAimNear(curPos, aimPos[aimPos.length - 1])) {
    const curAimPos = aimPos[recordAimPosIndex];
    const angle = getAngle(curPos.x, curPos.y, curAimPos.x, curAimPos.y);
    const { x, y } = getCirclePoint(angle);
    dm.MoveTo(x, y);
    dm.leftDown();
  } else {
    const curAimPos = aimPos[recordAimPosIndex];
    const angle = getAngle(curPos.x, curPos.y, curAimPos.x, curAimPos.y);
    const { x, y } = getCirclePoint(angle);
    dm.MoveTo(x, y);
  }
  if (isArriveAimNear(curPos, aimPos[recordAimPosIndex]) && recordAimPosIndex < aimPos.length) {
    recordAimPosIndex++;
    formTo(dm, curPos, aimPos);
  }

  if (isArriveAimNear(curPos, aimPos[recordAimPosIndex]) && recordAimPosIndex === aimPos.length - 1) {
    dm.LeftClick();
    console.log('目标已到达指定位置');
    recordAimPosIndex = 0;
    return;
  }
  console.log('不知道为什么');
};

// 从(x1,y1)移动到以(x2,y2)为中心,r为半径的范围内
export const isArriveAimNear = (initPos: Pos, aimPos: Pos, r: number = 5) => {
  const { x: x1, y: y1 } = initPos;
  const { x: x2, y: y2 } = aimPos;
  return (x1 - x2) ** 2 + (y1 - y2) ** 2 <= r ** 2;
};

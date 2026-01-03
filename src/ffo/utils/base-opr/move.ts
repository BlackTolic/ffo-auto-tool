import { ORIGIN_POSITION } from '../../constant/OCR-pos';
import { Role } from '../../events/rolyer';

export interface Pos {
  x: number;
  y: number;
}

const getInitPos = () => {
  const initPos = (ORIGIN_POSITION as any)[(global as any).windowSize];
  return { x: initPos.x, y: initPos.y, r: initPos.r };
};

// 计算两点之间的角度（角度制）
export const getAngle = (x1: number, y1: number, x2: number, y2: number) => {
  const x = x2 - x1;
  const y = y2 - y1;
  return (Math.atan2(y, x) * 180) / Math.PI;
};

// 从(x1,y1)移动到以(x2,y2)为中心,r为半径的范围内
export const isArriveAimNear = (initPos: Pos, aimPos: Pos, r: number = 5) => {
  const { x: x1, y: y1 } = initPos;
  const { x: x2, y: y2 } = aimPos;
  return (x1 - x2) ** 2 + (y1 - y2) ** 2 <= r ** 2;
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

export class MoveActions {
  private dm: any = null;
  private recordAimPosIndex = 0;
  private finalPos: Pos | null = null;
  private role;
  public timer: NodeJS.Timeout | null = null;

  constructor(role: Role) {
    this.dm = role.bindDm;
    this.role = role;
  }

  fromTo(fromPos: Pos, toPos: Pos[] | Pos): boolean {
    if (!Array.isArray(toPos)) {
      toPos = [toPos];
    }
    if (this.recordAimPosIndex === 0 && !isArriveAimNear(fromPos, toPos[toPos.length - 1])) {
      const curAimPos = toPos[this.recordAimPosIndex];
      const angle = getAngle(fromPos.x, fromPos.y, curAimPos.x, curAimPos.y);
      const { x, y } = getCirclePoint(angle);
      this.dm.MoveTo(x, y);
      this.dm.leftDown();
    } else {
      const curAimPos = toPos[this.recordAimPosIndex];
      const angle = getAngle(fromPos.x, fromPos.y, curAimPos.x, curAimPos.y);
      const { x, y } = getCirclePoint(angle);
      this.dm.MoveTo(x, y);
    }
    if (isArriveAimNear(fromPos, toPos[this.recordAimPosIndex]) && this.recordAimPosIndex < toPos.length) {
      this.recordAimPosIndex++;
      return this.fromTo(fromPos, toPos);
    }

    if (isArriveAimNear(fromPos, toPos[this.recordAimPosIndex]) && this.recordAimPosIndex === toPos.length - 1) {
      this.dm.LeftClick();
      console.log('目标已到达指定位置');
      this.recordAimPosIndex = 0;
      return true;
    }
    console.log('持续移动中！！！');
    return false;
  }

  startAutoFindPath(toPos: Pos[] | Pos) {
    this.finalPos = Array.isArray(toPos) ? toPos[toPos.length - 1] : toPos;
    let isArrive: boolean | undefined;
    this.timer = setInterval(() => {
      if (this.role.position) {
        isArrive = this.fromTo(this.role.position, toPos);
        console.log('开始寻路拉！！', isArrive);
      }
      if (isArrive) {
        this.timer && clearInterval(this.timer);
        this.timer = null;
        console.log('[角色信息] 已关闭自动寻路');
      }
    }, 300); // 中文注释：最小间隔 200ms，避免过于频繁
  }

  stopAutoFindPath() {
    this.timer && clearInterval(this.timer);
    this.timer = null;
    console.log('[角色信息] 已关闭自动寻路');
  }
}

// 从当前位置移动到指定位置 146/115； 191/90
// export const formTo = (dm: any, curPos: Pos, aimPos: Pos[] | Pos) => {
//   if (!Array.isArray(aimPos)) {
//     aimPos = [aimPos];
//   }
//   if (recordAimPosIndex === 0 && !isArriveAimNear(curPos, aimPos[aimPos.length - 1])) {
//     const curAimPos = aimPos[recordAimPosIndex];
//     const angle = getAngle(curPos.x, curPos.y, curAimPos.x, curAimPos.y);
//     const { x, y } = getCirclePoint(angle);
//     dm.MoveTo(x, y);
//     dm.leftDown();
//   } else {
//     const curAimPos = aimPos[recordAimPosIndex];
//     const angle = getAngle(curPos.x, curPos.y, curAimPos.x, curAimPos.y);
//     const { x, y } = getCirclePoint(angle);
//     dm.MoveTo(x, y);
//   }
//   if (isArriveAimNear(curPos, aimPos[recordAimPosIndex]) && recordAimPosIndex < aimPos.length) {
//     recordAimPosIndex++;
//     return formTo(dm, curPos, aimPos);
//   }

//   if (isArriveAimNear(curPos, aimPos[recordAimPosIndex]) && recordAimPosIndex === aimPos.length - 1) {
//     dm.LeftClick();
//     console.log('目标已到达指定位置');
//     recordAimPosIndex = 0;
//     return true;
//   }
//   console.log('持续移动中！！！');
//   return false;
// };

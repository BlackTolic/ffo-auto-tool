import { ORIGIN_POSITION } from '../../constant/OCR-pos';
import { isArriveAimNear } from '../../utils/common';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';

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
  return { x, y };
}

export class MoveActions {
  private dm: any = null;
  private recordAimPosIndex = 0;
  private finalPos: Pos | null = null;
  private role;
  public timer: NodeJS.Timeout | null = null;
  private actions?: AttackActions | null = null; // 赶路过程中的其他行为

  constructor(role: Role) {
    this.dm = role.bindDm;
    this.role = role;
  }

  fromTo(fromPos: Pos, toPos: Pos[] | Pos): boolean {
    if (!Array.isArray(toPos)) {
      toPos = [toPos];
    }
    console.log('开始移动了：', fromPos, toPos[this.recordAimPosIndex]);
    // 第一次寻路开启连续点击
    console.log('第一次寻路开启连续点击', isArriveAimNear(fromPos, toPos[toPos.length - 1]));
    if (this.recordAimPosIndex === 0 && !isArriveAimNear(fromPos, toPos[toPos.length - 1])) {
      const curAimPos = toPos[this.recordAimPosIndex];
      const angle = getAngle(fromPos.x, fromPos.y, curAimPos.x, curAimPos.y);
      const { x, y } = getCirclePoint(angle);
      this.dm.MoveTo(x, y);
      // 中文注释：按下左键以触发移动（修正大小写）
      this.dm.delay(200);
      this.dm.LeftDown();
    }
    // 不是第一次，不需要再连续点击
    if (this.recordAimPosIndex > 0 && !isArriveAimNear(fromPos, toPos[toPos.length - 1])) {
      const curAimPos = toPos[this.recordAimPosIndex];
      const angle = getAngle(fromPos.x, fromPos.y, curAimPos.x, curAimPos.y);
      const { x, y } = getCirclePoint(angle);
      this.dm.MoveTo(x, y);
      this.dm.delay(200);
      // 嵌入攻击后
      this.actions && this.dm.LeftDown();
    }
    if (isArriveAimNear(fromPos, toPos[this.recordAimPosIndex]) && this.recordAimPosIndex < toPos.length - 1) {
      this.recordAimPosIndex++;
      return this.fromTo(fromPos, toPos);
    }
    //  { x: 335, y: 126 }
    if (isArriveAimNear(fromPos, toPos[this.recordAimPosIndex]) && this.recordAimPosIndex === toPos.length - 1) {
      this.dm.LeftClick();
      console.log('目标已到达指定位置');
      return true;
    }
    return false;
  }

  startAutoFindPath(toPos: Pos[] | Pos, actions?: AttackActions) {
    this.actions = actions;
    return new Promise((res, rej) => {
      this.finalPos = Array.isArray(toPos) ? toPos[toPos.length - 1] : toPos;
      let isArrive: boolean | undefined;
      this.timer = setInterval(() => {
        if (this.role.position) {
          isArrive = this.fromTo(this.role.position, toPos);
          // console.log('开始寻路拉！！', this.role.position, toPos, isArrive);
        }
        if (isArrive) {
          this.timer && clearInterval(this.timer);
          this.timer = null;
          this.recordAimPosIndex = 0;
          console.log('[角色信息] 已关闭自动寻路');
          res(this.role.position);
        }
        // 开启自动攻击
        // && this.actions?.currentAttackTargetPos
        if (actions) {
          actions.attackNearestMonster();
        }
      }, 300); // 中文注释：最小间隔 200ms，避免过于频繁
    });
  }

  stopAutoFindPath() {
    this.timer && clearInterval(this.timer);
    this.timer = null;
    // 中文注释：停止寻路时释放鼠标左键，避免卡住按下状态
    try {
      if (this.dm && typeof this.dm.LeftUp === 'function') {
        this.dm.LeftUp();
      }
    } catch {}
    console.log('[角色信息] 已关闭自动寻路');
  }
}

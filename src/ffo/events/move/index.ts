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
  private isPause = false; // 是否暂停移动
  private lastMoveTime = 0; // 上次移动时间戳
  private recordPos: Pos | null = null; // 记录上次移动的位置

  constructor(role: Role) {
    this.dm = role.bindDm;
    this.role = role;
  }

  async move(fromPos: Pos, curAimPos: Pos) {
    const angle = getAngle(fromPos.x, fromPos.y, curAimPos.x, curAimPos.y);
    const { x, y } = getCirclePoint(angle);
    this.dm.MoveTo(x, y);
    // 中文注释：按下左键以触发移动（修正大小写）
    this.dm.delay(200);
    this.dm.LeftDown();
  }

  fromTo(fromPos: Pos, toPos: Pos[] | Pos): boolean {
    if (!Array.isArray(toPos)) {
      toPos = [toPos];
    }
    // 判断是否达到最后一个目的坐标，没有到达就继续移动
    if (!(isArriveAimNear(fromPos, toPos[toPos.length - 1]) && this.recordAimPosIndex === toPos.length - 1)) {
      const curAimPos = toPos[this.recordAimPosIndex];
      !this.isPause && this.move(fromPos, curAimPos);
    }
    // 已到达中途的坐标点后，切换下一个坐标
    if (isArriveAimNear(fromPos, toPos[this.recordAimPosIndex]) && this.recordAimPosIndex < toPos.length - 1) {
      this.recordAimPosIndex++;
      return this.fromTo(fromPos, toPos);
    }
    // 到达最后的终点坐标
    if (isArriveAimNear(fromPos, toPos[this.recordAimPosIndex]) && this.recordAimPosIndex === toPos.length - 1) {
      this.dm.LeftClick();
      console.log('目标已到达指定位置');
      return true;
    }
    return false;
  }

  startAutoFindPath(toPos: Pos[] | Pos, actions?: AttackActions) {
    this.recordPos = { x: this.role?.position?.x || 0, y: this.role?.position?.y || 0 };
    if (actions) {
      this.actions = actions;
    }
    return new Promise((res, rej) => {
      this.finalPos = Array.isArray(toPos) ? toPos[toPos.length - 1] : toPos;
      let isArrive: boolean | undefined;
      console.log('执行startAutoFindPath，注册定时器');
      this.timer = setInterval(() => {
        if (this.role.position) {
          // 判断是否到达目的地
          isArrive = Array.isArray(toPos) ? this.fromTo(this.role.position, toPos) && this.recordAimPosIndex === toPos.length - 1 : this.fromTo(this.role.position, toPos);
        }
        if (isArrive) {
          this.timer && clearInterval(this.timer);
          this.timer = null;
          this.recordAimPosIndex = 0;
          console.log('[角色信息] 已关闭自动寻路，并解除定时器');
          res(this.role.position);
        }
        // 这里攻击操作会在寻路过程中执行，且因为共同同一个鼠标控制，攻击可能会阻塞寻路操作
        if (actions) {
          actions.attackNearestMonster();
          const now = Date.now();
          const isMove = this.role?.position?.x !== this.recordPos?.x || this.role?.position?.y !== this.recordPos?.y;
          if (now - this.lastMoveTime >= 6000 && this.role.position && !isMove) {
            // 在this.role.position随机100内移动
            this.dm.MoveTo(this.role.position.x + Math.floor(Math.random() * 200 - 100), this.role.position.y + Math.floor(Math.random() * 200 - 100));
            this.dm.delay(300);
            this.dm.LeftClick();
            this.lastMoveTime = now;
            this.recordPos = { x: this.role.position.x, y: this.role.position.y };
          }
        }
      }, 300); // 中文注释：最小间隔 200ms，避免过于频繁\
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

  // 暂停移动
  pauseMove() {
    this.isPause = true;
  }

  // 恢复移动
  resumeMove() {
    this.isPause = false;
  }
}

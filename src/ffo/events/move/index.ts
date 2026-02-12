import * as math from '../../../utils/math';
import { ORIGIN_POSITION } from '../../constant/OCR-pos';
import { isArriveAimNear } from '../../utils/common';
import { Role } from '../rolyer';
import { AttackActions } from '../skills';

// 节点半径（用于判断是否到达当前节点范围内，如果到达，就切换到下一个节点）
const pointR = 6;

export interface Pos {
  x: number;
  y: number;
}

export interface AutoFindPathConfig {
  toPos: Pos[] | Pos; // 目标位置（可以是多个位置，也可以是单个位置）
  actions?: AttackActions; // 赶路过程中的其他行为
  aimPos?: Pos | string; // 目标位置（可以是坐标，也可以是文本描述）
  stationR?: number; // 到达当前节点范围内半径（默认6）
  delay?: number; // 检查到达当前节点范围内时间间隔（默认2000ms）
}

const getInitPos = (bindWindowSize: string) => {
  const initPos = (ORIGIN_POSITION as any)[bindWindowSize];
  // console.log(initPos, '角色的绝对位置');
  return { x: initPos.x, y: initPos.y, r: initPos.r };
};

// 计算两点之间的角度（角度制）
export const getAngle = (x1: number, y1: number, x2: number, y2: number) => {
  const x = math.sub(x2, x1);
  const y = math.sub(y2, y1);
  // 求出弧度制
  const rad = Math.atan2(y, x);
  // 转换成角度值
  return Number(((rad * 180) / Math.PI).toFixed(2));
};

function getCirclePoint(angle: number, bindWindowSize: string) {
  // 角度转弧度（JavaScript Math.sin/cos需弧度）
  const pos = getInitPos(bindWindowSize);
  const initX = pos.x;
  const initY = pos.y;
  const radius = pos.r;
  // 角度转弧度（JavaScript Math.sin/cos需弧度）
  const rad = Number(((angle * Math.PI) / 180).toFixed(2));
  // console.log(rad, '弧度');
  // todo
  const x = math.add(initX, math.mul(radius, Number(Math.cos(rad).toFixed(2))));
  const y = math.add(initY, math.mul(radius, Number(Math.sin(rad).toFixed(2))));
  // console.log(Math.cos(rad), Math.sin(rad), '圆上cos sin');
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
    const { x, y } = getCirclePoint(angle, this.role.bindWindowSize);
    this.dm.MoveTo(x, y);
    // 中文注释：按下左键以触发移动（修正大小写）
    this.dm.delay(200);
    this.dm.LeftDown();
    console.log(fromPos, '移动到', curAimPos, '角度', angle, { x, y });
  }

  fromTo(fromPos: Pos | null, toPos: Pos[] | Pos, stationR: number): boolean {
    if (!Array.isArray(toPos)) {
      toPos = [toPos];
    }
    if (!fromPos) {
      console.log('未获取到角色位置', this.role);
      return false;
    }
    // 判断是否达到最后一个目的坐标，没有到达就继续移动
    if (!(isArriveAimNear(fromPos, toPos[toPos.length - 1], stationR) && this.recordAimPosIndex === toPos.length - 1)) {
      const curAimPos = toPos[this.recordAimPosIndex];
      !this.isPause && this.move(fromPos, curAimPos);
    }
    // 已到达/或者超过中途的坐标点后，切换下一个坐标
    // 已到达
    const isArriveStation = isArriveAimNear(fromPos, toPos[this.recordAimPosIndex], stationR) && this.recordAimPosIndex < toPos.length - 1;
    // 已超过
    // const isOverStation = isArriveAimNear(fromPos, toPos[this.recordAimPosIndex], 10) && this.recordAimPosIndex > 0;
    if (isArriveStation) {
      this.recordAimPosIndex++;
      return this.fromTo(fromPos, toPos, stationR);
    }
    // 到达最后的终点坐标
    if (isArriveAimNear(fromPos, toPos[this.recordAimPosIndex], stationR) && this.recordAimPosIndex === toPos.length - 1) {
      this.dm.LeftClick();
      console.log('目标已到达指定位置');
      return true;
    }
    return false;
  }

  // 在范围内随机移动
  randomMoveInRange(initPos: Pos, R: number, action: () => void, end: () => boolean) {
    // return new Promise((res, rej) => {
    //   let timer = setInterval(() => {
    //     const randomPos = this.randomMoveInRange(initPos, R);
    //     action();
    //     if (typeof end === 'function' && end() === true) {
    //       res(randomPos);
    //     }
    //   }, 1000);
    // });
  }

  startAutoFindPath(config: AutoFindPathConfig) {
    const { toPos, actions, aimPos, stationR = pointR, delay = 2000 } = config;
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
          // 到达下一张地图退出寻路
          if (aimPos && typeof aimPos === 'string' && this.role.map === aimPos) {
            this.dm.LeftClick();
            console.log('点击停止', aimPos);
            isArrive = true;
            // 到达目标点位退出寻路
          } else if (aimPos && typeof aimPos === 'object' && isArriveAimNear(this.role.position, aimPos, stationR)) {
            this.dm.LeftClick();
            isArrive = true;
          } else {
            // 判断是否到达目的地
            isArrive = Array.isArray(toPos) ? this.fromTo(this.role.position, toPos, stationR) && this.recordAimPosIndex === toPos.length - 1 : this.fromTo(this.role.position, toPos, stationR);
          }
        }
        if (isArrive) {
          this.timer && clearInterval(this.timer);
          this.timer = null;
          this.recordAimPosIndex = 0;
          setTimeout(() => {
            console.log(`[角色信息] 已关闭自动寻路，并解除定时器,同时延时${delay}毫秒，确保已经静止`);
            console.log(this.role.position);
            // 这里刚进入地图没法读取坐标
            res(true);
          }, delay);
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

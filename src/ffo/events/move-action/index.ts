import { logger } from '../../../utils/logger';
import * as math from '../../../utils/math';
import { ORIGIN_POSITION } from '../../constant/OCR-pos';
import { isArriveAimNear } from '../../utils/common';
import { AttackActions } from '../attack-action';
import { Role } from '../rolyer';

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
  refreshTime?: number; // 刷新时间
  map?: string; // 目标地图
}

const getInitPos = (bindWindowSize: string) => {
  const initPos = (ORIGIN_POSITION as any)[bindWindowSize];
  // logger.debug(initPos, '角色的绝对位置');
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
  const x = math.add(initX, math.mul(radius, Number(Math.cos(rad).toFixed(2))));
  const y = math.add(initY, math.mul(radius, Number(Math.sin(rad).toFixed(2))));
  // 四舍五入为整数（适配鼠标坐标）
  return { x, y };
}

export class MoveActions {
  private dm: any = null;
  private bindPlugin: any = null;
  private recordAimPosIndex = 0;
  private finalPos: Pos | null = null;
  private role;
  private actions?: AttackActions | null = null; // 赶路过程中的其他行为
  private isPause = false; // 是否暂停移动
  private lastMoveTime = 0; // 上次移动时间戳
  private recordPos: Pos | null = null; // 记录上次移动的位置
  private isRunLoop = true; // 是否运行循环

  constructor(role: Role) {
    this.dm = role.bindDm;
    this.bindPlugin = role.bindPlugin;
    this.role = role;
  }

  async move(fromPos: Pos, curAimPos: Pos) {
    // 未识别到坐标点，不进行寻路
    if (!fromPos.x || !fromPos.y) {
      logger.warn('[自动寻路] 未识别到坐标点', curAimPos);
      return;
    }
    const angle = getAngle(fromPos.x, fromPos.y, curAimPos.x, curAimPos.y);
    const { x, y } = getCirclePoint(angle, this.role.bindWindowSize);
    this.bindPlugin.moveToLeftDown(x, y);
    logger.info(`[自动寻路] 从 (${fromPos.x},${fromPos.y}) 移动到 (${curAimPos.x},${curAimPos.y}) `);
  }

  randomMove() {
    const angle = Math.random() * 360;
    const { x, y } = getCirclePoint(angle, this.role.bindWindowSize);
    this.dm.MoveTo(x, y);
    // 中文注释：按下左键以触发移动（修正大小写）
    this.dm.delay(400);
    this.dm.LeftDown();
    logger.info('[自动寻路] 开始进行随机移动');
  }

  fromTo(fromPos: Pos | null, toPos: Pos[] | Pos, stationR: number): boolean {
    if (!Array.isArray(toPos)) {
      toPos = [toPos];
    }
    if (!fromPos) {
      logger.warn('[自动寻路] 未获取到角色位置', this.role);
      return false;
    }
    // 判断是否达到最后一个目的坐标，没有到达就继续移动
    if (!(isArriveAimNear(fromPos, toPos[toPos.length - 1], stationR) && this.recordAimPosIndex === toPos.length - 1)) {
      const curAimPos = toPos[this.recordAimPosIndex];
      !this.isPause && this.move(fromPos, curAimPos);
    }
    // 已到达/或者超过中途的坐标点后，切换下一个坐标
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
      logger.info(`[自动寻路] 已到达指定位置(${toPos[this.recordAimPosIndex].x},${toPos[this.recordAimPosIndex].y})`);
      return true;
    }
    return false;
  }

  // 判断6S内是否进行了移动
  isMove(time = 6) {
    this.recordPos = { x: this.role?.position?.x || 0, y: this.role?.position?.y || 0 };
    // 如果超过6S没有移动，就进行随机移动
    const now = Date.now();
    if (now - this.lastMoveTime >= time * 1000 && this.role.position) {
      const { x, y } = this.role.position ?? {};
      const isM = !(x === this.recordPos.x && y === this.recordPos.y);
      setTimeout(() => {
        this.lastMoveTime = now;
      }, 1000);
      return isM;
    }
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
    const { toPos, actions, aimPos, stationR = pointR, delay = 2000, refreshTime = 300, map = '' } = config;
    if (actions) {
      this.actions = actions;
    }
    return new Promise((res, rej) => {
      this.finalPos = Array.isArray(toPos) ? toPos[toPos.length - 1] : toPos;
      let isArrive: boolean | undefined;
      let isRunLoop = true;
      logger.info(`[自动寻路] 执行startAutoFindPath，注册定时器`);
      // 中文注释：使用 setImmediate 首次触发，再用 setTimeout(300ms) 做周期轮询，避免事件循环拥塞
      const loop = () => {
        try {
          if (this.role.position) {
            const { x, y } = this.role.position;
            // 到达下一张地图退出寻路
            if (aimPos && typeof aimPos === 'string' && this.role.map === aimPos) {
              // this.dm.LeftClick();
              this.bindPlugin.moveToClick(x, y + 2);
              logger.info(`[自动寻路] 到达下一张地图退出寻路,点击坐标 (${x},${y + 2}) 停止寻路，`);
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

          // 这里攻击操作会在寻路过程中执行，且因为共同同一个鼠标控制，攻击可能会阻塞寻路操作
          if (actions) {
            actions.attackNearestMonster();
          }
        } finally {
          if (map && map !== this.role.map) {
            this.role.clearActionTimer('autoFindPath');
            this.recordAimPosIndex = 0;
            this.isRunLoop = false; // 关闭循环
            // 鼠标点击结束寻路的左键按下
            this.dm.LeftClick();
            logger.info(`[自动寻路] 已切换地图，当前地图${this.role.map}，目标地图${map}，结束自动寻路`);
            rej('[自动寻路] 已切换地图，结束自动寻路');
          }
          if (isArrive) {
            // 中文注释：到达后清理定时器并延时，确保角色静止
            this.role.clearActionTimer('autoFindPath');
            this.recordAimPosIndex = 0;
            isRunLoop = false; // 关闭循环
            setTimeout(() => {
              logger.info(`[自动寻路] 已关闭自动寻路，并解除定时器,同时延时${delay}毫秒，确保已经静止`);
              // 这里刚进入地图没法读取坐标
              res(true);
            }, delay);
          } else {
            // 中文注释：未到达则继续 300ms 后轮询一次，并更新可清理的句柄
            if (!isRunLoop) return;
            const t = setTimeout(loop, refreshTime);
            this.role.addActionTimer('autoFindPath', t);
          }
        }
      };
      setImmediate(loop); // 中文注释：立即触发一次执行
    });
  }

  stopAutoFindPath() {
    this.role.clearActionTimer('autoFindPath');
    // 中文注释：停止寻路时释放鼠标左键，避免卡住按下状态
    try {
      if (this.dm && typeof this.dm.LeftUp === 'function') {
        this.dm.LeftUp();
      }
    } catch {}
    logger.info('[角色信息] 已关闭自动寻路');
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

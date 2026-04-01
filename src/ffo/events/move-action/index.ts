import { logger } from '../../../utils/logger';
import * as math from '../../../utils/math';
import { ORIGIN_POSITION } from '../../constant/OCR-pos';
import { isArriveAimNear } from '../../utils/common';
import { AttackActions } from '../attack-action';
import { BaseAction } from '../base-action';
import { Role } from '../rolyer';

// 节点半径（用于判断是否到达当前节点范围内，如果到达，就切换到下一个节点）
const pointR = 6;

export interface Pos {
  x: number;
  y: number;
}

const computedRange = (angle: number) => {
  if (angle >= 22.5 && angle <= 67.5) {
    return 'G5';
  }
  if (angle >= 67.5 && angle <= 112.5) {
    return 'G6';
  }
  if (angle >= 112.5 && angle <= 157.5) {
    return 'G7';
  }
  if ((angle >= 157.5 && angle <= 180) || (angle > -180 && angle < -157.5)) {
    return 'G8';
  }
  if (angle >= -157.5 && angle <= -112.5) {
    return 'G1';
  }
  if (angle >= -112.5 && angle <= -67.5) {
    return 'G2';
  }
  if (angle >= -67.5 && angle <= -22.5) {
    return 'G3';
  }
  if (angle >= -22.5 && angle <= 22.5) {
    return 'G4';
  }
};

export interface AutoFindPathConfig {
  toPos: Pos[] | Pos; // 目标位置（可以是多个位置，也可以是单个位置）
  actions?: AttackActions; // 赶路过程中的其他行为
  aimPos?: Pos | string; // 目标位置（可以是坐标，也可以是文本描述）
  stationR?: number; // 到达当前节点范围内半径（默认6）
  delay?: number; // 检查到达当前节点范围内时间间隔（默认2000ms）
  refreshTime?: number; // 刷新时间
  taskMap?: string; // 需要进行作业的目标地图
  attackMode?: 'moveAndAttack' | 'spotAttack'; // 攻击模式（moveAndAttack:一边移动一边技能好了就攻击；spotAttack:到达坐标后开始清理攻击）
  blockAllBeforeMove?: boolean; // 移动前屏蔽所有人
}

const getInitPos = (bindWindowSize: string, offsetR?: number) => {
  const initPos = (ORIGIN_POSITION as any)[bindWindowSize];
  // logger.debug(initPos, '角色的绝对位置');
  return { x: initPos.x, y: initPos.y, r: offsetR || initPos.r };
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

function getCirclePoint(angle: number, bindWindowSize: string, offsetR?: number) {
  // 角度转弧度（JavaScript Math.sin/cos需弧度）
  const pos = getInitPos(bindWindowSize, offsetR);
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

interface MoveConfig {
  offsetR?: number; //
  mirrorJitter?: boolean; // 移动时的镜像抖动（默认false）
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
  private lastAttackTime = 0; // 上次攻击时间戳
  private recordPos: Pos | null = null; // 记录上次移动的位置
  private isRunLoop = true; // 是否运行循环
  private offsetR?: number; // 偏移半径
  private mirrorJitter = false; // 移动时的镜像抖动
  private attackMode: 'moveAndAttack' | 'spotAttack' = 'moveAndAttack'; // 攻击模式（moveAndAttack:一边移动一边技能好了就攻击；spotAttack:到达坐标后开始清理攻击）
  private aimPos?: Pos | string | null = null; // 目标位置（可以是坐标，也可以是文本描述）

  constructor(role: Role, config?: MoveConfig) {
    this.dm = role.bindDm;
    this.bindPlugin = role.bindPlugin;
    this.role = role;
    this.offsetR = config?.offsetR;
  }

  async move(fromPos: Pos, curAimPos: Pos) {
    // 未识别到坐标点，不进行寻路
    if (!fromPos.x || !fromPos.y) {
      logger.warn('[自动寻路] 未识别到坐标点', curAimPos);
      return;
    }
    const angle = getAngle(fromPos.x, fromPos.y, curAimPos.x, curAimPos.y);
    const { x, y } = getCirclePoint(angle, this.role.bindWindowSize, this.offsetR);
    this.bindPlugin.moveToLeftDown(x, y);
    logger.info(`[自动寻路] 从 (${fromPos.x},${fromPos.y}) 移动到 (${curAimPos.x},${curAimPos.y}) `);
  }

  // 一边移动一边攻击
  async moveAndAttack(fromPos: Pos, curAimPos: Pos) {
    // 未识别到坐标点，不进行寻路
    if (!fromPos.x || !fromPos.y) {
      logger.warn('[自动寻路] 未识别到坐标点', curAimPos);
      return;
    }
    const angle = getAngle(fromPos.x, fromPos.y, curAimPos.x, curAimPos.y);
    const { x, y } = getCirclePoint(angle, this.role.bindWindowSize, this.offsetR);
    const freeSkill = this.actions?.getFreeSkill?.();
    const findMonster = this.actions?.findMonsterPos?.();
    if (freeSkill && findMonster && Date.now() - this.lastAttackTime > 2000) {
      // 计算与（800，450）的角度
      const angle = getAngle(x, y, 800, 450);
      // 攻击最近的怪物
      this.actions?.attackNearestMonster?.(computedRange(angle));
      this.lastAttackTime = Date.now();
      return;
    }
    this.bindPlugin.moveToLeftDown(x, y);
    logger.info(`[自动寻路] 从 (${fromPos.x},${fromPos.y}) 移动到 (${curAimPos.x},${curAimPos.y}) `);
  }

  randomMove() {
    const angle = Math.random() * 360;
    const { x, y } = getCirclePoint(angle, this.role.bindWindowSize, this.offsetR);
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
      if (this.isPause) {
        return false;
      }
      if (this.attackMode === 'moveAndAttack') {
        // console.log(this.attackMode, 'moveAndAttack');
        this.moveAndAttack(fromPos, curAimPos);
      } else {
        this.move(fromPos, curAimPos);
      }
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
    const isLastPos = isArriveAimNear(fromPos, toPos[this.recordAimPosIndex], stationR) && this.recordAimPosIndex === toPos.length - 1;
    // 如果设置了目标位置，且到达了目标位置，成功到达;未设置目标地图名字，到达最后一个坐标也算到达
    const isArrive = (typeof this.aimPos === 'string' && this.aimPos === this.role.map) || (typeof this.aimPos !== 'string' && isLastPos);
    if (isArrive) {
      // 点击脚下的死坐标
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

  startAutoFindPath(config: AutoFindPathConfig) {
    const { toPos, actions, aimPos, stationR = pointR, delay = 2000, refreshTime = 300, attackMode, taskMap, blockAllBeforeMove = false } = config;
    if (blockAllBeforeMove) {
      new BaseAction(this.role).blockAllPlayers();
    }
    this.aimPos = aimPos;
    if (actions) {
      this.actions = actions;
    }
    if (!attackMode) {
      this.attackMode = 'moveAndAttack';
    }
    return new Promise((res, rej) => {
      this.finalPos = Array.isArray(toPos) ? toPos[toPos.length - 1] : toPos;
      let isArrive: boolean | undefined;
      let isRunLoop = true;
      logger.info(`[自动寻路] 执行startAutoFindPath，注册定时器`);
      // 中文注释：使用 setImmediate 首次触发，再用 setTimeout(300ms) 做周期轮询，避免事件循环拥塞
      const loop = () => {
        try {
          if (!this.role.position) {
            logger.info(`[自动寻路] 未检测到坐标`);
            return;
          }
          const { x, y } = this.role.position;
          // 到达下一张地图退出寻路
          if (aimPos && typeof aimPos === 'string' && this.role.map === aimPos) {
            // 点击脚下的死坐标
            this.bindPlugin.moveToClick(800, 525);
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

          // 这里攻击操作会在寻路过程中执行，且因为共同同一个鼠标控制，攻击可能会阻塞寻路操作
          if (actions && this.attackMode !== 'moveAndAttack') {
            actions.attackNearestMonster();
          }
        } finally {
          // 目标地图与当前地图不同，（可能是被杀了）
          if (taskMap && this.role.map !== taskMap) {
            this.role.clearActionTimer('autoFindPath');
            this.recordAimPosIndex = 0;
            this.isRunLoop = false; // 关闭循环
            // 鼠标点击结束寻路的左键按下
            this.dm.LeftClick();
            rej(`[自动寻路] 已切换地图，当前地图${this.role.map}，目标地图${aimPos}，结束自动寻路`);
          }
          if (isArrive) {
            // 中文注释：到达后清理定时器并延时，确保角色静止
            this.role.clearActionTimer('autoFindPath');
            this.recordAimPosIndex = 0;
            setTimeout(() => {
              logger.info(`[自动寻路] 已关闭自动寻路，并解除定时器,同时延时${delay}毫秒，确保已经静止`);
              // 这里刚进入地图没法读取坐标
              res(true);
            }, delay);
            isRunLoop = false; // 关闭循环
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

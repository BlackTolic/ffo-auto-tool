import { logger } from '../../../utils/logger';
import { MonsterFeature, OCR_MONSTER } from '../../constant/monster-feature';
import { parseTextPos } from '../../utils/common';
import { isMonsterEmptyHp } from '../../utils/ocr-check/base';
import { Role } from '../rolyer';

export interface ScanMonsterOptions {
  attackType?: 'group' | 'single';
  times?: number;
  attackRange?: {
    x: number;
    y: number;
    r: number;
  };
  map?: string;
}

const attackRange = {
  '1600*900': { x1: 364, y1: 152, x2: 1293, y2: 677 },
  '1280*800': { x1: 337, y1: 154, x2: 968, y2: 587 },
};

// dm.Ocr(380,117,1254,736,"000400-555555",1.0)
export class CatchPetAction {
  public role: Role; // 角色信息
  public bindDm: any = null; // 大漠类
  private bindPlugin: any = null; // 插件类
  public timer: NodeJS.Timeout | null = null;
  public timerMapList: Map<string, NodeJS.Timeout> = new Map();
  private ocrMonster: MonsterFeature;
  private lastTime = 0; // 记录上次执行F10的时间戳
  private catchTimes = 0; // 记录捕捉次数

  constructor(role: Role, ocrMonster?: MonsterFeature) {
    this.role = role;
    this.bindDm = role.bindDm;
    this.ocrMonster = { ...attackRange[this.role.bindWindowSize], ...(ocrMonster || OCR_MONSTER) };
    this.bindPlugin = role.bindPlugin;
  }

  findMonsterPos(delX = 10, delY = 40) {
    const { x1, y1, x2, y2, string, color, sim } = this.ocrMonster;
    const result = this.bindDm.FindStrFastE(x1, y1, x2, y2, string, color, sim);
    // 识别怪物的坐标
    const pos = parseTextPos(result);
    if (!pos || pos.x < 0 || pos.y < 0) return null;
    // 往怪物名字坐标下方20丢技能
    const currentAttackTargetPos = { x: pos.x + delX, y: pos.y + delY };
    return currentAttackTargetPos;
  }

  // 找到最近的宠物进行捕捉
  attackNearestMonster() {
    const pos = this.findMonsterPos();
    logger.info(`[自动捕捉] OCR结果: ${pos}`);
    if (!pos) return;
    const { x, y } = pos;
    // 右键锁定
    this.bindPlugin.moveToClick(x, y, 'right');
    this.bindPlugin.delay(1000);
    // 检查是否是地翼魔，如果不是直接干死
    const monsterName = this.role.selectMonster;
    console.log(monsterName, 'monsterName');
    if (monsterName && monsterName !== '地翼魔') {
      this.bindDm.keyDownChar('F2');
      this.bindDm.delay(300);
      this.bindDm.keyUpChar('F2');
      logger.info('[自动捕捉] 目标不是地翼魔，直接干死');
      return;
    }
    // 左键点击打残血量
    this.bindDm.LeftClick();
    this.bindDm.delay(500);
    this.bindPlugin.moveToClick(795, 632, 'left');
    // 检查当前怪物的血量是否为空
    const isEmptyHp = isMonsterEmptyHp(this.bindPlugin, this.role.bindWindowSize);
    console.log(isEmptyHp, 'isEmptyHp111');
    // 只抓7次
    if (isEmptyHp && monsterName && this.catchTimes < 8) {
      this.bindDm.delay(300);
      // 开始捕捉
      this.bindDm.keyDownChar('F1');
      this.bindDm.delay(300);
      this.bindDm.keyUpChar('F1');
      this.catchTimes++; // 捕捉次数加1
      logger.info(`[自动捕捉] 捕捉地翼魔，当前捕捉次数 ${this.catchTimes}`);
    }
    if (isEmptyHp && monsterName && !(this.catchTimes < 8)) {
      // 开始捕捉
      this.catchTimes = 0;
      logger.info('[自动捕捉] 捕捉地翼魔失败，进行人道毁灭');
    }
    logger.info('[自动捕捉] 出现其他情况');
  }

  // 检查角色血量是否健康
  checkHealthStatus() {
    const bloodStatus = this.role.bloodStatus;
    // logger.debug('血量状态', bloodStatus);
    // const statusBloodIcon = this.role.statusBloodIcon;
    if (bloodStatus === 'danger') {
      const now = Date.now();
      if (now - this.lastTime > 100 * 1000) {
        // 距离上次执行F10超过100秒
        logger.warn('角色血量进入危险状态，执行F10', bloodStatus);
        this.bindDm.keyDownChar('F10');
        this.bindDm.delay(300);
        this.bindDm.keyUpChar('F10');
        this.bindDm.delay(300);
        this.lastTime = now; // 更新上次执行时间
      } else {
        logger.warn('[自动攻击] 角色血量危险，但距离上次执行F10不足100秒，跳过');
      }
    }
  }

  // 识别周围有无怪物，并且识别5秒
  scanMonster(options: ScanMonsterOptions) {
    const { attackType, times = 5, attackRange, map = '' } = options;
    return new Promise((resolve, reject) => {
      logger.info(`[自动捕捉] 已启动：attackType=${attackType} | 目标点位=${attackRange?.x},${attackRange?.y} | 间隔=${times}S | 范围=${attackRange?.r || '无'}`);
      let counter = 0;
      let lastIsolateTime = 0;
      let timer: NodeJS.Timeout | null = setInterval(() => {
        // 对怪物进行攻击
        // const isRange = attackRange && isArriveAimNear(this.role.position, { x: attackRange.x, y: attackRange.y }, attackRange.r);
        // if (!isRange && attackRange) {
        //   logger.info(`[自动攻击] 未在范围内，需要移动到目标点：(${attackRange.x},${attackRange.y}),r=${attackRange.r}`);
        //   const { x, y } = attackRange;
        //   const { x: roleX, y: roleY } = this.role.position ?? { x: 0, y: 0 };
        //   new MoveActions(this.role).move({ x: roleX, y: roleY }, { x, y });
        // }

        this.attackNearestMonster();
        // todo 缩小范围
        const findMonsterPos = this.findMonsterPos();
        if (findMonsterPos) {
          counter = 0;
        }
        // // 检测到与怪物有隔离
        // const isIsolate = isBlocked(this.bindDm, this.role.bindWindowSize);
        // // todo技能卡住移动
        // const now = Date.now();
        // // 这里需要打开世界频道，刷新掉弹出的红字
        // if (isIsolate && now - lastIsolateTime > 5000 && attackRange) {
        //   // 连续5S内都有隔离，认为是与怪物有隔离
        //   logger.info(`[自动攻击] 已与怪物隔离，需要移动到目标点 (${attackRange.x},${attackRange.y})`);
        //   const { x, y } = attackRange;
        //   const { x: roleX, y: roleY } = this.role.position ?? { x: 0, y: 0 };
        //   new MoveActions(this.role).move({ x: roleX, y: roleY }, { x, y });
        // }
        // 地图发生改变，中断攻击
        if (map && map !== this.role.map) {
          const { x: roleX, y: roleY } = this.role.position ?? { x: 0, y: 0 };
          timer && clearInterval(timer);
          timer = null;
          this.bindDm;
          this.bindPlugin.moveToClick(roleX + 30, roleY);
          reject('[自动攻击] 已切换地图，当前地图${this.role.map}，目标地图${map}，结束自动攻击');
        }
        if (!findMonsterPos && counter > times) {
          logger.info(`[自动攻击] 已连续${times}S无目标，结束自动攻击`);
          timer && clearInterval(timer);
          timer = null;
          resolve(true);
        }
        counter++;
      }, 1000);
    });
  }
}

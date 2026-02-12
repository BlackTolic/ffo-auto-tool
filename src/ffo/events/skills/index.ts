import { MonsterFeature, OCR_MONSTER } from '../../constant/monster-feature';
import { parseTextPos } from '../../utils/common';
import { isBlocked } from '../../utils/ocr-check/base';
import { Pos, Role } from '../rolyer';

// 中文注释：Windows 虚拟键码映射（F1-F10），便于统一复用
export const VK_F: Record<'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' | 'F11', number> = {
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
};

interface KeyPressOptions {
  key: keyof typeof VK_F;
  interval: number | null;
  isCd?: boolean;
  song?: number;
  sort?: number;
  type?: 'lock' | 'delay' | 'normal'; // 技能类型，lock 为锁定技能，delay 为延迟技能，normal 为普通技能
}

const skillGroup: KeyPressOptions[] = [
  // { key: 'F1', interval: 6000, song: 500 }, // 攻击技能
  // { key: 'F2', interval: 5000, song: 750 }, // 攻击技能
  // { key: 'F3', interval: 10000, song: 0 }, // 攻击技能
  // { key: 'F4', interval: 9000, song: 0 }, // 攻击技能
  // { key: 'F9', interval: 10000, song: 0 }, // 状态技能

  { key: 'F1', interval: 6000, song: 0, sort: 1 }, // 攻击技能
  { key: 'F2', interval: 6000, song: 0, sort: 2 }, // 攻击技能
  { key: 'F3', interval: 2500, song: 0, sort: 4, type: 'lock' }, // 攻击技能
  { key: 'F4', interval: 5000, song: 0, sort: 3 }, // 攻击技能
];

const buffGroup: KeyPressOptions[] = [
  { key: 'F6', interval: 90 * 1000, song: 0 }, // 状态技能
  { key: 'F7', interval: 100 * 1000, song: 0 }, // 状态技能
  { key: 'F8', interval: 30 * 1000, song: 0, type: 'lock' }, // 状态技能
];

// dm.Ocr(380,117,1254,736,"000400-555555",1.0)
export class AttackActions {
  public role: Role; // 角色信息
  public bindDm: any = null; // 大漠类
  public timer: NodeJS.Timeout | null = null;
  public timerMapList: Map<string, NodeJS.Timeout> = new Map();
  public buffTimerMapList: Map<string, NodeJS.Timeout> = new Map();
  private skillPropsList: KeyPressOptions[] = [];
  private ocrMonster: MonsterFeature;
  private lastTime = 0; // 记录上次执行F10的时间戳
  // 技能组
  private cdController: Map<keyof typeof VK_F, boolean> = new Map([
    ['F1', false],
    ['F2', false],
    ['F3', false],
    ['F4', false],
    ['F9', false],
  ]);
  // 当前正在攻击的对象的坐标
  public currentAttackTargetPos: Pos | null = null;

  constructor(role: Role, ocrMonster?: MonsterFeature) {
    this.role = role;
    this.bindDm = role.bindDm;
    this.ocrMonster = ocrMonster || OCR_MONSTER;
  }

  findMonsterPos(delX = 10, delY = 40) {
    const { x1, y1, x2, y2, string, color, sim } = this.ocrMonster;
    const result = this.bindDm.FindStrFastE(x1, y1, x2, y2, string, color, sim);
    // console.log('OCR结果', result);
    // 识别怪物的坐标
    const pos = parseTextPos(result);
    if (!pos || pos.x < 0 || pos.y < 0) return null;
    // 往怪物名字坐标下方20丢技能
    const currentAttackTargetPos = { x: pos.x + delX, y: pos.y + delY };
    return currentAttackTargetPos;
  }

  // 找到最近的怪物进行攻击 - 适用于群攻场景
  attackNearestMonster() {
    const freeSkill = this.getFreeSkill();
    // 判断是否有闲置的技能
    if (!freeSkill) {
      console.log('技能在CD中');
      return;
    }
    const pos = this.findMonsterPos();
    console.log(pos, 'pos');
    if (!pos) return;
    const { x, y } = pos;
    this.bindDm.MoveTo(x, y);
    this.bindDm.delay(300);
    // 选中目标
    this.bindDm.RightClick();
    // const monsterName = this.role.selectMonster;
    // console.log('怪物坐标', pos, '名字', monsterName);
    // 即将使用带lock技能
    this.useSkill(freeSkill);
    // 检查血量是否危险
    this.checkHealthStatus();
    // this.startAutoSkill(skillGroup);
  }
  // 找到最近的怪物进行攻击 - 适用于单体攻击场景
  attackNearestMonsterForSingle() {
    const freeSkill = this.getFreeSkill();
    // 判断是否有闲置的技能
    if (!freeSkill) {
      console.log('技能在CD中');
      return;
    }
    const pos = this.findMonsterPos();
    console.log(pos, 'pos');
    if (!pos) return;
    const { x, y } = pos;
    this.bindDm.MoveTo(x, y);
    this.bindDm.delay(300);
    // 选中目标,如果已经选中目标就不在
    !this.role.selectMonster && this.bindDm.LeftClick();
    this.bindDm.delay(300);
    // const monsterName = this.role.selectMonster;
    // console.log('怪物坐标', pos, '名字', monsterName);
    // 即将使用带lock技能
    this.useSkill(freeSkill);
    // 检查血量是否危险
    this.checkHealthStatus();
    // this.startAutoSkill(skillGroup);
  }

  // 开启自动攻击
  startAutoAttack() {
    // const timer = setInterval(() => {
    //   this.attackNearestMonster();
    // }, 1000);
    return this.scanMonster();
  }

  // 检查角色血量是否健康
  checkHealthStatus() {
    const bloodStatus = this.role.bloodStatus;
    // console.log('血量状态', bloodStatus);
    // const statusBloodIcon = this.role.statusBloodIcon;
    if (bloodStatus === 'danger') {
      const now = Date.now();
      if (now - this.lastTime > 120000) {
        // 距离上次执行F10超过120秒
        console.log('角色血量进入危险状态，执行F10', bloodStatus);
        this.bindDm.KeyDownChar('F10');
        this.bindDm.delay(300);
        this.bindDm.KeyUpChar('F10');
        this.bindDm.delay(300);
        this.lastTime = now; // 更新上次执行时间
      } else {
        console.log('角色血量危险，但距离上次执行F10不足120秒，跳过');
      }
    }
  }

  useSkill(skill: KeyPressOptions) {
    // console.log(skill, 'skill');
    const { key, interval = 0, type } = skill;
    console.log(key, interval, type, 'useSkill', this.role.selectMonster);
    if (type === 'lock' && !this.role.selectMonster) {
      this.bindDm.LeftClick();
    } else {
      this.bindDm.KeyDownChar(key);
      this.bindDm.delay(300);
      this.bindDm.KeyUpChar(key);
      this.bindDm.delay(300);
      // 延时技能需要左键点击释放
      type === 'delay' && this.bindDm.LeftClick();
      this.cdController.set(key, true);
      setTimeout(() => {
        this.cdController.set(key, false);
      }, interval || 0);
    }
  }

  // 获取空闲时间的技能
  getFreeSkill(): KeyPressOptions | null {
    // 在cdController中找到一个为false的技能,且优先级最高的
    const filterSkill = skillGroup.filter(item => this.cdController.get(item.key) === false).sort((a, b) => a.sort! - b.sort!);
    // console.log(filterSkill, '空闲技能');
    const freeSkill = filterSkill[0] || null;
    if (!freeSkill) return null;

    return freeSkill;
  }

  // startAutoSkill(props: KeyPressOptions[]) {
  //   this.skillPropsList = props;
  //   props.forEach(item => {
  //     const timer = setInterval(() => {
  //       this.bindDm.KeyDownChar(item.key);
  //       this.bindDm.delay(500);
  //       this.bindDm.KeyUpChar(item.key);
  //       this.bindDm.delay(300);
  //       this.bindDm.LeftClick();
  //     }, item.interval || 0);
  //     this.timerMapList.set(item.key, timer);
  //   });
  // }

  // 停止缺省技能
  stopAutoSkill() {
    this.skillPropsList.forEach(item => {
      const timer = this.timerMapList.get(item.key);
      if (timer) {
        clearInterval(timer);
        this.timerMapList.delete(item.key);
      }
    });
  }

  // 中文注释：启动自动按键（第二参数为毫秒间隔，第三参数为按键名，默认 F1）
  startKeyPress(props: KeyPressOptions): void {
    const { key, interval = null } = props;
    if (interval) {
      // 中文注释：周期即执行的时间间隔（毫秒），设置最小 10ms 防止过于频繁
      const periodMs = Math.max(10, Math.floor(interval));
      // 中文注释：定时按键（使用大漠插件 KeyPress）
      const timer = setInterval(() => {
        try {
          // 中文注释：按指定功能键（通过映射获取虚拟键码并转字符串）
          this.bindDm.KeyPress(VK_F[key]);
        } catch (err) {
          // 中文注释：按键失败后立即退出定时器并清理状态
          console.warn('[自动按键] 按键失败，自动停止：', String((err as any)?.message || err));
          this.stopKeyPress(key);
        }
      }, periodMs);
      this.timerMapList.set(key, timer);
      console.log(`[自动按键y] 已启动：key=${key} | 间隔=${periodMs}ms | 频率约=${(1000 / periodMs).toFixed(2)} 次/秒`);
    } else {
      console.log(`[自动按键y]`, String(VK_F[key]));
      // 中文注释：按指定功能键（通过映射获取虚拟键码并转字符串）
      // this.bindDm.KeyPress(VK_F[key]);
      this.bindDm.KeyDownChar(key);
      this.bindDm.delay(500);
      this.bindDm.KeyUpChar(key);
      // console.log(`[自动按键]`, this.bindDm);
      console.log(`[自动按键y] 已启动：key=${key} | 无间隔（单次按键）`);
    }
  }

  stopKeyPress(key: keyof typeof VK_F): void {
    const timer = this.timerMapList.get(key);
    if (timer) {
      clearInterval(timer);
      this.timerMapList.delete(key);
      console.log(`[自动按键] 已停止：key=${key}`);
    }
  }

  // 循环添加buff
  addBuff() {
    if (this.buffTimerMapList.get('F6')) {
      return;
    }
    buffGroup.forEach(item => {
      console.log(`[buff] 已启动：key=${item.key}`);
      this.bindDm.KeyDownChar(item.key);
      this.bindDm.delay(300);
      this.bindDm.KeyUpChar(item.key);
      this.bindDm.delay(300);
      const timer = setInterval(() => {
        try {
          if (item.type === 'lock' && !this.role.selectMonster) {
            console.log(`当前技能${item.key}为锁定技能，未选择目标，不执行`);
          } else {
            this.bindDm.KeyDownChar(item.key);
            this.bindDm.delay(300);
            this.bindDm.KeyUpChar(item.key);
            this.bindDm.delay(300);
          }
          // 中文注释：按指定功能键（通过映射获取虚拟键码并转字符串）
        } catch (err) {
          // 中文注释：按键失败后立即退出定时器并清理状态
          console.warn('[自动按键] 按键失败，自动停止：', String((err as any)?.message || err));
          this.stopKeyPress(item.key);
        }
      }, item.interval || 0);
      this.buffTimerMapList.set(item.key, timer);
    });
  }

  // 停止添加buff
  stopAddBuff() {
    buffGroup.forEach(item => {
      const timer = this.buffTimerMapList.get(item.key);
      if (timer) {
        clearInterval(timer);
        this.buffTimerMapList.delete(item.key);
        console.log(`[自动按键] 已停止：key=${item.key}`);
      }
    });
  }

  // 识别周围有无怪物，并且识别5秒
  scanMonster(attackType?: 'group' | 'single', times = 5) {
    return new Promise((resolve, reject) => {
      let counter = 0;
      let lastIsolateTime = 0;
      let timer: NodeJS.Timeout | null = setInterval(() => {
        // 对怪物进行攻击
        attackType === 'single' ? this.attackNearestMonsterForSingle() : this.attackNearestMonster();
        const findMonsterPos = this.findMonsterPos();
        if (findMonsterPos) {
          counter = 0;
        }
        // console.log('counter', counter, findMonsterPos);
        // 检测到与怪物有隔离
        const isIsolate = isBlocked(this.bindDm, this.role.bindWindowSize);
        // console.log(isIsolate, 'isIsolate');
        const now = Date.now();
        if (isIsolate && now - lastIsolateTime > 5000) {
          // 连续5S内都有隔离，认为是与怪物有隔离
          console.log('与怪物有隔离，不攻击');
          lastIsolateTime = now;
          timer && clearInterval(timer);
          timer = null;
          resolve(findMonsterPos);
        }
        if (!findMonsterPos && counter > times) {
          timer && clearInterval(timer);
          timer = null;
          resolve(findMonsterPos);
        }
        counter++;
      }, 1000);
    });
  }
}

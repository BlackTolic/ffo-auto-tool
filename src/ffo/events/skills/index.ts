import { MONSTER_FEATURE, OCR_MONSTER } from '../../constant/monster-feature';
import { parseTextPos } from '../../utils/common';
import { Pos, Role } from '../rolyer';

// 中文注释：Windows 虚拟键码映射（F1-F10），便于统一复用
export const VK_F: Record<'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10', number> = {
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
};

interface AttackOptions {
  path?: { x: number; y: number }[];
  attackRange?: number;
}

interface KeyPressOptions {
  key: keyof typeof VK_F;
  interval?: number | null;
  isCd?: boolean;
  song?: number;
}

const skillGroup: KeyPressOptions[] = [
  { key: 'F1', interval: 6000, song: 500 },
  { key: 'F2', interval: 5000, song: 750 },
  { key: 'F3', interval: 10000, song: 0 },
  { key: 'F4', interval: 9000, song: 0 },
];

// dm.Ocr(380,117,1254,736,"000400-555555",1.0)
export class AttackActions {
  public role: Role;
  public bindDm: any = null; // 大漠类
  public timer: NodeJS.Timeout | null = null;
  public timerMapList: Map<string, NodeJS.Timeout> = new Map();
  private skillPropsList: KeyPressOptions[] = [];
  private ocrMonster = { ...OCR_MONSTER, string: MONSTER_FEATURE['精英|头目'] };
  // 技能组
  private cdController: Map<keyof typeof VK_F, boolean> = new Map([
    ['F1', false],
    ['F2', false],
    ['F3', false],
    ['F4', false],
  ]);
  // 当前正在攻击的对象的坐标
  public currentAttackTargetPos: Pos | null = null;

  constructor(role: Role) {
    this.role = role;
    this.bindDm = role.bindDm;
  }

  findMonsterPos() {
    const { x1, y1, x2, y2, string, color, sim } = this.ocrMonster;
    const result = this.bindDm.FindStrFastE(x1, y1, x2, y2, string, color, sim);
    // console.log('OCR结果', result);
    // 识别怪物
    const pos = parseTextPos(result);
    if (!pos || pos.x < 0 || pos.y < 0) return null;
    const currentAttackTargetPos = { x: pos.x, y: pos.y + 20 };
    this.currentAttackTargetPos = currentAttackTargetPos;
    return currentAttackTargetPos;
  }

  // 找到最近的怪物进行攻击
  attackNearestMonster() {
    const freeSkill = this.getFreeSkill();
    // 已经识别到怪物后就不再进行识别
    if (!freeSkill) {
      console.log('已经识别到怪物后就不再进行识别,或者技能在CD中');
      return;
    }
    const pos = this.findMonsterPos();
    if (!pos) return;
    const { x, y } = pos;

    this.bindDm.MoveTo(x, y);
    !this.currentAttackTargetPos && this.bindDm.RightClick();
    // 开启技能组
    // this.startKeyPress({ key: 'F2', interval: null });

    // console.log(freeSkill, 'freeSkill');
    const monsterName = this.role.selectMonster;
    console.log('怪物坐标', pos, '名字', monsterName);
    // && monsterName
    if (freeSkill) {
      this.useSkill(freeSkill.key, freeSkill.interval || 0);
    } else {
      console.log('没有空闲技能');
    }
    // this.startAutoSkill(skillGroup);
  }

  useSkill(key: keyof typeof VK_F, interval: number, song?: number) {
    this.bindDm.KeyDownChar(key);
    this.bindDm.delay(500);
    this.bindDm.KeyUpChar(key);
    this.bindDm.delay(200);
    this.bindDm.LeftClick();
    this.cdController.set(key, true);
    setTimeout(() => {
      this.cdController.set(key, false);
    }, interval || 0);
  }

  // 获取空闲时间的技能
  getFreeSkill(): KeyPressOptions | null {
    // 在cdController中找到一个为false的技能
    const freeSkill = skillGroup.find(item => this.cdController.get(item.key) === false);
    if (!freeSkill) return null;
    return freeSkill;
  }

  startAutoSkill(props: KeyPressOptions[]) {
    this.skillPropsList = props;
    props.forEach(item => {
      const timer = setInterval(() => {
        this.bindDm.KeyDownChar(item.key);
        this.bindDm.delay(500);
        this.bindDm.KeyUpChar(item.key);
        this.bindDm.delay(300);
        this.bindDm.LeftClick();
      }, item.interval || 0);
      this.timerMapList.set(item.key, timer);
    });
  }

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

  scanMonster() {
    return new Promise((resolve, reject) => {
      let counter = 0;
      let timer: NodeJS.Timeout | null = setInterval(() => {
        this.attackNearestMonster();
        const findMonsterPos = this.findMonsterPos();
        if (findMonsterPos) {
          counter = 0;
        }
        console.log('counter', counter, findMonsterPos);
        if (!findMonsterPos && counter > 5) {
          timer && clearInterval(timer);
          timer = null;
          resolve(findMonsterPos);
        }
        counter++;
      }, 1000);
    });
  }
}

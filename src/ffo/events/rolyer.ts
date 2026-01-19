import { damoBindingManager } from '.';
import { getVerifyCodeAiRes } from '../../AI/request';
import { AutoT, ensureDamo } from '../../auto-plugin/index';
import { VERIFY_CODE_PATH } from '../../constant/config';
import { DEFAULT_ADDRESS_NAME, DEFAULT_MENUS_POS, DEFAULT_MONSTER_NAME, DEFAULT_ROLE_POSITION, DEFAULT_VERIFY_CODE, DEFAULT_VERIFY_CODE_TEXT, VerifyCodeTextPos } from '../constant/OCR-pos';
import { isArriveAimNear, parseRolePositionFromText, parseTextPos } from '../utils/common';
import { readVerifyCodeImage } from '../utils/common/read-file';
import { MoveActions } from './move';

export type Pos = {
  x: number;
  y: number;
};

export class Role {
  public bindDm: any = null; // 大漠类
  private timer: NodeJS.Timeout | null = null; // 定时器
  private name: string = ''; // 当前控制的角色名称
  public position: Pos | null = { x: 0, y: 0 }; // 当前角色所在坐标
  public map: string = ''; // 当前所在地图名称
  // 验证码
  private verifyCode: string = '';
  private isOpenAutoRoute: boolean = false; // 是否开启自动寻路
  private bloodStatus: string = ''; // 血量状态
  private isDead: boolean = false; // 是否死亡
  public bindWindowSize: string = ''; // 绑定窗口的尺寸
  private moveActions: MoveActions | null = null; // 移动操作类
  private pollTimers = new Map<number, ReturnType<typeof setInterval>>(); // 记录轮询定时器
  public selectMonster = ''; // 已选中怪物
  public menusPos = DEFAULT_MENUS_POS['1600*900'];
  public isPauseAllActive: boolean = false; // 暂停所有行为
  public isPauseCurActive: boolean = false; // 暂停当前行为
  private openCapture: boolean = true; // 是否开启截图
  private lastVerifyCaptureTs: number = 0;
  private lastTaskActionTs: number = 0;
  private task: { name: string; pos: Pos; action: () => void } | null = null;

  constructor() {}

  // 需要先绑定之后再注册角色信息
  public registerRole(bindWindowSize: '1600*900' | '1280*800', hwndId?: number) {
    this.bindWindowSize = bindWindowSize;
    const map = DEFAULT_ADDRESS_NAME[bindWindowSize];
    const rolePos = DEFAULT_ROLE_POSITION[bindWindowSize];
    const monsterPos = DEFAULT_MONSTER_NAME[bindWindowSize];
    const verifyCodePos = DEFAULT_VERIFY_CODE[bindWindowSize];
    this.menusPos = DEFAULT_MENUS_POS[bindWindowSize as keyof typeof DEFAULT_MENUS_POS];

    const dm = ensureDamo();
    // 中文注释：获取当前前台窗口句柄
    const hwnd = hwndId ? hwndId : dm.getForegroundWindow();
    const rec = damoBindingManager.get(hwnd);
    if (!hwnd || !dm) {
      throw new Error('[角色信息] 未提供有效的绑定记录或 dm 实例');
    }
    if (!damoBindingManager.isBound(hwnd)) {
      console.log('[角色信息] 当前前台窗口未绑定');
      return;
    }
    const bindDm = rec?.ffoClient as AutoT;
    this.bindDm = rec?.ffoClient.dm;
    this.timer = setInterval(() => {
      // console.log('轮询角色信息');
      try {
        const raw: string = String(bindDm.ocr(rolePos.x1, rolePos.y1, rolePos.x2, rolePos.y2, rolePos.color, rolePos.sim) || '').trim();
        const pos = parseRolePositionFromText(raw);
        const addressName = bindDm.ocr(map.x1, map.y1, map.x2, map.y2, map.color, map.sim);
        const monsterName = bindDm.ocr(monsterPos.x1, monsterPos.y1, monsterPos.x2, monsterPos.y2, monsterPos.color, monsterPos.sim);
        // 截图
        // bindDm.CapturePng(verifyCodePos.x1, verifyCodePos.y1, verifyCodePos.x2, verifyCodePos.y2, `${VERIFY_CODE_PATH}/${hwnd}测试.png`);
        const verifyCode = bindDm.findStrFastE(verifyCodePos.x1, verifyCodePos.y1, verifyCodePos.x2, verifyCodePos.y2, '神医问题来啦', verifyCodePos.color, verifyCodePos.sim);
        const verifyCodeTextPos = parseTextPos(verifyCode);
        // console.log(verifyCodeTextPos, 'verifyCodeTextPos');
        if (verifyCodeTextPos) {
          const now = Date.now();
          if (this.openCapture || now - this.lastVerifyCaptureTs >= 10000) {
            const checkPos = DEFAULT_VERIFY_CODE_TEXT[this.bindWindowSize as keyof typeof DEFAULT_VERIFY_CODE_TEXT];
            const verifyCodeImg = bindDm.capturePng(verifyCodeTextPos.x - 10, verifyCodeTextPos.y - 10, verifyCodeTextPos.x + 300, verifyCodeTextPos.y + 140, `${VERIFY_CODE_PATH}/${hwnd}验证码.png`);
            console.log(verifyCodeImg);
            if (String(verifyCodeImg) === '1') {
              const safeCheckPos: VerifyCodeTextPos = checkPos;
              // 调用AI识别验证码
              // this.verifyCode = verifyCodeImg;
              const url = readVerifyCodeImage(hwnd);
              if (!url) {
                return;
              }
              getVerifyCodeAiRes(url).then(res => {
                console.log('验证码识别结果', res);
                if (!res) {
                  this.openCapture = false;
                  this.lastVerifyCaptureTs = now;
                  return;
                }
                const I = { x: verifyCodeTextPos.x + safeCheckPos.I.x, y: verifyCodeTextPos.y + safeCheckPos.I.y };
                const II = { x: verifyCodeTextPos.x + safeCheckPos.II.x, y: verifyCodeTextPos.y + safeCheckPos.II.y };
                const III = { x: verifyCodeTextPos.x + safeCheckPos.III.x, y: verifyCodeTextPos.y + safeCheckPos.III.y };
                const map = { I, II, III };
                const answerPos = map[res as keyof typeof map];
                console.log('answerPos', answerPos);
                bindDm.moveTo(answerPos.x, answerPos.y);
                bindDm.leftClick();
                this.openCapture = false;
                this.lastVerifyCaptureTs = now;
                console.log('关闭截图啦', this.openCapture);
              });
            }
          }
        } else {
          this.openCapture = true;
        }

        // console.log('[角色信息] 验证码:', verifyCode);
        this.selectMonster = monsterName;
        this.map = addressName;
        this.position = pos;
        if (this.task && isArriveAimNear(pos as Pos, this.task.pos, 10)) {
          const now = Date.now();
          if (now - this.lastTaskActionTs >= 10000) {
            console.log(`[角色信息] 已到达任务位置 ${this.task.name}`);
            this.task.action();
            this.lastTaskActionTs = now;
          }
        }
        // console.log('[角色信息] 地图名称:', `${this.map}:${this.position?.x},${this.position?.y}`);
      } catch (err) {
        console.warn('[角色信息] 轮询失败:', String((err as any)?.message || err));
      }
    }, 300); // 中文注释：最小间隔 200ms，避免过于频繁
  }

  unregisterRole() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[角色信息] 已解除角色轮询');
    }
  }

  addIntervalActive(task: string, pos: Pos, call: () => void) {
    this.task = { name: task, pos, action: call };
    this.lastTaskActionTs = 0; // 重置任务执行时间，确保新任务能立即执行（或按需调整）
  }

  clearIntervalActive() {
    this.task = null;
  }

  pauseCurActive() {
    this.isPauseCurActive = true;
  }

  hasActiveTask() {
    return !!this.task;
  }
}

// 66 72 78 84 90 96 102 6次机会
// 66 120J  102 40J  80J =》 15J + 15J = 30J 一次机会
// 320

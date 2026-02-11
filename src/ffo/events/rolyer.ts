import { damoBindingManager } from '.';
import { getVerifyCodeByAliQW } from '../../AI/ali-qianwen';
import { getVerifyCodeByTuJian } from '../../AI/tu-jian';
import { AutoT, ensureDamo } from '../../auto-plugin/index';
import { VERIFY_CODE_OPTIONS_PATH, VERIFY_CODE_QUESTION_PATH } from '../../constant/config';
import { emailStrategy } from '../../utils/email';
import { DEFAULT_MENUS_POS, DEFAULT_VERIFY_CODE_TEXT, VerifyCodeTextPos } from '../constant/OCR-pos';
import { isArriveAimNear, selectRightAnwser } from '../utils/common';
import { readVerifyCodeImage } from '../utils/common/read-file';
import { fullScreenShot, getBloodStatus, getMapName, getMonsterName, getRolePosition, getStatusBloodIcon, getVerifyCodePos, isDead, isOffline } from '../utils/ocr-check/base';
import { MoveActions } from './move';

export type Pos = {
  x: number;
  y: number;
};

export interface TaskProp {
  taskName: string;
  loopOriginPos: Pos;
  action: () => void;
  interval: number;
  taskStatus?: 'doing' | 'done';
}

const test = async () => {
  const optionsUrl = readVerifyCodeImage(`${VERIFY_CODE_OPTIONS_PATH}`, 'ali');
  const questionUrl = readVerifyCodeImage(`${VERIFY_CODE_QUESTION_PATH}`, 'tujian');
  console.time('接口调用耗时');
  // Promise.all([getVerifyCodeByDouBao(optionsUrl), getVerifyCodeByTuJian(questionUrl)]);
  // getVerifyCodeByDouBao(optionsUrl);
  await getVerifyCodeByAliQW(optionsUrl);

  // await getVerifyCodeByTuJian(questionUrl);
  console.timeEnd('接口调用耗时');
};

export class Role {
  public bindDm: any = null; // 大漠类
  private timer: NodeJS.Timeout | null = null; // 定时器
  private name: string = ''; // 当前控制的角色名称
  public position: Pos | null = { x: 0, y: 0 }; // 当前角色所在坐标
  public map: string = ''; // 当前所在地图名称
  private isOpenAutoRoute: boolean = false; // 是否开启自动寻路
  public bloodStatus: string = ''; // 血量状态
  public statusBloodIcon: Pos | null = null;
  // private isDead: boolean = false; // 是否死亡
  public bindWindowSize: '1600*900' | '1280*800' = '1600*900'; // 绑定窗口的尺寸
  private moveActions: MoveActions | null = null; // 移动操作类
  private pollTimers = new Map<number, ReturnType<typeof setInterval>>(); // 记录轮询定时器
  public selectMonster = ''; // 已选中怪物
  public menusPos = DEFAULT_MENUS_POS['1600*900'];
  public isPauseAllActive: boolean = false; // 暂停所有行为
  public isPauseCurActive: boolean = false; // 暂停当前行为
  private openCapture: boolean = true; // 是否开启截图
  private lastVerifyCaptureTs: number = 0;
  private lastTaskActionTs: number = 0;
  private task: TaskProp | null = null;
  public job: 'YS' | 'SS' | 'JK' | 'CK' | 'ZS' = 'SS'; // 角色职业JK-剑客；CK-刺客；YS-药师；SS-术士；ZS-战士

  constructor() {}

  // 需要先绑定之后再注册角色信息
  public registerRole(bindWindowSize: '1600*900' | '1280*800', hwndId?: number) {
    // test();
    this.bindWindowSize = bindWindowSize;
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
      try {
        // 获取角色位置
        const pos = getRolePosition(bindDm, this.bindWindowSize);
        // 获取地图名
        const addressName = getMapName(bindDm, this.bindWindowSize);
        // 获取选中的怪物名
        const monsterName = getMonsterName(bindDm, this.bindWindowSize);
        // 获取血量状态
        const bloodStatus = getBloodStatus(bindDm, this.bindWindowSize);
        // console.log(bloodStatus, 'bloodStatus');
        // 是否处于回血状态
        this.statusBloodIcon = getStatusBloodIcon(bindDm, this.bindWindowSize);
        // 截图
        // bindDm.CapturePng(verifyCodePos.x1, verifyCodePos.y1, verifyCodePos.x2, verifyCodePos.y2, `${VERIFY_CODE_PATH}/${hwnd}测试.png`);
        // 获取神医坐标
        const verifyCodeTextPos = getVerifyCodePos(bindDm, this.bindWindowSize);
        if (verifyCodeTextPos) {
          const now = Date.now();
          if (this.openCapture || now - this.lastVerifyCaptureTs >= 10000) {
            const checkPos = DEFAULT_VERIFY_CODE_TEXT[this.bindWindowSize as keyof typeof DEFAULT_VERIFY_CODE_TEXT];
            // 获取验证码截图
            // const answerImg = bindDm.capturePng(verifyCodeTextPos.x - 10, verifyCodeTextPos.y - 10, verifyCodeTextPos.x + 300, verifyCodeTextPos.y + 140, `${VERIFY_CODE_ANSWER_PATH}`);
            const questionImg = bindDm.capturePng(verifyCodeTextPos.x, verifyCodeTextPos.y + 60, verifyCodeTextPos.x + 100, verifyCodeTextPos.y + 130, `${VERIFY_CODE_QUESTION_PATH}`);
            const optionsImg = bindDm.capturePng(verifyCodeTextPos.x + 200, verifyCodeTextPos.y + 30, verifyCodeTextPos.x + 250, verifyCodeTextPos.y + 110, `${VERIFY_CODE_OPTIONS_PATH}`);
            if (String(questionImg) === '1' && String(optionsImg) === '1') {
              const safeCheckPos: VerifyCodeTextPos = checkPos;
              const optionsUrl = readVerifyCodeImage(`${VERIFY_CODE_OPTIONS_PATH}`, 'ali');
              const questionUrl = readVerifyCodeImage(`${VERIFY_CODE_QUESTION_PATH}`, 'tujian');
              if (!optionsUrl || !questionUrl) {
                return;
              }
              // 20S
              this.openCapture = false;
              this.lastVerifyCaptureTs = now;
              // 检查是否已经离线
              const isOff = isOffline(this.bindDm, this.bindWindowSize);
              if (isOff) {
                console.log('[角色信息] 角色已掉线');
                // 发送邮件
                emailStrategy.sendMessage({ to: '1031690983@qq.com', subject: '角色离线', text: `角色 ${this.name} 已掉线` });
                // 断线后取消注册，终止
                this.unregisterRole();
                return;
              }
              // 检查角色是否死亡
              const roleIsDead = isDead(bindDm, this.bindWindowSize);
              if (roleIsDead) {
                // 全屏截图
                fullScreenShot(bindDm, this.bindWindowSize);
                // 发送邮件
                emailStrategy.sendMessage({ to: '1031690983@qq.com', subject: '角色死亡', text: `角色 ${this.name} 已死亡` });
                // 死亡后取消注册，终止
                this.unregisterRole();
                return;
              }
              Promise.all([getVerifyCodeByAliQW(optionsUrl), getVerifyCodeByTuJian(questionUrl)]).then(([Ali = '', TuJian = '']) => {
                console.log('验证码识别结果 Ali', Ali);
                console.log('验证码识别结果 TuJian', TuJian);
                const I = { x: verifyCodeTextPos.x + safeCheckPos.I.x, y: verifyCodeTextPos.y + safeCheckPos.I.y };
                const II = { x: verifyCodeTextPos.x + safeCheckPos.II.x, y: verifyCodeTextPos.y + safeCheckPos.II.y };
                const III = { x: verifyCodeTextPos.x + safeCheckPos.III.x, y: verifyCodeTextPos.y + safeCheckPos.III.y };
                const map = { I, II, III };
                let answerPos;
                // 识别不出来直接选第一个
                if ([Ali, TuJian].some(item => !item)) {
                  answerPos = map['I'];
                }
                const result = selectRightAnwser(Ali, TuJian);
                if (!result) {
                  answerPos = map['I'];
                }
                answerPos = map[result as keyof typeof map];
                bindDm.moveTo(answerPos.x, answerPos.y);
                bindDm.leftClick();
                console.log('当前时间:', new Date().toLocaleString());
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
        this.bloodStatus = bloodStatus;
        const taskStatus = this.task?.taskStatus ?? '';
        // console.log('任务状态', ['', 'done'].includes(taskStatus), taskStatus);
        if (this.task && ['', 'done'].includes(taskStatus) && isArriveAimNear(pos as Pos, this.task.loopOriginPos, 10)) {
          this.task.taskStatus = 'doing';
          const now = Date.now();
          if (now - this.lastTaskActionTs >= this.task.interval) {
            console.log(`[角色信息] 已到达任务位置 ${this.task.taskName}`);
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
      this.task = null;
      this.lastTaskActionTs = 0; // 重置任务执行时间，确保新任务能立即执行（或按需调整）
      this.isPauseCurActive = false;
      console.log('[角色信息] 已解除角色轮询');
    }
  }

  addIntervalActive(props: TaskProp) {
    const { taskName, loopOriginPos, action, interval = 10000 } = props;
    this.task = { taskName, loopOriginPos, action, interval };
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

  updateTaskStatus(status: 'done' | 'doing') {
    if (!this.task) {
      console.log('任务不存在!');
      return;
    }
    this.task.taskStatus = status;
  }
}

// 66 72 78 84 90 96 102 6次机会
// 66 120J  102 40J  80J =》 15J + 15J = 30J 一次机会
//

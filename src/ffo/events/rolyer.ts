import { damoBindingManager } from '.';
import { getVerifyCodeByAliQW } from '../../AI/ali-qianwen';
import { getVerifyCodeByTuJian } from '../../AI/tu-jian';
import { AutoT, ensureDamo } from '../../auto-plugin/index';
import { ROLE_IS_DEAD_PATH, VERIFY_CODE_OPTIONS_PATH, VERIFY_CODE_QUESTION_PATH } from '../../constant/config';
import { emailStrategy } from '../../utils/email';
import { debounce } from '../../utils/tool';
import { DEFAULT_MENUS_POS, DEFAULT_VERIFY_CODE_TEXT, VerifyCodeTextPos } from '../constant/OCR-pos';
import { isArriveAimNear, selectRightAnwser } from '../utils/common';
import { readVerifyCodeImage } from '../utils/common/read-file';
import { getBloodStatus, getMapName, getMonsterName, getRoleName, getRolePosition, getVerifyCodePos, isDeadCYPos, isOffline } from '../utils/ocr-check/base';

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
  deadCall?: () => void;
}

// 中文注释：角色任务快照接口（用于渲染层展示简要任务信息）
export interface RoleTaskSnapshot {
  taskName: string; // 中文注释：任务名称
  taskStatus?: 'doing' | 'done'; // 中文注释：任务状态：doing-进行中，done-已完成或就绪
}

const delay20S = debounce((fn: (...args: any[]) => void, ...args: any[]) => fn.apply(this, args), 20 * 1000, true);

export class Role {
  public hwnd?: number = 0; // 窗口句柄
  public bindDm: any = null; // 大漠类
  public bindPlugin: any = null; // 绑定的插件类
  private timer: NodeJS.Timeout | null = null; // 定时器
  private name: string = ''; // 当前控制的角色名称
  public position: Pos | null = { x: 0, y: 0 }; // 当前角色所在坐标
  public map: string = ''; // 当前所在地图名称
  public bloodStatus: string = ''; // 血量状态
  public statusBloodIcon: Pos | null = null;
  // private isDead: boolean = false; // 是否死亡
  public bindWindowSize: '1600*900' | '1280*800' = '1600*900'; // 绑定窗口的尺寸
  public selectMonster = ''; // 已选中怪物
  public menusPos = DEFAULT_MENUS_POS['1600*900'];
  public isPauseAllActive: boolean = false; // 暂停所有行为
  public isPauseCurActive: boolean = false; // 暂停当前行为
  private openCapture: boolean = true; // 是否开启截图
  private lastVerifyCaptureTs: number = 0;
  private lastTaskActionTs: number = 0;
  private task: TaskProp | null = null;
  private taskList: TaskProp[] = []; // 任务队列
  private taskStatus: 'doing' | 'done' = 'done'; // 任务状态
  public job: 'YS' | 'SS' | 'JK' | 'CK' | 'ZS' = 'SS'; // 角色职业JK-剑客；CK-刺客；YS-药师；SS-术士；ZS-战士
  public actionTimer = new Map<string, ReturnType<typeof setInterval>>(); // 其他行为中的定时器
  private needCheckDead: boolean = true; // 是否需要检查死亡
  private needCheckTeamApply: boolean = false; // 是否需要检查组队申请
  private needCheckLeaveUp: boolean = false; // 是否需要检查升级状态
  constructor() {}

  // 需要先绑定之后再注册角色信息
  public registerRole(bindWindowSize: '1600*900' | '1280*800', hwndId?: number) {
    this.bindWindowSize = bindWindowSize;
    this.menusPos = DEFAULT_MENUS_POS[bindWindowSize as keyof typeof DEFAULT_MENUS_POS];
    const dm = ensureDamo();
    // 中文注释：获取当前前台窗口句柄
    const hwnd = hwndId ? hwndId : dm.getForegroundWindow();
    this.hwnd = hwndId;
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
    this.bindPlugin = bindDm;
    const name = getRoleName(bindDm, this.bindWindowSize);
    console.log(name, 'this.name');
    this.name = name;
    // 中文注释：使用 setImmediate 触发首轮执行，随后用 setTimeout 维持固定轮询间隔（避免事件循环被持续 setImmediate 挤压）
    const loop = () => {
      try {
        // 获取角色位置
        const pos = getRolePosition(bindDm, this.bindWindowSize); // 获取地图名
        const addressName = getMapName(bindDm, this.bindWindowSize);
        // 获取选中的怪物名
        const monsterName = getMonsterName(bindDm, this.bindWindowSize);
        // 获取血量状态
        const bloodStatus = getBloodStatus(bindDm, this.bindWindowSize);
        // console.log(bloodStatus, 'bloodStatus');
        // 是否处于回血状态
        // this.statusBloodIcon = getStatusBloodIcon(bindDm, this.bindWindowSize);
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

        this.selectMonster = monsterName;
        this.map = addressName;
        this.position = pos;
        this.bloodStatus = bloodStatus;

        // 检查是否有人抛出组队申请
        // 开启任务队列
        if (!this.taskList?.length) {
          return;
        }
        // 这里执行循环任务根据任务中的初始坐标来触发
        const takeTask = this.taskList.filter(item => isArriveAimNear(pos as Pos, item.loopOriginPos, 10));
        // if (!takeTask.length) {
        //   return;
        // }
        if (takeTask.length) {
          // 指定第一个任务为最近的任务
          this.task = takeTask[0];
          // console.log(this.task, ' this.task');
          if (['done'].includes(this.taskStatus)) {
            this.taskStatus = 'doing';
            // console.log('[角色信息] 已经成功切换循环任务:', this.task.taskName);
            const now = Date.now();
            if (now - this.lastTaskActionTs >= this.task.interval) {
              console.log(`[角色信息] 已到达任务位置 ${this.task.taskName}`);
              this.task.action();
              this.lastTaskActionTs = now;
            }
          }
        }
        // 检查角色是否死亡
        const roleIsDeadPos = this.needCheckDead && isDeadCYPos(bindDm, this.bindWindowSize);
        if (roleIsDeadPos) {
          const { name } = this;
          const delayFun = () => {
            // 全屏截图
            this.bindPlugin.captureFullScreen(ROLE_IS_DEAD_PATH);
            this.bindPlugin.delay(300);
            // 发送邮件 20S内只执行一次
            emailStrategy.sendMessage({
              to: '1031690983@qq.com',
              subject: '角色死亡',
              text: `角色 ${name} 已死亡`,
              attachments: [
                {
                  filename: '阵亡截图.png', // 邮件内部的文件名（可自定义）
                  path: ROLE_IS_DEAD_PATH, // 本地 PNG 图片路径
                  cid: 'logoImg', // 唯一cid，需和HTML中的cid一致
                },
              ],
            });
          };
          // 发送邮件 20S内只执行一次
          delay20S(delayFun);
          // 执行死亡时回调
          this.task?.deadCall?.();
          // 死亡后检查是否有定时器，如果有解除定时器
          this.clearAllActionTimer();
          this.bindPlugin.moveToClick(894, 490);
          this.bindPlugin.delay(1000);
          this.bindPlugin.moveToClick(799, 418);
          return;
        }
      } catch (err) {
        console.warn('[角色信息] 轮询失败:', String((err as any)?.message || err));
      } finally {
        // 中文注释：通过 setTimeout 维持 300ms 周期，避免紧凑的 setImmediate 导致事件循环阻塞
        this.timer = setTimeout(loop, 150);
      }
    };
    setImmediate(loop); // 中文注释：立即触发一次执行
  }

  getName() {
    return this.name;
  }

  // 中文注释：获取当前任务快照（仅包含名称与状态，便于 UI 展示）
  public getTaskSnapshot(): RoleTaskSnapshot | null {
    if (!this.task) return null;
    return { taskName: this.task.taskName, taskStatus: this.task.taskStatus };
  }

  unregisterRole() {
    if (this.timer) {
      // 中文注释：清理通过 setTimeout 周期调度的轮询定时器
      clearTimeout(this.timer);
      this.timer = null;
      this.task = null;
      this.lastTaskActionTs = 0; // 重置任务执行时间，确保新任务能立即执行（或按需调整）
      this.isPauseCurActive = false;
      this.clearAllActionTimer();
      console.log('[角色信息] 已解除角色轮询');
    }
  }

  // 挂载循环任务
  addIntervalActive(props: TaskProp | TaskProp[]) {
    // 挂载多个循环任务
    if (Array.isArray(props)) {
      this.taskList = props;
      return;
    }
    // 挂载单个循环任务
    const { taskName, loopOriginPos, action, interval = 10000 } = props;
    this.task = { taskName, loopOriginPos, action, interval };
    this.lastTaskActionTs = 0; // 重置任务执行时间，确保新任务能立即执行（或按需调整）
  }

  // 清空循环任务队列
  clearIntervalActive() {
    this.task = null;
    this.lastTaskActionTs = 0; // 重置任务执行时间，确保新任务能立即执行（或按需调整）
    this.taskList = []; // 清空任务队列
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
    this.taskStatus = status;
  }

  getSelectMonster() {
    return;
  }

  // 开启定时器
  addActionTimer(key: string, timer: ReturnType<typeof setInterval>) {
    this.actionTimer.set(key, timer);
  }

  // 关闭定时器
  clearActionTimer(key: string) {
    const timer = this.actionTimer.get(key);
    if (timer) {
      // 中文注释：兼容 setTimeout / setInterval 定时器的清理，确保能关闭通过 setTimeout 周期轮询的任务
      try {
        clearTimeout(timer as any);
      } catch {}
      try {
        clearInterval(timer as any);
      } catch {}
      this.actionTimer.delete(key);
    }
  }

  // 关闭所有定时器
  clearAllActionTimer() {
    this.actionTimer.forEach(timer => clearTimeout(timer));
    this.actionTimer.clear();
  }
}

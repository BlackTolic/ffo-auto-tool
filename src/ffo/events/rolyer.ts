import { AutoT } from '../../auto-plugin';
import { ROLE_IS_DEAD_PATH } from '../../constant/config';
import { emailStrategy } from '../../utils/email';
import { logger } from '../../utils/logger';
import { debounce } from '../../utils/tool';
import WorkerManager from '../../worker/worker-manager';
import { DEFAULT_MENUS_POS } from '../constant/OCR-pos';
import { isArriveAimNear, selectRightAnwser } from '../utils/common';
import { AttackActions } from './attack-action';
import { BaseAction } from './base-action';
import { MoveActions } from './move-action';

export type Pos = {
  x: number;
  y: number;
};

export interface TaskProp {
  taskName: string;
  loopOriginPos: Pos;
  action: (baseActions?: BaseAction, moveActions?: MoveActions, attackActions?: AttackActions) => void;
  interval: number;
  taskStatus?: 'doing' | 'done';
  deadCall?: () => void;
}

// 中文注释：角色任务快照接口（用于渲染层展示简要任务信息）
export interface RoleTaskSnapshot {
  taskName: string; // 中文注释：任务名称
  taskStatus?: 'doing' | 'done'; // 中文注释：任务状态：doing-进行中，done-已完成或就绪
}

export interface GlobalStrategyTask {
  name?: string; // 中文注释：任务名称
  condition: () => boolean; // 中文注释：任务条件
  callback: (baseActions?: BaseAction, moveActions?: MoveActions, attackActions?: AttackActions) => void; // 中文注释：任务回调
}

const delay20S = debounce((fn: (...args: any[]) => void, ...args: any[]) => fn.apply(this, args), 20 * 1000, true);

export class Role {
  public hwnd?: number = 0; // 窗口句柄
  public bindDm: any = null; // 大漠类
  public bindPlugin: any = null; // 绑定的插件类
  private name: string = ''; // 当前控制的角色名称
  public position: Pos | null = { x: 0, y: 0 }; // 当前角色所在坐标
  public map: string = ''; // 当前所在地图名称
  public bloodStatus: string = ''; // 血量状态
  public statusBloodIcon: Pos | null = null;
  public bindWindowSize: '1600*900' | '1280*800' = '1600*900'; // 绑定窗口的尺寸
  public selectMonster = ''; // 已选中怪物
  public menusPos = DEFAULT_MENUS_POS['1600*900'];
  public isPauseAllActive: boolean = false; // 暂停所有行为
  public isPauseCurActive: boolean = false; // 暂停当前行为
  private lastTaskActionTs: number = 0;
  private task: TaskProp | null = null;
  private taskList: TaskProp[] = []; // 任务队列
  private taskStatus: 'doing' | 'done' = 'done'; // 任务状态
  public job: 'YS' | 'SS' | 'JK' | 'CK' | 'ZS' = 'SS'; // 角色职业JK-剑客；CK-刺客；YS-药师；SS-术士；ZS-战士
  public actionTimer = new Map<string, ReturnType<typeof setInterval>>(); // 其他行为中的定时器
  private needCheckDead: boolean = true; // 是否需要检查死亡
  private needCheckLeaveUp: boolean = false; // 是否需要检查升级状态
  private deadCall: (() => void) | null = null; // 死亡回调
  private teamApplyCall: ((rejectPos?: Pos, agreePos?: Pos) => void) | null = null; // 组队申请回调
  private globalStrategyTask: GlobalStrategyTask[] | null = null; // 全局策略任务队列
  private workerManager: WorkerManager | null = null; // 工作线程管理器
  public emailMessage: string = ''; // 邮件消息
  public closeWorkerLoop: () => void = () => {};

  constructor() {}

  // 初始化角色信息，项目初始化执行
  childProcessInitRoleInfo(name: string, hwnd: number) {
    this.name = name;
    this.hwnd = hwnd;
  }
  // 更新角色信息
  childProcessUpdateRoleInfo(position: Pos, map: string, selectMonster: string, bloodStatus: string) {
    this.position = position;
    this.map = map;
    this.selectMonster = selectMonster;
    this.bloodStatus = bloodStatus;
    // console.log('更新角色信息', position, map, selectedMonster, bloodStatus);
    // logger.info(`更新角色信息：${position.x},${position.y} ${map} ${selectedMonster}, 血量：${bloodStatus}`);
  }

  // 更新团队邀请信息
  childProcessUpdateTeamInviteInfo(data: any) {
    this.teamApplyCall?.(data.rejectPos, data.agreePos);
  }

  // 处理验证码识别结果
  async childProcessUpdateVerifyCodeResult(data: any) {
    const { Ali, TuJian, verifyCodeTextPos, checkPos } = data;
    logger.info('验证码识别结果 Ali', Ali);
    logger.info('验证码识别结果 TuJian', TuJian);
    const I = { x: verifyCodeTextPos.x + checkPos.I.x, y: verifyCodeTextPos.y + checkPos.I.y };
    const II = { x: verifyCodeTextPos.x + checkPos.II.x, y: verifyCodeTextPos.y + checkPos.II.y };
    const III = { x: verifyCodeTextPos.x + checkPos.III.x, y: verifyCodeTextPos.y + checkPos.III.y };
    const map = { I, II, III };
    const result = selectRightAnwser(Ali, TuJian);
    const answerPos = (map as any)[result as string] || map['I'];
    this.bindDm.moveTo(answerPos.x, answerPos.y);
    await this.bindDm.delay(300);
    this.bindDm.leftClick();
    logger.info('当前时间:', new Date().toLocaleString());
  }

  // 角色死亡后的操作
  async childProcessUpdateDeathInfo() {
    const { name } = this;
    const delayFun = async () => {
      await this.bindPlugin.captureFullScreen(ROLE_IS_DEAD_PATH);
      await this.bindPlugin.delay(300);
      emailStrategy.sendMessage({
        to: '1031690983@qq.com',
        subject: '角色死亡',
        text: `角色 ${name} 已死亡`,
        attachments: [{ filename: '阵亡截图.png', path: ROLE_IS_DEAD_PATH, cid: 'logoImg' }],
      });
    };
    delay20S(delayFun);
    this.deadCall?.();
    this.clearAllActionTimer();
    await this.bindPlugin.moveToClick(894, 490);
    await this.bindPlugin.delay(1000);
    await this.bindPlugin.moveToClick(799, 418);
  }

  // 更新离线信息
  childProcessUpdateOfflineInfo() {
    emailStrategy.sendMessage({ to: '1031690983@qq.com', subject: '角色离线', text: `角色 ${this.name} 已掉线` });
    this.unregisterRole();
  }

  // 需要先绑定之后再注册角色信息
  public registerRole(bindWindowSize: '1600*900' | '1280*800', hwndId?: number) {
    this.bindWindowSize = bindWindowSize;
    this.menusPos = DEFAULT_MENUS_POS[bindWindowSize as keyof typeof DEFAULT_MENUS_POS];
    // const dm = ensureDamo();
    // // 中文注释：获取当前前台窗口句柄
    // const hwnd = hwndId ? hwndId : dm.getForegroundWindow();
    // this.hwnd = hwnd;
    // const rec = damoBindingManager.get(hwnd);
    // if (!hwnd || !dm) {
    //   throw new Error('[角色信息] 未提供有效的句柄或 dm 实例');
    // }
    // const bindDm = rec?.ffoClient as AutoT;
    // this.bindDm = bindDm;
    // this.bindPlugin = bindDm;
    // 中文注释：不再在主进程获取角色名，避免未绑定导致的 OCR 崩溃，统一由子线程 INITIALIZED 消息返回
    this.name = 'Initializing...';
    // 初始化代理插件对象，将指令转发给子线程执行，避免主线程与子线程同时绑定同一个窗口句柄导致的冲突
    // this.initProxyPlugin();
    // 初始化子线程
    // this.initWorker();
  }

  updateInfoFromWorkerManager(dm: AutoT) {
    const { bindWindowSize } = this;
    this.bindWindowSize = bindWindowSize;
    this.menusPos = DEFAULT_MENUS_POS[bindWindowSize as keyof typeof DEFAULT_MENUS_POS];
    this.bindDm = dm;
    this.bindPlugin = dm;
    this.name = 'Initializing...';
  }

  // 执行全局队列任务
  // 主线程处理逻辑：全局策略与任务队列
  childProcessExecuteGlobalTask() {
    try {
      if (!this.position) return;

      // 全局策略任务检查
      if (this.globalStrategyTask) {
        for (const task of this.globalStrategyTask) {
          if (task.condition()) {
            task.name && logger.info(`[全局任务检查] 执行任务：${task.name}`);
            task.callback();
            break;
          }
        }
      }

      // 任务队列执行
      if (!this.taskList?.length) return;

      const takeTask = this.taskList.filter(item => isArriveAimNear(this.position as Pos, item.loopOriginPos, 10));
      if (takeTask.length) {
        this.task = takeTask[0];
        if (['done'].includes(this.taskStatus)) {
          this.taskStatus = 'doing';
          const now = Date.now();
          if (now - this.lastTaskActionTs >= this.task.interval) {
            logger.info(`[角色信息] 已到达任务位置 ${this.task.taskName}`);
            this.task.action();
            this.lastTaskActionTs = now;
          }
        }
      }
    } catch (err) {
      logger.warn('[角色信息] 主线程轮询逻辑失败:', String((err as any)?.message || err));
    }
  }

  // 处理死亡逻辑
  private async handleDeath() {
    const { name } = this;
    const delayFun = async () => {
      this.bindPlugin.captureFullScreen(ROLE_IS_DEAD_PATH);
      await this.bindPlugin.delay(300);
      emailStrategy.sendMessage({
        to: '1031690983@qq.com',
        subject: '角色死亡',
        text: `角色 ${name} 已死亡`,
        attachments: [{ filename: '阵亡截图.png', path: ROLE_IS_DEAD_PATH, cid: 'logoImg' }],
      });
    };
    delay20S(delayFun);
    this.deadCall?.();
    this.clearAllActionTimer();
    this.bindPlugin.moveToClick(894, 490);
    await this.bindPlugin.delay(1000);
    this.bindPlugin.moveToClick(799, 418);
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
    // if (this.worker) {
    //   this.worker.postMessage({ type: 'STOP_LOOP' });
    //   this.worker.terminate();
    //   this.worker = null;
    //   logger.info('[角色信息] 已解除角色轮询子线程');
    // }
    this.task = null;
    this.lastTaskActionTs = 0;
    this.isPauseCurActive = false;
    this.clearAllActionTimer();
    this.clearGlobalStrategyTask();
    this.deadCall = null;
    this.teamApplyCall = null;
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
    this.taskList.push({ taskName, loopOriginPos, action, interval });
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
      logger.info('任务不存在!');
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

  addDeadCall(deadCall: (() => void) | null) {
    this.deadCall = deadCall;
  }

  // 中文注释：更新组队申请回调
  updateTeamApplyCall(teamApplyCall: (rejectPos?: Pos | undefined, agreePos?: Pos | undefined) => void) {
    this.teamApplyCall = teamApplyCall;
  }

  // 添加全局策略任务,当某个条件达到时，立即执行回调任务
  addGlobalStrategyTask(tasks: GlobalStrategyTask[]) {
    if (this.globalStrategyTask) {
      logger.info('[角色信息] 全局策略任务已存在，将被覆盖');
    }
    this.globalStrategyTask = tasks;
  }

  // 清除全局策略任务
  clearGlobalStrategyTask() {
    this.globalStrategyTask = null;
  }

  // 手动更新角色信息
  updateRoleInfo(roleInfo: { emailMessage: string }) {
    this.emailMessage = roleInfo.emailMessage;
  }

  // 关闭worker中的loop
  updateCbFromWorkerManager(cb: () => void) {
    this.closeWorkerLoop = cb;
  }
}

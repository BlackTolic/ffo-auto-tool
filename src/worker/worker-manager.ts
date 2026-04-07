import path from 'path';
import { Worker } from 'worker_threads';
import { AutoT } from '../auto-plugin';
import { Role } from '../ffo/events/rolyer';
import logger from '../utils/logger';

export class WorkerManager {
  private static readonly workerMap = new Map<number, Worker>();
  private worker: Worker | null = null; // 工作线程
  private hwnd: number | null = null; // 窗口句柄
  private bindWindowSize: string | null = '1600*900'; // 绑定窗口大小
  private role: Role | null = null; // 角色信息
  private bindPlugin: AutoT | null = null; // 绑定插件实例

  // 消息处理器映射表
  private messageHandlers: Map<string, Set<Function>> = new Map();

  // 新增：用于处理子线程请求回调
  private requestIdCounter = 0;
  private pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

  // 公开代理对象
  public dm: any;

  constructor() {
    this.initWorker();
    this.dm = this.getProxyPlugin();
    this.registerEvent();
  }

  private initWorker() {
    try {
      // 中文注释：启动子线程负责高频 OCR 识别与状态监控，避免阻塞主线程
      // 注意：在 Electron 环境下，需要确保 role-worker.js 路径正确
      const workerPath = path.join(__dirname, 'role-worker.js');
      this.worker = new Worker(workerPath, {
        workerData: {
          // 开启数据更新
          enableUpdateUpdate: true,
          // 句柄
          hwnd: this.hwnd,
          // 窗口大小
          bindWindowSize: this.bindWindowSize,
        },
      });

      // 1. 唯一的子线程消息分发入口
      this.worker.on('message', ({ type, data }) => {
        const handlers = this.messageHandlers.get(type);
        if (handlers) {
          handlers.forEach(handler => handler(data));
        }
      });

      // 监听启动错误
      this.worker.on('error', err => {
        logger.error(`[角色工作线程] 启动/运行错误: ${err.message}`);
      });

      // 监听异常退出
      this.worker.on('exit', code => {
        logger.error(`[角色工作线程] 异常退出，退出码: ${code}`);
        this.worker = null;
      });

      // 监听是否成功在线
      this.worker.on('online', () => {
        logger.info(`[角色工作线程] 子线程已在线`);
      });
    } catch (error: any) {
      logger.error(`[角色工作线程] 初始化失败: ${error.message}`);
    }
  }

  // 注册角色
  registerRole(role: Role) {
    this.role = role;
    this.role.updateInfoFromWorkerManager(this.dm);
    this.startChildProcessRoleLoop();
  }

  // 向工作线程发送消息
  postMessage({ type, data }: { type: string; data?: any }) {
    if (this.worker) {
      this.worker.postMessage({ type, data });
    }
  }

  // 1. 注册消息监听器（支持多监听器共存，且不重复绑定到底层 worker）
  private onMessage(message: string, callback: (data?: any) => void) {
    if (!this.messageHandlers.has(message)) {
      this.messageHandlers.set(message, new Set());
    }
    this.messageHandlers.get(message)!.add(callback);
    return () => this.offMessage(message, callback);
  }

  // 2. 注册单次监听器
  private onceMessage(message: string, callback: (data?: any) => void) {
    const wrapper = (data: any) => {
      this.offMessage(message, wrapper);
      callback(data);
    };
    this.onMessage(message, wrapper);
  }

  // 3. 取消消息监听器
  private offMessage(message: string, callback: Function) {
    const handlers = this.messageHandlers.get(message);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.messageHandlers.delete(message);
      }
    }
  }

  // 销毁工作线程
  destroyWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.messageHandlers.clear(); // 清理所有处理器
    }
  }

  // 更新角色信息
  registerEvent() {
    // 初始化角色信息
    this.onMessage('INITIALIZED', ({ name }) => {
      this.role?.childProcessInitRoleInfo(name);
    });
    // 更新角色状态信息：位置、地图、选择怪物、血量
    this.onMessage('STATUS_UPDATE', ({ position, map, selectMonster, bloodStatus }) => {
      if (position) {
        // logger.info(`更新角色状态信息：${position.x},${position.y} ${map} ${selectedMonster}, 血量：${bloodStatus}`);
      } else {
        logger.warn(`更新角色状态信息：[未获取到坐标] ${map} ${selectMonster}, 血量：${bloodStatus}`);
      }
      this.role?.childProcessUpdateRoleInfo(position, map, selectMonster, bloodStatus);
    });
    // 更新团队邀请信息
    this.onMessage('TEAM_INVITE', data => {
      this.role?.childProcessUpdateTeamInviteInfo(data);
    });
    // 更新验证码结果
    this.onMessage('VERIFY_CODE_RESULT', data => {
      this.role?.childProcessUpdateVerifyCodeResult(data);
    });
    // 更新死亡信息
    this.onMessage('DEATH_DETECTED', () => {
      this.role?.childProcessUpdateDeathInfo();
    });
    // 执行全局队列任务
    this.onMessage('GLOBAL_TASK', () => {
      this.role?.childProcessExecuteGlobalTask();
    });
    // 更新离线信息
    this.onMessage('OFFLINE', data => {
      this.role?.childProcessUpdateOfflineInfo();
    });
    // 日志处理
    this.onMessage('LOG', data => {
      (logger as any)?.[data?.level || 'info']?.(data?.message);
    });
    // 大漠指令执行完成
    this.onMessage('CALL_DM_DONE', ({ requestId, result, error }) => {
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        if (error) {
          pending.reject(new Error(error));
        } else {
          pending.resolve(result);
        }
        this.pendingRequests.delete(requestId);
      }
    });
  }

  // 修改监听绑定的窗口
  changeChildProcessBindWindow() {
    this.postMessage({ type: 'UPDATE_CONFIG', data: { hwnd: this.hwnd, bindWindowSize: this.bindWindowSize } });
  }

  // 通过封装promisew获取子线程中大漠相关信息
  getChildProcessInfo(message: string) {
    return new Promise((resolve, reject) => {
      this.onceMessage(message, data => {
        resolve(data?.hwnd);
      });
      this.postMessage({ type: message });
    });
  }

  // 获取工作线程的句柄
  getChildProcessHwnd(): Promise<number> {
    return this.getChildProcessInfo('GET_WINDOW_HWND') as Promise<number>;
  }

  // 绑定窗口
  bindChildProcessWindow(hwnd: number) {
    this.postMessage({ type: 'BIND_WINDOW', data: { hwnd } });
  }

  // 开启loop
  startChildProcessRoleLoop() {
    this.postMessage({ type: 'START_LOOP' });
  }

  // 停止loop
  stopChildProcessRoleLoop() {
    this.postMessage({ type: 'STOP_LOOP' });
  }

  // 代理插件
  private getProxyPlugin() {
    const proxyHandler = {
      get: (target: any, prop: string | symbol) => {
        // 1. 放行 Symbol 和特殊调试属性，避免检查/打印对象时崩溃
        if (typeof prop === 'symbol' || prop === 'inspect') {
          return target[prop];
        }

        // 2. 统一拦截所有方法调用，将其转发给子线程
        return (...args: any[]) => {
          if (!this.worker) {
            return Promise.reject(new Error('Worker 未初始化'));
          }

          const requestId = ++this.requestIdCounter;
          return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });
            this.postMessage({
              type: 'CALL_DM',
              data: { method: prop as string, args, requestId },
            });

            // 设置超时，防止死锁
            setTimeout(() => {
              if (this.pendingRequests.has(requestId)) {
                reject(new Error(`指令调用超时: ${String(prop)}`));
                this.pendingRequests.delete(requestId);
              }
            }, 10000);
          });
        };
      },
    };
    return new Proxy({}, proxyHandler);
  }
}

export const workerManager = new WorkerManager();

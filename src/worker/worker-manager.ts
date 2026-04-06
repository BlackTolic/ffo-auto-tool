import path from 'path';
import { Worker } from 'worker_threads';
import { AutoT } from '../auto-plugin';
import { Role } from '../ffo/events/rolyer';
import logger from '../utils/logger';

export class WorkerManager {
  private static readonly workerMap = new Map<number, Worker>();
  private worker: Worker | null = null; // 工作线程
  private hwnd: number | null = null; // 窗口句柄
  private bindWindowSize: number | null = null; // 绑定窗口大小
  private role: Role | null = null; // 角色信息

  constructor() {
    this.initWorker();
  }

  private initWorker() {
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

    // this.worker.on('message', msg => {
    //   switch (msg.type) {
    //     case 'INITIALIZED':
    //       this.name = msg.data.name;
    //       this.position = msg.data.position;
    //       this.job = this.name.includes('花开无须折') ? 'SS' : 'JK';
    //       logger.info(`[角色信息] 子线程初始化完成，角色名: ${this.name}`);
    //       break;
    //     case 'STATUS_UPDATE':
    //       this.position = msg.data.position;
    //       this.map = msg.data.map;
    //       this.selectMonster = msg.data.selectMonster;
    //       this.bloodStatus = msg.data.bloodStatus;
    //       this.handleRoleLoop(); // 主线程处理任务逻辑与全局策略
    //       break;
    //     case 'TEAM_INVITE':
    //       if (typeof this.teamApplyCall === 'function') {
    //         this.teamApplyCall(msg.data.rejectPos, msg.data.agreePos);
    //       }
    //       break;
    //     case 'VERIFY_CODE_RESULT':
    //       this.handleVerifyCode(msg.data);
    //       break;
    //     case 'DEATH_DETECTED':
    //       this.handleDeath();
    //       break;
    //     case 'OFFLINE':
    //       logger.warn('[角色信息] 角色已掉线');
    //       emailStrategy.sendMessage({ to: '1031690983@qq.com', subject: '角色离线', text: `角色 ${this.name} 已掉线` });
    //       this.unregisterRole();
    //       break;
    //     case 'LOG':
    //       (logger as any)[msg.level || 'info']?.(msg.message);
    //       break;
    //   }
    // });

    // this.worker.on('error', err => {
    //   logger.error(`[角色工作线程] 发生错误: ${err.message}`);
    // });

    // this.worker.on('exit', code => {
    //   if (code !== 0) {
    //     logger.error(`[角色工作线程] 异常退出，退出码: ${code}`);
    //   }
    // });
  }

  // 注册角色
  registerRole(role: Role) {
    this.role = role;
  }

  // 向工作线程发送消息
  postMessage(msg: any) {
    if (this.worker) {
      this.worker.postMessage(msg);
    }
  }

  // 监听工作线程发送的消息，根据类型处理消息
  private onMessage(message: string, callback: (msg: any) => void) {
    if (!this.worker) {
      return;
    }
    this.worker.on('message', ({ type, data }) => {
      if (type === message && typeof callback === 'function') {
        callback(data);
      }
    });
  }

  // 销毁工作线程
  destroyWorker() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  // 更新角色信息
  registerEvent() {
    // 初始化角色信息
    this.onMessage('INITIALIZED', ({ name }) => {
      this.role?.childProcessInitRoleInfo(name);
    });
    // 更新角色状态信息：位置、地图、选择怪物、血量
    this.onMessage('STATUS_UPDATE', ({ position, map, selectedMonster, health }) => {
      this.role?.childProcessUpdateRoleInfo(position, map, selectedMonster, health);
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
    // 更新离线信息
    this.onMessage('OFFLINE', data => {
      this.role?.childProcessUpdateOfflineInfo();
    });
    // 日志处理
    this.onMessage('LOG', ({ level, message }) => {
      (logger as any)[level || 'info']?.(message);
    });
  }

  // 修改监听绑定的窗口
  changeChildProcessBindWindow() {
    this.postMessage({ type: 'UPDATE_CONFIG', data: { hwnd: this.hwnd, bindWindowSize: this.bindWindowSize } });
  }

  // 获取工作线程的句柄
  getChildProcessHwnd() {
    return this.hwnd;
  }

  // 代理插件
  private getProxyPlugin(bindPlugin: AutoT) {
    const proxyHandler = {
      get: (target: any, prop: string | symbol) => {
        // 1. 放行 Symbol 和特殊调试属性，避免检查/打印对象时崩溃
        if (typeof prop === 'symbol' || prop === 'inspect') {
          return target[prop];
        }

        const original = target[prop];
        // 2. 如果不是函数，直接返回原始值（例如获取 hwnd 属性）
        if (typeof original !== 'function') {
          return original;
        }

        // 3. 只有函数调用才进行转发
        return (...args: any[]) => {
          if (this.worker) {
            this.worker.postMessage({ type: 'CALL_DM', data: { method: prop as string, args } });
          } else {
            return original.apply(target, args);
          }
        };
      },
    };
    return new Proxy(bindPlugin || {}, proxyHandler);
  }
}

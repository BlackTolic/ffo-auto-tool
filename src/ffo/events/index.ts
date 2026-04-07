/*
 * 中文注释：FFO 事件模块
 * 采用观察者(发布/订阅)设计模式，通过事件总线驱动大漠插件的多窗口绑定。
 * 提供 DamoBindingManager 管理多个窗口与对应的大漠实例，每个窗口独立实例化插件，互不影响。
 */

import { EventEmitter } from 'events';
import { AutoT, ensureDamo } from '../../auto-plugin';
import { logger } from '../../utils/logger';
import { Role } from './rolyer';

// 中文注释：绑定配置（可按需覆盖默认值）
export interface BindConfig {
  display?: string; // 显示绑定方式，如 'gdi'、'dx'
  mouse?: string; // 鼠标绑定方式，如 'windows'、'dx'
  keypad?: string; // 键盘绑定方式，如 'windows'、'dx'
  api?: string; // 扩展 API/模式，如 'dx.public.active.api'
  mode?: number; // 绑定模式参数（整数位标志位）
}

// 中文注释：绑定请求事件的负载
export interface BindRequestPayload {
  hwnd: number; // 目标窗口句柄
  config?: BindConfig; // 可选的绑定配置覆盖
}

// 中文注释：绑定成功事件的负载
export interface BoundPayload {
  pid: number; // 目标进程 PID
  hwnd: number; // 成功绑定的窗口句柄
}

// 中文注释：解绑事件负载
export interface UnbindPayload {
  hwnd: number; // 解绑的窗口句柄
}

// 中文注释：错误事件负载
export interface ErrorPayload {
  pid?: number; // 可选：与错误相关的 PID
  hwnd?: number; // 可选：与错误相关的窗口句柄
  error: Error | string; // 错误对象或信息
}

// 中文注释：事件名联合类型，便于统一管理
export type FfoEventName =
  | 'bind:pid' // 触发按 PID 扫描并绑定所有窗口
  | 'bound' // 某个窗口绑定成功
  | 'unbind' // 某个窗口解绑完成
  | 'error'; // 发生错误

// 中文注释：事件总线（发布/订阅）
export const ffoEvents = new EventEmitter();

// 中文注释：管理器内部保存的客户端结构
export interface DamoClientRecord {
  pid: number; // 进程 ID
  hwnd: number; // 窗口句柄
  ffoClient: AutoT; // 对应的大漠实例（每个窗口一个）
}

// 中文注释：大漠绑定管理器（多窗口）
export class DamoBindingManager {
  // 中文注释：以窗口句柄为 key 的客户端映射
  private clientsByHwnd: Map<number, DamoClientRecord> = new Map();

  // 中文注释：以窗口句柄为 key 的角色映射
  private roleByHwnd: Map<number, Role> = new Map();

  // 中文注释：绑定状态锁，防止并发触发绑定逻辑
  private isBinding: boolean = false;

  // 中文注释：默认绑定配置（可被调用方覆盖）
  private defaultConfig: Required<BindConfig> = {
    display: 'dx.graphic.2d',
    mouse: 'dx.mouse.position.lock.api|dx.mouse.position.lock.message',
    keypad: 'dx.keypad.state.api|dx.keypad.api',
    api: '',
    mode: 0,
  };

  // 当前选中的任务句柄
  public selectHwnd: number | null = null;

  setRole(hwnd: number, role: Role) {
    this.roleByHwnd.set(hwnd, role);
  }

  getRole(hwnd: number): Role | undefined {
    return this.roleByHwnd.get(hwnd);
  }

  // 中文注释：获取已绑定的所有窗口记录
  list(): DamoClientRecord[] {
    return Array.from(this.clientsByHwnd.values());
  }

  // 中文注释：根据窗口句柄获取客户端记录
  get(hwnd: number): DamoClientRecord | undefined {
    return this.clientsByHwnd.get(hwnd);
  }

  // 中文注释：检查窗口是否已绑定
  isBound(hwnd: number): boolean {
    return this.clientsByHwnd.has(hwnd);
  }

  // 中文注释：解绑指定窗口（如果存在）
  unbindWindow(hwnd: number): boolean {
    const rec = this.clientsByHwnd.get(hwnd);
    if (!rec) return false;

    let success = false;
    try {
      // 中文注释：调用插件解绑当前绑定窗口
      const ret = rec.ffoClient.unbindWindow();
      if (ret === 1) {
        success = true;
      } else {
        logger.warn(`UnBindWindow failed: ret=${ret}, hwnd=${hwnd}`);
      }
    } catch (err) {
      logger.error(`UnBindWindow error: hwnd=${hwnd}`, err);
      ffoEvents.emit('error', { hwnd, error: err } as ErrorPayload);
    }

    // 中文注释：清理内部状态
    this.clientsByHwnd.delete(hwnd);
    this.roleByHwnd.delete(hwnd);
    if (this.selectHwnd === hwnd) {
      this.selectHwnd = null;
    }

    ffoEvents.emit('unbind', { hwnd } as UnbindPayload);
    return success;
  }

  // 中文注释：一次性解绑所有已绑定窗口（退出前调用）
  unbindAll(): void {
    // 中文注释：创建副本以安全遍历
    const hwnds = Array.from(this.clientsByHwnd.keys());
    for (const hwnd of hwnds) {
      this.unbindWindow(hwnd);
    }
  }

  // 根据进程ID获取当前的顶级窗口句柄，即选中窗口
  private getTopWinHwndsByPid(dmRaw: AutoT, pid: number): number[] {
    const results: number[] = [];
    try {
      // 8=顶级窗口，16=可见窗口；这里是匹配所有可见的父窗口
      const visTop = String(dmRaw.enumWindowByProcessId(pid, '', '', 8 + 16) || '')
        .split(',')
        .map(s => parseInt(s))
        .filter(n => Number.isFinite(n) && n > 0);
      results.push(...visTop);
      if (results.length === 0) {
        // 回退仅顶级（可能当前不可见）
        const topOnly = String(dmRaw.enumWindowByProcessId(pid, '', '', 8) || '')
          .split(',')
          .map(s => parseInt(s))
          .filter(n => Number.isFinite(n) && n > 0);
        results.push(...topOnly);
      }
    } catch (err) {
      ffoEvents.emit('error', { pid, error: err } as ErrorPayload);
    }
    // 中文注释：去重
    return Array.from(new Set(results));
  }

  // 中文注释：绑定指定 PID 的所有候选窗口；采用单例探测，实际绑定交由 Worker 完成
  async bindWindowsByHwnd(hwnd: number, config?: BindConfig) {
    if (this.isBinding) {
      logger.warn(`[插件识别] hwnds=${hwnd} 的绑定任务已在进行中，跳过重复触发`);
      return 0;
    }
    this.selectHwnd = hwnd;
    ffoEvents.emit('bound', { hwnd });
    this.clientsByHwnd.set(hwnd, { hwnd });
    // this.isBinding = true;
    // try {
    //   // 中文注释：主进程使用单例 Damo 实例进行枚举，不再重复创建 COM 对象
    //   // const dm = ensureDamo();
    //   // const hwnds = this.getTopWinHwndsByPid(dm, pid);
    //   console.log(hwnd, '根据游戏名称获取的句柄');
    //   let successCount = 0;
    //   for (const hwnd of hwnds) {
    //     // 中文注释：跳过已绑定的窗口，避免重复
    //     if (this.isBound(hwnd)) {
    //       logger.info(`[插件识别] 当前窗口 ${hwnd} 已绑定，跳过`);
    //       continue;
    //     }
    //     try {
    //       // 中文注释：主进程仅记录并触发识别事件，真正的 bindWindow 将在 Role 初始化的子线程中执行
    //       // this.clientsByHwnd.set(hwnd, { hwnd, ffoClient: dm as any });
    //       // successCount++;
    //       // 中文注释：通知订阅者该窗口已就绪（触发 Role 注册并启动 Worker 绑定）
    //       ffoEvents.emit('bound', { hwnd } as BoundPayload);
    //     } catch (err) {
    //       logger.error(`[插件识别] 处理错误: hwnd=${hwnd}`, err);
    //       ffoEvents.emit('error', { hwnd, error: err } as ErrorPayload);
    //     }
    //   }
    //   return successCount;
    // } finally {
    //   this.isBinding = false;
    // }
  }

  // 中文注释：按句柄识别单个窗口
  async bindWindow(hwnd: number, config?: BindConfig): Promise<boolean> {
    if (!hwnd || hwnd <= 0) return false;
    if (this.isBound(hwnd)) return true;
    // 生成主线程的大漠对象
    const dm = ensureDamo();
    let pid = 0;
    try {
      pid = dm.getWindowProcessId(hwnd);
    } catch {
      logger.error(`[插件识别] 获取窗口 PID 失败，hwnd=${hwnd}`);
      return false;
    }

    try {
      this.clientsByHwnd.set(hwnd, { pid, hwnd, ffoClient: dm as any });
      ffoEvents.emit('bound', { pid, hwnd } as BoundPayload);
      return true;
    } catch (err) {
      ffoEvents.emit('error', { pid, hwnd, error: err } as ErrorPayload);
      return false;
    }
  }
}

// 中文注释：单例管理器，供主进程/其他模块复用
export const damoBindingManager = new DamoBindingManager();

// 中文注释：默认订阅：当收到按 PID 绑定请求时，执行绑定逻辑
ffoEvents.on('bind:pid', async (payload: BindRequestPayload) => {
  logger.info('[绑定] 收到按 hwnds 绑定请求', payload);
  const { hwnd } = payload;
  try {
    await damoBindingManager.bindWindowsByHwnd(hwnd);
  } catch (err) {
    ffoEvents.emit('error', { hwnd, error: err } as ErrorPayload);
  }
});

/*
 * 中文注释：FFO 事件模块
 * 采用观察者(发布/订阅)设计模式，通过事件总线驱动大漠插件的多窗口绑定。
 * 提供 DamoBindingManager 管理多个窗口与对应的大漠实例，每个窗口独立实例化插件，互不影响。
 */

import { EventEmitter } from 'events';
import { Damo } from '../../damo/damo';
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
  pid: number; // 目标进程 PID
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
  ffoClient: Damo; // 对应的大漠实例（每个窗口一个）
}

// 中文注释：大漠绑定管理器（多窗口）
export class DamoBindingManager {
  // 中文注释：以窗口句柄为 key 的客户端映射
  private clientsByHwnd: Map<number, DamoClientRecord> = new Map();

  private roleByHwnd: Map<number, Role> = new Map();

  // 中文注释：默认绑定配置（可被调用方覆盖）
  private defaultConfig: Required<BindConfig> = {
    // display: 'gdi',
    // mouse: 'windows',
    // keypad: 'windows',
    // api: 'dx.public.active.api',
    // mode: 0,

    // display: 'dx2',
    // mouse: 'dx.mouse.position.lock.api|dx.mouse.api|dx.mouse.cursor',
    // keypad: 'dx.keypad.api',
    // api: 'dx.public.active.api|dx.public.hide.dll|dx.public.graphic.protect|dx.public.down.cpu',
    // mode: 0,

    // display: 'dx2',
    // mouse: 'windows',
    // keypad: 'windows',
    // api: '',
    // mode: 1,

    display: 'dx2',
    mouse: 'normal',
    keypad: 'windows',
    api: '',
    mode: 0,
  };

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
    try {
      // 中文注释：调用插件解绑当前绑定窗口
      rec.ffoClient.unbindWindow();
    } catch (err) {
      ffoEvents.emit('error', { hwnd, error: err } as ErrorPayload);
    }
    this.clientsByHwnd.delete(hwnd);
    ffoEvents.emit('unbind', { hwnd } as UnbindPayload);
    return true;
  }

  // 中文注释：一次性解绑所有已绑定窗口（退出前调用）
  unbindAll(): void {
    for (const [hwnd, rec] of this.clientsByHwnd.entries()) {
      try {
        rec.ffoClient.unbindWindow(); // 中文注释：逐个调用插件解绑
      } catch (err) {
        ffoEvents.emit('error', { hwnd, error: err } as ErrorPayload);
      }
      // 中文注释：删除记录并广播解绑事件
      this.clientsByHwnd.delete(hwnd);
      ffoEvents.emit('unbind', { hwnd } as UnbindPayload);
    }
  }

  // 中文注释：按 PID 枚举候选窗口句柄（优先可见顶级，回退顶级所有）
  private enumerateWindowsByPid(dmRaw: any, pid: number): number[] {
    const results: number[] = [];
    try {
      // 8=顶级窗口，16=可见窗口；优先取可见顶级
      const visTop = String(dmRaw.EnumWindowByProcessId(pid, '', '', 8 + 16) || '')
        .split(',')
        .map(s => parseInt(s))
        .filter(n => Number.isFinite(n) && n > 0);
      results.push(...visTop);
      if (results.length === 0) {
        // 回退仅顶级（可能当前不可见）
        const topOnly = String(dmRaw.EnumWindowByProcessId(pid, '', '', 8) || '')
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

  // 中文注释：绑定指定 PID 的所有候选窗口；为每个窗口单独实例化大漠对象
  async bindWindowsForPid(pid: number, config?: BindConfig): Promise<number> {
    const cfg = { ...this.defaultConfig, ...(config || {}) };
    // 中文注释：使用探测实例进行枚举（与真正绑定实例分离，确保每个窗口独立实例）
    let probe: Damo | null = null;
    try {
      probe = new Damo();
    } catch (err) {
      ffoEvents.emit('error', { pid, error: err } as ErrorPayload);
      return 0;
    }

    // 中文注释：枚举窗口句柄
    const hwnds = this.enumerateWindowsByPid(probe.dm, pid);
    let successCount = 0;

    for (const hwnd of hwnds) {
      // 中文注释：跳过已绑定的窗口，避免重复
      if (this.isBound(hwnd)) continue;
      let client: Damo;
      try {
        client = new Damo();
      } catch (err) {
        ffoEvents.emit('error', { pid, hwnd, error: err } as ErrorPayload);
        continue;
      }

      try {
        const ret = client.dm.BindWindowEx(hwnd, cfg.display, cfg.mouse, cfg.keypad, cfg.api, cfg.mode);
        client.dm.delay(200);
        // const ret = client.dm.BindWindow(hwnd, cfg.display, cfg.mouse, cfg.keypad, cfg.mode);

        if (ret !== 1) {
          // 中文注释：返回非 1 表示失败，抛错并通知事件
          throw new Error(`BindWindowEx 失败，返回值=${ret}, hwnd=${hwnd}, pid=${pid}`);
        }
        // 中文注释：记录成功绑定的客户端
        this.clientsByHwnd.set(hwnd, { pid, hwnd, ffoClient: client });
        successCount++;
        // 中文注释：通知订阅者该窗口绑定成功
        ffoEvents.emit('bound', { pid, hwnd } as BoundPayload);
      } catch (err) {
        // 中文注释：发生错误，通知订阅者
        ffoEvents.emit('error', { pid, hwnd, error: err } as ErrorPayload);
        // 中文注释：务必释放可能的绑定（防止半绑定状态）
        try {
          client.unbindWindow();
        } catch {}
      }
    }
    console.log('[绑定] 枚举窗口 hwnds', hwnds);
    return successCount;
  }
}

// 中文注释：单例管理器，供主进程/其他模块复用
export const damoBindingManager = new DamoBindingManager();

// 中文注释：默认订阅：当收到按 PID 绑定请求时，执行绑定逻辑
ffoEvents.on('bind:pid', async (payload: BindRequestPayload) => {
  console.log('[绑定] 收到按 PID 绑定请求', payload);
  const { pid, config } = payload;
  try {
    await damoBindingManager.bindWindowsForPid(pid, config);
  } catch (err) {
    ffoEvents.emit('error', { pid, error: err } as ErrorPayload);
  }
});

import { BrowserWindow } from 'electron';
import { damoBindingManager, ffoEvents } from '../ffo/events';
import { Role } from '../ffo/events/rolyer';
import { stopKeyPress } from '../ffo/utils/key-press';
import logger from '../utils/logger';
import { workerManager } from '../worker/worker-manager';

// 中文注释：向所有渲染进程广播字库信息更新
export const broadcastDictInfoUpdated = (hwnd: number, info: any) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('damo:dictInfoUpdated', { hwnd, info }));
};

// 中文注释：记录最近绑定成功的窗口句柄（供部分逻辑使用）
let lastBoundHwnd: number | null = null;

// 中文注释：为绑定成功事件注册处理逻辑（加载字库、调试输出、截图与 OCR 示例）
export const registerBoundEventHandlers = () => {
  // 监听到传来的绑定消息
  ffoEvents.on('bound', async ({ hwnd }) => {
    // 中文注释：记录最近绑定的窗口句柄
    lastBoundHwnd = hwnd;
    // 中文注释：防止重复创建 Role 实例和子线程
    if (damoBindingManager.getRole(hwnd)) {
      logger.info(`[绑定事件] 窗口 ${hwnd} 已存在活跃角色实例，跳过重复注册`);
      return;
    }
    try {
      // 生成角色信息
      const role = new Role();
      // 中文注释：设置角色信息
      damoBindingManager.setRole(hwnd, role);
      // 绑定窗口
      workerManager.bindChildProcessWindow(hwnd);
      // 注册角色信息，并启动子线程执行实际绑定与 OCR
      workerManager.registerRole(role);
    } catch (err) {
      logger.warn(`[绑定事件] 处理失败: ${String((err as any)?.message || err)}`);
    }
  });

  // 中文注释：解绑事件处理（停止定时器与清理状态）
  ffoEvents.on('unbind', async ({ hwnd }) => {
    try {
      stopKeyPress(hwnd);
      // 中文注释：更新自动按键状态并重置最近绑定句柄
      const role = damoBindingManager.getRole(hwnd);
      if (role) {
        role.unregisterRole();
      }

      if (lastBoundHwnd === hwnd) lastBoundHwnd = null;
    } catch (err) {
      logger.warn(`[解绑事件] 清理失败: ${String((err as any)?.message || err)}`);
    }
  });
};

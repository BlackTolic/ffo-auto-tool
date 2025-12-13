/*
 * 中文注释：自动按键（基于大漠插件）
 * - 需求：默认每秒按 5 次（即每 200ms 按一次）
 * - 作用域：仅对已绑定窗口（DamoBindingManager 记录）生效
 * - 提供 startKeyPress(rec, intervalMs?, keyName?) / stopKeyPress(hwnd)
 */

import type { DamoClientRecord } from '../events';
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

// 中文注释：每个窗口的自动按键状态
interface F1State {
  running: boolean; // 中文注释：是否正在运行
  intervalId: NodeJS.Timeout | null; // 中文注释：定时器句柄
}

// 中文注释：保存每个窗口的运行状态（key=hwnd）
const states = new Map<number, F1State>();

// 中文注释：启动自动按键（第二参数为毫秒间隔，第三参数为按键名，默认 F1）
export function startKeyPress(keyName: keyof typeof VK_F = 'F1', intervalMs: number = 200, rec: DamoClientRecord): void {
  const dm = rec.ffoClient.dm;
  const hwnd = rec.hwnd;

  // 中文注释：防重入（已在运行则忽略）
  const existing = states.get(hwnd);
  if (existing?.running) {
    console.warn(`[自动按键] 窗口 ${hwnd} 已在运行，忽略重复启动。`);
    return;
  }

  // 中文注释：周期即执行的时间间隔（毫秒），设置最小 10ms 防止过于频繁
  const periodMs = Math.max(10, Math.floor(intervalMs));

  const state: F1State = {
    running: true,
    intervalId: null,
  };
  states.set(hwnd, state);

  // 中文注释：定时按键（使用大漠插件 KeyPress）
  state.intervalId = setInterval(() => {
    if (!state.running) return;
    try {
      // 中文注释：按指定功能键（通过映射获取虚拟键码并转字符串）
      dm.KeyPress(String(VK_F[keyName]));
    } catch (err) {
      // 中文注释：按键失败后立即退出定时器并清理状态
      console.warn('[自动按键] 按键失败，自动停止：', String((err as any)?.message || err));
      stopKeyPress(hwnd);
    }
  }, periodMs);

  console.log(`[自动按键] 已启动：hwnd=${hwnd} | key=${keyName} | 间隔=${periodMs}ms | 频率约=${(1000 / periodMs).toFixed(2)} 次/秒`);
}

// 中文注释：停止自动按键（清理定时器并移除状态）
export function stopKeyPress(hwnd: number): void {
  const st = states.get(hwnd);
  if (!st) return;
  st.running = false;
  if (st.intervalId) {
    clearInterval(st.intervalId);
  }
  states.delete(hwnd);
  console.log(`[自动按键] 已停止：hwnd=${hwnd}`);
}

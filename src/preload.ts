import { contextBridge, ipcRenderer } from 'electron';

// 中文注释：大漠相关 API（仅示例保留核心调用）
const damo = {
  // 中文注释：获取当前前台窗口句柄
  getForegroundWindow: (): Promise<number> => ipcRenderer.invoke('damo:getForegroundWindow'),
  // 中文注释：查询大漠插件版本号（供渲染层显示或诊断）
  ver: (): Promise<string> => ipcRenderer.invoke('damo:ver'),
  // 中文注释：绑定窗口
  bindWindow: (hwnd: number, display: string, mouse: string, keypad: string, mode: number): Promise<number> => ipcRenderer.invoke('damo:bindWindow', hwnd, display, mouse, keypad, mode),
  // 中文注释：解绑窗口
  unbindWindow: (): Promise<number> => ipcRenderer.invoke('damo:unbindWindow'),
  // 中文注释：按句柄解绑（扩展能力）
  unbindHwnd: (hwnd: number): Promise<{ ok: boolean; hwnd?: number; message?: string }> => ipcRenderer.invoke('ffo:unbindHwnd', hwnd),
  // 中文注释：清空所有绑定
  unbindAll: (): Promise<{ ok: boolean; count?: number; message?: string }> => ipcRenderer.invoke('ffo:unbindAll'),
  // 中文注释：切换自动按键
  toggleAutoKey: (
    keyName: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' = 'F1',
    intervalMs: number = 200
  ): Promise<{ ok: boolean; running?: boolean; hwnd?: number; key?: string; intervalMs?: number; message?: string }> => ipcRenderer.invoke('autoKey:toggle', keyName, intervalMs),
};

// 新增：环境校验 API，渲染进程可调用展示结果
const env = {
  check: (): Promise<any> => ipcRenderer.invoke('env:check'),
};

// 新增：窗口控制 API（最小化与关闭当前窗口）
const windowControl = {
  // 中文注释：最小化当前窗口
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  // 中文注释：关闭当前窗口
  close: (): Promise<void> => ipcRenderer.invoke('window:close'),
};

// 新增：FFO 动作 API（无泪南郊：切换/暂停/停止）
const ffoActions = {
  // 中文注释：切换“无泪南郊”自动寻路（第一次开启，第二次关闭）
  toggleWuLeiNanJiao: (): Promise<{ ok: boolean; running?: boolean; hwnd?: number; message?: string }> => ipcRenderer.invoke('ffo:wuLeiNanJiao:toggle'),
  // 中文注释：暂停当前激活的无泪南郊动作（停止自动寻路但保留任务）
  pauseCurActive: (): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('ffo:wuLeiNanJiao:pause'),
  // 中文注释：停止当前激活的无泪南郊动作（清空任务并停止自动寻路）
  stopCurActive: (): Promise<{ ok: boolean; message?: string }> => ipcRenderer.invoke('ffo:wuLeiNanJiao:stop'),
};

// 中文注释：向渲染进程暴露用于操作大漠插件的 API
contextBridge.exposeInMainWorld('damo', damo);
// 中文注释：向渲染进程暴露环境校验 API
contextBridge.exposeInMainWorld('env', env);
// 中文注释：向渲染进程暴露窗口控制 API
contextBridge.exposeInMainWorld('windowControl', windowControl);
// 中文注释：向渲染进程暴露 FFO 动作 API
contextBridge.exposeInMainWorld('ffoActions', ffoActions);

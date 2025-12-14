import { contextBridge, ipcRenderer } from 'electron';

// 中文注释：向渲染进程暴露用于操作大漠插件的 API
const damo = {
  ver: (): Promise<string> => ipcRenderer.invoke('damo:ver'),
  getForegroundWindow: (): Promise<number> => ipcRenderer.invoke('damo:getForegroundWindow'),
  bindWindow: (hwnd: number, display: string, mouse: string, keypad: string, mode: number): Promise<number> => ipcRenderer.invoke('damo:bindWindow', hwnd, display, mouse, keypad, mode),
  unbindWindow: (): Promise<number> => ipcRenderer.invoke('damo:unbindWindow'),
  getClientRect: (hwnd: number): Promise<{ x: number; y: number; width: number; height: number }> => ipcRenderer.invoke('damo:getClientRect', hwnd),
  clientToScreen: (hwnd: number, x: number, y: number): Promise<{ x: number; y: number }> => ipcRenderer.invoke('damo:clientToScreen', hwnd, x, y),
  screenToClient: (hwnd: number, x: number, y: number): Promise<{ x: number; y: number }> => ipcRenderer.invoke('damo:screenToClient', hwnd, x, y),
  getWindowRect: (hwnd: number): Promise<{ x: number; y: number; width: number; height: number }> => ipcRenderer.invoke('damo:getWindowRect', hwnd),
  getWindowInfo: (
    hwnd: number
  ): Promise<{ windowRect: { x: number; y: number; width: number; height: number }; clientRect: { x: number; y: number; width: number; height: number }; scaleFactor: number }> =>
    ipcRenderer.invoke('damo:getWindowInfo', hwnd),
  clientCssToScreenPx: (hwnd: number, xCss: number, yCss: number): Promise<{ x: number; y: number }> => ipcRenderer.invoke('damo:clientCssToScreenPx', hwnd, xCss, yCss),
  screenPxToClientCss: (hwnd: number, x: number, y: number): Promise<{ x: number; y: number }> => ipcRenderer.invoke('damo:screenPxToClientCss', hwnd, x, y),
  getDictInfo: (hwnd?: number): Promise<any> => ipcRenderer.invoke('damo:getDictInfo', hwnd),

  // 中文注释：一键绑定“当前前台窗口”的所属进程（通过绑定管理器），便于 Alt+W 切换
  bindForeground: (): Promise<{ ok: boolean; count?: number; hwnd?: number; pid?: number; message?: string }> => ipcRenderer.invoke('ffo:bindForeground'),

  // 中文注释：切换自动按键（通过主进程复用统一逻辑）
  toggleAutoKey: (
    keyName: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' = 'F1',
    intervalMs: number = 200
  ): Promise<{ ok: boolean; running?: boolean; hwnd?: number; key?: string; intervalMs?: number; message?: string }> => ipcRenderer.invoke('autoKey:toggle', keyName, intervalMs),
};

// 新增：环境校验 API，渲染进程可调用展示结果
const env = {
  check: (): Promise<any> => ipcRenderer.invoke('env:check'),
};

contextBridge.exposeInMainWorld('damo', damo);
contextBridge.exposeInMainWorld('env', env);

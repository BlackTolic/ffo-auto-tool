import { contextBridge, ipcRenderer } from 'electron';

const damo = {
  ver: (): Promise<string> => ipcRenderer.invoke('damo:ver'),
  getForegroundWindow: (): Promise<number> => ipcRenderer.invoke('damo:getForegroundWindow'),
  bindWindow: (
    hwnd: number,
    display: string,
    mouse: string,
    keypad: string,
    mode: number
  ): Promise<number> => ipcRenderer.invoke('damo:bindWindow', hwnd, display, mouse, keypad, mode),
  unbindWindow: (): Promise<number> => ipcRenderer.invoke('damo:unbindWindow'),
  getWindowRect: (hwnd: number): Promise<{ x: number; y: number; width: number; height: number }>
    => ipcRenderer.invoke('damo:getWindowRect', hwnd),
  getClientRect: (hwnd: number): Promise<{ x: number; y: number; width: number; height: number }>
    => ipcRenderer.invoke('damo:getClientRect', hwnd),
  clientToScreen: (hwnd: number, x: number, y: number): Promise<{ x: number; y: number }>
    => ipcRenderer.invoke('damo:clientToScreen', hwnd, x, y),
  screenToClient: (hwnd: number, x: number, y: number): Promise<{ x: number; y: number }>
    => ipcRenderer.invoke('damo:screenToClient', hwnd, x, y),
  getWindowInfo: (hwnd: number): Promise<{ windowRect: { x: number; y: number; width: number; height: number };
                                            clientRect: { x: number; y: number; width: number; height: number };
                                            scaleFactor: number }>
    => ipcRenderer.invoke('damo:getWindowInfo', hwnd),
  clientCssToScreenPx: (hwnd: number, xCss: number, yCss: number): Promise<{ x: number; y: number }>
    => ipcRenderer.invoke('damo:clientCssToScreenPx', hwnd, xCss, yCss),
  screenPxToClientCss: (hwnd: number, xScreenPx: number, yScreenPx: number): Promise<{ x: number; y: number }>
    => ipcRenderer.invoke('damo:screenPxToClientCss', hwnd, xScreenPx, yScreenPx),
  // 中文注释：新增字库信息查询接口（支持可选窗口句柄）
  getDictInfo: (hwnd?: number): Promise<{ activeIndex: number | null; source: { type: 'inline' | 'file' | 'unknown'; path?: string; length?: number } | null }>
    => ipcRenderer.invoke('damo:getDictInfo', hwnd),
  // 中文注释：新增字库信息更新事件监听接口（主进程广播时自动触发）
  onDictInfoUpdated: (callback: (payload: { hwnd: number; info: { activeIndex: number | null; source: { type: 'inline' | 'file' | 'unknown'; path?: string; length?: number } | null } | null }) => void): void => {
    ipcRenderer.on('damo:dictInfoUpdated', (_e, payload) => callback(payload));
  },
  // 中文注释：新增取消字库信息更新监听的方法（退出或卸载时调用）
  offDictInfoUpdated: (): void => {
    ipcRenderer.removeAllListeners('damo:dictInfoUpdated');
  },
};

// 新增：环境校验 API，渲染进程可调用展示结果
const env = {
  check: (): Promise<any> => ipcRenderer.invoke('env:check'),
};

contextBridge.exposeInMainWorld('damo', damo);
contextBridge.exposeInMainWorld('env', env);




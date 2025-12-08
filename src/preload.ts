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
};

// 新增：环境校验 API，渲染进程可调用展示结果
const env = {
  check: (): Promise<any> => ipcRenderer.invoke('env:check'),
};

contextBridge.exposeInMainWorld('damo', damo);
contextBridge.exposeInMainWorld('env', env);




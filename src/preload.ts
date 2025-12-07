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
};

// 新增：环境校验 API，渲染进程可调用展示结果
const env = {
  check: (): Promise<any> => ipcRenderer.invoke('env:check'),
};

contextBridge.exposeInMainWorld('damo', damo);
contextBridge.exposeInMainWorld('env', env);




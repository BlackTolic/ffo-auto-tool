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

contextBridge.exposeInMainWorld('damo', damo);




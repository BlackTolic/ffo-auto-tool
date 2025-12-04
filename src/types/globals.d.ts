declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

declare module '*.css';

type DamoAPI = {
  ver: () => Promise<string>;
  getForegroundWindow: () => Promise<number>;
  bindWindow: (
    hwnd: number,
    display: string,
    mouse: string,
    keypad: string,
    mode: number
  ) => Promise<number>;
  unbindWindow: () => Promise<number>;
};

declare global {
  interface Window {
    damo: DamoAPI;
  }
}

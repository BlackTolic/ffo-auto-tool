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

// 新增：环境 API 类型（简化为 any 以避免与 TS 模块类型耦合）
type EnvAPI = {
  check: () => Promise<any>;
};

declare global {
  interface Window {
    damo: DamoAPI;
    env: EnvAPI; // 中文注释：渲染进程可通过 window.env.check 获取环境校验结果
  }
}


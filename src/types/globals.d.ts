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
  getWindowRect: (hwnd: number) => Promise<{ x: number; y: number; width: number; height: number }>; // 中文注释：根据句柄返回窗口矩形
  getClientRect: (hwnd: number) => Promise<{ x: number; y: number; width: number; height: number }>; // 中文注释：根据句柄返回客户区矩形
  clientToScreen: (hwnd: number, x: number, y: number) => Promise<{ x: number; y: number }>; // 中文注释：客户区坐标 -> 屏幕坐标
  screenToClient: (hwnd: number, x: number, y: number) => Promise<{ x: number; y: number }>; // 中文注释：屏幕坐标 -> 客户区坐标
  getWindowInfo: (hwnd: number) => Promise<{ windowRect: { x: number; y: number; width: number; height: number }; clientRect: { x: number; y: number; width: number; height: number }; scaleFactor: number }>; // 中文注释：聚合窗口信息与显示器缩放
  clientCssToScreenPx: (hwnd: number, xCss: number, yCss: number) => Promise<{ x: number; y: number }>; // 中文注释：客户区 CSS(DIP) -> 屏幕像素
  screenPxToClientCss: (hwnd: number, xScreenPx: number, yScreenPx: number) => Promise<{ x: number; y: number }>; // 中文注释：屏幕像素 -> 客户区 CSS(DIP)
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


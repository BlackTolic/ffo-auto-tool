declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

declare module '*.css';

type DamoAPI = {
  ver: () => Promise<string>;
  getForegroundWindow: () => Promise<number>;
  bindWindow: (hwnd: number, display: string, mouse: string, keypad: string, mode: number) => Promise<number>;
  unbindWindow: () => Promise<number>;
  getWindowRect: (hwnd: number) => Promise<{ x: number; y: number; width: number; height: number }>; // 中文注释：根据句柄返回窗口矩形
  getClientRect: (hwnd: number) => Promise<{ x: number; y: number; width: number; height: number }>; // 中文注释：根据句柄返回客户区矩形
  clientToScreen: (hwnd: number, x: number, y: number) => Promise<{ x: number; y: number }>; // 中文注释：客户区坐标 -> 屏幕坐标
  screenToClient: (hwnd: number, x: number, y: number) => Promise<{ x: number; y: number }>; // 中文注释：屏幕坐标 -> 客户区坐标
  getWindowInfo: (
    hwnd: number
  ) => Promise<{ windowRect: { x: number; y: number; width: number; height: number }; clientRect: { x: number; y: number; width: number; height: number }; scaleFactor: number }>; // 中文注释：聚合窗口信息与显示器缩放
  clientCssToScreenPx: (hwnd: number, xCss: number, yCss: number) => Promise<{ x: number; y: number }>; // 中文注释：客户区 CSS(DIP) -> 屏幕像素
  screenPxToClientCss: (hwnd: number, xScreenPx: number, yScreenPx: number) => Promise<{ x: number; y: number }>; // 中文注释：屏幕像素 -> 客户区 CSS(DIP)
  getDictInfo: (hwnd?: number) => Promise<any>; // 中文注释：查询当前 OCR 字库信息
  bindForeground: () => Promise<{ ok: boolean; count?: number; hwnd?: number; pid?: number; message?: string }>; // 中文注释：一键绑定前台窗口所属进程（通过绑定管理器）
  toggleAutoKey: (
    keyName?: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10',
    intervalMs?: number
  ) => Promise<{ ok: boolean; running?: boolean; hwnd?: number; key?: string; intervalMs?: number; message?: string }>; // 中文注释：切换自动按键
};

declare global {
  interface Window {
    damo: DamoAPI;
    env: {
      check: () => Promise<any>;
    };
    // 中文注释：全局窗口大小配置
    windowSize: string;
  }
  windowSize: string;
}

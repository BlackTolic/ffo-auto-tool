export {}; // 让本文件成为模块，避免与全局冲突

declare global {
  interface Window {
    // 中文注释：在 preload 暴露的 damo API，用于操作大漠插件与绑定管理
    damo: {
      ver(): Promise<string>;
      getForegroundWindow(): Promise<number>;
      bindWindow(hwnd: number, display: string, mouse: string, keypad: string, mode: number): Promise<number>;
      unbindWindow(): Promise<number>;
      getClientRect(hwnd: number): Promise<{ x: number; y: number; width: number; height: number }>;
      clientToScreen(hwnd: number, x: number, y: number): Promise<{ x: number; y: number }>;
      screenToClient(hwnd: number, x: number, y: number): Promise<{ x: number; y: number }>;
      getWindowRect(hwnd: number): Promise<{ x: number; y: number; width: number; height: number }>;
      getWindowInfo(
        hwnd: number
      ): Promise<{ windowRect: { x: number; y: number; width: number; height: number }; clientRect: { x: number; y: number; width: number; height: number }; scaleFactor: number }>;
      clientCssToScreenPx(hwnd: number, xCss: number, yCss: number): Promise<{ x: number; y: number }>;
      screenPxToClientCss(hwnd: number, x: number, y: number): Promise<{ x: number; y: number }>;
      getDictInfo(hwnd?: number): Promise<any>;

      // 中文注释：绑定前台进程的所有窗口（通过绑定管理器）
      bindForeground(): Promise<{ ok: boolean; count?: number; hwnd?: number; pid?: number; message?: string }>;

      // 中文注释：列出当前可绑定窗口（全局顶层可见窗口）
      listBindableWindows(): Promise<Array<{ hwnd: number; pid: number; title: string; className: string; processPath?: string; exeName?: string }>>;

      // 中文注释：读取当前已绑定窗口列表（通过绑定管理器）
      listBoundWindows(): Promise<Array<{ hwnd: number; pid: number; title: string; className: string; processPath?: string; exeName?: string }>>;

      // 中文注释：按句柄执行绑定（通过绑定管理器记录）
      bindHwnd(hwnd: number): Promise<{ ok: boolean; hwnd?: number; message?: string }>;

      // 中文注释：按句柄执行解绑（通过绑定管理器记录）
      unbindHwnd(hwnd: number): Promise<{ ok: boolean; hwnd?: number; message?: string }>;

      // 中文注释：批量清空所有已绑定窗口（通过绑定管理器）
      unbindAll(): Promise<{ ok: boolean; count?: number; message?: string }>;

      // 中文注释：切换自动按键（通过主进程复用统一逻辑）
      toggleAutoKey(
        keyName?: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10',
        intervalMs?: number
      ): Promise<{ ok: boolean; running?: boolean; hwnd?: number; key?: string; intervalMs?: number; message?: string }>;
    };

    // 中文注释：环境校验 API（preload 暴露）
    env: {
      check(): Promise<any>;
    };

    // 中文注释：窗口控制 API（最小化与关闭）
    windowControl: WindowControlAPI;
  }

  // 中文注释：已绑定窗口的接口类型
  interface BoundWindow {
    hwnd: number; // 中文注释：窗口句柄
    pid: number; // 中文注释：所属进程 PID
    title: string; // 中文注释：窗口标题
    className: string; // 中文注释：窗口类名
    processPath?: string; // 中文注释：窗口所属进程路径（如 C:\\Path\\fo.exe）
    exeName?: string; // 中文注释：进程的可执行文件名（如 fo.exe）
  }

  // 中文注释：窗口控制接口类型（独立抽出，便于声明与复用）
  interface WindowControlAPI {
    minimize(): Promise<void>; // 中文注释：最小化当前窗口
    close(): Promise<void>; // 中文注释：关闭当前窗口
  }
}

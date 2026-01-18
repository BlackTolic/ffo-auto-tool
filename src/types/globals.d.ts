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
      listBindableWindows(): Promise<BindableWindow[]>;

      // 中文注释：读取当前已绑定窗口信息（通过绑定管理器）
      listBoundWindows(): Promise<BoundWindow[]>;

      // 中文注释：按句柄绑定一个窗口（通过绑定管理器）
      bindHwnd(hwnd: number): Promise<BindHwndResult>;

      // 新增：按句柄解绑一个窗口（通过绑定管理器）
      unbindHwnd(hwnd: number): Promise<UnbindHwndResult>;

      // 新增：批量清空所有已绑定窗口（通过绑定管理器）
      unbindAll(): Promise<UnbindAllResult>;

      // 中文注释：开关自动按键功能
      toggleAutoKey(
        keyName?: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10',
        intervalMs?: number
      ): Promise<{ ok: boolean; running?: boolean; hwnd?: number; key?: string; intervalMs?: number; message?: string }>;
    };

    // 中文注释：环境检测 API
    env: {
      check(): Promise<any>;
    };
  }

  // 中文注释：可绑定窗口的接口类型
  interface BindableWindow {
    hwnd: number; // 中文注释：窗口句柄
    pid: number; // 中文注释：所属进程 PID
    title: string; // 中文注释：窗口标题
    className: string; // 中文注释：窗口类名
    processPath?: string; // 中文注释：窗口所属进程路径（如 C:\\Path\\fo.exe）
    exeName?: string; // 中文注释：进程的可执行文件名（如 fo.exe）
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

  // 中文注释：按句柄绑定的返回结果接口
  interface BindHwndResult {
    ok: boolean; // 中文注释：是否绑定成功
    hwnd?: number; // 中文注释：绑定的窗口句柄（成功时有值）
    message?: string; // 中文注释：错误或提示信息
  }

  // 新增：按句柄解绑的返回结果接口
  interface UnbindHwndResult {
    ok: boolean; // 中文注释：是否解绑成功
    hwnd?: number; // 中文注释：解绑的窗口句柄（成功时有值）
    message?: string; // 中文注释：错误或提示信息
  }

  // 新增：批量清空已绑定窗口的返回结果接口
  interface UnbindAllResult {
    ok: boolean; // 中文注释：是否清空成功
    count?: number; // 中文注释：清空前的绑定窗口数量
    message?: string; // 中文注释：提示或错误信息
  }
}

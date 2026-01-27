export {}; // 让本文件成为模块，避免与全局冲突

declare global {
  interface Window {
    // 中文注释：在 preload 暴露的 eventManager API，用于操作事件管理
    eventManager: {
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
      setSelectHwnd(hwnd: number | null): Promise<{ ok: boolean }>;
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

  // 中文注释：FFO 动作返回结果接口（与主进程保持一致）
  // 中文注释：大漠 API 接口类型（通过 preload 暴露到渲染进程）
  export interface DamoAPI {
    ver: () => Promise<string>; // 中文注释：查询大漠插件版本号
    getForegroundWindow: () => Promise<number>; // 中文注释：获取当前前台窗口句柄
    bindWindow: (hwnd: number, display: string, mouse: string, keypad: string, mode: number) => Promise<number>; // 中文注释：绑定指定窗口
    unbindWindow: () => Promise<number>; // 中文注释：解绑当前绑定窗口
    unbindHwnd: (hwnd: number) => Promise<{ ok: boolean; hwnd?: number; message?: string }>; // 中文注释：按句柄解绑窗口
    unbindAll: () => Promise<{ ok: boolean; count?: number; message?: string }>; // 中文注释：解绑所有已绑定窗口
    toggleAutoKey: (
      keyName?: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10',
      intervalMs?: number
    ) => Promise<{ ok: boolean; running?: boolean; hwnd?: number; key?: string; intervalMs?: number; message?: string }>; // 中文注释：切换自动按键
    setSelectHwnd: (hwnd: number | null) => Promise<{ ok: boolean }>; // 中文注释：设置当前选中的窗口句柄
  }

  // 中文注释：自动路线切换结果接口（用于前端 UI 状态更新）
  export interface AutoRouteToggleResult {
    ok: boolean; // 中文注释：是否切换成功
    running?: boolean; // 中文注释：切换后的运行状态（true 表示已启动，false 表示已停止）
    hwnd?: number; // 中文注释：相关窗口句柄（仅在绑定窗口逻辑中使用）
    message?: string; // 中文注释：失败时的错误信息
  }

  // 中文注释：暂停当前动作结果接口（用于点击“暂停”时的反馈）
  export interface PauseResult {
    ok: boolean; // 中文注释：是否暂停成功
    message?: string; // 中文注释：失败时的错误信息
  }

  // 中文注释：停止当前动作结果接口（用于点击“停止”时的反馈）
  export interface StopResult {
    ok: boolean; // 中文注释：是否停止成功
    message?: string; // 中文注释：失败时的错误信息
  }

  // 中文注释：渲染进程可用的 FFO 动作 API 接口
  export interface FfoActionsAPI {
    // 中文注释：切换“无泪南郊”自动寻路（第一次开启，第二次关闭）
    toggleWuLeiNanJiao: () => Promise<AutoRouteToggleResult>;
    // 中文注释：暂停当前激活的无泪南郊动作（仅停止自动寻路，保留任务）
    pauseCurActive: () => Promise<PauseResult>;
    // 中文注释：停止当前激活的无泪南郊动作（清空任务并停止自动寻路）
    stopCurActive: () => Promise<StopResult>;
  }

  // 中文注释：向全局 window 挂载 API（preload 暴露）
  declare global {
    interface Window {
      eventManager: EventManagerAPI; // 中文注释：事件管理 API
      ffoActions: FfoActionsAPI; // 中文注释：FFO 动作 API
    }
  }
}

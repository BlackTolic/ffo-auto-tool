/* Minimal Damo (大漠插件) wrapper using COM via winax */
// Runtime-safe import: keep build working even if winax is not installed
let winax: any = null;
try {
  // Use dynamic require so bundlers don't eagerly resolve
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  winax = require('winax');
} catch (e) {
  winax = null;
}

export class Damo {
  private dm: any;

  constructor() {
    if (!winax) {
      throw new Error(
        'winax 未安装或构建失败。请先安装 Visual Studio C++ 构建工具和 Python，再执行: npm i winax'
      );
    }
    this.dm = new winax.Object('dm.dmsoft');
  }

  ver(): string {
    return this.dm.Ver();
  }

  getForegroundWindow(): number {
    return this.dm.GetForegroundWindow();
  }

  bindWindow(hwnd: number, display: string, mouse: string, keypad: string, mode: number): number {
    return this.dm.BindWindow(hwnd, display, mouse, keypad, mode);
  }

  unbindWindow(): number {
    return this.dm.UnBindWindow();
  }
}

/* Minimal Damo (大漠插件) wrapper using COM via winax */
const winax = require('winax');

export class Damo {
  private dm: any;

  constructor() {
    if (!winax) {
      // 中文提示：引导安装 winax 及其构建依赖
      throw new Error(
        'winax 未安装或构建失败。请先安装 Visual Studio C++ 构建工具和 Python，再执行: npm i winax'
      );
    }
    try {
      // 使用 COM ProgID 创建大漠对象，要求已正确注册 dm.dll（位数需匹配）
      this.dm = new winax.Object('dm.dmsoft');
      this.reg()
    } catch (err: any) {
      // -2147221005 = REGDB_E_CLASSNOTREG（类未注册），常见于未注册或位数不匹配
      const errno = err && typeof err.errno === 'number' ? err.errno : null;
      // console.error('[Damo] COM creation failed:', errno, msg);
      const archHint = `Current process architecture: ${process.arch} (Please ensure using the same bitness dm.dll and register as Administrator)`;
      const msg = String(err?.message || '');
      if (errno === -2147221005 || msg.includes('CreateInstance')) {
        // throw new Error(`创建 COM 对象失败：dm.dmsoft 类未注册或位数不匹配。${archHint}`);
        throw new Error(`Failed to create COM object: dm.dmsoft class not registered or bitness mismatch. ${archHint}`);
      }
      // 其他错误原样抛出，便于定位具体问题
      throw err;
    }
  }

    reg() {
        // 注册大漠插件（主要是大漠插件收费的校验）
        const regResult = this.dm.Reg("yonghufd83601c96660b0709d34423d3bad506", "yk3112313")
        console.log('大漠插件注册: ', regResult)
        console.log('大漠插件版本：', this.dm.Ver())
        console.log('大漠插件路径：', this.dm.GetBasePath())
        // 这里是字库的文件，我们后面说到
        // const textPath = `${libDir}\\text\\ocr.txt`
        // console.log('字库设置：', this.dll.SetDict(0, textPath))
    }

  // 获取版本号
  ver(): string {
    return this.dm.Ver();
  }

  // 获取前台窗口句柄
  getForegroundWindow(): number {
    return this.dm.GetForegroundWindow();
  }

  // 绑定窗口
  bindWindow(hwnd: number, display: string, mouse: string, keypad: string, mode: number): number {
    return this.dm.BindWindow(hwnd, display, mouse, keypad, mode);
  }

  // 解绑窗口
  unbindWindow(): number {
    return this.dm.UnBindWindow();
  }
}

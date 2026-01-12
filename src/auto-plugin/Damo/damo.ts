/* Minimal Damo (大漠插件) wrapper using COM via winax */
const winax = require('winax');
// 新增：导入 child_process 用于判断管理员权限（中文注释）
import cp from 'child_process';
import fs from 'fs'; // 中文注释：用于从文件系统读取字典内容
import path from 'path'; // 中文注释：用于处理字典文件路径

// 注册码
const registerCode = 'mh84909b3bf80d45c618136887775ccc90d27d7';
// 附加码
const attachCode = 'mt0plzvti09xyhw7';

// 新增：判断当前进程是否以管理员运行（中文注释）
export const isElevated = (): boolean => {
  try {
    // fltmc 命令需要管理员权限，成功说明当前进程已提升（UAC 通过）
    cp.execSync('fltmc', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

export class Damo {
  dm: any;
  // 中文注释：当前字库索引（UseDict 设置的活动索引）；未设置为 null
  private activeDictIndex: number | null = null;
  // 中文注释：最近一次 SetDict 的来源信息（inline=内存字符串，file=文件）
  private dictSource: { type: 'inline' | 'file' | 'unknown'; path?: string; length?: number } | null = null;

  constructor() {
    if (!winax) {
      // 中文提示：引导安装 winax 及其构建依赖
      throw new Error('winax 未安装或构建失败。请先安装 Visual Studio C++ 构建工具和 Python，再执行: npm i winax');
    }
    try {
      // 使用 COM ProgID 创建大漠对象，要求已正确注册 dm.dll（位数需匹配）
      this.dm = new winax.Object('dm.dmsoft');
      // 中文注释：构造函数不再调用收费注册，避免每次实例化重复注册
    } catch (err: any) {
      // -2147221005 = REGDB_E_CLASSNOTREG（类未注册），常见于未注册或位数不匹配
      const errno = err && typeof err.errno === 'number' ? err.errno : null;
      const archHint = `Current process architecture: ${process.arch} (Please ensure using the same bitness dm.dll and register as Administrator)`;
      const msg = String(err?.message || '');
      if (errno === -2147221005 || msg.includes('CreateInstance')) {
        throw new Error(`Failed to create COM object: dm.dmsoft class not registered or bitness mismatch. ${archHint}`);
      }
      // 其他错误原样抛出，便于定位具体问题
      throw err;
    }
  }

  reg() {
    // 中文注释：大漠收费注册（Reg/RegEx）需管理员权限，否则返回 -2
    const elevated = isElevated();
    if (!elevated) {
      // 非管理员时，不强制抛错，返回 -2 并给出中文提示，避免影响免费功能
      const code = -2;
      console.warn('大漠收费注册未执行：当前进程非管理员(-2)。请以管理员运行或关闭UAC后重试。');
      console.warn('提示：右键以管理员身份运行终端，再执行 npm run start:utf8');
      return code;
    }
    // 执行收费注册（示例：使用你的用户名与附加码）
    const regCode = this.dm.Reg(registerCode, attachCode);
    console.log('大漠插件注册返回值: ', regCode, this.describeRegResult(regCode));
    console.log('大漠插件版本：', this.dm.Ver());
    console.log('大漠插件路径：', this.dm.GetBasePath());
    return regCode;
  }

  // 新增：返回码中文含义（汇总常见结果，便于快速定位问题）
  private describeRegResult(code: number): string {
    switch (code) {
      case 1:
        return '成功';
      case 0:
        return '失败(未知错误)';
      case -1:
        return '无法连接网络/可能防火墙拦截或IP暂封';
      case -2:
        return '进程未以管理员运行(UAC 导致)';
      case 2:
        return '余额不足';
      case 3:
        return '绑定了本机器，但账户余额不足50元';
      case 4:
        return '注册码错误';
      case 5:
        return '机器或IP在黑名单/不在白名单';
      case 6:
        return '非法使用插件/系统语言非中文简体可能触发';
      case 7:
        return '帐号因非法使用被封禁';
      case 8:
        return '附加码不在白名单中';
      case 77:
        return '机器码或IP因非法使用被封禁(全局封禁)';
      case 777:
        return '同一机器码注册次数超限，暂时封禁';
      case -8:
        return '版本附加信息长度超过20';
      case -9:
        return '版本附加信息包含非法字符';
      default:
        return '未知返回码';
    }
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
  // 根据窗口句柄获取窗口矩形（屏幕坐标）
  getWindowRect(hwnd: number): { x: number; y: number; width: number; height: number } {
    // 中文注释：使用按引用参数承接返回的左上/右下坐标（winax 通过 Variant byref 实现）
    const x1 = new winax.Variant(0, 'byref');
    const y1 = new winax.Variant(0, 'byref');
    const x2 = new winax.Variant(0, 'byref');
    const y2 = new winax.Variant(0, 'byref');
    const ok = this.dm.GetWindowRect(hwnd, x1, y1, x2, y2);
    if (!ok) {
      // 中文注释：当返回 0 表示失败，抛出错误便于上层处理
      throw new Error(`GetWindowRect 失败，hwnd=${hwnd}`);
    }
    // 中文注释：转换为数值并计算宽高（确保非负）
    const left = Number(x1.value) || 0;
    const top = Number(y1.value) || 0;
    const right = Number(x2.value) || 0;
    const bottom = Number(y2.value) || 0;
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    return { x: left, y: top, width, height };
  }

  // 根据窗口句柄获取客户区矩形（屏幕坐标）
  getClientRect(hwnd: number): { x: number; y: number; width: number; height: number } {
    // 中文注释：按引用参数承接返回坐标
    const x1 = new winax.Variant(0, 'byref');
    const y1 = new winax.Variant(0, 'byref');
    const x2 = new winax.Variant(0, 'byref');
    const y2 = new winax.Variant(0, 'byref');
    const ok = this.dm.GetClientRect(hwnd, x1, y1, x2, y2);
    if (!ok) {
      throw new Error(`GetClientRect 失败，hwnd=${hwnd}`);
    }
    const left = Number(x1.value) || 0;
    const top = Number(y1.value) || 0;
    const right = Number(x2.value) || 0;
    const bottom = Number(y2.value) || 0;
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);
    return { x: left, y: top, width, height };
  }

  // 客户区坐标转换为屏幕坐标（点坐标）
  clientToScreen(hwnd: number, x: number, y: number): { x: number; y: number } {
    // 中文注释：将传入的 x/y 包装为按引用参数，调用后读取转换结果
    const xr = new winax.Variant(x, 'byref');
    const yr = new winax.Variant(y, 'byref');
    const ok = this.dm.ClientToScreen(hwnd, xr, yr);
    if (!ok) {
      throw new Error(`ClientToScreen 失败，hwnd=${hwnd}`);
    }
    return { x: Number(xr.value) || 0, y: Number(yr.value) || 0 };
  }

  // 屏幕坐标转换为客户区坐标（点坐标）
  screenToClient(hwnd: number, x: number, y: number): { x: number; y: number } {
    const xr = new winax.Variant(x, 'byref');
    const yr = new winax.Variant(y, 'byref');
    const ok = this.dm.ScreenToClient(hwnd, xr, yr);
    if (!ok) {
      throw new Error(`ScreenToClient 失败，hwnd=${hwnd}`);
    }
    return { x: Number(xr.value) || 0, y: Number(yr.value) || 0 };
  }
  // 中文注释：选择当前字典索引（0=默认字典）；用于 OCR 涂色/文字识别
  useDict(index: number): number {
    const ret = this.dm.UseDict(index);
    if (ret === 1) {
      this.activeDictIndex = index; // 中文注释：记录当前活动字库索引
    }
    return ret;
  }
  // 中文注释：设置字典内容（传入字库字符串）；字典格式参考大漠文档
  setDict(index: number, content: string): number {
    const ret = this.dm.SetDict(index, content);
    if (ret === 1) {
      this.dictSource = { type: 'inline', length: content?.length || 0 };
    }
    return ret;
  }
  // 中文注释：从文件加载字典内容并设置到指定索引；支持相对/绝对路径
  loadDictFromFile(index: number, filePath: string): number {
    try {
      const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      const raw = fs.readFileSync(absPath, 'utf8');
      const content = this.sanitizeDictContent(raw); // 中文注释：统一处理 BOM 和换行
      const ret = this.dm.SetDict(index, content);
      if (ret === 1) {
        this.dictSource = { type: 'file', path: absPath, length: content.length };
      }
      return ret;
    } catch (e) {
      // 中文注释：读取失败抛出错误，便于上层捕获
      throw new Error(`加载字典文件失败: ${filePath} | ${String((e as any)?.message || e)}`);
    }
  }
  // 中文注释：字典内容预处理（移除 BOM、统一换行为 CRLF），避免解析失败
  private sanitizeDictContent(content: string): string {
    let s = content || '';
    // 中文注释：移除 UTF-8/UTF-16 BOM
    if (s.charCodeAt(0) === 0xfeff) {
      s = s.slice(1);
    }
    // 中文注释：统一换行，某些版本要求 CRLF，否则可能触发“打开字库失败”
    s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
    return s;
  }
  // 中文注释：异步读取字典文件并调用 SetDict（COM 调用本身仍同步）
  async loadDictFromFileAsync(index: number, filePath: string): Promise<number> {
    try {
      const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
      const ret = this.dm.SetDict(index, absPath);
      if (ret === 1) {
        this.dictSource = { type: 'file', path: absPath, length: ret.length };
      }
      return ret;
    } catch (e) {
      throw new Error(`异步加载字典文件失败: ${filePath} | ${String((e as any)?.message || e)}`);
    }
  }
  // 中文注释：查询当前 OCR 使用的字库信息（活动索引 + 最近加载来源）
  getCurrentDictInfo(): { activeIndex: number | null; source: { type: 'inline' | 'file' | 'unknown'; path?: string; length?: number } | null } {
    return {
      activeIndex: this.activeDictIndex,
      source: this.dictSource || { type: 'unknown' },
    };
  }

  findStrFastEx(hwnd: number, x: number, y: number, w: number, h: number, str: string, mode: number): number {
    return this.dm.FindStrFastEx(hwnd, x, y, w, h, str, mode);
  }

  ocr(x: number, y: number, w: number, h: number, color: string, sim: number): string {
    return this.dm.Ocr(x, y, w, h, color, sim);
  }

  findStrFastE(x: number, y: number, w: number, h: number, str: string, color: string, sim: number): string {
    return this.dm.FindStrFastE(x, y, w, h, str, color, sim);
  }

  moveTo(x: number, y: number): number {
    return this.dm.MoveTo(x, y);
  }

  capturePng(x: number, y: number, w: number, h: number, filePath: string): number {
    return this.dm.CapturePng(x, y, w, h, filePath);
  }

  enumWindowByProcessId(pid: number, title: string, class_name: string, filter: number): number {
    return this.dm.EnumWindowByProcessId(pid, title, class_name, filter);
  }
  leftClick(): number {
    return this.dm.LeftClick();
  }
}

// 中文注释：返回码中文映射（与类内私有描述保持一致，便于外部展示）
export const describeReg = (code?: number): string => {
  switch (code) {
    case 1:
      return '成功';
    case 0:
      return '失败(未知错误)';
    case -1:
      return '无法连接网络/可能防火墙拦截或IP暂封';
    case -2:
      return '进程未以管理员运行(UAC 导致)';
    case 2:
      return '余额不足';
    case 3:
      return '绑定了本机器，但账户余额不足50元';
    case 4:
      return '注册码错误';
    case 5:
      return '机器或IP在黑名单/不在白名单';
    case 6:
      return '非法使用插件/系统语言非中文简体可能触发';
    case 7:
      return '帐号因非法使用被封禁';
    case 8:
      return '附加码不在白名单中';
    case 77:
      return '机器码或IP因非法使用被封禁(全局封禁)';
    case 777:
      return '同一机器码注册次数超限，暂时封禁';
    case -8:
      return '版本附加信息长度超过20';
    case -9:
      return '版本附加信息包含非法字符';
    default:
      return '未知返回码';
  }
};

import cp from 'child_process';
import { Damo, describeReg } from './Damo/damo';

// 中文注释：导出单例获取函数，集中管理 Damo 实例（懒加载）
let __damoSingleton: Damo | null = null;
// 中文注释：是否已执行一次收费注册（手动控制，避免重复）

let __damoRegisteredOnce: boolean = false;
// 中文注释：最近一次注册返回码（便于展示或复用）
let __damoLastRegCode: number | undefined = undefined;

export const ensureDamo = (): Damo => {
  // 中文注释：仅在首次调用时创建实例，后续复用，避免重复 COM 初始化
  if (!__damoSingleton) {
    // __damoSingleton = new Damo();
    __damoSingleton = new Damo();
  }
  return __damoSingleton;
};

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

// 中文注释：大漠注册结果的接口类型（便于渲染或日志输出）
export interface DamoRegResult {
  // 中文注释：是否本次调用实际执行了注册（true 表示首次注册；false 表示之前已注册过）
  ran: boolean;
  // 中文注释：大漠注册返回码（例如 1=成功，-2=非管理员等）
  code?: number;
  // 中文注释：返回码的中文说明（便于快速定位问题）
  desc?: string;
  // 中文注释：当前进程是否管理员（注册前后都可用于判断提示）
  admin?: boolean;
  // 中文注释：额外提示信息（例如“已注册无需重复”等）
  message?: string;
}

// 中文注释：手动执行一次收费注册（Reg），后续重复调用直接返回上次结果
export const registerDamoOnce = (): DamoRegResult => {
  const admin = isElevated();
  if (__damoRegisteredOnce) {
    return {
      ran: false,
      code: __damoLastRegCode,
      desc: describeReg(__damoLastRegCode),
      admin,
      message: '已注册，无需重复执行',
    };
  }
  const dm = ensureDamo();
  const code = dm.reg();
  __damoLastRegCode = code;
  __damoRegisteredOnce = true;
  return {
    ran: true,
    code,
    desc: describeReg(code),
    admin,
    message: '已尝试执行收费注册',
  };
  // return {
  //   ran: true,
  //   admin,
  //   message: '天使插件无需注册',
  // };
};

export { Damo as AutoT };
// export { TSPlug as AutoT };

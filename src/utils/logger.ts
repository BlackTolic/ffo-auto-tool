import pino from 'pino';

// 辅助函数：安全地访问 process.env，避免在浏览器环境中报错
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// 判断是否在浏览器环境
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
// 判断是否为开发环境（默认为开发环境）
const isDev = getEnv('NODE_ENV') === 'development' || !getEnv('NODE_ENV');

let pinoLogger: pino.Logger;

if (isBrowser) {
  // 浏览器环境配置
  pinoLogger = pino({
    browser: {
      asObject: true,
    },
    level: 'info',
  });
} else {
  // Node.js 环境配置
  const transport = isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined;

  pinoLogger = pino({
    level: getEnv('LOG_LEVEL') || 'info',
    transport,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

// 辅助函数：格式化日志参数
const formatLog = (args: any[]): [object | undefined, string] => {
  if (args.length === 0) return [undefined, ''];

  // 情况 1: 第一个参数是字符串 (通常是日志消息)
  if (typeof args[0] === 'string') {
    const msg = args[0];
    const rest = args.slice(1);
    if (rest.length === 0) return [undefined, msg];
    // 如果有更多参数，将它们放入 'context' 对象中
    // pino-pretty 将会显示这个对象
    // return [{ context: rest.length === 1 ? rest[0] : rest }, msg];
    return [rest.length === 1 ? rest[0] : rest, msg];
  }

  // 情况 2: 第一个参数是 Error 对象 (特殊处理错误堆栈)
  if (args[0] instanceof Error) {
    const err = args[0];
    const rest = args.slice(1);
    const msg = rest.length > 0 && typeof rest[0] === 'string' ? rest[0] : err.message;
    const context = rest.length > 0 && typeof rest[0] === 'string' ? rest.slice(1) : rest;

    if (context.length > 0) {
      return [{ err, context }, msg];
    }
    return [{ err }, msg];
  }

  // 情况 3: 第一个参数是普通对象
  if (typeof args[0] === 'object' && args[0] !== null) {
    // 检查第二个参数是否为字符串 (常见模式: console.log(obj, "message"))
    if (args.length > 1 && typeof args[1] === 'string') {
      const obj = args[0];
      const msg = args[1];
      const rest = args.slice(2);
      if (rest.length > 0) {
        return [{ ...obj, context: rest }, msg];
      }
      return [obj, msg];
    }
    // 仅有对象
    if (args.length === 1) return [args[0], ''];
    return [{ args }, 'Log Object Sequence'];
  }

  // 情况 4: 原始类型值 (数字, 布尔值等)
  return [{ value: args[0], rest: args.slice(1) }, 'Log Value'];
};

export const logger = {
  info: (...args: any[]) => {
    const [obj, msg] = formatLog(args);
    if (obj) pinoLogger.info(obj, msg);
    else pinoLogger.info(msg);
  },
  warn: (...args: any[]) => {
    const [obj, msg] = formatLog(args);
    if (obj) pinoLogger.warn(obj, msg);
    else pinoLogger.warn(msg);
  },
  error: (...args: any[]) => {
    const [obj, msg] = formatLog(args);
    if (obj) pinoLogger.error(obj, msg);
    else pinoLogger.error(msg);
  },
  debug: (...args: any[]) => {
    const [obj, msg] = formatLog(args);
    if (obj) pinoLogger.debug(obj, msg);
    else pinoLogger.debug(msg);
  },
  // 如果需要，暴露原始 pino 实例
  raw: pinoLogger,
};

export default logger;

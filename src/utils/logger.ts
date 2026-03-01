import pino from 'pino';

// Helper to safely access process.env
const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const isDev = getEnv('NODE_ENV') === 'development' || !getEnv('NODE_ENV');

let pinoLogger: pino.Logger;

if (isBrowser) {
  // Browser configuration
  pinoLogger = pino({
    browser: {
      asObject: true,
    },
    level: 'info',
  });
} else {
  // Node.js configuration
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

const formatLog = (args: any[]): [object | undefined, string] => {
  if (args.length === 0) return [undefined, ''];

  // Case 1: First argument is a string (Message)
  if (typeof args[0] === 'string') {
    const msg = args[0];
    const rest = args.slice(1);
    if (rest.length === 0) return [undefined, msg];
    // If there are more arguments, put them in a 'context' object
    // pino-pretty will display this object
    return [{ context: rest.length === 1 ? rest[0] : rest }, msg];
  }

  // Case 2: First argument is an Error (Special handling for Errors)
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

  // Case 3: First argument is an object
  if (typeof args[0] === 'object' && args[0] !== null) {
    // Check if second argument is a string (common pattern: console.log(obj, "message"))
    if (args.length > 1 && typeof args[1] === 'string') {
      const obj = args[0];
      const msg = args[1];
      const rest = args.slice(2);
      if (rest.length > 0) {
        return [{ ...obj, context: rest }, msg];
      }
      return [obj, msg];
    }
    // Just object(s)
    if (args.length === 1) return [args[0], ''];
    return [{ args }, 'Log Object Sequence'];
  }

  // Case 4: Primitive values (number, boolean, etc.)
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
  // Expose the raw pino instance if needed
  raw: pinoLogger,
};

export default logger;

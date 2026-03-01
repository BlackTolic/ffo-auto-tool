import logger from '../../../utils/logger';

// 中文注释：从文本中解析坐标，兼容常见格式，例如：
export const parseRolePositionFromText = (text: string): Pos | null => {
  const s = String(text || '').trim();
  if (!s) return null;
  // 中文注释：找出文本中的两个整数或浮点数（允许逗号/空格/分隔符）
  const numbers = s.match(/[-+]?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  const x = Math.round(Number(numbers[0]) || 0);
  const y = Math.round(Number(numbers[1]) || 0);
  return x < 0 || y < 0 ? null : { x, y };
};

export const parsePositionFromTextList = (text: string[]): Pos[] => {
  if (!text || text.length === 0) return [];
  return text.map(x => parseTextPos(x)).filter(y => y !== null);
};

export const parseTextPos = (text: string) => {
  const s = String(text || '').trim();
  if (!s) return null;
  // 中文注释：找出文本中的两个整数或浮点数（允许逗号/空格/分隔符）
  const numbers = s.match(/[-+]?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  const x = Math.round(Number(numbers[1]) || 0);
  const y = Math.round(Number(numbers[2]) || 0);
  if (x < 0 || y < 0 || x === 0 || y === 0) return null;
  return { x, y, text: s };
};

interface Pos {
  x: number;
  y: number;
}

// 从(x1,y1)移动到以(x2,y2)为中心,r为半径的范围内
export const isArriveAimNear = (initPos: Pos | null, aimPos: Pos, r: number = 2) => {
  if (!initPos) return false;
  const { x: x1, y: y1 } = initPos;
  const { x: x2, y: y2 } = aimPos;
  return (x1 - x2) ** 2 + (y1 - y2) ** 2 <= r ** 2;
};

export const selectRightAnwser = (options: string | null, question: string | null) => {
  if (!options || !question) return null;
  logger.info(options, 'options, ');
  const map = { '0': 'I', '1': 'II', '2': 'III' };
  const arr = options.split(',').map((x, idx) => ({ opt: x, sim: 0, target: map[idx.toString() as keyof typeof map] }));
  logger.info(arr, 'arr');
  arr.forEach((x, idx) => {
    const [aim1, aim2, aim3] = question.split('');
    const [opt1, opt2, opt3] = x.opt.split('');
    if (idx === 0) {
      x.sim = (opt1 === aim1 ? 1 : 0) + (opt2 === aim2 ? 1 : 0) + (opt3 === aim3 ? 1 : 0);
    }
    if (idx === 1) {
      x.sim = (opt1 === aim1 ? 1 : 0) + (opt2 === aim2 ? 1 : 0) + (opt3 === aim3 ? 1 : 0);
    }
    if (idx === 2) {
      x.sim = (opt1 === aim1 ? 1 : 0) + (opt2 === aim2 ? 1 : 0) + (opt3 === aim3 ? 1 : 0);
    }
  });
  const maxSim = Math.max(...arr.map(z => z.sim));
  const result = arr.filter(z => z.sim === maxSim);
  return result?.[0]?.target;
};

/**
 * 货币单位换算常量（大漠货币）
 */
export const SILVER_PER_GOLD = 1000; // 1 金 = 1000 银
export const COPPER_PER_SILVER = 1000; // 1 银 = 1000 铜
export const COPPER_PER_GOLD = SILVER_PER_GOLD * COPPER_PER_SILVER; // 1 金 = 1,000,000 铜

/**
 * 表示从字符串中解析出的金币、银币、铜币数
 */
export interface CurrencyParts {
  /** 金币数量（整数，若未给出则为 0） */
  gold: number;
  /** 银币数量（整数，若未给出则为 0） */
  silver: number;
  /** 铜币数量（整数，若未给出则为 0） */
  copper: number;
}

/**
 * 金额格式化选项
 */
export interface CurrencyFormatOptions {
  /** 小数位数（默认 6 位，对应到“铜”的精度） */
  decimals?: number;
  /** 是否去除小数末尾多余的 0（默认 true） */
  trimTrailingZeros?: boolean;
}

/**
 * 从形如 "@金X@银Y@铜Z" 的字符串中解析出金币/银币/铜币的数值。
 * - 未出现的单位按 0 处理；
 * - 非法或缺失的数值按 0 处理；
 * - 仅提取第一次出现的数值。
 *
 * @param input 原始字符串，如 "@金0@银82@铜269"
 * @returns 解析后的金币/银币/铜币对象
 */
export function parseCurrencyString(input: string): CurrencyParts {
  // 使用正则提取对应单位后的整数部分
  const goldMatch = input.match(/@金(\d+)/);
  const silverMatch = input.match(/@银(\d+)/);
  const copperMatch = input.match(/@铜(\d+)/);

  const gold = goldMatch ? parseInt(goldMatch[1], 10) : 0;
  const silver = silverMatch ? parseInt(silverMatch[1], 10) : 0;
  const copper = copperMatch ? parseInt(copperMatch[1], 10) : 0;

  return {
    gold: Number.isFinite(gold) ? gold : 0,
    silver: Number.isFinite(silver) ? silver : 0,
    copper: Number.isFinite(copper) ? copper : 0,
  };
}

/**
 * 将 "@金X@银Y@铜Z" 转换为以“金币”为单位的字符串表示（例如 "0.082269金币"）。
 * 换算关系：1 金 = 1000 银 = 1,000,000 铜。
 *
 * @param input 原始字符串，如 "@金0@银82@铜269"
 * @param options 格式化选项（可选）
 * @returns 形如 "0.082269金币" 的字符串
 *
 * 示例：
 *   parseFFOCurrencyToGoldLabel("@金0@银82@铜269") => "0.082269金币"
 *   parseFFOCurrencyToGoldLabel("@金1@银0@铜0")   => "1金币"
 */
export function parseFFOCurrencyToGoldLabel(input: string, options?: CurrencyFormatOptions): string {
  const { gold, silver, copper } = parseCurrencyString(input);

  // 统一换算为金币的小数表示
  const goldValue = gold + silver / SILVER_PER_GOLD + copper / COPPER_PER_GOLD;

  const decimals = options?.decimals ?? 6; // 默认保留到“铜”的精度
  const trimTrailingZeros = options?.trimTrailingZeros ?? true;

  let formatted = goldValue.toFixed(decimals);
  if (trimTrailingZeros) {
    // 去除小数点后多余的 0（包括去掉完全为 0 的小数点）
    formatted = formatted.replace(/\.?0+$/, '');
  }

  return formatted;
}

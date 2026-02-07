import { BigNumber } from 'bignumber.js';

// 使用BigNumber优化加法，避免浮点精度问题
export const add = (a: number, b: number) => new BigNumber(a).plus(b).toNumber();

// 使用BigNumber优化减法，避免浮点精度问题
export const sub = (a: number, b: number) => new BigNumber(a).minus(b).toNumber();

// 使用BigNumber优化乘法，避免浮点精度问题
export const mul = (a: number, b: number) => new BigNumber(a).times(b).toNumber();

// 使用BigNumber优化除法，避免浮点精度问题
export const div = (a: number, b: number) => new BigNumber(a).div(b).toNumber();

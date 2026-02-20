/**
 * 增强版防抖函数（支持立即执行）
 * @param {Function} fn - 需要防抖的目标函数
 * @param {number} delay - 延迟时间（毫秒）
 * @param {boolean} immediate - 是否立即执行（默认false）
 * @returns {Function} - 防抖后的函数
 */

export function debounce(fn: (...args: any[]) => void, delay: number, immediate = false) {
  let timer: NodeJS.Timeout | null = null;

  return function (...args: any[]) {
    // 保存当前this指向（事件回调中指向触发元素）
    const context = this;

    // 清除之前的计时器
    if (timer) clearTimeout(timer);

    // 立即执行逻辑
    if (immediate) {
      // 判断是否是第一次触发（timer为null表示第一次）
      const callNow = !timer;
      // 设置计时器，延迟后重置timer（保证下次触发可以再次立即执行）
      timer = setTimeout(() => {
        timer = null;
      }, delay);
      // 第一次触发时立即执行函数
      if (callNow) fn.apply(context, args);
    } else {
      // 非立即执行：重新设置计时器延迟执行
      timer = setTimeout(() => {
        fn.apply(context, args);
        timer = null;
      }, delay);
    }
  };
}

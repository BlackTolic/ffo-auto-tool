// 获取当前角色的坐标位置（OCR 识别坐标文本并解析为数值）
// 中文注释：该模块提供一次性获取与每秒轮询两种调用方式，基于已绑定窗口对应的大漠实例。

import type { DamoClientRecord } from '../../events';

// 中文注释：默认用于识别坐标的屏幕区域与参数（根据你的示例）
const DEFAULT_REGION = { x1: 1316, y1: 111, x2: 1389, y2: 138 };
const DEFAULT_COLOR = 'e8f0e8-111111';
const DEFAULT_SIM = 1.0;

// 中文注释：轮询定时器映射，按窗口句柄管理，便于停止
const pollTimers = new Map<number, ReturnType<typeof setInterval>>();

export interface RolePosition {
  x: number; // 中文注释：角色 X 坐标
  y: number; // 中文注释：角色 Y 坐标
  text: string; // 中文注释：OCR 原始文本（便于调试）
}

// 中文注释：从文本中解析坐标，兼容常见格式，例如：
// - "123,456" / "x:123 y:456" / "X=123 Y=456" / "(123, 456)" / "123 456"
function parseRolePositionFromText(text: string): RolePosition | null {
  const s = String(text || '').trim();
  if (!s) return null;
  // 中文注释：找出文本中的两个整数或浮点数（允许逗号/空格/分隔符）
  const numbers = s.match(/[-+]?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  const x = Math.round(Number(numbers[0]) || 0);
  const y = Math.round(Number(numbers[1]) || 0);
  return { x, y, text: s };
}

// 获取当前角色的坐标位置（一次性，需提供已绑定窗口记录）
export function getCurrentRolePosition(
  rec: DamoClientRecord,
  region: { x1: number; y1: number; x2: number; y2: number } = DEFAULT_REGION,
  color: string = DEFAULT_COLOR,
  sim: number = DEFAULT_SIM
): RolePosition | null {
  // 中文注释：通过绑定记录获取对应的大漠 dm 实例
  const dm = rec?.ffoClient?.dm;
  if (!dm) return null;
  try {
    const raw: string = String(dm.Ocr(region.x1, region.y1, region.x2, region.y2, color, sim) || '').trim();
    return parseRolePositionFromText(raw);
  } catch (err) {
    console.warn('[角色坐标] OCR 获取失败:', String((err as any)?.message || err));
    return null;
  }
}

// 每秒轮询获取角色坐标（返回定时器 ID，便于停止），重复调用会覆盖旧定时器
export function startRolePositionPolling(
  rec: DamoClientRecord,
  onUpdate: (pos: RolePosition | null) => void,
  intervalMs: number = 1000,
  region: { x1: number; y1: number; x2: number; y2: number } = DEFAULT_REGION,
  color: string = DEFAULT_COLOR,
  sim: number = DEFAULT_SIM
): ReturnType<typeof setInterval> {
  const hwnd = rec?.hwnd;
  const dm = rec?.ffoClient?.dm;
  console.log('[角色坐标] 开始轮询:', rec);
  if (!hwnd || !dm) {
    throw new Error('未提供有效的绑定记录或 dm 实例');
  }
  // 中文注释：若已有轮询，则先停止，避免多个定时器并发
  // stopRolePositionPolling(hwnd);
  const timer = setInterval(
    () => {
      try {
        const raw: string = String(dm.Ocr(region.x1, region.y1, region.x2, region.y2, color, sim) || '').trim();
        const pos = parseRolePositionFromText(raw);
        onUpdate(pos);
      } catch (err) {
        console.warn('[角色坐标] 轮询失败:', String((err as any)?.message || err));
        onUpdate(null);
      }
    },
    Math.max(200, intervalMs)
  ); // 中文注释：最小间隔 200ms，避免过于频繁
  pollTimers.set(hwnd, timer);
  return timer;
}

// 停止角色坐标的轮询（按窗口句柄）
export function stopRolePositionPolling(hwnd: number): void {
  const t = pollTimers.get(hwnd);
  if (t) {
    try {
      clearInterval(t);
    } catch {}
    pollTimers.delete(hwnd);
  }
}

export function checkRolePosition() {
  // 中文注释：检查角色位置是否正确
}

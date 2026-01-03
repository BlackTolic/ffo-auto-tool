// 获取当前角色的坐标位置（OCR 识别坐标文本并解析为数值）
// 中文注释：该模块提供一次性获取与每秒轮询两种调用方式，基于已绑定窗口对应的大漠实例。
import { DEFAULT_ADDRESS_NAME, DEFAULT_ROLE_POSITION } from '../../constant/OCR-pos';
import type { DamoClientRecord } from '../../events';
import { parseRolePositionFromText } from '../common';
const DEFAULT_COLOR = 'e8f0e8-111111';
const DEFAULT_SIM = 1.0;

// 中文注释：轮询定时器映射，按窗口句柄管理，便于停止
const pollTimers = new Map<number, ReturnType<typeof setInterval>>();

export interface RolePosition {
  x: number; // 中文注释：角色 X 坐标
  y: number; // 中文注释：角色 Y 坐标
  text: string; // 中文注释：OCR 原始文本（便于调试）
}

// 获取当前角色的坐标位置（一次性，需提供已绑定窗口记录）
export function getCurrentRolePosition(
  rec: DamoClientRecord,
  region: { x1: number; y1: number; x2: number; y2: number } = DEFAULT_ROLE_POSITION[global.windowSize as keyof typeof DEFAULT_ROLE_POSITION],
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
    console.warn('[OCR坐标识别] 获取失败:', String((err as any)?.message || err));
    return null;
  }
}

export interface StartRolePositionProps {
  rec: DamoClientRecord; // 中文注释：已绑定窗口记录
  onUpdate: (pos: RolePosition | null) => void; // 中文注释：坐标更新回调
  intervalMs?: number; // 中文注释：轮询间隔（毫秒），默认 1000ms
  region?: { x1: number; y1: number; x2: number; y2: number }; // 中文注释：OCR 识别区域，默认 DEFAULT_ROLE_POSITION
  color?: string; // 中文注释：OCR 识别颜色，默认 DEFAULT_COLOR
  sim?: number; // 中文注释：OCR 识别相似度，默认 DEFAULT_SIM
}

// 每秒轮询获取角色坐标（返回定时器 ID，便于停止），重复调用会覆盖旧定时器
export function startRolePositionPolling(params: StartRolePositionProps): ReturnType<typeof setInterval> {
  const { rec, onUpdate, intervalMs = 1000, region = DEFAULT_ROLE_POSITION[global.windowSize], color = DEFAULT_COLOR, sim = DEFAULT_SIM } = params;
  const hwnd = rec?.hwnd;
  const dm = rec?.ffoClient?.dm;
  if (!hwnd || !dm) {
    throw new Error('未提供有效的绑定记录或 dm 实例');
  }
  const map = DEFAULT_ADDRESS_NAME[global.windowSize];
  // 中文注释：若已有轮询，则先停止，避免多个定时器并发
  stopRolePositionPolling(hwnd);
  const timer = setInterval(
    () => {
      try {
        const raw: string = String(dm.Ocr(region.x1, region.y1, region.x2, region.y2, color, sim) || '').trim();
        console.log('[OCR坐标]  原始文本:', raw);
        const pos = parseRolePositionFromText(raw);
        const addressName = dm.Ocr(map.x1, map.y1, map.x2, map.y2, DEFAULT_COLOR, DEFAULT_SIM);
        console.log('[OCR坐标]  地图名称:', addressName);
        onUpdate(pos);
      } catch (err) {
        console.warn('[OCR坐标] 轮询失败:', String((err as any)?.message || err));
        onUpdate(null);
      }
    },
    Math.max(200, intervalMs)
  ); // 中文注释：最小间隔 200ms，避免过于频繁
  pollTimers.set(hwnd, timer);
  return timer;
}

// 中文注释：轮询状态查询参数接口（用于判断某个窗口是否处于轮询中）
export interface RolePollingQuery {
  hwnd: number; // 中文注释：窗口句柄（与绑定记录中的 hwnd 一致）
}

// 中文注释：判断指定窗口是否正在进行角色坐标轮询
export function isRolePositionPolling(query: number | RolePollingQuery): boolean {
  const hwnd = typeof query === 'number' ? query : query.hwnd;
  return pollTimers.has(hwnd);
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

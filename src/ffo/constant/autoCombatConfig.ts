/*
 * 中文注释：自动打怪默认配置（按需修改即可生效）
 * - 可设置 OCR 搜索范围、颜色、相似度、移动半径与点击键位、摆动角度、策略等
 */

// 中文注释：自动打怪默认配置与合并函数
import type { AutoCombatOptions } from '../utils/auto-combat';

// 中文注释：根据屏幕尺寸生成默认配置
export function getDefaultAutoCombatOptions(screen_w: number, screen_h: number): Required<AutoCombatOptions> {
  const center = { x: Math.floor(screen_w / 2), y: Math.floor(screen_h / 2) };
  return {
    searchRegion: { x1: 0, y1: 0, x2: screen_w - 1, y2: screen_h - 1 },
    color: '000000-111111',
    sim: 0.9,
    refPoint: center,
    scanIntervalMs: 150,
    kiteIntervalMs: 500,
    moveRadiusPx: 80,
    moveClickButton: 'right',
    strafeAngleDeg: 30,
    kiteStrategy: 'aroundRef',
  };
}

// 中文注释：合并用户覆盖项到默认配置（浅合并）
export function mergeCombatOptions(defaults: Required<AutoCombatOptions>, overrides?: AutoCombatOptions): Required<AutoCombatOptions> {
  return { ...defaults, ...(overrides || {}) } as Required<AutoCombatOptions>;
}

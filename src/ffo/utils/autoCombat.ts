/*
 * 中文注释：自动打怪逻辑（基于大漠插件）
 * - 技能键：F1/F2/F3/F4，对应冷却：1s/2s/3s/4s
 * - 选怪逻辑：OCR 识别怪物名字，鼠标点击选中；当目标消失时，选择离自己最近的怪物
 * - 拉扯逻辑：仅用鼠标点击移动，围绕参考点或目标摆动（可配置）
 *
 * 说明：本模块基于已绑定的窗口对应的大漠实例（DamoClientRecord.ffoClient.dm），
 *       并提供 start/stop 两个入口用于控制自动战斗。
 */

import type { DamoClientRecord } from '../events';
import { getDefaultAutoCombatOptions } from '../constant/autoCombatConfig';

// 中文注释：自动战斗的可选配置
export interface AutoCombatOptions {
  // 中文注释：OCR 搜索范围（客户区坐标），默认全屏
  searchRegion?: { x1: number; y1: number; x2: number; y2: number };
  // 中文注释：文字颜色范围，示例 '000000-111111'
  color?: string;
  // 中文注释：OCR 相似度（0.1~1.0），默认 0.9
  sim?: number;
  // 中文注释：参考点（用于计算最近怪物），默认屏幕中心
  refPoint?: { x: number; y: number };
  // 中文注释：扫描周期（毫秒），默认 150ms
  scanIntervalMs?: number;
  // 中文注释：拉扯周期（毫秒），默认 500ms
  kiteIntervalMs?: number;
  // 中文注释：鼠标移动半径（像素），用于点击到参考点附近移动，默认 80px
  moveRadiusPx?: number;
  // 中文注释：用于移动的点击按键（'left' 或 'right'），默认 'right'
  moveClickButton?: 'left' | 'right';
  // 中文注释：左右摆动的旋转角度（度），默认 30 度
  strafeAngleDeg?: number;
  // 中文注释：拉扯策略：围绕参考点('aroundRef') 或围绕目标('aroundTarget')
  kiteStrategy?: 'aroundRef' | 'aroundTarget';
}

// 中文注释：技能配置与冷却（毫秒）
const defaultSkillCooldowns: Record<string, number> = {
  F1: 1000,
  F2: 2000,
  F3: 3000,
  F4: 4000,
};

// 中文注释：每个窗口的自动战斗状态
interface CombatState {
  running: boolean;
  intervalId: NodeJS.Timeout | null; // 中文注释：主循环定时器
  lastSkillUse: Record<string, number>; // 中文注释：技能最近释放时间戳
  lastTarget: { text: string; x: number; y: number } | null; // 中文注释：当前目标（名字与位置）
  kiteToggle: boolean; // 中文注释：左右摆动切换标志
}

const states = new Map<number, CombatState>(); // 中文注释：hwnd -> 状态

// 中文注释：辅助函数：判断是否到达技能冷却
function isCooldownReady(lastUse: number | undefined, cdMs: number): boolean {
  const now = Date.now();
  if (!lastUse) return true;
  return now - lastUse >= cdMs;
}

// 中文注释：辅助函数：计算两点距离
function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

// 中文注释：根据 OCR 文本，查找该文本在屏幕上的所有坐标（返回最近的一个）
function findNearestTextPos(
  dm: any,
  token: string,
  region: { x1: number; y1: number; x2: number; y2: number },
  color: string,
  sim: number,
  ref: { x: number; y: number }
): { x: number; y: number } | null {
  try {
    // 中文注释：优先使用 FindStrEx 获取所有匹配坐标
    const ret: string = String(dm.FindStrEx(region.x1, region.y1, region.x2, region.y2, token, color, sim) || '');
    const pairs = ret
      .split('|')
      .map((p: string) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const [xs, ys] = p.split(',');
        const x = parseInt(xs);
        const y = parseInt(ys);
        return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
      })
      .filter(Boolean) as Array<{ x: number; y: number }>;
    if (pairs.length > 0) {
      // 中文注释：选择离参考点最近的坐标
      let best = pairs[0];
      let bestDist = dist(best.x, best.y, ref.x, ref.y);
      for (let i = 1; i < pairs.length; i++) {
        const d = dist(pairs[i].x, pairs[i].y, ref.x, ref.y);
        if (d < bestDist) {
          best = pairs[i];
          bestDist = d;
        }
      }
      return best;
    }

    // 中文注释：回退使用 FindStr 获取单个坐标
    const xr = new (require('winax').Variant)(0, 'byref');
    const yr = new (require('winax').Variant)(0, 'byref');
    const ok = dm.FindStr(region.x1, region.y1, region.x2, region.y2, token, color, sim, xr, yr);
    if (ok === 1) {
      return { x: Number(xr.value) || 0, y: Number(yr.value) || 0 };
    }
  } catch (err) {
    console.warn('[自动打怪] 查找文本坐标失败:', String((err as any)?.message || err));
  }
  return null;
}

// 中文注释：从 OCR 文本中提取候选怪物名称（中文名优先）
function pickMonsterToken(text: string): string | null {
  if (!text) return null;
  // 中文注释：按非字母数字中文分隔，筛选长度>=2的中文片段
  const tokens = text
    .split(/[^\u4e00-\u9fa5A-Za-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  // 中文注释：优先中文片段
  const zh = tokens.find((t) => /[\u4e00-\u9fa5]{2,}/.test(t));
  if (zh) return zh;
  return tokens[0] || null;
}

// 中文注释：扫描并选择目标（返回目标文本与坐标）
function acquireTarget(dm: any, opts: Required<AutoCombatOptions>): { text: string; x: number; y: number } | null {
  try {
    const text: string = String(dm.Ocr(opts.searchRegion.x1, opts.searchRegion.y1, opts.searchRegion.x2, opts.searchRegion.y2, opts.color, opts.sim) || '').trim();
    const token = pickMonsterToken(text);
    if (!token) return null;
    const pos = findNearestTextPos(dm, token, opts.searchRegion, opts.color, opts.sim, opts.refPoint);
    if (!pos) return null;
    return { text: token, x: pos.x, y: pos.y };
  } catch (err) {
    console.warn('[自动打怪] OCR 扫描失败:', String((err as any)?.message || err));
    return null;
  }
}

// 中文注释：点击坐标以选中目标（使用客户区坐标）
function clickTarget(dm: any, x: number, y: number) {
  try {
    dm.MoveTo(x, y);
    dm.LeftClick();
  } catch (err) {
    console.warn('[自动打怪] 点击选中失败:', String((err as any)?.message || err));
  }
}
// 中文注释：点击到指定坐标以进行移动（根据配置选择左右键）
function clickToMove(dm: any, x: number, y: number, button: 'left' | 'right') {
  try {
    dm.MoveTo(x, y);
    if (button === 'left') dm.LeftClick();
    else dm.RightClick();
  } catch (err) {
    console.warn('[自动打怪] 鼠标点击移动失败:', String((err as any)?.message || err));
  }
}
// 中文注释：基于参考点与目标，计算拉扯移动点（鼠标点击移动）
function computeKitePoint(
  ref: { x: number; y: number },
  target: { x: number; y: number } | null,
  radius: number,
  toggle: boolean,
  angleDeg: number,
  strategy: 'aroundRef' | 'aroundTarget'
): { x: number; y: number } {
  // 中文注释：计算基向量（不同策略下不同）
  let vx = 1, vy = 0, baseX = ref.x, baseY = ref.y;
  if (strategy === 'aroundTarget' && target) {
    // 中文注释：围绕目标：以目标为基点，方向取“参考点指向目标”或其正交方向
    vx = target.x - ref.x;
    vy = target.y - ref.y;
    baseX = target.x;
    baseY = target.y;
  } else {
    // 中文注释：围绕参考点：以“目标指向参考点”的方向为基向量
    vx = target ? ref.x - target.x : 1;
    vy = target ? ref.y - target.y : 0;
    baseX = ref.x;
    baseY = ref.y;
  }
  const len = Math.max(Math.sqrt(vx * vx + vy * vy), 1e-6);
  let ux = vx / len;
  let uy = vy / len;
  const rad = (angleDeg * Math.PI) / 180 * (toggle ? 1 : -1);
  const rx = ux * Math.cos(rad) - uy * Math.sin(rad);
  const ry = ux * Math.sin(rad) + uy * Math.cos(rad);
  const x = Math.round(baseX + rx * radius);
  const y = Math.round(baseY + ry * radius);
  return { x, y };
}

// 中文注释：执行一次技能释放（若冷却已就绪）
function tryCastSkills(dm: any, state: CombatState) {
  const now = Date.now();
  for (const key of Object.keys(defaultSkillCooldowns)) {
    const cd = defaultSkillCooldowns[key];
    const last = state.lastSkillUse[key];
    if (isCooldownReady(last, cd)) {
      try {
        dm.KeyPress(key);
        state.lastSkillUse[key] = now;
      } catch (err) {
        console.warn(`[自动打怪] 释放技能 ${key} 失败:`, String((err as any)?.message || err));
      }
    }
  }
}

// 中文注释：执行拉扯（S 后退 + A/D 左右摆动）
function doKite(dm: any, state: CombatState, opts: Required<AutoCombatOptions>) {
  try {
    const movePt = computeKitePoint(
      opts.refPoint,
      state.lastTarget ? { x: state.lastTarget.x, y: state.lastTarget.y } : null,
      opts.moveRadiusPx,
      state.kiteToggle,
      opts.strafeAngleDeg,
      opts.kiteStrategy
    );
    clickToMove(dm, movePt.x, movePt.y, opts.moveClickButton);
    state.kiteToggle = !state.kiteToggle;
  } catch (err) {
    console.warn('[自动打怪] 拉扯操作失败:', String((err as any)?.message || err));
  }
}

// 中文注释：启动自动战斗（根据窗口记录找到 dm 实例）
export function startAutoCombat(rec: DamoClientRecord, options?: AutoCombatOptions) {
  const dm = rec.ffoClient.dm;
  const hwnd = rec.hwnd;
  const screen_w = dm.GetScreenWidth();
  const screen_h = dm.GetScreenHeight();
  // 中文注释：从默认配置生成，再合并自定义覆盖
  const base = getDefaultAutoCombatOptions(screen_w, screen_h);
  const opts: Required<AutoCombatOptions> = { ...base, ...(options || {}) } as Required<AutoCombatOptions>;
  // 中文注释：防重入
  if (states.get(hwnd)?.running) {
    console.warn(`[自动打怪] 窗口 ${hwnd} 已在运行，忽略重复启动。`);
    return;
  }

  const state: CombatState = {
    running: true,
    intervalId: null,
    lastSkillUse: {},
    lastTarget: null,
    kiteToggle: false,
  };
  states.set(hwnd, state);

  // 中文注释：主循环：扫描目标、点击选中、释放技能、拉扯
  let lastKiteTs = 0;
  state.intervalId = setInterval(() => {
    if (!state.running) return;

    // 中文注释：校验当前目标是否仍存在（若不存在则重新选择）
    let targetOk = false;
    if (state.lastTarget) {
      const pos = findNearestTextPos(dm, state.lastTarget.text, opts.searchRegion, opts.color, opts.sim, opts.refPoint);
      if (pos) {
        targetOk = true;
      } else {
        state.lastTarget = null; // 中文注释：目标消失
      }
    }

    if (!targetOk) {
      const t = acquireTarget(dm, opts);
      if (t) {
        clickTarget(dm, t.x, t.y);
        state.lastTarget = t;
      }
    }

    // 中文注释：释放技能（按冷却）
    tryCastSkills(dm, state);

    // 中文注释：周期性拉扯（通过鼠标点击移动）
    const now = Date.now();
    if (now - lastKiteTs >= opts.kiteIntervalMs) {
      doKite(dm, state, opts);
      lastKiteTs = now;
    }
  }, opts.scanIntervalMs);

  console.log(`[自动打怪] 已启动：hwnd=${hwnd}`);
}

// 中文注释：停止自动战斗（清理定时器与状态）
export function stopAutoCombat(hwnd: number) {
  const st = states.get(hwnd);
  if (!st) return;
  st.running = false;
  if (st.intervalId) {
    clearInterval(st.intervalId);
  }
  states.delete(hwnd);
  console.log(`[自动打怪] 已停止：hwnd=${hwnd}`);
}

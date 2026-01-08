// 中文注释：从文本中解析坐标，兼容常见格式，例如：
export const parseRolePositionFromText = (text: string) => {
  const s = String(text || '').trim();
  if (!s) return null;
  // 中文注释：找出文本中的两个整数或浮点数（允许逗号/空格/分隔符）
  const numbers = s.match(/[-+]?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  const x = Math.round(Number(numbers[0]) || 0);
  const y = Math.round(Number(numbers[1]) || 0);
  return { x, y, text: s };
};

export const parseTextPos = (text: string) => {
  if (!text) return null;
  const pos = text.split('|');
  const x = Number(pos[1] || 0);
  const y = Number(pos[2] || 0);
  if (x < 0 || y < 0) return null;
  return { x, y };
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

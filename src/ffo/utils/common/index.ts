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
  console.log(options, 'options, ');
  const map = { '0': 'I', '1': 'II', '2': 'III' };
  const arr = options.split(',').map((x, idx) => ({ opt: x, sim: 0, target: map[idx.toString() as keyof typeof map] }));
  console.log(arr, 'arr');
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

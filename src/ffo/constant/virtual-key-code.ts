const VK_F_NUM = {
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
};

const VK_LETTER = {
  a: 65,
  b: 66,
  c: 67,
  d: 68,
  e: 69,
  f: 70,
  g: 71,
  h: 72,
  i: 73,
  j: 74,
  k: 75,
  l: 76,
  m: 77,
  n: 78,
  o: 79,
  p: 80,
  q: 81,
  r: 82,
  s: 83,
  t: 84,
  u: 85,
  v: 86,
  w: 87,
  x: 88,
  y: 89,
  z: 90,
};

const VK_SPECAIL = {
  ctrl: 17,
  alt: 18,

  shift: 16,

  win: 91,

  space: 32,

  cap: 20,

  tab: 9,

  '~': 192,

  esc: 27,

  enter: 13,

  up: 38,

  down: 40,

  left: 37,

  right: 39,

  option: 93,

  print: 44,

  delete: 46,

  home: 36,

  end: 35,

  pgup: 33,

  pgdn: 34,
};

// 中文注释：Windows 虚拟键码映射（F1-F10），便于统一复用
export const VK_F: Record<string, number> = {
  ...VK_F_NUM,
  ...VK_LETTER,
  ...VK_SPECAIL,
};

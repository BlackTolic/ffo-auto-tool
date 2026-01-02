import { BIND_WINDOW } from './base';

BIND_WINDOW;

// 地图名称(,2,1227,,"e
export const DEFAULT_ADDRESS_NAME = {
  '1200*900': { x1: 1166, y1: 2, x2: 1226, y2: 20 },
  '1600*900': { x1: 1458, y1: 0, x2: 1563, y2: 20 },
  '1280*800': { x1: 1159, y1: 2, x2: 1226, y2: 19 },
};

// 角色坐标 { x1: 1163, y1: 41, x2: 1224, y2: 61 }(,,,
export const DEFAULT_ROLE_POSITION = {
  '1600*900': { x1: 1487, y1: 39, x2: 1551, y2: 59 },
  '1280*800': { x1: 1167, y1: 39, x2: 1218, y2: 56 },
};

// 原点坐标
export const ORIGIN_POSITION = {
  '1600*900': { x: 800, y: 450, r: 300 },
  '1280*800': { x: 640, y: 400, r: 300 },
};

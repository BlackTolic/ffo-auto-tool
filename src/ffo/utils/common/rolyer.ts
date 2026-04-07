import { logger } from '../../../utils/logger';
import { damoBindingManager } from '../../events';
import { Role } from '../../events/rolyer';

// 获取绑定窗口信息、pid
export const getBindWindowInfo = (selectHwnd?: number) => {
  const hwnd = selectHwnd ? selectHwnd : damoBindingManager.selectHwnd;
  if (!hwnd) {
    logger.error('未选择已绑定的窗口', hwnd);
    throw new Error('未选择已绑定的窗口');
  }
  const role = damoBindingManager.getRole(hwnd);
  if (!role) {
    logger.error('未获取到角色', hwnd);
    throw new Error('未获取到角色');
  }
  return {
    hwnd,
    role,
  };
};

// 检查是否卡住（未移动）- 工厂函数，生成独立的状态闭包
export const createStuckChecker = (role: Role) => {
  let lastMoveTime = 0;
  let lastPos = { x: 0, y: 0 };

  return (min: number, map: string = '') => {
    // 地图不匹配直接返回
    if (map && role.map !== map) return false;

    // 每隔 min 分钟检查一次
    if (Date.now() - lastMoveTime > min * 60 * 1000) {
      const curX = role.position?.x ?? 0;
      const curY = role.position?.y ?? 0;
      logger.info(`[检查是否卡住] 每隔${min}分钟获取一次${map}地图坐标, 上一次坐标: (${lastPos.x},${lastPos.y}), 当前坐标: (${curX},${curY})`);
      const isStuck = lastPos.x === curX && lastPos.y === curY && lastPos.x !== 0 && lastPos.y !== 0;
      // 无论是否卡住，都更新时间和坐标，开始下一个周期的计时
      // 这样可以避免返回 true 后，因为时间未更新而导致在下一帧无限触发 true，进而导致 debounce 被无限重置无法执行回调
      lastMoveTime = Date.now();
      lastPos.x = curX;
      lastPos.y = curY;
      if (isStuck) {
        logger.info(`[检查是否卡住] ${map} 地图卡住了，开始执行相关回调任务`);
        return true; // 卡住了
      }
    }
    return false;
  };
};

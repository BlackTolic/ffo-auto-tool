import { logger } from '../../../utils/logger';
import { damoBindingManager } from '../../events';

// 获取绑定窗口信息、pid
export const getBindWindowInfo = () => {
  const hwnd = damoBindingManager.selectHwnd;
  if (!hwnd || !damoBindingManager.isBound(hwnd)) {
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

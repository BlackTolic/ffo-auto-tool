import { AutoT } from '../../../auto-plugin';
import {
  DEFAULT_ADDRESS_NAME,
  DEFAULT_BLOOD_STATUS,
  DEFAULT_GOLD,
  DEFAULT_ISOLATE,
  DEFAULT_ITEM_BOX,
  DEFAULT_ITEM_BOX_TAB,
  DEFAULT_MONSTER_NAME,
  DEFAULT_ROLE_NAME,
  DEFAULT_ROLE_POSITION,
  DEFAULT_SERVER_DISCONNECT,
  DEFAULT_STATUS_ICON_POS,
  DEFAULT_VERIFY_CODE,
} from '../../constant/OCR-pos';
import { parseFFOCurrencyToGoldLabel, parseRolePositionFromText, parseTextPos } from '../common';
// 检查服务器是否断线
export const isOffline = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const offlinePos = DEFAULT_SERVER_DISCONNECT[bindWindowSize];
  const addressName = bindDm.ocr(offlinePos.x1, offlinePos.y1, offlinePos.x2, offlinePos.y2, offlinePos.color, offlinePos.sim);
  return addressName.includes('退出游戏');
};

// 检查角色是否死亡
export const isDead = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800'): boolean => {
  // const deadPos = DEFAULT_STATUS_ICON_POS[bindWindowSize];
  // const deadIcon = bindDm.ocr(deadPos.x1, deadPos.y1, deadPos.x2, deadPos.y2, deadPos.color, deadPos.sim);
  // console.log(deadIcon, 'deadIcon');
  // return deadIcon.includes('死亡');
  return false;
};

// 获取神医验证码
export const getVerifyCodePos = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const verifyCodePos = DEFAULT_VERIFY_CODE[bindWindowSize];
  const verifyCode = bindDm.findStrFastE(verifyCodePos.x1, verifyCodePos.y1, verifyCodePos.x2, verifyCodePos.y2, '神医问题来啦', verifyCodePos.color, verifyCodePos.sim);
  return parseTextPos(verifyCode);
};

// 检查角色名称
export const getRoleName = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const roleNamePos = DEFAULT_ROLE_NAME[bindWindowSize];
  const roleName = bindDm.ocr(roleNamePos.x1, roleNamePos.y1, roleNamePos.x2, roleNamePos.y2, roleNamePos.color, roleNamePos.sim);
  return roleName;
};

// 获取地图名称
export const getMapName = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const mapNamePos = DEFAULT_ADDRESS_NAME[bindWindowSize];
  const mapName = bindDm.ocr(mapNamePos.x1, mapNamePos.y1, mapNamePos.x2, mapNamePos.y2, mapNamePos.color, mapNamePos.sim);
  return mapName;
};

// 获取角色坐标位置
export const getRolePosition = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const rolePos = DEFAULT_ROLE_POSITION[bindWindowSize];
  const rolePosText = bindDm.ocr(rolePos.x1, rolePos.y1, rolePos.x2, rolePos.y2, rolePos.color, rolePos.sim);
  return parseRolePositionFromText(rolePosText);
};

// 获取怪物名称
export const getMonsterName = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const monsterPos = DEFAULT_MONSTER_NAME[bindWindowSize];
  const monsterPosText = bindDm.ocr(monsterPos.x1, monsterPos.y1, monsterPos.x2, monsterPos.y2, monsterPos.color, monsterPos.sim);
  return monsterPosText;
};

// 获取血量状态（获取指定区域颜色均值）
export const getBloodStatus = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const bloodStatusPos = DEFAULT_BLOOD_STATUS[bindWindowSize];
  const bloodStatusText = bindDm.findColorE(bloodStatusPos.x1, bloodStatusPos.y1, bloodStatusPos.x2, bloodStatusPos.y2, bloodStatusPos.color, bloodStatusPos.sim);
  return parseRolePositionFromText(bloodStatusText) ? 'danger' : 'safe';
};

// 是否处于回血状态
export const getStatusBloodIcon = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const statusIconPos = (DEFAULT_STATUS_ICON_POS as any)[bindWindowSize]?.status_blood;
  const statusIconText = bindDm.findColorE(statusIconPos.x1, statusIconPos.y1, statusIconPos.x2, statusIconPos.y2, statusIconPos.color, statusIconPos.sim);
  return parseRolePositionFromText(statusIconText);
};

// 全屏截图
export const fullScreenShot = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  // const fullScreenPos = DEFAULT_FULL_SCREEN[bindWindowSize];
  // const fullScreen = bindDm.capturePng(fullScreenPos.x1, fullScreenPos.y1, fullScreenPos.x2, fullScreenPos.y2, `${FULL_SCREEN_PATH}`);
  // return fullScreen;
};

// 是否与目标直接有阻挡
export const isBlocked = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const blockedPos = DEFAULT_ISOLATE[bindWindowSize];
  const blockedText = bindDm.findStrFastE(blockedPos.x1, blockedPos.y1, blockedPos.x2, blockedPos.y2, '有阻挡', blockedPos.color, blockedPos.sim);
  return !!parseRolePositionFromText(blockedText);
};

// 查看当前金币
export const getCurrentGold = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const goldPos = DEFAULT_GOLD[bindWindowSize];
  const goldText = bindDm.ocr(goldPos.x1, goldPos.y1, goldPos.x2, goldPos.y2, goldPos.color, goldPos.sim);
  console.log(parseFFOCurrencyToGoldLabel(goldText), 'goldText');
  return parseFFOCurrencyToGoldLabel(goldText);
};

// 检查物品栏是否打开
export const isItemBoxOpen = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800'): string | false => {
  const itemBoxPos = DEFAULT_ITEM_BOX[bindWindowSize];
  const itemBoxText = bindDm.findStrFastE(itemBoxPos.x1, itemBoxPos.y1, itemBoxPos.x2, itemBoxPos.y2, '物品栏', itemBoxPos.color, itemBoxPos.sim);
  console.log(itemBoxText, 'itemBoxText');
  const isOk = !!parseRolePositionFromText(itemBoxText);
  if (!isOk) {
    return false;
  }
  const tabPos = DEFAULT_ITEM_BOX_TAB[bindWindowSize];
  const tabText = bindDm.ocr(tabPos.x1, tabPos.y1, tabPos.x2, tabPos.y2, tabPos.color, tabPos.sim);
  console.log(tabText, 'tabText');
  return tabText;
};

// 检查红药数量
export const getRedPillCount = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const redPillPos = DEFAULT_RED_PILL[bindWindowSize];
  const redPillText = bindDm.ocr(redPillPos.x1, redPillPos.y1, redPillPos.x2, redPillPos.y2, redPillPos.color, redPillPos.sim);
  console.log(redPillText, 'redPillText');
  return redPillText;
};

// 检查回城卷轴数量
export const getBackScrollCount = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const backScrollPos = DEFAULT_BACK_SCROLL[bindWindowSize];
  const backScrollText = bindDm.ocr(backScrollPos.x1, backScrollPos.y1, backScrollPos.x2, backScrollPos.y2, backScrollPos.color, backScrollPos.sim);
  console.log(backScrollText, 'backScrollText');
  return backScrollText;
};

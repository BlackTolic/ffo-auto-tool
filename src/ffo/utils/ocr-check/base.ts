import { AutoT } from '../../../auto-plugin';
import {
  DEFAULT_ADDRESS_NAME,
  DEFAULT_BLOOD_STATUS,
  DEFAULT_ISOLATE,
  DEFAULT_MONSTER_NAME,
  DEFAULT_ROLE_POSITION,
  DEFAULT_SERVER_DISCONNECT,
  DEFAULT_STATUS_ICON_POS,
  DEFAULT_VERIFY_CODE,
} from '../../constant/OCR-pos';
import { parseRolePositionFromText, parseTextPos } from '../common';
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
// export const getRoleName = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
//   const roleNamePos = DEFAULT_ROLE_NAME[bindWindowSize];
//   const roleName = bindDm.ocr(roleNamePos.x1, roleNamePos.y1, roleNamePos.x2, roleNamePos.y2, roleNamePos.color, roleNamePos.sim);
//   return roleName;
// }

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
  const blockedText = bindDm.ocr(blockedPos.x1, blockedPos.y1, blockedPos.x2, blockedPos.y2, '有阻挡', blockedPos.sim);
  return parseRolePositionFromText(blockedText);
};

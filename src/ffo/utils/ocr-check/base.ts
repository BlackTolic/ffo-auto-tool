import { AutoT } from '../../../auto-plugin';
import { TEST_PATH } from '../../../constant/config';
import {
  DEFAULT_ADDRESS_NAME,
  DEFAULT_BLOOD_STATUS,
  DEFAULT_DEAD,
  DEFAULT_DEAD_CY,
  DEFAULT_EQUIP_COUNT,
  DEFAULT_EQUIP_DAMAGE,
  DEFAULT_EXP_BAR,
  DEFAULT_GOLD,
  DEFAULT_INVITE_TEAM,
  DEFAULT_ISOLATE,
  DEFAULT_ITEM_BOX_TAB,
  DEFAULT_ITEM_BOX_TAB_SWITCH,
  DEFAULT_MONSTER_NAME,
  DEFAULT_PET_ACTIVE,
  DEFAULT_ROLE_NAME,
  DEFAULT_ROLE_POSITION,
  DEFAULT_SERVER_DISCONNECT,
  DEFAULT_STATUS_ICON_POS,
  DEFAULT_SYSTERM_INFO,
  DEFAULT_UN_EQUIP,
  DEFAULT_VERIFY_CODE,
} from '../../constant/OCR-pos';
import { parseFFOCurrencyToGoldLabel, parsePositionFromTextList, parseRolePositionFromText, parseTextPos } from '../common';
// 检查服务器是否断线
export const isOffline = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const offlinePos = DEFAULT_SERVER_DISCONNECT[bindWindowSize];
  const addressName = bindDm.ocr(offlinePos.x1, offlinePos.y1, offlinePos.x2, offlinePos.y2, offlinePos.color, offlinePos.sim);
  return addressName.includes('退出游戏');
};

// 检查角色是否死亡
export const isDeadPos = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800'): boolean => {
  const deadPos = DEFAULT_DEAD[bindWindowSize];
  const deadIcon = bindDm.ocr(deadPos.x1, deadPos.y1, deadPos.x2, deadPos.y2, deadPos.color, deadPos.sim);
  console.log(deadIcon, 'deadIcon');
  return deadIcon.includes('死亡');
};

// 检查角色是否死亡-彩玉复活
export const isDeadCYPos = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const deadPos = DEFAULT_DEAD_CY[bindWindowSize];
  const deadIcon = bindDm.findStrFastE(deadPos.x1, deadPos.y1, deadPos.x2, deadPos.y2, deadPos.string, deadPos.color, deadPos.sim);
  // console.log(deadIcon, '彩玉复活后坐标');
  return parseTextPos(deadIcon);
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
  bindDm.capturePng(goldPos.x1, goldPos.y1, goldPos.x2, goldPos.y2, `${TEST_PATH}/current_gold.png`);
  return parseFFOCurrencyToGoldLabel(goldText);
};

// 检查物品栏是否打开
export const isItemBoxOpen = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800'): string | false => {
  const tabPos = DEFAULT_ITEM_BOX_TAB[bindWindowSize];
  const tabText = bindDm.ocr(tabPos.x1, tabPos.y1, tabPos.x2, tabPos.y2, tabPos.color, tabPos.sim);
  return tabText ? tabText : false;
};

// 切换物品栏tab页
export const switchItemBoxTabPos = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800', tabText: string) => {
  const tabPos = DEFAULT_ITEM_BOX_TAB_SWITCH[bindWindowSize];
  const pos = bindDm.findStrFastE(tabPos.x1, tabPos.y1, tabPos.x2, tabPos.y2, tabText, tabPos.color, tabPos.sim);
  console.log(pos, '切换物品栏tab页', tabText);
  return parseTextPos(pos);
};

// 检查装备是否已经损坏
export const checkEquipBroken = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const equipBrokenPos = DEFAULT_EQUIP_DAMAGE[bindWindowSize];
  // console.log(equipBrokenPos, bindDm, 'equipBrokenPos');
  const equipBrokenText = bindDm.findColorE(equipBrokenPos.x1, equipBrokenPos.y1, equipBrokenPos.x2, equipBrokenPos.y2, equipBrokenPos.color, equipBrokenPos.sim);
  // console.log(equipBrokenText, 'equipBrokenText');
  return parseRolePositionFromText(equipBrokenText);
};

// 检查宠物是否激活
export const checkPetActive = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const petActivePos = DEFAULT_PET_ACTIVE[bindWindowSize];
  const petActiveText = bindDm.ocr(petActivePos.x1, petActivePos.y1, petActivePos.x2, petActivePos.y2, petActivePos.color, petActivePos.sim);
  return petActiveText !== '暂时没有宠物';
};

// 检查物品栏物品数量
export const checkItemBoxItemCount = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800', itemSort: number = 1, message?: string) => {
  // 第一个格子物品数量
  const firstItem = {
    '1600*900': { x1: 1189, y1: 599, x2: 1228, y2: 637, color: 'e8f0e8-111111', sim: 1.0 },
    '1280*800': { x1: 1194, y1: 600, x2: 1228, y2: 638, color: 'e8f0e8-111111', sim: 1.0 },
  };
  //1229,597,1268,635
  const itemPos = firstItem[bindWindowSize];
  const itemBoxItemText = bindDm.ocr(itemPos.x1 + (itemSort - 1) * 41, itemPos.y1, itemPos.x2 + (itemSort - 1) * 41, itemPos.y2, itemPos.color, itemPos.sim);
  return !itemBoxItemText ? 0 : Number(itemBoxItemText);
};

// 检查装备数量
export const checkEquipCount = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const checkEquipPos = DEFAULT_EQUIP_COUNT[bindWindowSize];
  const equipCountText = bindDm.findStrFastEx(checkEquipPos.x1, checkEquipPos.y1, checkEquipPos.x2, checkEquipPos.y2, checkEquipPos.string, checkEquipPos.color, checkEquipPos.sim);
  const list = equipCountText ? equipCountText.split?.('|') : [];
  return parsePositionFromTextList(list);
};

interface IUnEquipEquip {
  type: string | null;
  level: string | null;
  attrName: string | null;
  attrValue: string | null;
}

// 识别“未装备”的装备信息
export const checkUnEquipEquip = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800'): IUnEquipEquip | null => {
  const unEquipPos = DEFAULT_UN_EQUIP[bindWindowSize];
  const pos = bindDm.findStrFastE(unEquipPos.x1, unEquipPos.y1, unEquipPos.x2, unEquipPos.y2, unEquipPos.string, unEquipPos.color, unEquipPos.sim);
  const _pos = parseTextPos(pos);
  if (!_pos) {
    console.log('未识别到装备信息');
    return null;
  }
  // bindDm.capturePng(_pos.x, _pos.y, _pos.x + 128, _pos.y + 153, `${TEST_PATH}/test4.png`);
  // bindDm.capturePng(_pos.x, _pos.y + 153, _pos.x + 128, _pos.y + 306, `${TEST_PATH}/test5.png`);
  // 等级和装备部位
  const type = bindDm.ocr(_pos.x, _pos.y, _pos.x + 128, _pos.y + 153, 'b0bcb0-111111|e0e8e0-111111|e83c00-111111', unEquipPos.sim);
  // bindDm.delay(200);
  // 装备属性
  const attr = bindDm.ocr(_pos.x, _pos.y + 153, _pos.x + 135, _pos.y + 306, '408ce8-111111|d830e8-111111|00f0c8-111111', unEquipPos.sim);
  // console.log('装备类型和等级：', type);
  // console.log('装备属性：', attr);
  const res = { type: type.match(/\(([^)]+)\)/)?.[1] ?? null, level: type?.match(/需要等级(\d+)/)?.[1] ?? null, attrName: attr.split('+')?.[0] ?? null, attrValue: attr.split('+')?.[1] ?? null };
  // console.log(res);
  return res;
};

// 别人的队伍邀请
export const checkInviteTeam = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const inviteTeamPos = DEFAULT_INVITE_TEAM[bindWindowSize];
  const inviteTeamText = bindDm.findStrFastE(inviteTeamPos.x1, inviteTeamPos.y1, inviteTeamPos.x2, inviteTeamPos.y2, inviteTeamPos.string, inviteTeamPos.color, inviteTeamPos.sim);
  return parseTextPos(inviteTeamText);
};

// 检查是否快升级了
export const checkExpBar = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const expBarPos = DEFAULT_EXP_BAR[bindWindowSize];
  const expBarText = bindDm.findColorE(expBarPos.x1, expBarPos.y1, expBarPos.x2, expBarPos.y2, expBarPos.color, expBarPos.sim);
  return !!parseRolePositionFromText(expBarText);
};

// 检查系统是否有提示改信息
export const checkSystemPrompt = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800', keyword: string) => {
  const blockedPos = DEFAULT_SYSTERM_INFO[bindWindowSize];
  const blockedText = bindDm.findStrFastE(blockedPos.x1, blockedPos.y1, blockedPos.x2, blockedPos.y2, keyword, blockedPos.color, blockedPos.sim);
  console.log(blockedText, 'blockedText');
  return !!parseRolePositionFromText(blockedText);
};

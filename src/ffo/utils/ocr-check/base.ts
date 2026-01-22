import { AutoT } from '../../../auto-plugin';
import { DEFAULT_VERIFY_CODE } from '../../constant/OCR-pos';
import { parseTextPos } from '../common';

// 检查服务器是否断线
export const isOffline = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const addressName = bindDm.ocr(630, 383, 968, 516, 'e8f0e8-111111', 1.0);
  console.log(addressName, 'addressName');
  return addressName.includes('退出游戏');
};

// 检查角色是否死亡

// 获取神医验证码
export const getVerifyCodePos = (bindDm: AutoT, bindWindowSize: '1600*900' | '1280*800') => {
  const verifyCodePos = DEFAULT_VERIFY_CODE[bindWindowSize];
  const verifyCode = bindDm.findStrFastE(verifyCodePos.x1, verifyCodePos.y1, verifyCodePos.x2, verifyCodePos.y2, '神医问题来啦', verifyCodePos.color, verifyCodePos.sim);
  const verifyCodeTextPos = parseTextPos(verifyCode);
};

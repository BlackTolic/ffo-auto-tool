import { VERIFY_CODE_PATH } from '../../../constant/config';

const fs = require('fs-extra');
const path = require('path');

/**
 * 读取 verify-code 文件夹下的验证码图片，转为 base64url 格式
 * @param fileName 图片文件名（含扩展名），默认读取文件夹内第一个图片文件
 * @returns base64url 字符串（data:image/png;base64, 开头）
 */
export function readVerifyCodeImage(hwnd: string | number): string {
  const targetFile = path.join(VERIFY_CODE_PATH, `${hwnd}验证码.png`);
  const exists = fs.existsSync(targetFile);
  if (!exists) {
    console.log('验证码图片不存在');
    return '';
  }
  const mime = 'png';
  const buffer = fs.readFileSync(targetFile);
  return `data:image/${mime};base64,${buffer.toString('base64')}`;
}

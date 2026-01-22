const fs = require('fs-extra');

/**
 * 读取 verify-code 文件夹下的验证码图片，转为 base64url 格式
 * @param fileName 图片文件名（含扩展名），默认读取文件夹内第一个图片文件
 * @returns base64url 字符串（data:image/png;base64, 开头）
 */
export function readVerifyCodeImage(filePath: string, format: 'ali' | 'tujian' = 'ali'): string {
  const exists = fs.existsSync(filePath);
  if (!exists) {
    console.log('验证码图片不存在');
    return '';
  }
  const buffer = fs.readFileSync(filePath);
  if (format === 'ali') {
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } else {
    return buffer.toString('base64');
  }
}

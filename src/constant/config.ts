import path from 'path';
// 中文注释：OCR 字体文件路径
export const OCR_FONT_PATH = path.join(process.cwd(), '/src/lib/font/0_ffo.txt');

// 截图保存路径
export const SCREENSHOT_PATH = path.join(process.cwd(), '/public/screenshot/');
// 神医验证码保存路径
export const VERIFY_CODE_QUESTION_PATH = path.join(process.cwd(), '/public/verify-code/code-question.png');
export const VERIFY_CODE_ANSWER_PATH = path.join(process.cwd(), '/public/verify-code/code-answer.png');
export const VERIFY_CODE_OPTIONS_PATH = path.join(process.cwd(), '/public/verify-code/code-options.png');
// 死亡后截图
export const ROLE_IS_DEAD_PATH = path.join(process.cwd(), '/public/role-is-dead.png');
//测试
export const TEST_PATH = path.join(process.cwd(), '/public');

// 绑定的窗口
export const BIND_WINDOW_NAME = 'FFO';

// 回城卷轴图片路径
export const BACK_CITY_PNG_PATH = path.join(process.cwd(), '/src/lib/bmp/back_city.bmp');

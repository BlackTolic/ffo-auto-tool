// 顶层：改为使用 to-ico 生成 BMP 编码 ICO，修复 rcedit 兼容性
const jimpMod = require('jimp'); // 中文注释：兼容导入（可能是 default 或 { Jimp } 导出）
const Jimp = jimpMod?.Jimp || jimpMod?.default || jimpMod; // 中文注释：统一获取构造函数
const toIco = require('to-ico'); // 中文注释：生成 BMP 编码 ICO（兼容 rcedit）
const path = require('path');
const fs = require('fs');

/**
 * @typedef {Object} IconGenConfig
 * @property {number[]} sizes 中文注释：要生成的 PNG 尺寸集合（例如 [16,32,48,64,128]）
 * @property {string} background 中文注释：背景颜色（CSS 颜色字符串，如 '#111827'）
 * @property {string} text 中文注释：图标文字（例如项目简称 'FFO'）
 * @property {number} padding 中文注释：文字与边缘的内边距（像素）
 */
const iconGenConfig = {
  // 中文注释：去掉 256，保证 ICO 内部使用 BMP 编码，提升 rcedit 兼容性
  sizes: [16, 32, 48, 64, 128],
  background: '#111827',
  text: 'FFO',
  padding: 8,
};

/**
 * 中文注释：安全加载字体并绘制文字；若字体加载失败则跳过文字绘制
 * @param {import('jimp')} image 中文注释：Jimp 图像实例
 * @param {number} size 中文注释：图像尺寸
 * @param {string} text 中文注释：要绘制的文字
 * @returns {Promise<void>} 中文注释：无返回，失败时仅输出警告
 */
async function safePrintText(image, size, text) {
  try {
    // 中文注释：按尺寸选择内置字体常量，部分版本可能不存在，故整体包裹 try/catch
    const fontConst = size <= 32 ? Jimp.FONT_SANS_16_WHITE : size <= 64 ? Jimp.FONT_SANS_32_WHITE : size <= 128 ? Jimp.FONT_SANS_64_WHITE : Jimp.FONT_SANS_128_WHITE;

    const font = await Jimp.loadFont(fontConst);
    image.print(font, 0, 0, { text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, size, size);
  } catch (e) {
    console.warn('[icon] 字体加载或文字绘制失败，跳过文字绘制：', e?.message || e);
  }
}

/**
 * 中文注释：为 PNG MIME 类型添加安全回退（确保为字符串；否则强制使用 'image/png'）
 * @param {IconGenConfig} config 中文注释：生成参数配置
 * @returns {Promise<{size:number,path:string,buf:Buffer}[]>} 中文注释：返回生成的 PNG 路径与内存缓冲数组
 */
async function generatePngSet(config) {
  console.log(config, 999);
  const outDir = path.resolve(__dirname, '..', 'public');
  fs.mkdirSync(outDir, { recursive: true });

  /** @type {{size:number,path:string,buf:Buffer}[]} */
  const results = [];

  for (const size of config.sizes) {
    // 中文注释：使用数值型颜色，避免字符串颜色在当前 Jimp 版本下解析异常
    const image = new Jimp(size, size, hexColorToRgbaInt(config.background));

    // 中文注释：绘制内嵌深色矩形块（数值型颜色），不绘制文字以提升稳定性
    const inset = Math.max(2, Math.floor(size * 0.06));
    const overlay = new Jimp(size - inset * 2, size - inset * 2, hexColorToRgbaInt('#1F2937'));
    image.composite(overlay, inset, inset);

    const pngPath = path.join(outDir, `app-${size}.png`);
    console.log(`[icon] 正在生成 PNG (${size}x${size})：`, pngPath);
    await image.writeAsync(pngPath);

    // 中文注释：避免使用 getBufferAsync（会命中异常 MIME 路径），直接读取已写入的 PNG 文件缓冲
    const buf = fs.readFileSync(pngPath);

    results.push({ size, path: pngPath, buf });
    console.log(`[icon] 已生成 PNG (${size}x${size})：`, pngPath);
  }

  // 中文注释：额外生成一个 256x256 备用预览图（直接复制最后一个文件，避免 Jimp.read）
  const png256 = path.join(outDir, 'app.png');
  try {
    fs.copyFileSync(results[results.length - 1].path, png256);
    console.log('[icon] 已生成 PNG（256x256 备用）：', png256);
  } catch (e) {
    console.warn('[icon] 生成 256x256 备用图失败（已忽略）：', e?.message || e);
  }

  return results;
}

/**
 * @typedef {Object} IcoHeaderInfo
 * @property {number} reserved 中文注释：ICO 文件保留字段（必须为 0）
 * @property {number} type 中文注释：文件类型（1 表示 icon，2 表示 cursor）
 * @property {number} count 中文注释：图像数量（子图层个数）
 */

/**
 * 中文注释：校验 ICO 文件头，确保 reserved=0 且 type=1
 * @param {string} icoPath 中文注释：ICO 文件绝对路径
 * @returns {IcoHeaderInfo} 中文注释：返回 ICO 头部信息
 */
function validateIcoHeader(icoPath) {
  const buf = fs.readFileSync(icoPath);
  if (buf.length < 6) {
    throw new Error('ICO 文件过小或损坏（长度 < 6 字节）');
  }
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);

  console.log(`[icon] ICO 头部校验: reserved=${reserved}, type=${type}, count=${count}`);
  if (reserved !== 0) throw new Error(`ICO reserved 非 0：${reserved}`);
  if (type !== 1) throw new Error(`ICO type 非 icon(1)：${type}`);
  if (count <= 0) throw new Error(`ICO 子图层数量异常：${count}`);

  return { reserved, type, count };
}

/**
 * 中文注释：将多尺寸 PNG 缓冲合成为 BMP 编码 ICO（public/app.ico）
 * @param {{size:number,buf:Buffer}[]} pngItems 中文注释：PNG 内存缓冲数组（按尺寸升序）
 * @returns {Promise<string>} 中文注释：返回生成的 ICO 绝对路径
 */
async function buildBmpIco(pngItems) {
  const outDir = path.resolve(__dirname, '..', 'public');
  const icoPath = path.join(outDir, 'app.ico');

  // 中文注释：to-ico 接受 PNG 缓冲数组，生成 BMP 编码 ICO，兼容 rcedit
  const icoBuf = await toIco(pngItems.map(i => i.buf));
  fs.writeFileSync(icoPath, icoBuf);
  console.log('[icon] 已生成 BMP 编码 ICO：', icoPath);

  // 中文注释：生成后立即校验 ICO 头部，保证合法性
  validateIcoHeader(icoPath);
  return icoPath;
}

/**
 * 中文注释：主流程入口，生成多尺寸 PNG 并合成 BMP ICO
 */
async function main() {
  try {
    const items = await generatePngSet(iconGenConfig);
    // 中文注释：确保按尺寸升序（上面生成已按升序）
    await buildBmpIco(items);
    console.log('[icon] 图标生成完成（多尺寸 PNG + BMP ICO）');
  } catch (e) {
    console.error('[icon] 图标生成失败：', e?.message || e);
    process.exitCode = 1;
  }
}

// 中文注释：当脚本被直接执行（非作为模块引入）时，运行主流程以生成 app.ico
if (require.main === module) {
  main();
}

/**
 * 中文注释：将 CSS 十六进制颜色 '#RRGGBB' 转换为 Jimp 需要的 0xRRGGBBFF（包含不透明度）
 * @param {string} hex 中文注释：CSS 颜色字符串（例如 '#111827'）
 * @returns {number} 中文注释：数值型颜色（例如 0x111827FF）
 */
function hexColorToRgbaInt(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex));
  if (!m) throw new Error(`无效的十六进制颜色：${hex}`);
  const rgb = parseInt(m[1], 16);
  return (rgb << 8) | 0xff; // 中文注释：附加 0xFF 不透明度
}

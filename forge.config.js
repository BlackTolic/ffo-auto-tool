// 中文注释：强制指定 node-gyp 使用 VS2022 编译原生模块（如 winax），并规避 OpenSSL FIPS 问题
process.env.GYP_MSVS_VERSION = '2022';
process.env.npm_config_openssl_fips = '0';
// 中文注释：winax 可能需要 C++20 标准（参考 scripts/rebuild_winax.cmd）
process.env.CL = '/std:c++20';

const fs = require('fs-extra');
const path = require('path');
// 中文注释：正确从命名导出解构 AutoUnpackNativesPlugin（否则会报 not a constructor）
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');

/**
 * 复制任务参数类型（JSDoc 类型声明，用于 JS 下的类型提示）
 * @typedef {Object} CopyTask
 * @property {string} src 源目录的绝对路径（中文注释：要复制的目录或文件的来源路径）
 * @property {string} dest 目标目录的绝对路径（中文注释：复制到的目标目录路径）
 */

/**
 * 递归复制目录（保留子目录与文件结构）
 * @param {CopyTask} task 复制任务（含源与目标路径）
 */
function copyDirectory(task) {
  // 中文注释：如果源不存在，直接返回并打印警告
  if (!fs.existsSync(task.src)) {
    console.warn('[copyDirectory] 源目录不存在：', task.src);
    return;
  }
  // 中文注释：确保目标目录存在
  fs.mkdirSync(task.dest, { recursive: true });

  const entries = fs.readdirSync(task.src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(task.src, entry.name);
    const destPath = path.join(task.dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectory({ src: srcPath, dest: destPath });
    } else {
      // 中文注释：普通文件直接复制
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * 环境标识接口类型（用于判断当前是否为 start 场景）
 * @typedef {Object} EnvFlags
 * @property {boolean} isDev 中文注释：是否为开发模式（NODE_ENV=development）
 * @property {boolean} isStart 中文注释：是否为 Electron Forge 的 start 命令
 */

/**
 * 计算当前环境标识（用于插件启用的条件控制）
 * @returns {EnvFlags} 中文注释：返回环境标识对象
 */
function getEnvFlags() {
  // 中文注释：Forge 在 start 时通常会设置 NODE_ENV=development；同时根据命令行参数进行兜底判断
  const isDev = process.env.NODE_ENV === 'development';
  const isStart =
    isDev ||
    process.argv.some((arg) =>
      /electron-forge-start|electron-forge start/i.test(arg)
    ) ||
    process.env.FORGE_START === 'true';

  return { isDev, isStart };
}

const envFlags = getEnvFlags();

module.exports = {
  // 中文注释：Electron 打包配置，启用 asar 并设置镜像源避免 GitHub 443 超时
  packagerConfig: {
    asar: true, // 中文注释：启用 asar；配合 AutoUnpackNativesPlugin，原生 .node 会被解包到 asar 外
    download: {
      mirror: 'https://npmmirror.com/mirrors/electron/', // 中文注释：Electron 国内镜像加速
    },
  },
  rebuildConfig: {},
  makers: [
    {
      // 中文注释：使用 MSI（WiX）安装器
      name: '@electron-forge/maker-wix',
      config: {
        language: 2052, // 中文注释：安装 UI 语言（2052=简体中文）
        manufacturer: 'MoonMage', // 中文注释：厂商名称（显示在安装信息中）
        shortName: 'ffo-auto-script', // 中文注释：短名称（用于部分路径与标识）
        perMachine: true, // 中文注释：系统级安装到 Program Files（会弹 UAC）
        icon: path.resolve(__dirname, 'public', 'app.ico'), // 中文注释：显式设置安装器图标
        // upgradeCode: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // 中文注释：固定升级 GUID（可选）
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    { name: '@electron-forge/maker-deb', config: {} },
    { name: '@electron-forge/maker-rpm', config: {} },
  ],
  plugins: [
    {
      // 中文注释：仅保留一个 webpack 插件实例，并在配置中添加 whiteListedModules
      name: '@electron-forge/plugin-webpack',
      config: {
        port: 3010, // 中文注释：开发端口
        loggerPort: 9100, // 中文注释：日志端口
        mainConfig: './webpack.main.config.js', // 中文注释：主进程 webpack 配置路径
        renderer: {
          config: './webpack.renderer.config.js', // 中文注释：渲染进程 webpack 配置路径
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.ts',
              name: 'main_window',
              preload: { js: './src/preload.ts' },
            },
          ],
        },
        whiteListedModules: ['winax'], // 中文注释：保留原生模块到最终产物的 node_modules，避免被 webpack 丢失
      },
    },
    // 中文注释：仅在非 start 场景启用自动解包插件，避免与 webpack 抢占 start 命令
    ...(!envFlags.isStart ? [new AutoUnpackNativesPlugin()] : []),
  ],
  hooks: {
    /**
     * @typedef {Object} PreMakeContext 中文注释：preMake 钩子上下文接口
     * @property {string} platform 中文注释：平台标识（如 'win32'）
     * @property {string} arch 中文注释：架构（如 'ia32'）
     * @property {string[]} makeTargets 中文注释：将要生成的制品目标列表
     */
    // 中文注释：在生成制品前确保生成 public/app.ico（供 rcedit 与安装器使用）
    async preMake(_forgeConfig, /** @type {PreMakeContext} */ hookContext) {
      const cp = require('child_process');
      const iconPath = path.resolve(__dirname, 'public', 'app.ico'); // 中文注释：图标目标路径

      console.log('[preMake] 生成应用图标（public/app.ico）');
      // try {
      //   // 中文注释：调用生成脚本（Windows 路径分隔符）
      //   cp.execSync('node scripts\\generate_icon.js', { stdio: 'inherit' });
      // } catch (e) {
      //   console.warn('[preMake] 生成图标脚本执行失败：', e?.message || e);
      // }

      if (!fs.existsSync(iconPath)) {
        throw new Error('[preMake] 未检测到 app.ico，停止制品生成，请检查图标生成脚本');
      }
      console.log('[preMake] 已检测到 app.ico：', iconPath);
    },

    // 中文注释：打包完成（package）后执行，负责把 winax 与 src/lib 放入产物
    async postPackage(forgeConfig, options) {
      // 中文注释：标准化 outputPaths 为数组，便于多平台/多架构处理
      const outputs = Array.isArray(options.outputPaths) ? options.outputPaths : [options.outputPaths];

      console.log('[postPackage] 平台:', options.platform, '架构:', options.arch);
      console.log('[postPackage] 输出目录列表:', outputs);

      for (const outPath of outputs) {
        try {
          if (!outPath || !fs.existsSync(outPath)) {
            console.warn('[postPackage] 跳过：输出目录不存在 =>', outPath);
            continue;
          }

          const resourcesDir = path.join(outPath, 'resources');
          const appDir = path.join(resourcesDir, 'app');
          const asarFile = path.join(resourcesDir, 'app.asar');
          const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked');

          // 中文注释：优先使用 app 目录；若存在 asar，则使用 app.asar.unpacked
          let targetRoot = appDir;
          if (!fs.existsSync(appDir) && fs.existsSync(asarFile)) {
            targetRoot = unpackedDir;
          }
          // 中文注释：确保目标根目录存在
          fs.mkdirSync(targetRoot, { recursive: true });

          const nodeModulesDir = path.join(targetRoot, 'node_modules');
          console.log('[postPackage] 目标根目录:', targetRoot);
          console.log('[postPackage] 目标 node_modules:', nodeModulesDir);

          // 中文注释：确保打包产物里有 node_modules 目录（否则外部模块无法解析）
          fs.mkdirSync(nodeModulesDir, { recursive: true });

          // 中文注释：准备复制 winax 模块
          const winaxSrc = path.resolve(__dirname, 'node_modules', 'winax');
          const winaxDest = path.join(nodeModulesDir, 'winax');

          if (fs.existsSync(winaxSrc)) {
            copyDirectory({ src: winaxSrc, dest: winaxDest });
            console.log('[postPackage] winax 已复制到:', winaxDest);
          } else {
            console.warn('[postPackage] 未找到 winax 源目录（是否未安装或在 devDependencies？）=>', winaxSrc);
          }

          // 中文注释：复制 src/lib 资源到打包产物
          const libSrc = path.resolve(__dirname, 'src', 'lib');
          const libDest = path.join(targetRoot, 'src', 'lib');

          if (fs.existsSync(libSrc)) {
            copyDirectory({ src: libSrc, dest: libDest });
            console.log('[postPackage] src/lib 已复制到:', libDest);
          } else {
            console.warn('[postPackage] 未找到 src/lib 源目录 =>', libSrc);
          }
        } catch (err) {
          console.error('[postPackage] 复制过程发生异常：', err);
        }
      }
    },
  },
};

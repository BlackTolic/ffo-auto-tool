// 中文注释：强制指定 node-gyp 使用 VS2022 编译原生模块（如 winax），并规避 OpenSSL FIPS 问题
process.env.GYP_MSVS_VERSION = '2022';
process.env.npm_config_openssl_fips = '0';
// 中文注释：winax 可能需要 C++20 标准（参考 scripts/rebuild_winax.cmd）
process.env.CL = '/std:c++20';

const fs = require('fs-extra');
const path = require('path');

module.exports = {
  // 中文注释：关闭 asar，确保原生 dll 以物理文件进入资源目录（便于注册）
  packagerConfig: {
    asar: false,
  },
  hooks: {
    postPackage: async (forgeConfig, options) => {
      const appPath = path.join(options.outputPaths[0], 'resources', 'app');
      const winaxSrc = path.join(__dirname, 'node_modules', 'winax');
      const winaxDest = path.join(appPath, 'node_modules', 'winax');

      console.log(`Copying winax from ${winaxSrc} to ${winaxDest}...`);
      await fs.copy(winaxSrc, winaxDest);
      console.log('winax copied successfully.');

      // 中文注释：复制 src\lib（包含 dm.dll 等资源）到打包后的目录，供运行时环境检测与注册使用
      const libSrc = path.join(__dirname, 'src', 'lib'); // 源：开发目录中的 src\lib
      const libDest = path.join(appPath, 'src', 'lib'); // 目标：打包目录 resources\app\src\lib
      console.log(`Copying src/lib from ${libSrc} to ${libDest}...`);
      await fs.copy(libSrc, libDest);
      console.log('src/lib copied successfully.');
    },
  },
  rebuildConfig: {},
  makers: [
    {
      // 中文注释：改为使用 MSI（WiX）安装器
      name: '@electron-forge/maker-wix',
      config: {
        language: 2052,              // 中文注释：安装 UI 语言：2052=简体中文
        manufacturer: 'MoonMage',    // 中文注释：厂商名称（显示在安装信息中）
        shortName: 'ffo-auto-script',// 中文注释：短名称（用于部分路径与标识）
        perMachine: true,            // 中文注释：系统级安装到 Program Files（会弹 UAC 管理员权限）
        // 中文注释：可选固定升级识别：升级码需是固定 GUID，设置后请保持不变
        // upgradeCode: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    // 中文注释：保留 webpack 插件用于开发与打包
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        // 中文注释：自定义端口，避免默认端口 3000/9000 冲突
        port: 3010,
        loggerPort: 9100,
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.ts',
              name: 'main_window',
              preload: {
                js: './src/preload.ts',
              },
            },
          ],
        },
      },
    },
  ],
  // 中文注释：打包后复制 src\lib 到资源目录（确保 dm.dll、reg.bat 可用）
  hooks: {
    /**
     * @typedef {Object} PostPackageContext 中文注释：postPackage 钩子上下文接口
     * @property {string[]|string} outputPaths 中文注释：打包输出路径（数组或单路径）
     * @property {string} platform 中文注释：平台标识（例如 win32）
     * @property {string} arch 中文注释：架构（例如 ia32）
     */
    // 中文注释：打包后复制 src\lib 到各输出的 resources\app\src\lib，确保 dm.dll 与 reg.bat 可用
    async postPackage(_forgeConfig, /** @type {PostPackageContext} */ hookContext) {
      const fs = require('fs');
      const path = require('path');
      const srcLib = path.resolve(__dirname, 'src', 'lib'); // 中文注释：源资源目录

      // 中文注释：归一化 outputPaths 为数组（兼容字符串/数组/未定义）
      const outputs = Array.isArray(hookContext?.outputPaths)
        ? hookContext.outputPaths
        : (hookContext?.outputPaths ? [hookContext.outputPaths] : []);

      if (!outputs.length) {
        console.warn('[postPackage] 未获取到 outputPaths，跳过资源复制');
        return;
      }

      // 中文注释：递归复制工具函数（目录/文件均处理）
      const copyRecursive = (src, dst) => {
        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
          fs.mkdirSync(dst, { recursive: true });
          for (const name of fs.readdirSync(src)) {
            copyRecursive(path.join(src, name), path.join(dst, name));
          }
        } else {
          fs.copyFileSync(src, dst);
        }
      };

      for (const out of outputs) {
        const destLib = path.resolve(out, 'resources', 'app', 'src', 'lib');
        try {
          fs.mkdirSync(destLib, { recursive: true });
          copyRecursive(srcLib, destLib);
          console.log('[postPackage] 复制资源 ->', destLib);
        } catch (e) {
          console.warn('[postPackage] 复制 src\\lib 失败：', e?.message || e);
        }
      }
    },
  },
};

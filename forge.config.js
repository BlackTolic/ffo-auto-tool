// 中文注释：强制指定 node-gyp 使用 VS2022 编译原生模块（如 winax），并规避 OpenSSL FIPS 问题
process.env.GYP_MSVS_VERSION = '2022';
process.env.npm_config_openssl_fips = '0';
// 中文注释：winax 可能需要 C++20 标准（参考 scripts/rebuild_winax.cmd）
process.env.CL = '/std:c++20';

const fs = require('fs-extra');
const path = require('path');

module.exports = {
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
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: 'MoonMage',
        description: 'ffo-auto-script',
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
    // 中文注释：为避免多个插件同时接管 start 导致开发启动冲突，
    // 临时仅保留 webpack 插件以顺利启动开发服务器与预览 UI。
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
};

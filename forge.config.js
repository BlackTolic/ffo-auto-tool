const fs = require('fs');
const path = require('path');

// 中文注释：配置 Electron 镜像，确保打包时下载顺利
process.env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/';

// 中文注释：强制指定 node-gyp 使用 VS2022 编译原生模块（如 winax），并规避 OpenSSL FIPS 问题
process.env.GYP_MSVS_VERSION = '2022';
process.env.npm_config_openssl_fips = '0';
process.env.VISUALSTUDIOVERSION = '17.0';
// 中文注释：winax 可能需要 C++20 标准（参考 scripts/rebuild_winax.cmd）
process.env.CL = '/std:c++20';

// 中文注释：尝试自动定位 MSBuild 并添加到 PATH，解决 node-gyp 找不到构建工具的问题
const msbuildCandidates = [
  'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin',
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin',
  'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin',
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin',
  'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\MSBuild\\Current\\Bin',
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\Enterprise\\MSBuild\\Current\\Bin',
];

for (const p of msbuildCandidates) {
  if (fs.existsSync(p)) {
    console.log(`[forge.config.js] Found MSBuild: ${p}`);
    process.env.PATH = p + path.delimiter + process.env.PATH;
    break;
  }
}

module.exports = {
  packagerConfig: {
    asar: true,
    // 中文注释：将 dm.dll 作为额外资源复制到打包目录，确保运行时可用
    extraResource: ['./src/lib/dm.dll'],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // 中文注释：显式指定 ASCII 名称和作者，避免因中文乱码导致 CreateZipFromDirectory 失败
        name: 'ffo_auto_script',
        authors: 'MoonMage',
        exe: 'ffo-auto-script.exe',
        noMsi: true,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
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

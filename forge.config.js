module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
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
        // 中文注释：自定义端口，避免默认端口及占用冲突
        port: 3020,
        // 中文注释：变更日志服务端口，避免 9100 被占用导致启动失败
        loggerPort: 9201,
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.tsx',
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

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.ts',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  // Ensure TypeScript imports resolve correctly in main process bundle
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
  },
  // Avoid bundling native COM bridge; load at runtime from node_modules
  // 中文注释：将 winax 声明为外部依赖，运行时从打包后的 node_modules 直接加载原生模块
  externals: {
      winax: 'commonjs winax', // 中文注释：不参与打包，保持 require('winax') 指向真实模块
  },
};

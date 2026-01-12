const rules = require('./webpack.rules');

// 中文注释：为 .css 文件配置样式加载
rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

// 中文注释：新增 Less 支持（渲染进程）
rules.push({
  test: /\.less$/,
  use: [
    { loader: 'style-loader' }, // 中文注释：将样式以 <style> 注入页面
    { loader: 'css-loader' }, // 中文注释：解析 @import、url() 等
    { loader: 'less-loader' }, // 中文注释：编译 Less 为 CSS
  ],
});

module.exports = {
  // 中文注释：为渲染进程禁用 eval 类 source-map，避免触发 CSP 的 unsafe-eval
  // 使用普通的 'source-map'，不会注入 eval，从而与严格 CSP 兼容
  devtool: 'source-map',
  // Put your normal webpack config below here
  module: {
    rules,
  },
  // 中文注释：为渲染进程补充扩展名解析，支持无扩展导入 TS/TSX/JS
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'], // 中文注释：按顺序尝试解析这些扩展名
  },
};

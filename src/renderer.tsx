// 中文注释：React 入口，挂载根组件到页面
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './index.css';

// 中文注释：获取 React 挂载容器
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.warn('未找到 #root 容器，React UI 未挂载。');
}

import React from 'react';
import './ContentHeader.less'; // 中文注释：引入顶部统计区组件样式（Less）

// 中文注释：顶部统计区组件属性接口（预留可扩展）
export interface ContentHeaderProps {
  // 中文注释：可根据需要扩展统计数据/操作按钮等
}

// 中文注释：页面顶部渐变统计与操作按钮区域
const ContentHeader: React.FC<ContentHeaderProps> = () => {
  // 中文注释：检测是否运行在 Electron（通过 preload 暴露的 windowControl 判断）
  const isElectron = typeof (window as any).windowControl?.close === 'function';

  // 中文注释：点击最小化按钮处理函数
  const handleMinimize = async () => {
    try {
      if (!isElectron) {
        // 中文注释：浏览器预览模式下给出提示
        alert('当前为浏览器预览模式，最小化不可用');
        return;
      }
      await window.windowControl.minimize();
    } catch (e: any) {
      console.warn('最小化失败:', e?.message || e);
    }
  };

  // 中文注释：点击关闭按钮处理函数
  const handleClose = async () => {
    try {
      if (!isElectron) {
        // 中文注释：浏览器预览模式下给出提示
        alert('当前为浏览器预览模式，关闭不可用');
        return;
      }
      await window.windowControl.close();
    } catch (e: any) {
      console.warn('关闭窗口失败:', e?.message || e);
    }
  };

  return (
    <section className="content-header">
      <div className="stat">
        <div className="stat-icon">☁️</div>
        <div className="stat-text">
          <div className="stat-sub">已用</div>
          <div className="stat-main">
            20 <span className="unit">GB / 1700 GB</span>
          </div>
        </div>
      </div>
      <div className="stat">
        <div className="stat-icon">🕑</div>
        <div className="stat-text">
          <div className="stat-sub">有效期</div>
          <div className="stat-main">
            330 <span className="unit">天</span>
          </div>
        </div>
      </div>
      <div className="header-actions">
        <button className="icon-btn">🔔</button>
        <button className="icon-btn" onClick={handleMinimize} disabled={!isElectron}>
          —
        </button>
        <button className="icon-btn" onClick={handleClose} disabled={!isElectron}>
          ✕
        </button>
      </div>
    </section>
  );
};

export default ContentHeader;

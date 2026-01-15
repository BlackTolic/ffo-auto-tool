import React from 'react';
import './ContentHeader.less'; // 中文注释：引入顶部统计区组件样式（Less）

// 中文注释：顶部统计区组件属性接口（预留可扩展）
export interface ContentHeaderProps {
  // 中文注释：可根据需要扩展统计数据/操作按钮等
}

// 中文注释：页面顶部渐变统计与操作按钮区域
const ContentHeader: React.FC<ContentHeaderProps> = () => {
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
        <button className="icon-btn">—</button>
        <button className="icon-btn">✕</button>
      </div>
    </section>
  );
};

export default ContentHeader;

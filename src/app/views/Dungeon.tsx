import React from 'react';

// 中文注释：副本视图的属性接口定义
export interface DungeonProps {
  // 中文注释：预留属性（如副本选择、进度等）
}

// 中文注释：副本视图组件
const DungeonView: React.FC<DungeonProps> = () => {
  return (
    <section className="card">
      <div className="card-title">副本</div>
      <div className="card-sub">此页面内容开发中（占位）</div>
    </section>
  );
};

export default DungeonView;
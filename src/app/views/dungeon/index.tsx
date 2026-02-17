import React from 'react';
import Card from '../../components/card/Card';

// 中文注释：副本视图的属性接口定义
export interface DungeonProps {
  // 中文注释：预留属性（如副本选择、进度等）
}

// 中文注释：副本视图组件
const DungeonView: React.FC<DungeonProps> = () => {
  return <Card title="副本" subtitle="此页面内容开发中（占位页面）" />;
};

export default DungeonView;

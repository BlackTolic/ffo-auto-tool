import React from 'react';
import Card from '../../components/card/Card';

// 中文注释：名誉视图的属性接口定义
export interface ReputationProps {
  // 中文注释：预留属性（如名誉任务状态等）
}

// 中文注释：名誉视图组件
const ReputationView: React.FC<ReputationProps> = () => {
  return <Card title="名誉" subtitle="此页面内容开发中（占位）" />;
};

export default ReputationView;

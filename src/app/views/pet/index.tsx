import React from 'react';
import Card from '../../components/card/Card';

// 中文注释：抓宠视图的属性接口定义
export interface PetProps {
  // 中文注释：预留属性（如宠物列表、抓捕策略等）
}

// 中文注释：抓宠视图组件
const PetView: React.FC<PetProps> = () => {
  return <Card title="抓宠" subtitle="此页面内容开发中（占位）" />;
};

export default PetView;

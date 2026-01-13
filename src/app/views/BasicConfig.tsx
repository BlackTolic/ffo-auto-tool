import React from 'react';

// 中文注释：基本配置视图的属性接口定义
export interface BasicConfigProps {
  // 中文注释：预留属性（后续可传入配置数据等）
}

// 中文注释：基本配置视图组件
const BasicConfigView: React.FC<BasicConfigProps> = () => {
  return (
    <section className="card">
      <div className="card-title">基本配置</div>
      <div className="card-sub">此页面内容开发中（占位）</div>
    </section>
  );
};

export default BasicConfigView;
import React from 'react';

// 中文注释：野外刷怪视图的属性接口定义
export interface FieldProps {
  // 中文注释：预留属性（如刷怪配置、状态等）
}

// 中文注释：野外刷怪视图组件
const FieldView: React.FC<FieldProps> = () => {
  return (
    <section className="card">
      <div className="card-title">野外刷怪</div>
      <div className="card-sub">此页面内容开发中（占位）</div>
    </section>
  );
};

export default FieldView;
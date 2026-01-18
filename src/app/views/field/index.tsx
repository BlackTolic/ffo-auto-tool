import React from 'react';

export interface FieldProps {}

const FieldView: React.FC<FieldProps> = () => {
  return (
    <section className="card">
      <div className="card-title">野外刷怪</div>
      <div className="card-sub">此页面内容开发中（占位）</div>
    </section>
  );
};

export default FieldView;

import React from 'react';

export interface MiningProps {}

const MiningView: React.FC<MiningProps> = () => {
  return (
    <section className="card">
      <div className="card-title">挖矿</div>
      <div className="card-sub">挖矿功能开发中（占位页面）</div>
    </section>
  );
};

export default MiningView;


import React from 'react';
import Card from '../../components/card/Card';
import './index.less';

export interface FieldProps {}

const FieldView: React.FC<FieldProps> = () => {
  return (
    <div className="field-root">
      <Card title="野外刷怪" subtitle="选择刷怪路线并控制自动练级" />

      <section className="card card-inline field-card-main">
        <div className="card-main">
          <div className="card-title-row">
            <div className="card-title">无泪南郊</div>
            <span className="tag tag-pill">练级</span>
          </div>
          <div className="card-meta">
            <span className="meta-item">等级 60 - 66</span>
            <span className="meta-item">单人 / 小队</span>
          </div>
          <div className="card-sub">适合长时间持续刷怪练级</div>
        </div>
        <div className="card-actions">
          <button className="btn primary">启动</button>
          <button className="btn">暂停</button>
          <button className="btn">停止</button>
        </div>
      </section>
    </div>
  );
};

export default FieldView;

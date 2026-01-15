import React from 'react';
import './EnvStatus.less'; // 中文注释：引入环境状态组件样式（Less）

// 中文注释：环境校验项的接口类型
export interface EnvItem {
  name: string; // 中文注释：项目名称
  ok: boolean; // 中文注释：是否通过
  message: string; // 中文注释：说明信息
}

// 中文注释：环境校验结果的接口类型
export interface EnvCheckResult {
  ok: boolean; // 中文注释：总体是否通过
  items: EnvItem[]; // 中文注释：逐项结果列表
}

// 中文注释：EnvStatus 组件属性接口
export interface EnvStatusProps {
  env: EnvCheckResult | null; // 中文注释：环境检测结果（可为空表示加载中）
}

// 中文注释：环境校验结果展示组件
const EnvStatus: React.FC<EnvStatusProps> = ({ env }) => {
  return (
    <section className="card">
      <div className="card-title">环境校验结果</div>
      {!env ? (
        <p className="muted">正在检测...</p>
      ) : (
        <div>
          <p className="status">
            总体状态：<strong>{env.ok ? '通过 ✅' : '未通过 ❌'}</strong>
          </p>
          <ul className="list">
            {env.items?.map((i, idx) => (
              <li key={idx}>
                {i.ok ? '✅' : '❌'} <strong>{i.name}</strong>：{i.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default EnvStatus;

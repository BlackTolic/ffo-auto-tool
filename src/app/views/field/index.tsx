import React, { useState } from 'react';
import Card from '../../components/card/Card';
import './index.less';

export interface FieldProps {}

const FieldView: React.FC<FieldProps> = () => {
  // 中文注释：是否处于 Electron 环境（依赖 preload 暴露的 ffoActions）
  const isElectron = typeof window !== 'undefined' && !!(window as any).ffoActions;
  // 中文注释：运行状态（true 显示“暂停”，false 显示“启动”）
  const [running, setRunning] = useState<boolean>(false);

  // 中文注释：主按钮点击“启动/暂停”
  // - 未运行时：调用 toggleWuLeiNanJiao 启动，并根据返回值设置 running
  // - 运行中时：调用 pauseCurActive 暂停，成功后设置 running=false
  const handleStartOrPause = async () => {
    try {
      if (isElectron) {
        if (!running) {
          const ret = await (window as any).ffoActions.toggleWuLeiNanJiao();
          console.log('[无泪南郊] 切换结果', ret);
          if (typeof ret?.running === 'boolean') {
            setRunning(ret.running);
          } else {
            setRunning(true);
          }
        } else {
          const ret = await (window as any).ffoActions.pauseCurActive();
          console.log('[无泪南郊] 暂停结果', ret);
          if (ret?.ok) {
            setRunning(false);
          } else {
            console.warn('[无泪南郊] 暂停失败：', ret?.message);
          }
        }
      } else {
        // 中文注释：预览模式下演示切换文案
        setRunning(prev => !prev);
      }
    } catch (e) {
      console.warn('[无泪南郊] 启动/暂停失败：', (e as any)?.message || e);
      // 中文注释：异常时不改变当前状态，保持可点击
    }
  };

  // 中文注释：独立“停止”按钮点击（运行中/暂停中均可调用，彻底停止）
  const handleStop = async () => {
    try {
      if (isElectron) {
        const ret = await (window as any).ffoActions.stopCurActive();
        console.log('[无泪南郊] 停止结果', ret);
        if (ret?.ok) {
          setRunning(false);
        } else {
          console.warn('[无泪南郊] 停止失败：', ret?.message);
        }
      } else {
        setRunning(false);
      }
    } catch (e) {
      console.warn('[无泪南郊] 停止失败：', (e as any)?.message || e);
    }
  };

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
          <button className="btn primary" onClick={handleStartOrPause}>
            {running ? '暂停' : '启动'}
          </button>
          {/* 中文注释：按需求移除第二个“暂停”按钮，仅保留“停止” */}
          <button className="btn" onClick={handleStop}>
            停止
          </button>
        </div>
      </section>
    </div>
  );
};

export default FieldView;

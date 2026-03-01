import React, { useState } from 'react';
import { logger } from '../../../utils/logger';
import Card from '../../components/card/Card';
import styles from './index.module.less';

export interface FieldProps {}

// 中文注释：新建卡片的表单值接口，用于弹框收集信息
export interface NewCardFormValues {
  title: string; // 中文注释：卡片标题（例如：无泪南郊）
  levelFrom: number; // 中文注释：适配等级下限（整数）
  levelTo: number; // 中文注释：适配等级上限（整数）
  mode: '单人' | '小队'; // 中文注释：刷怪模式（单人或小队）
  tag: string; // 中文注释：右侧标签文案（例如：练级、刷钱等）
  desc: string; // 中文注释：卡片简短描述（例如：适合长时间持续刷怪练级）
}

// 中文注释：展示用的卡片数据接口
export interface FieldRouteCard {
  title: string; // 中文注释：卡片标题
  levelRangeLabel: string; // 中文注释：等级区间展示文案（例如：等级 60 - 66）
  modeLabel: string; // 中文注释：模式展示文案（例如：单人 / 小队）
  tagLabel: string; // 中文注释：右侧标签（例如：练级）
  desc: string; // 中文注释：简短描述
}

const FieldView: React.FC<FieldProps> = () => {
  // 中文注释：是否处于 Electron 环境（依赖 preload 暴露的 ffoActions）
  const isElectron = typeof window !== 'undefined' && !!(window as any).ffoActions;
  // 中文注释：运行状态（true 显示“暂停”，false 显示“启动”）
  const [running, setRunning] = useState<boolean>(false);

  // 中文注释：维护用户新建的卡片列表
  const [cards, setCards] = useState<FieldRouteCard[]>([]);

  // 中文注释：控制“新建卡片”弹框开关
  const [newOpen, setNewOpen] = useState<boolean>(false);

  // 中文注释：弹框内的表单值
  const [form, setForm] = useState<NewCardFormValues>({
    title: '',
    levelFrom: 1,
    levelTo: 1,
    mode: '单人',
    tag: '练级',
    desc: '',
  });

  // 中文注释：主按钮点击“启动/暂停”
  // - 未运行时：调用 toggleWuLeiNanJiao 启动，并根据返回值设置 running
  // - 运行中时：调用 pauseCurActive 暂停，成功后设置 running=false
  const handleStartOrPause = async () => {
    try {
      if (isElectron) {
        if (!running) {
          const ret = await (window as any).ffoActions.toggleWuLeiNanJiao();
          logger.info('[无泪南郊] 切换结果', ret);
          if (typeof ret?.running === 'boolean') {
            setRunning(ret.running);
          } else {
            setRunning(true);
          }
        } else {
          const ret = await (window as any).ffoActions.pauseCurActive();
          logger.info('[无泪南郊] 暂停结果', ret);
          if (ret?.ok) {
            setRunning(false);
          } else {
            logger.warn('[无泪南郊] 暂停失败：', ret?.message);
          }
        }
      } else {
        // 中文注释：预览模式下演示切换文案
        setRunning(prev => !prev);
      }
    } catch (e) {
      logger.warn('[无泪南郊] 启动/暂停失败：', (e as any)?.message || e);
      // 中文注释：异常时不改变当前状态，保持可点击
    }
  };

  // 中文注释：独立“停止”按钮点击（运行中/暂停中均可调用，彻底停止）
  const handleStop = async () => {
    try {
      if (isElectron) {
        const ret = await (window as any).ffoActions.stopCurActive();
        logger.info('[无泪南郊] 停止结果', ret);
        if (ret?.ok) {
          setRunning(false);
        } else {
          logger.warn('[无泪南郊] 停止失败：', ret?.message);
        }
      } else {
        setRunning(false);
      }
    } catch (e) {
      logger.warn('[无泪南郊] 停止失败：', (e as any)?.message || e);
    }
  };

  // 中文注释：打开“新建卡片”弹框
  const openNewModal = () => {
    setNewOpen(true);
  };

  // 中文注释：关闭“新建卡片”弹框并重置表单
  const closeNewModal = () => {
    setNewOpen(false);
    setForm({ title: '', levelFrom: 1, levelTo: 1, mode: '单人', tag: '练级', desc: '' });
  };

  // 中文注释：从表单值生成展示卡片数据
  const toCard = (v: NewCardFormValues): FieldRouteCard => {
    return {
      title: v.title.trim(),
      levelRangeLabel: `等级 ${v.levelFrom} - ${v.levelTo}`,
      modeLabel: v.mode === '单人' ? '单人' : '小队',
      tagLabel: v.tag.trim() || '练级',
      desc: v.desc.trim(),
    };
  };

  // 中文注释：提交“新建卡片”并加入列表
  const submitNewCard = () => {
    const title = form.title.trim();
    if (!title) {
      // 中文注释：标题必填校验（简单提示）
      alert('请填写卡片标题');
      return;
    }
    if (form.levelFrom <= 0 || form.levelTo <= 0 || form.levelFrom > form.levelTo) {
      alert('请填写正确的等级范围');
      return;
    }
    const next = toCard(form);
    setCards(prev => [...prev, next]);
    closeNewModal();
  };

  return (
    <div className={styles['field-root']}>
      <Card
        title="野外刷怪"
        subtitle="选择刷怪路线并控制自动练级"
        right={
          <button className="btn primary" onClick={openNewModal}>
            新建
          </button>
        }
      />

      <section className={styles['field-card-main']}>
        <div className={styles['card-main']}>
          <div className={styles['card-title-row']}>
            <div className={styles['card-title']}>无泪南郊</div>
            <span className={`${styles.tag} ${styles['tag-pill']}`}>练级</span>
          </div>
          <div className={styles['card-meta']}>
            <span className={styles['meta-item']}>等级 60 - 66</span>
            <span className={styles['meta-item']}>单人 / 小队</span>
          </div>
          <div className={styles['card-sub']}>适合长时间持续刷怪练级</div>
        </div>
        <div className={styles['card-actions']}>
          <button className="btn primary" onClick={handleStartOrPause}>
            {running ? '暂停' : '启动'}
          </button>
          {/* 中文注释：按需求移除第二个“暂停”按钮，仅保留“停止” */}
          <button className="btn" onClick={handleStop}>
            停止
          </button>
        </div>
      </section>

      {/* 中文注释：动态渲染用户自定义的新建卡片，样式与上方一致 */}
      {cards.map((c, idx) => (
        <section key={idx} className={styles['field-card-main']}>
          <div className={styles['card-main']}>
            <div className={styles['card-title-row']}>
              <div className={styles['card-title']}>{c.title}</div>
              <span className={`${styles.tag} ${styles['tag-pill']}`}>{c.tagLabel}</span>
            </div>
            <div className={styles['card-meta']}>
              <span className={styles['meta-item']}>{c.levelRangeLabel}</span>
              <span className={styles['meta-item']}>{c.modeLabel}</span>
            </div>
            {c.desc ? <div className={styles['card-sub']}>{c.desc}</div> : null}
          </div>
          <div className={styles['card-actions']}>
            {/* 中文注释：为新建卡片预留启动/停止按钮（与默认卡片行为一致，后续可绑定不同逻辑） */}
            <button className="btn primary" onClick={handleStartOrPause}>
              {running ? '暂停' : '启动'}
            </button>
            <button className="btn" onClick={handleStop}>
              停止
            </button>
          </div>
        </section>
      ))}

      {/* 中文注释：新建卡片弹框（简易） */}
      {newOpen ? (
        <div className={styles['modal-mask']}>
          <div className={styles['modal']}>
            <div className={styles['modal-header']}>
              <div className={styles['modal-title']}>新建卡片</div>
            </div>
            <div className={styles['modal-body']}>
              <div className={styles['form-row']}>
                <label>标题</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="请输入卡片标题" />
              </div>
              <div className={styles['form-row']}>
                <label>等级范围</label>
                <div className={styles['inline']}>
                  <input type="number" min={1} value={form.levelFrom} onChange={e => setForm({ ...form, levelFrom: Number(e.target.value) })} placeholder="下限" />
                  <span className={styles['sep']}>-</span>
                  <input type="number" min={1} value={form.levelTo} onChange={e => setForm({ ...form, levelTo: Number(e.target.value) })} placeholder="上限" />
                </div>
              </div>
              <div className={styles['form-row']}>
                <label>模式</label>
                <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value as NewCardFormValues['mode'] })}>
                  <option value="单人">单人</option>
                  <option value="小队">小队</option>
                </select>
              </div>
              <div className={styles['form-row']}>
                <label>标签</label>
                <input value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} placeholder="例如：练级" />
              </div>
              <div className="form-row">
                <label>描述</label>
                <textarea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="简要说明该卡片用途" rows={3} />
              </div>
            </div>
            <div className={styles['modal-footer']}>
              <button className="btn" onClick={closeNewModal}>
                取消
              </button>
              <button className="btn primary" onClick={submitNewCard}>
                创建
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FieldView;

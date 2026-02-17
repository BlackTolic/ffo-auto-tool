import React from 'react';
import styles from './Card.module.less'; // 中文注释：引入通用卡片组件样式（CSS Modules）

// 中文注释：通用卡片组件属性接口
export interface CardProps {
  title: string; // 中文注释：卡片主标题
  subtitle?: string; // 中文注释：卡片副标题（可选）
  right?: React.ReactNode; // 中文注释：卡片右侧操作区内容（按钮/切换等）
  footer?: React.ReactNode; // 中文注释：卡片底部区内容（说明/状态等，可选）
  children?: React.ReactNode; // 中文注释：卡片主体内容插槽（可选）
}

// 中文注释：通用卡片组件，统一样式与布局
const Card: React.FC<CardProps> = ({ title, subtitle, right, footer, children }) => {
  return (
    <section className={styles.card}>
      <div className={styles['card-left']}>
        <div className={styles['card-title']}>{title}</div>
        {subtitle ? <div className={styles['card-sub']}>{subtitle}</div> : null}
      </div>
      <div className={styles['card-right']}>{right}</div>
      {children}
      {footer ? <div className={`${styles['card-footer']} ${styles.small}`}>{footer}</div> : null}
    </section>
  );
};

export default Card;

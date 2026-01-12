import React from 'react';
import './Sidebar.less'; // 中文注释：引入侧边栏组件样式（Less）

// 中文注释：侧边栏导航项接口（供 Sidebar 使用）
export interface SidebarNavItem {
  id: string; // 中文注释：导航项唯一标识
  label: string; // 中文注释：导航显示文案
  active?: boolean; // 中文注释：是否为当前选中项（可选）
}

// 中文注释：Sidebar 组件的属性接口
export interface SidebarProps {
  items: SidebarNavItem[]; // 中文注释：要展示的导航项列表
}

// 中文注释：应用侧边栏（品牌、导航、底部按钮）
const Sidebar: React.FC<SidebarProps> = ({ items }) => {
  return (
    <aside className="sidebar">
      <div className="brand">GW</div>
      <nav className="nav">
        {items.map(item => (
          <div key={item.id} className={`nav-item ${item.active ? 'active' : ''}`}>
            {item.label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="btn ghost">仪表盘</button>
      </div>
    </aside>
  );
};

export default Sidebar;

import React, { useEffect, useState } from 'react';
import '../styles/global.module.less'; // 中文注释：引入全局基础样式与通用样式（Less）
import './App.module.less'; // 中文注释：引入 App 组件专属样式（Less）
import BindForegroundButton from './components/bind-foreground-button/BindForegroundButton';
import ContentHeader from './components/content-header/ContentHeader';
import Sidebar, { SidebarNavItem } from './components/sider/Sidebar';
import AutoRefineView from './views/auto-refine';
import BasicConfigView from './views/basic-config';
import DungeonView from './views/dungeon';
import EnhanceView from './views/enhance';
import FieldView from './views/field';
import MiningView from './views/mining';
import PetView from './views/pet';
import ReputationView from './views/reputation';

// 中文注释：侧边导航项接口类型
export interface NavItem {
  id: string; // 中文注释：导航项唯一标识
  label: string; // 中文注释：导航显示文案
  active?: boolean; // 中文注释：是否为当前选中项
}

// 中文注释：环境校验项的接口类型定义
export interface EnvItem {
  name: string; // 项目名称
  ok: boolean; // 是否通过
  message: string; // 中文说明信息
}

// 中文注释：环境校验结果的接口类型定义
export interface EnvCheckResult {
  ok: boolean; // 总体是否通过
  items: EnvItem[]; // 逐项结果列表
}

// 中文注释：绑定结果的接口类型定义
export interface BindResult {
  ok: boolean; // 是否绑定成功
  pid?: number; // 绑定的目标进程 PID
  hwnd?: number; // 绑定的目标窗口句柄
  count?: number; // 成功绑定的窗口数量
  message?: string; // 失败或提示信息
}

// 中文注释：路由项接口类型定义
export interface RouteItem {
  id: string; // 中文注释：路由唯一标识
  label: string; // 中文注释：菜单显示文案
  path: string; // 中文注释：哈希路由地址
  Component?: React.FC; // 中文注释：对应渲染的视图组件（首页可缺省）
}

// 中文注释：App 组件的属性接口（当前为空，预留扩展）
export interface AppProps {}

// 中文注释：App 根组件，用于展示环境信息与绑定操作（重构为左右布局）
export const App: React.FC<AppProps> = () => {
  // 中文注释：状态定义
  const [env, setEnv] = useState<EnvCheckResult | null>(null); // 环境校验结果
  const [binding, setBinding] = useState<boolean>(false); // 环境校验结果
  const [bindText, setBindText] = useState<string>(''); // 绑定结果文案

  // 中文注释：当前路由 id 状态（默认首页）
  const [currentRouteId, setCurrentRouteId] = useState<string>('home');

  const routes: RouteItem[] = [
    { id: 'home', label: '首页', path: '#/home' },
    { id: 'basic', label: '基本配置', path: '#/basic', Component: BasicConfigView },
    { id: 'field', label: '野外刷怪', path: '#/field', Component: FieldView },
    { id: 'mining', label: '挖矿', path: '#/mining', Component: MiningView },
    { id: 'enhance', label: '装备强化', path: '#/enhance', Component: EnhanceView },
    { id: 'auto-refine', label: '全自动刷炼化', path: '#/auto-refine', Component: AutoRefineView },
    { id: 'dungeon', label: '副本', path: '#/dungeon', Component: DungeonView },
    { id: 'pet', label: '抓宠', path: '#/pet', Component: PetView },
    { id: 'reputation', label: '名誉', path: '#/reputation', Component: ReputationView },
  ];

  // 中文注释：监听并应用哈希路由变化
  useEffect(() => {
    const applyFromHash = () => {
      const hash = window.location.hash || '#/home';
      const match = routes.find(r => r.path === hash) || routes[0];
      setCurrentRouteId(match.id);
    };
    if (typeof window !== 'undefined') {
      if (!window.location.hash) window.location.hash = '#/home';
      applyFromHash();
      window.addEventListener('hashchange', applyFromHash);
      return () => window.removeEventListener('hashchange', applyFromHash);
    }
  }, []);

  // 中文注释：侧边栏导航项（含 href 与高亮）
  const sidebarItems: SidebarNavItem[] = routes.map(r => ({
    id: r.id,
    label: r.label,
    href: r.path,
    active: r.id === currentRouteId,
  }));

  // 中文注释：检测当前是否在 Electron 环境（存在 preload 暴露的 API）
  const isElectron = typeof window !== 'undefined' && !!(window as any).env && !!(window as any).damo;

  // 中文注释：初始化时加载环境校验信息；在非 Electron 环境（浏览器预览）下给出友好提示
  useEffect(() => {
    (async () => {
      try {
        if (!isElectron) {
          setEnv({ ok: false, items: [{ name: 'EnvCheck', ok: false, message: '当前非 Electron 环境，无法执行环境检测（预览模式）' }] });
          return;
        }
        const result = (await (window as any).env.check()) as EnvCheckResult;
        setEnv(result);
      } catch (err: any) {
        setEnv({ ok: false, items: [{ name: 'EnvCheck', ok: false, message: `异常：${err?.message || String(err)}` }] });
      }
    })();
  }, [isElectron]);

  // 中文注释：点击绑定前台窗口
  const onBindForegroundClick = async () => {
    // 已抽取为 BindForegroundButton 组件的内部逻辑，这里不再使用
  };

  return (
    <div className="app-shell">
      {/* 中文注释：左侧导航栏 */}
      <Sidebar items={sidebarItems} />

      {/* 中文注释：右侧主内容区 */}
      <main className="content">
        {/* 中文注释：根据当前路由渲染内容；首页使用原有内容，其它路由渲染对应视图 */}
        {currentRouteId === 'home' ? (
          <>
            {/* 中文注释：顶部渐变统计区 */}
            <ContentHeader />

            {/* 中文注释：卡片区：服务器 */}
            <Card
              title="服务器"
              subtitle="53ms · 自动选择"
              right={
                <>
                  <button className="btn primary">切换</button>
                  <BindForegroundButton isElectron={isElectron} onStatus={setBindText} />
                </>
              }
              footer={bindText || (!isElectron ? '预览模式下无法绑定，请在 Electron 应用中使用' : '')}
            />

            {/* 中文注释：卡片区：代理模式 */}
            <Card
              title="代理模式"
              right={
                <div className="seg">
                  <button className="seg-btn active">规则</button>
                  <button className="seg-btn">全局</button>
                </div>
              }
            />

            {/* 中文注释：主操作按钮 */}
            <div className="action">
              <button className="btn xl primary">连接</button>
            </div>

            {/* 中文注释：环境校验展示 */}
            <Card title="环境校验结果">
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
            </Card>
          </>
        ) : (
          <>
            {/* 中文注释：非首页，渲染对应路由视图与占位提示 */}
            {(() => {
              const current = routes.find(r => r.id === currentRouteId);
              return <>{current?.Component ? React.createElement(current.Component) : null}</>;
            })()}
          </>
        )}
      </main>
    </div>
  );
};

export default App;

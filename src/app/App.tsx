import React, { useEffect, useState } from 'react';
import BindForegroundButton from './components/BindForegroundButton'; // 中文注释：绑定前台窗口按钮组件
import ContentHeader from './components/ContentHeader'; // 中文注释：顶部统计区组件
import Sidebar from './components/Sidebar'; // 中文注释：侧边栏组件
import './App.less'; // 中文注释：引入 App 组件专属样式（Less）
import '../styles/global.less'; // 中文注释：引入全局基础样式与通用样式（Less）

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

// 中文注释：App 组件的属性接口（当前为空，预留扩展）
export interface AppProps {}

// 中文注释：App 根组件，用于展示环境信息与绑定操作（重构为左右布局）
export const App: React.FC<AppProps> = () => {
  // 中文注释：状态定义
  const [env, setEnv] = useState<EnvCheckResult | null>(null); // 环境校验结果
  const [binding, setBinding] = useState<boolean>(false); // 环境校验结果
  const [bindText, setBindText] = useState<string>(''); // 绑定结果文案

  // 中文注释：侧边导航静态项（仅示意）
  const navItems: NavItem[] = [
    { id: 'home', label: '首页', active: true }, // 中文注释：默认选中首页
    { id: 'basic', label: '基本配置' }, // 中文注释：基础设置与参数
    { id: 'field', label: '野外刷怪' }, // 中文注释：野外自动打怪
    { id: 'dungeon', label: '副本' }, // 中文注释：副本相关操作
    { id: 'pet', label: '抓宠' }, // 中文注释：宠物抓捕功能
    { id: 'reputation', label: '名誉' }, // 中文注释：名誉任务与状态
  ];

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
      <aside className="sidebar">
        <Sidebar items={navItems} />
      </aside>

      {/* 中文注释：右侧主内容区 */}
      <main className="content">
        {/* 中文注释：顶部渐变统计区 */}
        <section className="content-header">
          <ContentHeader />
        </section>

        {/* 中文注释：卡片区：服务器 */}
        <section className="card">
          <div className="card-left">
            <div className="card-title">服务器</div>
            <div className="card-sub">53ms · 自动选择</div>
          </div>
          <div className="card-right">
            <button className="btn primary">切换</button>
            <BindForegroundButton isElectron={isElectron} onStatus={setBindText} />
          </div>
          <div className="card-footer small">{bindText || (!isElectron ? '预览模式下无法绑定，请在 Electron 应用中使用' : '')}</div>
        </section>

        {/* 中文注释：卡片区：代理模式 */}
        <section className="card">
          <div className="card-left">
            <div className="card-title">代理模式</div>
          </div>
          <div className="card-right">
            <div className="seg">
              <button className="seg-btn active">规则</button>
              <button className="seg-btn">全局</button>
            </div>
          </div>
        </section>

        {/* 中文注释：主操作按钮 */}
        <div className="action">
          <button className="btn xl primary">连接</button>
        </div>

        {/* 中文注释：环境校验展示 */}
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
      </main>
    </div>
  );
};

export default App;

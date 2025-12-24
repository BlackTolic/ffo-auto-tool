import React, { useEffect, useState } from 'react';

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

// 中文注释：App 根组件，用于展示环境信息与绑定操作
export const App: React.FC<AppProps> = () => {
  // 中文注释：状态定义
  const [env, setEnv] = useState<EnvCheckResult | null>(null); // 环境校验结果
  const [binding, setBinding] = useState<boolean>(false); // 绑定进行中标志
  const [bindText, setBindText] = useState<string>(''); // 绑定结果文案

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
    if (binding) return;
    setBinding(true);
    setBindText('正在绑定前台窗口…');
    try {
      const ret = (await (window as any).damo.bindForeground()) as BindResult;
      if (ret.ok) {
        setBindText(`绑定成功 | pid=${ret.pid} hwnd=${ret.hwnd} count=${ret.count}`);
      } else {
        setBindText(`绑定失败：${ret.message || '未知错误'}`);
      }
    } catch (e: any) {
      setBindText(`绑定异常：${e?.message || String(e)}`);
    } finally {
      setBinding(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      {/* 中文注释：标题 */}
      <h2>React 界面 · FFO 辅助工具</h2>

      {/* 中文注释：绑定操作区 */}
      <section style={{ marginBottom: 16 }}>
        <h3>绑定操作</h3>
        <div>
          <button onClick={onBindForegroundClick} disabled={binding || !isElectron}>
            绑定当前前台窗口
          </button>
          <span style={{ marginLeft: 8, color: '#555' }}>{bindText || (!isElectron ? '预览模式下无法绑定，请在 Electron 应用中使用' : '')}</span>
        </div>
        <p style={{ marginTop: 8, color: '#888' }}>
          提示：推荐在目标窗口中按 <strong>Alt+B</strong> 进行绑定；点击按钮会聚焦本应用窗口，通常无法捕获目标前台窗口。
        </p>
      </section>

      {/* 中文注释：环境校验显示区 */}
      <section>
        <h3>环境校验结果</h3>
        {!env ? (
          <p>正在检测...</p>
        ) : (
          <div>
            <p>
              总体状态：<strong>{env.ok ? '通过 ✅' : '未通过 ❌'}</strong>
            </p>
            <ul>
              {env.items?.map((i, idx) => (
                <li key={idx}>
                  {i.ok ? '✅' : '❌'} <strong>{i.name}</strong>：{i.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};

export default App;

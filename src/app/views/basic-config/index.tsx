import { useEffect, useState } from 'react';
import './index.less'; // 中文注释：引入当前视图的 Less 样式文件（替换原内联样式）

// 中文注释：基本配置界面 - 增加“选择可绑定窗口”下拉框与“绑定”按钮
// 说明：通过 preload 暴露的 window.damo API 从主进程获取候选窗口列表，并允许按句柄绑定

interface BindableOption {
  value: number; // 中文注释：窗口句柄
  label: string; // 中文注释：下拉显示的文本
}

export default function BasicConfigView() {
  const [options, setOptions] = useState<BindableOption[]>([]); // 中文注释：候选选项
  const [selectedHwnd, setSelectedHwnd] = useState<number | null>(null); // 中文注释：当前选择的句柄
  const [loading, setLoading] = useState<boolean>(false); // 中文注释：加载状态
  const [binding, setBinding] = useState<boolean>(false); // 中文注释：绑定状态
  const [message, setMessage] = useState<string>(''); // 中文注释：操作提示
  const [boundList, setBoundList] = useState<BoundWindow[]>([]); // 中文注释：当前已绑定窗口列表
  const [unbinding, setUnbinding] = useState<boolean>(false); // 中文注释：解绑状态

  // 中文注释：已绑定窗口句柄集合（用于在下拉框标红）
  const boundSet = new Set(boundList.map(b => b.hwnd));

  // 新增：判断是否处于 Electron 环境（预览模式下不具备 damo 与 env）
  const isElectron = typeof window !== 'undefined' && !!(window as any).damo && !!(window as any).env; // 中文注释：存在 preload 暴露的 API 则认为是 Electron

  // 中文注释：格式化候选项的显示文本
  const formatLabel = (w: any): string => {
    const title = w.title || '(无标题)';
    const cls = w.className || '(无类名)';
    return `${title} | ${cls} | hwnd=${w.hwnd} | pid=${w.pid}`;
  };

  // 中文注释：加载候选窗口列表
  const loadWindows = async () => {
    // 新增：在浏览器预览模式下给出提示并跳过调用
    if (!isElectron) {
      setOptions([]);
      setSelectedHwnd(null);
      setMessage('当前为浏览器预览模式，无法获取可绑定窗口列表');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const list = await window.damo.listBindableWindows();
      console.log('可绑定窗口列表:', list);
      // 中文注释：仅保留标题或类名包含“QQ幻想”的窗口（中文匹配不区分大小写）
      const targetField = 'QQ幻想';
      const filtered = list.filter(w => {
        const title = String(w.title || '');
        const cls = String(w.className || '');
        return title.includes(targetField) || cls.includes(targetField);
      });
      const opts = filtered.map(w => ({ value: w.hwnd, label: formatLabel(w) }));
      setOptions(opts);
      // 优先选择第一个候选项
      setSelectedHwnd(opts.length > 0 ? opts[0].value : null);

      // 新增：若查不到可绑定窗口，则批量清空所有已绑定窗口
      if (opts.length === 0) {
        const res = await window.damo.unbindAll();
        if (res.ok) {
          setMessage('未找到可绑定窗口，已清空所有已绑定窗口');
        } else {
          setMessage(res.message || '未找到可绑定窗口，尝试清空已绑定窗口失败');
        }
        // 中文注释：清空后刷新已绑定列表
        await loadBoundWindows();
      }
    } catch (err: any) {
      setMessage(err?.message || '加载可绑定窗口列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 新增：加载当前已绑定窗口列表
  const loadBoundWindows = async () => {
    if (!isElectron) {
      setBoundList([]);
      return;
    }
    try {
      const list = await window.damo.listBoundWindows();
      console.log('已绑定窗口列表:', list);
      setBoundList(list || []);
    } catch (err) {
      // 中文注释：非致命错误，仅打印日志以便调试
      console.warn('加载已绑定窗口列表失败', err);
    }
  };

  useEffect(() => {
    // 中文注释：组件挂载时加载候选窗口与已绑定窗口列表
    loadWindows();
    loadBoundWindows();
  }, []);

  // 中文注释：绑定当前选择的句柄
  const handleBind = async () => {
    if (!selectedHwnd) {
      setMessage('请选择一个窗口');
      return;
    }
    // 新增：浏览器预览模式下直接提示
    if (!isElectron) {
      setMessage('预览模式无法执行绑定，请在 Electron 应用中操作');
      return;
    }
    setBinding(true);
    setMessage('');
    try {
      const res = await window.damo.bindHwnd(selectedHwnd);
      if (res.ok) {
        setMessage(`绑定成功：hwnd=${res.hwnd}`);
        // 中文注释：绑定成功后刷新“已绑定窗口列表”
        await loadBoundWindows();
      } else {
        setMessage(res.message || '绑定失败');
      }
    } catch (err: any) {
      setMessage(err?.message || '绑定过程发生错误');
    } finally {
      setBinding(false);
    }
  };

  // 中文注释：刷新候选与已绑定窗口列表
  const handleRefresh = async () => {
    await loadWindows();
    await loadBoundWindows();
  };

  // 新增：解绑当前选择的句柄
  const handleUnbind = async () => {
    if (!selectedHwnd) {
      setMessage('请选择一个窗口');
      return;
    }
    if (!isElectron) {
      setMessage('预览模式无法执行解绑，请在 Electron 应用中操作');
      return;
    }
    setUnbinding(true);
    setMessage('');
    try {
      const res = await window.damo.unbindHwnd(selectedHwnd);
      if (res.ok) {
        setMessage(`解绑成功：hwnd=${res.hwnd}`);
        await loadBoundWindows();
      } else {
        setMessage(res.message || '解绑失败');
      }
    } catch (err: any) {
      setMessage(err?.message || '解绑过程发生错误');
    } finally {
      setUnbinding(false);
    }
  };

  return (
    <div className="basic-config-container">
      <h3>基本配置</h3>
      <div className="basic-row">
        <select className="basic-select" disabled={loading || !isElectron} value={selectedHwnd ?? ''} onChange={e => setSelectedHwnd(Number(e.target.value))}>
          {options.length === 0 ? (
            <option value="">{loading ? '加载中…' : isElectron ? '无可绑定窗口' : '预览模式不可用'}</option>
          ) : (
            options.map(opt => {
              // 中文注释：将已绑定的项标红色
              const isBound = boundSet.has(opt.value);
              return (
                <option key={opt.value} value={opt.value} style={{ color: isBound ? '#d93025' : undefined }}>
                  {opt.label}
                </option>
              );
            })
          )}
        </select>
        <button className="basic-button" disabled={binding || !selectedHwnd || !isElectron} onClick={handleBind}>
          {binding ? '绑定中…' : '绑定'}
        </button>
        <button className="basic-button" disabled={unbinding || !selectedHwnd || !isElectron} onClick={handleUnbind}>
          {unbinding ? '解绑中…' : '解绑'}
        </button>
        <button className="basic-button" disabled={loading} onClick={handleRefresh}>
          刷新
        </button>
      </div>
      <div className="basic-hint">在下拉框中选择一个可绑定的窗口，然后点击“绑定”。</div>
      {!isElectron && <div className="basic-hint">提示：当前为浏览器预览模式，绑定功能不可用，请在 Electron 应用中使用。</div>}
      {message && <div>{message}</div>}

      {/* 新增：已绑定窗口列表展示区域 */}
      <div className="basic-bound-section">
        <h4>已绑定窗口（{boundList.length}）</h4>
        {boundList.length === 0 ? (
          <div className="basic-hint">暂无已绑定窗口</div>
        ) : (
          <ul className="basic-bound-list">
            {boundList.map(item => (
              <li key={item.hwnd} className="basic-bound-item">
                <span className="basic-bound-title">{item.title || '(无标题)'}</span>
                <span className="basic-bound-meta">
                  {item.className || '(无类名)'} | hwnd={item.hwnd} | pid={item.pid}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import './BindForegroundButton.module.less'; // 中文注释：引入绑定按钮组件样式（全局按钮样式仍使用 .btn）

// 中文注释：绑定结果接口类型
export interface BindResult {
  ok: boolean; // 中文注释：是否绑定成功
  pid?: number; // 中文注释：绑定的目标进程 PID（可选）
  hwnd?: number; // 中文注释：绑定的目标窗口句柄（可选）
  count?: number; // 中文注释：成功绑定的窗口数量（可选）
  message?: string; // 中文注释：失败或提示信息（可选）
}

// 中文注释：BindForegroundButton 组件的属性接口
export interface BindForegroundButtonProps {
  isElectron: boolean; // 中文注释：是否在 Electron 环境下（决定可用性）
  onStatus?: (text: string) => void; // 中文注释：绑定过程的状态文案回调（可选）
}

// 中文注释：绑定前台窗口按钮组件，封装交互与状态管理
const BindForegroundButton: React.FC<BindForegroundButtonProps> = ({ isElectron, onStatus }) => {
  const [loading, setLoading] = useState<boolean>(false); // 中文注释：绑定中的加载态

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    onStatus?.('正在绑定前台窗口…');
    try {
      const ret = (await (window as any).damo.bindForeground()) as BindResult;
      if (ret.ok) {
        onStatus?.(`绑定成功 | pid=${ret.pid} hwnd=${ret.hwnd} count=${ret.count}`);
      } else {
        onStatus?.(`绑定失败：${ret.message || '未知错误'}`);
      }
    } catch (e: any) {
      onStatus?.(`绑定异常：${e?.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button className="btn" onClick={handleClick} disabled={loading || !isElectron}>
      绑定前台窗口
    </button>
  );
};

export default BindForegroundButton;

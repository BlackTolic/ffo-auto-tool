// 中文注释：React 入口，挂载根组件到页面
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './index.css';

// 新增：字库信息接口定义（中文注释）
interface DictSourceInfo {
  type: string; // 中文注释：字库来源类型（例如 文件、内置 等）
  path?: string; // 中文注释：字库文件路径（若来源为文件）
  length?: number; // 中文注释：字库数据长度（字节数，可选）
}

interface DictInfo {
  activeIndex?: number; // 中文注释：当前激活的字库索引（可选，未知则为空）
  source?: DictSourceInfo | null; // 中文注释：字库来源信息（可能为空或未知）
}

// 新增：从 renderer.ts 迁移的功能函数（保持旧 DOM ID 兼容，若不存在则直接返回）
const renderEnvStatus = async () => {
  const envStatusEl = document.getElementById('env-status');
  if (!envStatusEl) return;
  try {
    const status = await window.env.check(); // 中文注释：调用预加载中的环境校验
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(status, null, 2);
    envStatusEl.appendChild(pre);
  } catch (err) {
    const pre = document.createElement('pre');
    pre.textContent = `环境校验失败: ${String(err)}`;
    envStatusEl.appendChild(pre);
  }
};

const renderDictInfo = async () => {
  const container = document.getElementById('dict-info-content');
  if (!container) return;
  try {
    const info: DictInfo | null = await window.damo.getDictInfo();
    const lines: string[] = [];
    if (!info) {
      lines.push('未获取到字库信息（插件未初始化或未绑定窗口）');
    } else {
      const idx = info.activeIndex ?? null;
      const src = info.source ?? null;
      lines.push(`当前字库索引: ${idx === null ? '未知' : idx}`);
      if (src) {
        lines.push(`字库来源类型: ${src.type}`);
        if (src.path) lines.push(`字库文件: ${src.path}`);
        if (typeof src.length === 'number') lines.push(`字库长度: ${src.length} 字节`);
      } else {
        lines.push('字库来源: 未知');
      }
    }
    container.textContent = lines.join('\n');
  } catch (err) {
    container.textContent = `查询字库信息失败: ${String(err)}`;
  }
};

const subscribeDictInfoUpdates = () => {
  const container = document.getElementById('dict-info-content');
  if (!container) return;
  // 中文注释：以下事件 API 依赖 preload 暴露；若未实现，将在运行时报 warn
  // @ts-expect-error 运行时存在 onDictInfoUpdated/类型未在 DamoAPI 中声明
  window.damo.onDictInfoUpdated(({ hwnd, info }: { hwnd: number; info: DictInfo | null }) => {
    try {
      const lines: string[] = [];
      lines.push(`窗口句柄: ${hwnd}`);
      if (!info) {
        lines.push('未获取到字库信息（插件未初始化或未绑定窗口）');
      } else {
        const idx = info.activeIndex ?? null;
        const src = info.source ?? null;
        lines.push(`当前字库索引: ${idx === null ? '未知' : idx}`);
        if (src) {
          lines.push(`字库来源类型: ${src.type}`);
          if (src.path) lines.push(`字库文件: ${src.path}`);
          if (typeof src.length === 'number') lines.push(`字库长度: ${src.length} 字节`);
        } else {
          lines.push('字库来源: 未知');
        }
      }
      container.textContent = lines.join('\n');
    } catch (e) {
      container.textContent = `刷新字库信息失败: ${String((e as any)?.message || e)}`;
    }
  });
};

const setupBindActions = () => {
  const btn = document.getElementById('bind-foreground-btn') as HTMLButtonElement | null;
  const resultEl = document.getElementById('bind-foreground-result');
  if (!btn || !resultEl) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true; // 中文注释：防重入
    resultEl.textContent = '正在绑定前台窗口…';
    try {
      const ret = await window.damo.bindForeground();
      if (ret.ok) {
        resultEl.textContent = `绑定成功 | pid=${ret.pid} hwnd=${ret.hwnd} count=${ret.count}`;
      } else {
        resultEl.textContent = `绑定失败：${ret.message || '未知错误'}`;
      }
    } catch (e: any) {
      resultEl.textContent = `绑定异常：${e?.message || e}`;
    } finally {
      btn.disabled = false;
    }
  });
};

// 中文注释：确认渲染入口执行与插件版本
window.damo
  .ver()
  .then(v => console.log('[Damo] Ver:', v))
  .catch(e => console.warn('[Damo] 不可用:', e?.message || e));

console.log('👋 This message is being logged by "renderer.tsx" (merged from renderer.ts)');

// 中文注释：禁用右键默认菜单，避免出现浏览器上下文菜单
window.addEventListener('contextmenu', event => {
  event.preventDefault();
});

// 中文注释：页面加载后渲染旧版信息块并注册交互
window.addEventListener('DOMContentLoaded', () => {
  renderEnvStatus();
  renderDictInfo();
  subscribeDictInfoUpdates();
  setupBindActions();
});

// 中文注释：在页面卸载/关闭前执行清理（取消 IPC 事件订阅）
window.addEventListener('beforeunload', () => {
  try {
    // @ts-expect-error 运行时存在 offDictInfoUpdated/类型未在 DamoAPI 中声明
    window.damo.offDictInfoUpdated();
  } catch (e) {
    console.warn('[渲染清理] 取消字库更新订阅失败:', String((e as any)?.message || e));
  }
});

// 中文注释：在页面上以卡片样式展示环境校验结果（若存在对应容器）
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('env-status');
  if (!container) return;
  container.innerHTML = '<h2>环境校验结果</h2><p>正在检测...</p>';

  try {
    const result = await window.env.check();
    const ok = result?.ok;
    const items: Array<{ name: string; ok: boolean; message: string }> = result?.items || [];

    const listHtml = items
      .map(i => {
        const status = i.ok ? '✅' : '❌';
        return `<li>${status} <strong>${i.name}</strong>：${i.message}</li>`;
      })
      .join('');

    container.innerHTML = `
      <h2>环境校验结果：${ok ? '通过 ✅' : '未通过 ❌'}</h2>
      <ul>${listHtml}</ul>
      <p style="color:${ok ? '#2e7d32' : '#c62828'}">${ok ? '环境满足要求，可以正常使用大漠插件。' : '环境未满足要求，请按上述提示修复。'}</p>
    `;
  } catch (err: any) {
    container.innerHTML = `
      <h2>环境校验结果：异常 ❌</h2>
      <p>获取校验结果失败：${err?.message || err}</p>
    `;
  }
});

// 中文注释：获取 React 挂载容器（index.html 里的 <div id="root">）
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />); // 中文注释：挂载 React 应用到页面
} else {
  console.warn('未找到 #root 容器，React UI 未挂载。');
}

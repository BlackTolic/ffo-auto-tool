/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true,
 *    },
 *  });
 * ```
 */

import './index.css';

// 中文注释：渲染首页的环境状态
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

// 中文注释：渲染首页的当前 OCR 字库信息
const renderDictInfo = async () => {
  const container = document.getElementById('dict-info-content');
  if (!container) return;
  try {
    // 中文注释：不带 hwnd，查询默认大漠实例当前字库信息
    const info = await window.damo.getDictInfo();
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

// 中文注释：订阅主进程广播的字库信息更新事件，自动刷新显示
const subscribeDictInfoUpdates = () => {
  const container = document.getElementById('dict-info-content');
  if (!container) return;
  window.damo.onDictInfoUpdated(({ hwnd, info }) => {
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
      container.textContent = `刷新字库信息失败: ${String(e)}`;
    }
  });
};

// 中文注释：绑定按钮点击处理（调用主进程实现的一键绑定前台窗口）
const setupBindActions = () => {
  const btn = document.getElementById('bind-foreground-btn') as HTMLButtonElement | null;
  const resultEl = document.getElementById('bind-foreground-result');
  if (!btn || !resultEl) return;
  btn.addEventListener('click', async () => {
    // 中文注释：防重入，点击一次期间禁用按钮
    btn.disabled = true;
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

window.addEventListener('DOMContentLoaded', () => {
  // 中文注释：页面加载后渲染环境状态与字库信息，并订阅更新
  renderEnvStatus();
  renderDictInfo();
  subscribeDictInfoUpdates();
  setupBindActions();

  // 中文注释：移除渲染进程的 Alt+W 监听，避免与全局快捷键重复触发
  // 如需在仅界面焦点下触发，可恢复此监听：
  // window.addEventListener('keydown', async (e) => {
  //   if (e.altKey && String(e.key).toLowerCase() === 'w') {
  //     await window.damo.toggleAutoKey('F1', 200);
  //   }
  // });
});

// 中文注释：在页面卸载/关闭前执行清理（取消 IPC 事件订阅）
window.addEventListener('beforeunload', () => {
  try {
    window.damo.offDictInfoUpdated();
  } catch (e) {
    console.warn('[渲染清理] 取消字库更新订阅失败:', String((e as any)?.message || e));
  }
});

// Demo: query Damo version from main (will error if winax/DM 未安装)

window.damo
  .ver()
  .then((v) => console.log('[Damo] Ver:', v))
  .catch((e) => console.warn('[Damo] 不可用:', e?.message || e));

console.log('👋 This message is being logged by "renderer.ts", included via webpack');

// 新增：在页面上展示环境校验结果（中文注释）
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('env-status');
  if (!container) return;
  container.innerHTML = '<h2>环境校验结果</h2><p>正在检测...</p>';

  try {
    const result = await window.env.check();
    const ok = result?.ok;
    const items: Array<{ name: string; ok: boolean; message: string }> = result?.items || [];

    const listHtml = items
      .map((i) => {
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

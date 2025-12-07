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

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

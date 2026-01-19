import { BrowserWindow, Notification } from 'electron';
import fs from 'fs'; // 中文注释：读取字典文件
import path from 'path'; // 中文注释：处理文件路径
import { OCR_FONT_PATH, SCREENSHOT_PATH } from '../constant/config';
import { damoBindingManager, ffoEvents } from '../ffo/events';
import { Role } from '../ffo/events/rolyer';
import { stopAutoCombat } from '../ffo/utils/auto-combat';
import { stopKeyPress } from '../ffo/utils/key-press';

// 中文注释：向所有渲染进程广播字库信息更新
export const broadcastDictInfoUpdated = (hwnd: number, info: any) => {
  BrowserWindow.getAllWindows().forEach(w => w.webContents.send('damo:dictInfoUpdated', { hwnd, info }));
};

// 中文注释：记录最近绑定成功的窗口句柄（供部分逻辑使用）
let lastBoundHwnd: number | null = null;

// 中文注释：为绑定成功事件注册处理逻辑（加载字库、调试输出、截图与 OCR 示例）
export const registerBoundEventHandlers = () => {
  ffoEvents.on('bound', async ({ pid, hwnd }) => {
    new Notification({ title: '绑定成功', body: `PID=${pid} HWND=${hwnd}` }).show();
    lastBoundHwnd = hwnd; // 中文注释：记录最近绑定的窗口句柄（供其他逻辑参考，不参与快捷键切换）
    const rec = damoBindingManager.get(hwnd);
    const ad = new Role();
    // 注册角色信息 1280*800  1600*900
    // ad.registerRole('1600*900');
    ad.registerRole('1280*800', hwnd);
    // 中文注释：设置角色信息
    damoBindingManager.setRole(hwnd, ad);

    if (!rec) return;
    try {
      const dm = rec?.ffoClient?.dm;
      let dictLoaded = false;
      if (fs.existsSync(OCR_FONT_PATH)) {
        try {
          // 加载ffo字库
          const ret = await rec?.ffoClient?.loadDictFromFileAsync(0, OCR_FONT_PATH);
          if (ret === 1) {
            // 中文注释：加载字库成功后，启用索引 0（默认字库）
            dm?.UseDict(0);
            console.log(`[OCR字典] 已加载 ${path.basename(OCR_FONT_PATH)} 并启用索引 0`);
            dictLoaded = true;
            const info = rec?.ffoClient?.getCurrentDictInfo?.();
            // 中文注释：广播字库信息更新事件（供渲染进程监听）
            broadcastDictInfoUpdated(hwnd, info);
          } else {
            console.warn(`[OCR字典] SetDict 返回值=${ret} | 路径=${OCR_FONT_PATH}`);
          }
        } catch (err) {
          console.warn(`[OCR字典] 加载失败: ${OCR_FONT_PATH} | ${String((err as any)?.message || err)}`);
        }
      }
      if (!dictLoaded) {
        dm?.UseDict(0);
        console.log('[OCR字典] 使用默认字典索引 0（未找到或加载失败）');
      }

      // 中文注释：示例截图（可选）
      try {
        // 截取当前窗口内容
        const windowRect = dm?.GetWindowRect?.(hwnd);
        if (!windowRect) {
          console.warn(`[截图失败] 获取窗口矩形失败 HWND=${hwnd}`);
          return;
        }
        const cap = dm?.CapturePng?.(windowRect.left, windowRect.top, windowRect.right - 1, windowRect.bottom - 1, `${SCREENSHOT_PATH}/${pid}.png`);
        if (cap) {
          console.log(`[截图] PNG=${cap} | ${SCREENSHOT_PATH}/${pid}.png`);
        } else {
          console.warn(`[截图失败] 截图返回值=${cap} HWND=${hwnd}`);
        }
      } catch (err) {
        console.log(`[截图失败] HWND=${hwnd}`, err);
      }
    } catch (err) {
      console.warn(`[绑定事件] 处理失败: ${String((err as any)?.message || err)}`);
    }
  });
  // 中文注释：解绑事件处理（停止定时器与清理状态）
  ffoEvents.on('unbind', async ({ hwnd }) => {
    try {
      // 中文注释：停止自动打怪（释放定时器）
      stopAutoCombat(hwnd);
      // 中文注释：停止自动按键（释放定时器）
      stopKeyPress(hwnd);
      // 中文注释：更新自动按键状态并重置最近绑定句柄
      // autoKeyOnByHwnd.delete(hwnd);
      if (lastBoundHwnd === hwnd) lastBoundHwnd = null;
    } catch (err) {
      console.warn(`[解绑事件] 清理失败: ${String((err as any)?.message || err)}`);
    }
  });
};

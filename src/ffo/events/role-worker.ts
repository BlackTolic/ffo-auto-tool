import fs from 'fs';
import { parentPort, workerData } from 'worker_threads';
import { getVerifyCodeByAliQW } from '../../AI/ali-qianwen';
import { getVerifyCodeByTuJian } from '../../AI/tu-jian';
import { ensureDamo } from '../../auto-plugin/index';
import { OCR_FONT_PATH, VERIFY_CODE_OPTIONS_PATH, VERIFY_CODE_QUESTION_PATH } from '../../constant/config';
import { DEFAULT_VERIFY_CODE_TEXT } from '../constant/OCR-pos';
import { readVerifyCodeImage } from '../utils/common/read-file';
import { checkInviteTeam, getBloodStatus, getMapName, getMonsterName, getRoleName, getRolePosition, getVerifyCodePos, isDeadCYPos, isOffline } from '../utils/ocr-check/base';

/**
 * 子线程任务逻辑
 * 负责高频的 OCR 识别、状态监控
 */

const { hwnd, bindWindowSize, name: initialName, job, needCheckDead } = workerData;

// 子线程内初始化自己的插件实例
const dm = ensureDamo();

let loopIsRuning = true;
let lastVerifyCaptureTs = 0;
let openCapture = true;

// 初始化：注册、绑定窗口和加载字库
const init = async () => {
  try {
    if (!hwnd || hwnd <= 0) {
      throw new Error(`非法句柄: ${hwnd}`);
    }

    // 1. 注册大漠 (如果需要收费功能)
    dm.reg();

    // 2. 绑定窗口 - 使用项目统一的配置 (参考 DamoBindingManager 的 defaultConfig)
    const display = 'dx.graphic.2d';
    const mouse = 'dx.mouse.position.lock.api|dx.mouse.position.lock.message';
    const keypad = 'dx.keypad.state.api|dx.keypad.api';
    const api = '';
    const mode = 0;
    console.log(hwnd, 'hwnd');
    const ret = dm.bindWindow(hwnd, display, mouse, keypad, api, mode);
    if (ret !== 1) {
      throw new Error(`BindWindow 失败，返回值=${ret}, hwnd=${hwnd}`);
    }

    // 3. 加载字库
    if (fs.existsSync(OCR_FONT_PATH)) {
      try {
        // 中文注释：改用异步方法加载（内部传递路径），避免同步加载读取大文件内容导致的 COM 缓冲区溢出错误（数据区域太小）
        const ret = await dm.loadDictFromFileAsync(0, OCR_FONT_PATH);
        if (ret === 1) {
          dm.useDict(0);

          // 4. 初始化角色信息并通知主线程
          const currentName = getRoleName(dm, bindWindowSize);
          const currentPos = getRolePosition(dm, bindWindowSize);
          parentPort?.postMessage({
            type: 'INITIALIZED',
            data: { name: currentName, position: currentPos },
          });

          parentPort?.postMessage({ type: 'LOG', level: 'info', message: `[角色工作线程] 子线程初始化成功，角色名: ${currentName}` });
        } else {
          parentPort?.postMessage({ type: 'LOG', level: 'error', message: `[角色工作线程] 加载字库失败，返回值: ${ret}` });
        }
      } catch (err) {
        parentPort?.postMessage({ type: 'LOG', level: 'error', message: `[角色工作线程] 加载字库异常: ${String(err)}` });
      }
    } else {
      parentPort?.postMessage({ type: 'LOG', level: 'warn', message: `[角色工作线程] 未找到字库文件: ${OCR_FONT_PATH}` });
    }

    return true;
  } catch (err) {
    parentPort?.postMessage({ type: 'LOG', level: 'error', message: `[角色工作线程] 初始化失败: ${String(err)}` });
    return false;
  }
};

const loop = async () => {
  try {
    if (!loopIsRuning) return;

    // 获取角色位置
    const position = getRolePosition(dm, bindWindowSize);
    console.log(position, 'position');

    // 如果没有位置，通知主线程并阻塞
    if (!position) {
      parentPort?.postMessage({ type: 'LOG', level: 'warn', message: '[角色工作线程] 未获取到角色位置，阻塞两秒' });
      // 在子线程中使用同步 delay 是可以的，因为它不阻塞主线程
      dm.delay(2000);
    }

    const map = getMapName(dm, bindWindowSize);
    const selectMonster = getMonsterName(dm, bindWindowSize);
    const bloodStatus = getBloodStatus(dm, bindWindowSize);

    // 将基础状态实时发回主线程
    parentPort?.postMessage({
      type: 'STATUS_UPDATE',
      data: { position, map, selectMonster, bloodStatus },
    });

    // 队伍邀请检查
    const isInviteTeam = checkInviteTeam(dm, bindWindowSize);
    if (isInviteTeam) {
      parentPort?.postMessage({ type: 'TEAM_INVITE', data: { rejectPos: { x: 870, y: 573 }, agreePos: { x: 738, y: 573 } } });
    }

    // 验证码检查 (OCR + AI)
    const verifyCodeTextPos = getVerifyCodePos(dm, bindWindowSize);
    if (verifyCodeTextPos) {
      const now = Date.now();
      if (openCapture || now - lastVerifyCaptureTs >= 10000) {
        const checkPos = DEFAULT_VERIFY_CODE_TEXT[bindWindowSize as keyof typeof DEFAULT_VERIFY_CODE_TEXT];
        const questionImg = dm.capturePng(verifyCodeTextPos.x, verifyCodeTextPos.y + 60, verifyCodeTextPos.x + 100, verifyCodeTextPos.y + 130, `${VERIFY_CODE_QUESTION_PATH}`);
        const optionsImg = dm.capturePng(verifyCodeTextPos.x + 200, verifyCodeTextPos.y + 30, verifyCodeTextPos.x + 250, verifyCodeTextPos.y + 110, `${VERIFY_CODE_OPTIONS_PATH}`);

        if (String(questionImg) === '1' && String(optionsImg) === '1') {
          openCapture = false;
          lastVerifyCaptureTs = now;

          // 离线检查
          if (isOffline(dm, bindWindowSize)) {
            parentPort?.postMessage({ type: 'OFFLINE' });
            return;
          }

          const optionsUrl = readVerifyCodeImage(`${VERIFY_CODE_OPTIONS_PATH}`, 'ali');
          const questionUrl = readVerifyCodeImage(`${VERIFY_CODE_QUESTION_PATH}`, 'tujian');

          if (optionsUrl && questionUrl) {
            try {
              const [Ali = '', TuJian = ''] = await Promise.all([getVerifyCodeByAliQW(optionsUrl), getVerifyCodeByTuJian(questionUrl)]);
              parentPort?.postMessage({ type: 'VERIFY_CODE_RESULT', data: { Ali, TuJian, verifyCodeTextPos, checkPos } });
            } catch (err) {
              parentPort?.postMessage({ type: 'LOG', level: 'error', message: `[角色工作线程] 验证码识别失败: ${String(err)}` });
            }
          }
        }
      }
    } else {
      openCapture = true;
    }

    // 死亡检查
    if (needCheckDead && isDeadCYPos(dm, bindWindowSize)) {
      parentPort?.postMessage({ type: 'DEATH_DETECTED' });
    }
  } catch (err) {
    parentPort?.postMessage({ type: 'LOG', level: 'error', message: `[角色工作线程] 轮询失败: ${String((err as any)?.message || err)}` });
  } finally {
    if (loopIsRuning) {
      setTimeout(loop, 250);
    }
  }
};

// 执行初始化并启动循环
init().then(success => {
  if (success) {
    loop();
  }
});

// 监听主线程消息
parentPort?.on('message', msg => {
  if (msg.type === 'STOP_LOOP') {
    loopIsRuning = false;
    try {
      dm.unbindWindow();
    } catch {}
  } else if (msg.type === 'UPDATE_CONFIG') {
    Object.assign(workerData, msg.data);
  } else if (msg.type === 'CALL_DM') {
    const { method, args } = msg.data;
    try {
      // 优先调用 Damo 类封装的方法，如果没有则调用原始 dm 对象的方法
      const target = typeof (dm as any)[method] === 'function' ? dm : dm.dm;
      if (target && typeof target[method] === 'function') {
        target[method](...args);
      }
    } catch (err) {
      parentPort?.postMessage({ type: 'LOG', level: 'error', message: `[角色工作线程] 执行远程指令失败 (${String(method)}): ${String(err)}` });
    }
  }
});

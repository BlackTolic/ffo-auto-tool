import fs from 'fs';
import { parentPort, workerData } from 'worker_threads';
import { getVerifyCodeByAliQW } from '../AI/ali-qianwen';
import { getVerifyCodeByTuJian } from '../AI/tu-jian';
import { ensureDamo } from '../auto-plugin/index';
import { OCR_FONT_PATH, VERIFY_CODE_OPTIONS_PATH, VERIFY_CODE_QUESTION_PATH } from '../constant/config';
import { DEFAULT_VERIFY_CODE_TEXT } from '../ffo/constant/OCR-pos';
import { readVerifyCodeImage } from '../ffo/utils/common/read-file';
import { checkInviteTeam, getBloodStatus, getMapName, getMonsterName, getRoleName, getRolePosition, getVerifyCodePos, isDeadCYPos, isOffline } from '../ffo/utils/ocr-check/base';

/**
 * 子线程任务逻辑
 * 负责高频的 OCR 识别、状态监控
 */

const { needCheckDead } = workerData;
// 子线程内初始化自己的插件实例
const dm = ensureDamo();
const bindWindowSize = '1600*900';

let loopIsRuning = true;
let lastVerifyCaptureTs = 0;
let openCapture = true;

// 【新增】异步等待函数，不阻塞事件循环
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 绑定窗口
const bindWindow = async (hwnd: number) => {
  try {
    if (!hwnd || hwnd <= 0) {
      throw new Error(`非法句柄: ${hwnd}`);
    }
    const display = 'dx.graphic.2d';
    const mouse = 'dx.mouse.position.lock.api|dx.mouse.position.lock.message';
    const keypad = 'dx.keypad.state.api|dx.keypad.api';
    const api = '';
    const mode = 0;
    const ret = dm.bindWindow(hwnd, display, mouse, keypad, api, mode);
    if (ret !== 1) {
      throw new Error(`BindWindow 失败，返回值=${ret}, hwnd=${hwnd}`);
    }
    return true;
  } catch (err) {
    parentPort?.postMessage({ type: 'LOG', data: { level: 'error', message: `[角色工作线程] 绑定窗口失败: ${String(err)}` } });
    return false;
  }
};

// 加载字库
const loadDictionary = async () => {
  if (fs.existsSync(OCR_FONT_PATH)) {
    try {
      // 中文注释：改用异步方法加载（内部传递路径），避免同步加载读取大文件内容导致的 COM 缓冲区溢出错误（数据区域太小）
      const ret = await dm.loadDictFromFileAsync(0, OCR_FONT_PATH);
      if (ret === 1) {
        dm.useDict(0);
      } else {
        parentPort?.postMessage({ type: 'LOG', data: { level: 'error', message: `[角色工作线程] 加载字库失败，返回值: ${ret}` } });
      }
    } catch (err) {
      parentPort?.postMessage({ type: 'LOG', data: { level: 'error', message: `[角色工作线程] 加载字库异常: ${String(err)}` } });
    }
  } else {
    parentPort?.postMessage({ type: 'LOG', data: { level: 'warn', message: `[角色工作线程] 未找到字库文件: ${OCR_FONT_PATH}` } });
  }
};

// 初始化：注册、绑定窗口和加载字库
const init = () => {
  try {
    // 1. 注册大漠 (如果需要收费功能)
    dm.reg();
    return true;
  } catch (err) {
    parentPort?.postMessage({ type: 'LOG', data: { level: 'error', message: `[角色工作线程] 初始化失败: ${String(err)}` } });
    return false;
  }
};

const loop = async () => {
  // console.log('关闭轮询子线程');
  try {
    if (!loopIsRuning || !bindWindowSize) {
      parentPort?.postMessage({ type: 'LOG', data: { level: 'warn', message: '[角色工作线程] 循环已停止或未绑定窗口大小' } });
      return;
    }
    // 获取角色位置
    const position = getRolePosition(dm, bindWindowSize);
    // 如果没有位置，通知主线程并阻塞
    if (!position) {
      parentPort?.postMessage({ type: 'LOG', data: { level: 'warn', message: '[角色工作线程] 未获取到角色位置，异步等待 2S' } });
      // 【关键修改】使用 await sleep 代替同步 dm.delay，让出 CPU 执行权
      await dm.delay(2000);
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
              parentPort?.postMessage({ type: 'LOG', data: { level: 'error', message: `[角色工作线程] 验证码识别失败: ${String(err)}` } });
            }
          }
        }
      }
    } else {
      openCapture = true;
    }

    // 死亡检查
    if (needCheckDead && (await isDeadCYPos(dm, bindWindowSize))) {
      parentPort?.postMessage({ type: 'DEATH_DETECTED' });
    }

    // 执行全局队列任务
    parentPort?.postMessage({ type: 'GLOBAL_TASK' });
  } catch (err) {
    parentPort?.postMessage({ type: 'LOG', data: { level: 'error', message: `[角色工作线程] 轮询失败: ${String((err as any)?.message || err)}` } });
  } finally {
    if (loopIsRuning) {
      // 使用 setTimeout 进行轮询节流，避免 setImmediate 忙等抢占 CPU
      setTimeout(loop, 200);
    }
  }
};

// 执行初始化并启动循环
init();

// 更新配置
const updateConfig = (config: any) => {
  Object.assign(workerData, config);
};

// 执行远程指令
const callDm = async (data: any) => {
  const { method, args, requestId } = data;
  try {
    // 【关键修改】拦截 delay 指令，改为异步 sleep，防止阻塞 loop 执行
    if (method.toLowerCase() === 'delay') {
      await sleep(args[0] || 0);
      parentPort?.postMessage({ type: 'CALL_DM_DONE', data: { requestId, result: 1 } });
      return;
    }

    const target = typeof (dm as any)[method] === 'function' ? dm : dm.dm;
    if (target && typeof target[method] === 'function') {
      // 使用 await 等待指令执行完成，确保 result 是具体数值而非 Promise，
      // 避免 postMessage 发送 Promise 时报 DataCloneError
      const result = await target[method](...args);
      // 将执行结果发回主线程
      parentPort?.postMessage({
        type: 'CALL_DM_DONE',
        data: { requestId, result },
      });
    }
  } catch (err) {
    parentPort?.postMessage({
      type: 'CALL_DM_DONE',
      data: { requestId, error: String(err) },
    });
    parentPort?.postMessage({ type: 'LOG', data: { level: 'error', message: `[角色工作线程] 执行远程指令失败 (${String(method)}): ${String(err)}` } });
  }
};

// 绑定窗口句柄和大小

// 监听主线程消息
parentPort?.on('message', msg => {
  if (msg.type === 'STOP_LOOP') {
    loopIsRuning = false;
    console.log('关闭轮询子线程');
    try {
      // dm.unbindWindow();
    } catch {}
  }

  if (msg.type === 'UPDATE_CONFIG') {
    updateConfig(msg.data);
  }

  if (msg.type === 'CALL_DM') {
    callDm(msg.data);
  }

  // 开启loop
  if (msg.type === 'START_LOOP') {
    loopIsRuning = true;
    loop();
  }

  // 绑定窗口句柄和大小
  if (msg.type === 'BIND_WINDOW') {
    try {
      bindWindow(msg.data.hwnd);
      loadDictionary();
      // 4. 初始化角色信息并通知主线程
      const currentName = getRoleName(dm, bindWindowSize);
      parentPort?.postMessage({
        type: 'INITIALIZED',
        data: { name: currentName, hwnd: msg.data.hwnd },
      });
      parentPort?.postMessage({ type: 'LOG', data: { level: 'info', message: `[角色工作线程] 绑定窗口成功: ${msg.data.hwnd}，角色名: ${currentName}` } });
    } catch (err) {
      parentPort?.postMessage({ type: 'LOG', data: { level: 'error', message: `[角色工作线程] 绑定窗口失败: ${String((err as any)?.message || err)}` } });
    }
  }

  // 获取窗口句柄
  if (msg.type === 'GET_WINDOW_HWND') {
    // 中文注释：获取当前前台窗口句柄
    const hwnd = dm.getForegroundWindow();
    parentPort?.postMessage({ type: 'GET_WINDOW_HWND', data: { hwnd } });
  }

  // 解绑窗口句柄
  if (msg.type === 'BIND_UNBIND') {
    try {
      dm.unbindWindow();
    } catch {}
  }
});

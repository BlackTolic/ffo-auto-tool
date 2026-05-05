import fs from 'fs';
import { parentPort, workerData } from 'worker_threads';
import { getVerifyCodeByAliQW } from '../AI/ali-qianwen';
import { getVerifyCodeByTuJian } from '../AI/tu-jian';
import { ensureDamo } from '../auto-plugin/index';
import { OCR_FONT_PATH, VERIFY_CODE_OPTIONS_PATH, VERIFY_CODE_QUESTION_PATH } from '../constant/config';
import { DEFAULT_VERIFY_CODE_TEXT } from '../ffo/constant/OCR-pos';
import { mingYuTask } from '../ffo/events/game-actions/ming-yu';
import { readVerifyCodeImage } from '../ffo/utils/common/read-file';
import { checkInviteTeam, getBloodStatus, getMapName, getMonsterName, getRoleName, getRolePosition, getVerifyCodePos, isDeadCYPos, isOffline } from '../ffo/utils/ocr-check/base';

/**
 * 子线程任务逻辑
 * 负责高频的 OCR 识别、状态监控
 */

// const { needCheckDead } = workerData;
// 子线程内初始化自己的插件实例
const dm = ensureDamo();

let bindWindowSize: '1600*900' | '1280*800' = (workerData?.bindWindowSize as any) || '1600*900';
let needCheckDead: boolean = typeof workerData?.needCheckDead === 'boolean' ? workerData.needCheckDead : true;
let loopIntervalMs: number =
  typeof workerData?.loopIntervalMs === 'number' && Number.isFinite(workerData.loopIntervalMs) && workerData.loopIntervalMs >= 50 ? Math.floor(workerData.loopIntervalMs) : 200;

// 是否开启轮询（由主线程控制 START_LOOP / STOP_LOOP）
let loopIsRuning = false;
// 验证码截图/识别的节流时间戳（避免高频识别导致卡顿/触发风控）
let lastVerifyCaptureTs = 0;
// 验证码首次出现时允许立即截图；后续由 lastVerifyCaptureTs 节流控制
let openCapture = true;

// 防止 loop 重入（setTimeout 触发过快或异常导致的并发执行）
let loopInProgress = false;
// 当前等待处理的主线程消息数量（>0 时 loop 让出执行权，实现“消息优先”）
let pendingMessages = 0;
// 主线程消息串行队列：通过 Promise 链保证同一时刻只处理一条消息
let messageQueue: Promise<void> = Promise.resolve();

type WorkerStatus = {
  position: any;
  map: string;
  selectMonster: string;
  bloodStatus: string;
};

const isSamePos = (a: any, b: any) => a?.x === b?.x && a?.y === b?.y;

let cachedStatus: WorkerStatus = {
  position: null,
  map: '',
  selectMonster: '',
  bloodStatus: '',
};

let lastCheckAt = {
  position: 0,
  map: 0,
  selectMonster: 0,
  bloodStatus: 0,
};

let lastStatusSentAt = 0;
let statusSeq = 0;

let lastTeamInviteCheckAt = 0;
let lastVerifyCheckAt = 0;
let lastDeathCheckAt = 0;

// 【新增】异步等待函数，不阻塞事件循环
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 统一的日志上报封装（子线程 -> 主线程）
const postLog = (level: 'info' | 'warn' | 'error', message: string) => {
  parentPort?.postMessage({ type: 'LOG', data: { level, message } });
};

// 统一调度下一次轮询：当有消息堆积时缩短间隔，避免“消息处理完后等待太久才恢复轮询”
const scheduleNextLoop = () => {
  if (!loopIsRuning) {
    return;
  }
  setTimeout(loop, pendingMessages > 0 ? 50 : loopIntervalMs);
};

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
    postLog('error', `[角色工作线程] 绑定窗口失败: ${String(err)}`);
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
        postLog('error', `[角色工作线程] 加载字库失败，返回值: ${ret}`);
      }
    } catch (err) {
      postLog('error', `[角色工作线程] 加载字库异常: ${String(err)}`);
    }
  } else {
    postLog('warn', `[角色工作线程] 未找到字库文件: ${OCR_FONT_PATH}`);
  }
};

// 初始化：注册、绑定窗口和加载字库
const init = () => {
  try {
    // 1. 注册大漠 (如果需要收费功能)
    dm.reg();
    return true;
  } catch (err) {
    postLog('error', `[角色工作线程] 初始化失败: ${String(err)}`);
    return false;
  }
};

// 向主线程上报基础状态（坐标、地图、选怪、血量）
const sendStatusUpdate = (force = false) => {
  if (!parentPort) {
    return;
  }

  const now = Date.now();
  let changed = false;

  if (force || now - lastCheckAt.position >= 200) {
    const position = getRolePosition(dm, bindWindowSize);
    if (!isSamePos(position, cachedStatus.position)) {
      cachedStatus.position = position;
      changed = true;
    }
    lastCheckAt.position = now;
  }

  if (force || now - lastCheckAt.map >= 1000) {
    const map = getMapName(dm, bindWindowSize);
    if (map !== cachedStatus.map) {
      cachedStatus.map = map;
      changed = true;
    }
    lastCheckAt.map = now;
  }

  if (force || now - lastCheckAt.selectMonster >= 500) {
    const selectMonster = getMonsterName(dm, bindWindowSize);
    if (selectMonster !== cachedStatus.selectMonster) {
      cachedStatus.selectMonster = selectMonster;
      changed = true;
    }
    lastCheckAt.selectMonster = now;
  }

  if (force || now - lastCheckAt.bloodStatus >= 500) {
    const bloodStatus = getBloodStatus(dm, bindWindowSize);
    if (bloodStatus !== cachedStatus.bloodStatus) {
      cachedStatus.bloodStatus = bloodStatus;
      changed = true;
    }
    lastCheckAt.bloodStatus = now;
  }

  if (!force && !changed && now - lastStatusSentAt < 1000) {
    return;
  }

  statusSeq += 1;
  lastStatusSentAt = now;
  parentPort.postMessage({
    type: 'STATUS_UPDATE',
    data: { ...cachedStatus, seq: statusSeq, ts: now },
  });
};

// 检测队伍邀请并上报给主线程（主线程执行点击/拒绝等动作）
const checkTeamInviteAndNotify = () => {
  if (!parentPort) {
    return;
  }
  const now = Date.now();
  if (now - lastTeamInviteCheckAt < 500) {
    return;
  }
  lastTeamInviteCheckAt = now;

  const isInviteTeam = checkInviteTeam(dm, bindWindowSize);
  if (isInviteTeam) {
    parentPort.postMessage({ type: 'TEAM_INVITE', data: { rejectPos: { x: 870, y: 573 }, agreePos: { x: 738, y: 573 } } });
  }
};

// 检测验证码并上报识别结果（包含位置与对照坐标）
const checkVerifyCodeAndNotify = async () => {
  if (!parentPort) {
    return;
  }

  const now = Date.now();
  if (now - lastVerifyCheckAt < 500) {
    return;
  }
  lastVerifyCheckAt = now;

  const verifyCodeTextPos = getVerifyCodePos(dm, bindWindowSize);
  if (!verifyCodeTextPos) {
    openCapture = true;
    return;
  }

  if (!openCapture && now - lastVerifyCaptureTs < 10000) {
    return;
  }

  const checkPos = DEFAULT_VERIFY_CODE_TEXT[bindWindowSize as keyof typeof DEFAULT_VERIFY_CODE_TEXT];
  const questionImg = dm.capturePng(verifyCodeTextPos.x, verifyCodeTextPos.y + 60, verifyCodeTextPos.x + 100, verifyCodeTextPos.y + 130, `${VERIFY_CODE_QUESTION_PATH}`);
  const optionsImg = dm.capturePng(verifyCodeTextPos.x + 200, verifyCodeTextPos.y + 30, verifyCodeTextPos.x + 250, verifyCodeTextPos.y + 110, `${VERIFY_CODE_OPTIONS_PATH}`);

  if (String(questionImg) !== '1' || String(optionsImg) !== '1') {
    return;
  }

  openCapture = false;
  lastVerifyCaptureTs = now;

  if (isOffline(dm, bindWindowSize)) {
    parentPort.postMessage({ type: 'OFFLINE' });
    return;
  }

  const optionsUrl = readVerifyCodeImage(`${VERIFY_CODE_OPTIONS_PATH}`, 'ali');
  const questionUrl = readVerifyCodeImage(`${VERIFY_CODE_QUESTION_PATH}`, 'tujian');
  if (!optionsUrl || !questionUrl) {
    return;
  }

  try {
    const [Ali = '', TuJian = ''] = await Promise.all([getVerifyCodeByAliQW(optionsUrl), getVerifyCodeByTuJian(questionUrl)]);
    parentPort.postMessage({ type: 'VERIFY_CODE_RESULT', data: { Ali, TuJian, verifyCodeTextPos, checkPos } });
  } catch (err) {
    postLog('error', `[角色工作线程] 验证码识别失败: ${String(err)}`);
  }
};

// 检测死亡并通知主线程
const checkDeathAndNotify = async () => {
  if (!needCheckDead) {
    return;
  }
  const now = Date.now();
  if (now - lastDeathCheckAt < 500) {
    return;
  }
  lastDeathCheckAt = now;

  if (await isDeadCYPos(dm, bindWindowSize)) {
    parentPort?.postMessage({ type: 'DEATH_DETECTED' });
  }
};

// 触发主线程全局队列任务执行（由主线程决定具体任务内容）
const postGlobalTask = () => {
  parentPort?.postMessage({ type: 'GLOBAL_TASK' });
};

// 轮询：高频 OCR 状态监控。收到主线程消息时通过 pendingMessages 让出执行权，确保“消息优先”
const loop = async () => {
  if (loopInProgress) {
    return;
  }
  loopInProgress = true;
  try {
    if (!parentPort) {
      return;
    }
    if (!loopIsRuning || !bindWindowSize) {
      postLog('warn', '[角色工作线程] 循环已停止或未绑定窗口大小');
      return;
    }

    // 主线程消息优先：当消息队列不为空时，本轮 loop 直接退出，让出 CPU 给消息处理
    if (pendingMessages > 0) {
      return;
    }

    sendStatusUpdate();
    checkTeamInviteAndNotify();
    await checkVerifyCodeAndNotify();
    await checkDeathAndNotify();
    postGlobalTask();
  } catch (err) {
    postLog('error', `[角色工作线程] 轮询失败: ${String((err as any)?.message || err)}`);
  } finally {
    loopInProgress = false;
    scheduleNextLoop();
  }
};

// 执行初始化并启动循环
init();

// 更新配置
const updateConfig = (config: any) => {
  if (!config || typeof config !== 'object') {
    return;
  }

  if (typeof config.bindWindowSize === 'string' && config.bindWindowSize) {
    bindWindowSize = config.bindWindowSize as any;
    lastCheckAt = { position: 0, map: 0, selectMonster: 0, bloodStatus: 0 };
    lastStatusSentAt = 0;
  }

  if (typeof config.needCheckDead === 'boolean') {
    needCheckDead = config.needCheckDead;
  }

  if (typeof config.loopIntervalMs === 'number' && Number.isFinite(config.loopIntervalMs) && config.loopIntervalMs >= 50) {
    loopIntervalMs = Math.floor(config.loopIntervalMs);
  }
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
      parentPort?.postMessage({ type: 'CALL_DM_DONE', data: { requestId, result } });
      return;
    }
    parentPort?.postMessage({ type: 'CALL_DM_DONE', data: { requestId, error: `Unknown dm method: ${String(method)}` } });
  } catch (err) {
    parentPort?.postMessage({
      type: 'CALL_DM_DONE',
      data: { requestId, error: String(err) },
    });
    parentPort?.postMessage({ type: 'LOG', data: { level: 'error', message: `[角色工作线程] 执行远程指令失败 (${String(method)}): ${String(err)}` } });
  }
};

// 绑定窗口并初始化字库/角色信息（单独抽离，便于复用与维护）
const handleBindWindowMessage = async (data: any) => {
  try {
    await bindWindow(data.hwnd);
    await loadDictionary();
    const currentName = getRoleName(dm, bindWindowSize);
    parentPort?.postMessage({
      type: 'INITIALIZED',
      data: { name: currentName, hwnd: data.hwnd },
    });
    postLog('info', `[角色工作线程] 绑定窗口成功: ${data.hwnd}，角色名: ${currentName}`);
  } catch (err) {
    postLog('error', `[角色工作线程] 绑定窗口失败: ${String((err as any)?.message || err)}`);
  }
};

// 主线程消息分发：仅做控制/调用，不做高频轮询逻辑
const handleMessage = async (msg: any) => {
  if (msg.type === 'STOP_LOOP') {
    loopIsRuning = false;
    try {
      // dm.unbindWindow();
    } catch {}
    return;
  }

  if (msg.type === 'UPDATE_CONFIG') {
    updateConfig(msg.data);
    return;
  }

  if (msg.type === 'CALL_DM') {
    await callDm(msg.data);
    return;
  }

  if (msg.type === 'START_LOOP') {
    loopIsRuning = true;
    return;
  }

  if (msg.type === 'BIND_WINDOW') {
    await handleBindWindowMessage(msg.data);
    return;
  }

  if (msg.type === 'GET_WINDOW_HWND') {
    const hwnd = dm.getForegroundWindow();
    parentPort?.postMessage({ type: 'GET_WINDOW_HWND', data: { hwnd } });
    return;
  }
  // 更新角色信息
  if (msg.type === 'UPDATE_ROLE_INFO') {
    sendStatusUpdate(true);
    return;
  }

  if (msg.type === 'BIND_UNBIND') {
    try {
      dm.unbindWindow();
    } catch {}
  }

  // 跑名誉任务
  if (msg.type === 'MING_YU_TASK') {
    mingYuTask.startMingYuTask();
    return;
  }
};

// 将消息入队串行处理：在消息处理期间 loop 会因为 pendingMessages>0 让出执行权
const enqueueMessage = (msg: any) => {
  pendingMessages += 1;

  messageQueue = messageQueue
    .then(() => handleMessage(msg))
    .catch(err => {
      postLog('error', `[角色工作线程] 处理主线程消息失败: ${String((err as any)?.message || err)}`);
    })
    .finally(() => {
      pendingMessages -= 1;
      // 当消息队列清空后，主动恢复 loop，避免等待下一次 scheduleNextLoop 的定时触发
      if (pendingMessages <= 0) {
        pendingMessages = 0;
        if (loopIsRuning && !loopInProgress) {
          loop();
        }
      }
    });
};

// 监听主线程消息
parentPort?.on('message', msg => {
  enqueueMessage(msg);
});

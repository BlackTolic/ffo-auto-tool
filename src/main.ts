import { app, BrowserWindow, ipcMain, Notification } from 'electron';
import { Damo } from './damo/damo';
import cp from 'child_process'
import { validateEnvironment } from './envCheck'; // 中文注释：引入运行时环境校验


const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};

// Initialize Damo wrapper safely
let damo: Damo | null = null;
function ensureDamo(): Damo {
  if (!damo) {
    try {
      damo = new Damo();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Damo] 初始化失败:', msg);
      throw e;
    }
  }
  return damo;
}

// 新增：环境校验的 IPC（渲染进程可主动拉取校验结果）
ipcMain.handle('env:check', () => {
  // 中文注释：返回一次性的校验结果对象（包含逐项详情）
  return validateEnvironment();
});

// IPC handlers to access Damo from renderer via preload
ipcMain.handle('damo:ver', () => {
  return ensureDamo().ver();
});

ipcMain.handle('damo:getForegroundWindow', () => {
  return ensureDamo().getForegroundWindow();
});

ipcMain.handle(
  'damo:bindWindow',
  (_event, hwnd: number, display: string, mouse: string, keypad: string, mode: number) => {
    return ensureDamo().bindWindow(hwnd, display, mouse, keypad, mode);
  }
);

ipcMain.handle('damo:unbindWindow', () => {
  return ensureDamo().unbindWindow();
});

app.whenReady().then(() => {
  // 中文注释：启动前进行环境版本与架构校验（在创建窗口与扫描进程之前执行）
  const env = validateEnvironment();
  const envCheckOnly = process.env.ENV_CHECK_ONLY === '1'; // 中文注释：仅校验模式，不创建窗口

  // 打印逐项结果（无论通过与否，都输出便于观察）
  console.log('== 环境校验结果 ==');
  for (const item of env.items) {
    console.log(`- ${item.name}: ${item.ok ? 'OK' : 'FAIL'} | ${item.message}`);
  }

  if (!env.ok) {
    console.error('环境校验未通过，程序将退出。');
    new Notification({ title: '环境校验失败', body: '请查看控制台日志并修复环境后重试。' }).show();
    app.quit();
    return;
  }

  // 如果仅校验模式，直接退出，不创建窗口与后续逻辑
  if (envCheckOnly) {
    console.log('仅校验模式，应用不创建窗口，退出。');
    app.quit();
    return;
  }

  // 创建主窗口（环境校验通过后）
  createWindow();

  // 中文注释：在环境校验通过后再进行进程扫描与大漠绑定逻辑
  cp.exec('tasklist', async function (error, stdout) {
    if (error) {
      console.log(error)
      return
    }
    if (!stdout) return
    const list = stdout.split('\n')
    for (const line of list) {
      const processMessage = line.trim().split(/\s+/)
      const processName = processMessage[0] // processMessage[0]进程名称 ， processMessage[1]进程id
      if (processName === 'QQSG.exe') {
      	// 判断进程位QQSG.exe 拿到进程id
        const pid = parseInt(processMessage[1])
        // Electron的系统通知功能
        new Notification({ title: '注入QQ三国进程', body: pid.toString() }).show()
        // 一个进程新建一个大漠对象
        const clientDm = new Damo()
        // 通过大漠的api：根据pid获取窗口句柄
        const handle = clientDm.getDamo().FindWindowByProcessId(pid, '', '')
        console.log('句柄: ', handle)
        if (!handle) {
          console.log('pid: ', pid, ' 找不到窗口句柄')
          continue
        }
        // 大漠插件后台绑定窗口 参数详情可以看大漠插件文档 如果是模拟器或者其他游戏，所需的参数不尽相同
        const bindResult = clientDm.getDamo().BindWindowEx(handle, 'gdi', 'windows', 'windows', 'dx.public.active.api', 0)
        console.log('后台绑定：', bindResult)
        if (!bindResult) {
          console.log('句柄', handle, ' 后台绑定失败')
          continue
        }
        // 绑定成功之后，我们可以利用global对象，把所有的客户端保存到一个map方便调用，用句柄作为key
        global.clients[handle] = { pid, dm: clientDm }
        // 测试移动窗口
        // clientDm.dll.MoveWindow(handle, 0, 0)
      }
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

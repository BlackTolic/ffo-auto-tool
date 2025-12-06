import { app, BrowserWindow, ipcMain } from 'electron';
import { Damo } from './damo/damo';
import cp from 'child_process'


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
  // 创建主窗口
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

 // 通过tasklist遍历返回的进程信息
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
        const clientDm = new Dm()
        // 通过大漠的api：根据pid获取窗口句柄
        const handle = clientDm.dll.FindWindowByProcessId(pid, '', '')
        console.log('句柄: ', handle)
        if (!handle) {
          console.log('pid: ', pid, ' 找不到窗口句柄')
          continue
        }
        // 大漠插件后台绑定窗口 参数详情可以看大漠插件文档 如果是模拟器或者其他游戏，所需的参数不尽相同
        const bindResult = clientDm.dll.BindWindowEx(handle, 'gdi', 'windows', 'windows', 'dx.public.active.api', 0)
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
  )

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

import { app, BrowserWindow, ipcMain } from 'electron';
import { Damo } from './damo';

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
  createWindow();

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

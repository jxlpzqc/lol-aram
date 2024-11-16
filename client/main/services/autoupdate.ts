
import { App, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater, UpdateInfo } from 'electron-updater'

const isProd = process.env.NODE_ENV === 'production'

autoUpdater.autoDownload = false;

let _updateInfo: UpdateInfo | null = null;

export function registAutoUpdateService() {
  ipcMain.handle("autoupdate:getInfo", () => {
    return _updateInfo;
  });
  ipcMain.handle("autoupdate:startUpdate", () => {
    autoUpdater.downloadUpdate();
  });
}

export function checkUpdate(app: App, mainWindow: BrowserWindow) {
  console.log("start checking update")
  autoUpdater.checkForUpdates()

  autoUpdater.on('error', (err: any) => {
    console.log(err)
  })

  autoUpdater.on('update-available', async (info) => {
    _updateInfo = info;
    if (isProd) {
      mainWindow?.loadURL('app://./update.html')
    } else {
      const port = process.argv[2]
      mainWindow?.loadURL(`http://localhost:${port}/update`)
    }
  });

  autoUpdater.on('download-progress', (x) => {
    console.log('download progress');
    mainWindow.setProgressBar(x.percent / 100);
    mainWindow.webContents.send('autoupdate:downloadProgress', x.percent);
  })

  //监听'update-downloaded'事件，新版本下载完成时触发
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.setProgressBar(-1);
    autoUpdater.quitAndInstall();
    app.quit()
  })
}

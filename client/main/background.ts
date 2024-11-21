import path from 'path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { registLeagueService } from './services/leagueMainRegister'
import { autoUpdater } from 'electron-updater'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

let mainWindow: BrowserWindow | undefined;

autoUpdater.autoDownload = false;

function checkUpdate() {
  //检测更新
  autoUpdater.checkForUpdates()

  //监听'error'事件
  autoUpdater.on('error', (err: any) => {
    console.log(err)
  })

  //监听'update-available'事件，发现有新版本时触发
  autoUpdater.on('update-available', () => {
    console.log('found new version')
  })

  //默认会自动下载新版本，如果不想自动下载，设置autoUpdater.autoDownload = false

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '应用更新',
      message: '发现新版本，是否更新？',
      buttons: ['是', '否']
    }).then((buttonIndex) => {
      if (buttonIndex.response == 0) {  //选择是，则开始下载新版本
        autoUpdater.downloadUpdate()
      }
    })
  });

  autoUpdater.on('download-progress', (x) => {
    console.log('download progress');
    mainWindow?.setProgressBar(x.percent / 100);
  })

  //监听'update-downloaded'事件，新版本下载完成时触发
  autoUpdater.on('update-downloaded', () => {
    mainWindow?.setProgressBar(-1);
    autoUpdater.quitAndInstall();
    app.quit()
  })
}


; (async () => {
  await app.whenReady()

  mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isProd) {
    await mainWindow.loadURL('app://./')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/`)
    mainWindow.webContents.openDevTools()
  }
})()

app.on('window-all-closed', () => {
  app.quit()
})

app.on('ready', () => {
  checkUpdate()
})

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})

registLeagueService();
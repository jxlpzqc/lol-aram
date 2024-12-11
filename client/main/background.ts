import path from 'path'
import { app, BrowserWindow, ipcMain } from 'electron'
import serve from 'electron-serve'
import { createWindow } from './helpers'
import { registLeagueService } from './services/leagueMainRegister'
import { checkUpdate, registAutoUpdateService } from './services/autoupdate'

const isProd = process.env.NODE_ENV === 'production'

if (isProd) {
  serve({ directory: 'app' })
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`)
}

let mainWindow: BrowserWindow | undefined;

; (async () => {
  await app.whenReady()

  mainWindow = createWindow('main', {
    width: 1200,
    height: 720,
    autoHideMenuBar: true,
    title: 'League of PRIDE',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  registLeagueService(mainWindow);

  if (isProd) {
    await mainWindow.loadURL('app://./')
  } else {
    const port = process.argv[2]
    await mainWindow.loadURL(`http://localhost:${port}/`)
    mainWindow.webContents.openDevTools()
  }

  checkUpdate(app, mainWindow)

})()

app.on('window-all-closed', () => {
  app.quit()
})

ipcMain.on('message', async (event, arg) => {
  event.reply('message', `${arg} World!`)
})

registAutoUpdateService();
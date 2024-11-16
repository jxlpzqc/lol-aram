import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import leagueBridge from './services/leagueBridge'
import autoUpdateBridge from './services/autoupdateBridge'

const handler = {
  send(channel: string, value: unknown) {
    ipcRenderer.send(channel, value)
  },
  on(channel: string, callback: (...args: unknown[]) => void) {
    const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
      callback(...args)
    ipcRenderer.on(channel, subscription)

    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  },
}

contextBridge.exposeInMainWorld('ipc', handler);

export type IpcHandler = typeof handler

contextBridge.exposeInMainWorld('league', leagueBridge);

export type LeagueHandler = typeof leagueBridge;

contextBridge.exposeInMainWorld('autoupdate', autoUpdateBridge)

export type AutoUpdateHandler = typeof autoUpdateBridge;
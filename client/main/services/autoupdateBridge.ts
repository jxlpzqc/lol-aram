import { ipcRenderer, IpcRendererEvent } from "electron"
import type { UpdateInfo } from "electron-updater"

const _autoUpdateBridge = {
    getInfo: async () => {
        const ret = await ipcRenderer.invoke('autoupdate:getInfo')
        return ret as UpdateInfo | null;
    },
    startUpdate: async () => {
        await ipcRenderer.invoke('autoupdate:startUpdate')
    },
    addProgressListener: (listener: (_event: IpcRendererEvent, percent: number) => void) => {
        ipcRenderer.on('autoupdate:downloadProgress', listener);
    },
    removeProgressListener: (listener: (_event: IpcRendererEvent, percent: number) => void) => {
        ipcRenderer.off('autoupdate:downloadProgress', listener);
    }
}

export default _autoUpdateBridge;
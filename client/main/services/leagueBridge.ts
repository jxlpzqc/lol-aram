import { ipcRenderer, IpcRendererEvent } from 'electron'

const _leagueBridge = {
    isLeagueRunning: async () => {
        const ret = await ipcRenderer.invoke('league:isLeagueRunning');
        return ret as boolean;
    },
    createNewGame: async (gameName: string, password: string, summonerID: string, team: 'blue' | 'red') => {
        await ipcRenderer.invoke('league:createNewGame', gameName, password, summonerID, team);
    },
    joinGame: async (gameName: string, password: string, summonerID: string, team: 'blue' | 'red' = 'blue') => {
        await ipcRenderer.invoke('league:joinGame', gameName, password, summonerID, team);
    },
    startGame: async () => {
        await ipcRenderer.invoke('league:startGame');
    },
    getOwnedChampions: async (summonerID: string) => {
        const ret = await ipcRenderer.invoke('league:getOwnedChampions', summonerID);
        return ret as number[];
    },
    selectChampion: async (championId: number) => {
        await ipcRenderer.invoke('league:selectChampion', championId);
    },
    getSummonerInfo: async () => {
        return await ipcRenderer.invoke('league:getSummonerInfo') as {
            id: string;
            name: string;
        };
    },
    startWebSocket: async () => {
        await ipcRenderer.invoke('league:startWebSocket');
    },
    addOnEndGameListener: (listener: (_event: IpcRendererEvent, data: any) => void) => {
        ipcRenderer.on('league:endOfGame', listener);
    },
    removeOnEndGameListener: (listener: (_event: IpcRendererEvent, data: any) => void) => {
        ipcRenderer.off('league:endOfGame', listener);
    },
    getWebSocketStatus: async () => {
        return await ipcRenderer.invoke('league:getWebSocketStatus') as 'open' | 'close' | 'connecting';
    },
    addWebSocketStatusChangedListener: (listener: (_event: IpcRendererEvent, data: 'open' | 'close' | 'connecting') => void) => {
        ipcRenderer.on('league:webSocketStatusChanged', listener);
    },
    removeWebSocketStatusChangedListener: (listener: (_event: IpcRendererEvent, data: 'open' | 'close' | 'connecting') => void) => {
        ipcRenderer.off('league:webSocketStatusChanged', listener);
    },
    restartUI: async () => {
        await ipcRenderer.invoke('league:restartUI');
    },
};

export default _leagueBridge;
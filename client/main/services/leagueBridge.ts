import { ipcRenderer } from 'electron'

const _leagueBridge = {
    isLeagueRunning: async () => {
        const ret = await ipcRenderer.invoke('league:isLeagueRunning');
        return ret as boolean;
    },
    createNewGame: async (gameName: string, password: string) => {
        await ipcRenderer.invoke('league:createNewGame', gameName, password);
    },
    joinGame: async (gameName: string, password: string, team: 'blue' | 'red' = 'blue') => {
        await ipcRenderer.invoke('league:joinGame', gameName, password, team);
    },
    startGame: async () => {
        await ipcRenderer.invoke('league:startGame');
    },
    getOwnedChampions: async () => {
        const ret = await ipcRenderer.invoke('league:getOwnedChampions');
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
    }
};

export default _leagueBridge;
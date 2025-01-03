
import {
    createNewGame, getOwnedChampions,
    isLeagueRunning, joinGame, startGame,
    selectChampion, getSummonerInfo,
    startWebSocket,
    getWebSocketStatus,
    restartUI,
    getRecentGames,
    getGameInfo
} from './league';
import { ipcMain } from 'electron';

export function registLeagueService(mainWindow: Electron.BrowserWindow) {
    console.log("Regist league service")

    ipcMain.handle('league:isLeagueRunning', async () => {
        return await isLeagueRunning();
    });
    ipcMain.handle('league:createNewGame', async (_event, gameName: string, password: string, summonerID: string, team: 'blue' | 'red') => {
        return await createNewGame(gameName, password, summonerID, team);
    });
    ipcMain.handle('league:joinGame', async (_event, gameName: string, password: string, summonerID: string, team: 'blue' | 'red') => {
        return await joinGame(gameName, password, summonerID, team);
    });
    ipcMain.handle('league:startGame', async () => {
        return await startGame();
    });
    ipcMain.handle('league:getOwnedChampions', async (_event, summonerID: string) => {
        return await getOwnedChampions(summonerID);
    });
    ipcMain.handle('league:selectChampion', async (_event, championId: number) => {
        return await selectChampion(championId);
    });
    ipcMain.handle('league:getSummonerInfo', async () => {
        return await getSummonerInfo();
    });
    ipcMain.handle('league:startWebSocket', async () => {
        return await startWebSocket(mainWindow);
    });
    ipcMain.handle('league:getWebSocketStatus', async () => {
        return await getWebSocketStatus();
    });
    ipcMain.handle('league:restartUI', async () => {
        return await restartUI();
    });
    ipcMain.handle('league:getRecentGames', async () => {
        return await getRecentGames();
    });
    ipcMain.handle('league:getGameEogInfo', async (_event, gameid: number) => {
        return await getGameInfo(gameid);
    });

}



import {
    createNewGame, getOwnedChampions,
    isLeagueRunning, joinGame, startGame,
    selectChampion, getSummonerInfo
} from './league';
import { ipcMain } from 'electron';

export function registLeagueService() {
    ipcMain.handle('league:isLeagueRunning', async () => {
        return await isLeagueRunning();
    });
    ipcMain.handle('league:createNewGame', async (_event, gameName: string, password: string) => {
        return await createNewGame(gameName, password);
    });
    ipcMain.handle('league:joinGame', async (_event, gameName: string, password: string, team: 'blue' | 'red') => {
        return await joinGame(gameName, password, team);
    });
    ipcMain.handle('league:startGame', async () => {
        return await startGame();
    });
    ipcMain.handle('league:getOwnedChampions', async () => {
        return await getOwnedChampions();
    });
    ipcMain.handle('league:selectChampion', async (_event, championId: number) => {
        return await selectChampion(championId);
    });
    ipcMain.handle('league:getSummonerInfo', async () => {
        return await getSummonerInfo();
    });
}

// @ts-nocheck
import { authenticate, createHttp1Request, createWebSocketConnection, LeagueWebSocket } from 'league-connect';
import championList from '@renderer/public/assets/champions.json';
import { ipcMain } from 'electron';

export async function isLeagueRunning() {
    try {
        await authenticate();
        return true;
    }
    catch (e) {
        console.error(e);
        return false;
    }
}

let _websocket: LeagueWebSocket | null = null;

const emitWebSocketStatus = (socket: LeagueWebSocket, mainWindow: Electron.BrowserView) => {
    let status = 'close';
    if (socket.readyState === LeagueWebSocket.OPEN) {
        status = 'open';
    } else if (socket.readyState === LeagueWebSocket.CONNECTING) {
        status = 'connecting';
    } else if (socket.readyState === LeagueWebSocket.CLOSED) {
        status = 'close';
    }
    console.log("emitWebSocketStatus", status);

    mainWindow.webContents.send('league:webSocketStatusChanged', status);
}

export async function startWebSocket(mainWindow: Electron.BrowserWindow) {
    if (_websocket?.readyState == LeagueWebSocket.OPEN) return;
    if (_websocket?.readyState == LeagueWebSocket.CONNECTING) return;

    if (_websocket) {
        _websocket.close();
        _websocket.removeAllListeners();
    }

    _websocket = await createWebSocketConnection();
    _websocket.addEventListener('open', () => emitWebSocketStatus(_websocket, mainWindow));
    _websocket.addEventListener('close', () => emitWebSocketStatus(_websocket, mainWindow));
    _websocket.addEventListener('error', () => emitWebSocketStatus(_websocket, mainWindow));

    _websocket.subscribe("/lol-end-of-game/v1/eog-stats-block", (data, event) => {
        console.log("endOfGame", data);
        mainWindow.webContents.send('league:endOfGame', data);
    });
    emitWebSocketStatus(_websocket, mainWindow);
}

export function getWebSocketStatus(): 'open' | 'close' | 'connecting' {
    if (_websocket?.readyState === LeagueWebSocket.OPEN) {
        return 'open';
    } else if (_websocket?.readyState === LeagueWebSocket.CONNECTING) {
        return 'connecting';
    } else if (_websocket?.readyState === LeagueWebSocket.CLOSED) {
        return 'close';
    } else {
        return 'close';
    }
}

async function ensureSummonerInTeam(credentials, summonerID: string, team: 'blue' | 'red') {
    const currentSummonerId = summonerID;

    let lobbyResp = await createHttp1Request({
        method: 'GET',
        url: `/lol-lobby/v2/lobby`,
    }, credentials);

    if (!lobbyResp.ok) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        lobbyResp = await createHttp1Request({
            method: 'GET',
            url: `/lol-lobby/v2/lobby`,
        }, credentials);

        if (!lobbyResp.ok)
            throw new Error(`获取房间信息失败！${JSON.stringify(await lobbyResp.json(), null, 2)}`);
    }

    const lobbyData = await lobbyResp.json();

    const member = (lobbyData.members.find((x: any) => x.summonerId.toString() === currentSummonerId));
    if (!member) throw new Error("未找到召唤师所在队伍！");
    if (member.teamId !== 100 && member.teamId !== 200) throw new Error("teamId不合法！");
    const isInRed = member.teamId === 200;

    if ((isInRed && team === 'blue') || (!isInRed && team === 'red')) {
        const switchTeamResp = await createHttp1Request({
            method: 'POST',
            url: `/lol-lobby/v1/lobby/custom/switch-teams`,
        }, credentials);
        if (!switchTeamResp.ok) {
            throw new Error(`切换队伍失败！${JSON.stringify(await switchTeamResp.json(), null, 2)}`);
        }
    }

}

export async function createNewGame(gameName: string, password: string, summonerID, team: 'blue' | 'red' = 'blue') {
    const credentials = await authenticate();
    console.log("Creating new game", gameName, password);
    const response = await createHttp1Request({
        method: 'POST',
        url: '/lol-lobby/v2/lobby',
        body: {
            "customGameLobby": {
                "configuration": {
                    "gameMode": "ARAM",
                    "mapId": 12,
                    "maxPlayerCount": 10,
                    "mutators": {
                        "id": 1,
                        "reroll": true,
                    },
                    "spectatorDelayEnabled": true,
                    "spectatorPolicy": "LobbyAllowed",
                    "teamSize": 5
                },
                "lobbyName": gameName,
                "lobbyPassword": password
            },
            "isCustom": true,
            "queueId": 450
        }
    }, credentials);

    console.log(response.status);

    if (!response.ok) {
        throw new Error(`创建房间失败！${JSON.stringify(await response.json(), null, 2)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await ensureSummonerInTeam(credentials, summonerID, team);
}

export async function joinGame(gameName: string, password: string, summonerID: string, team: 'blue' | 'red' = 'blue') {
    const credentials = await authenticate();

    const refreshResp = await createHttp1Request({
        method: 'POST',
        url: '/lol-lobby/v1/custom-games/refresh',
    }, credentials);

    if (!refreshResp.ok) {
        throw new Error(`刷新房间失败！${JSON.stringify(await refreshResp.json(), null, 2)}`);
    }

    const resp = await createHttp1Request({
        method: 'GET',
        url: '/lol-lobby/v1/custom-games',
    }, credentials);

    if (!resp.ok) {
        throw new Error(`获取房间列表失败！${JSON.stringify(await resp.json(), null, 2)}`);
    }

    const data = await resp.json();
    // @ts-ignore
    const d = data?.find((game: any) => game.lobbyName === gameName);
    const id = d?.id;
    if (!id) {
        throw new Error(`未找到房间${gameName}`);
    }

    const joinResp = await createHttp1Request({
        method: 'POST',
        url: `/lol-lobby/v1/custom-games/${id}/join`,
        body: !!password ? {
            "password": password
        } : {}
    }, credentials);

    if (!joinResp.ok) {
        if ((await joinResp.json())?.message?.includes?.('com.riotgames.platform.game.PlayerAlreadyInGameException')) {
            console.error('PlayerAlreadyInGameException: already in game');
        } else {
            throw new Error(`加入房间失败！${JSON.stringify(await joinResp.json(), null, 2)}`);
        }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await ensureSummonerInTeam(credentials, summonerID, team);
}

export async function startGame() {
    const credentials = await authenticate();
    const startGameResp = await createHttp1Request({
        method: 'POST',
        url: '/lol-lobby/v1/lobby/custom/start-champ-select',
    }, credentials);
    if (!startGameResp.ok) {
        throw new Error(`开始游戏失败！${JSON.stringify(await startGameResp.json(), null, 2)}`);
    }
}

export async function getOwnedChampions(summonerID: string): Promise<number[]> {
    const credentials = await authenticate();
    const resp = await createHttp1Request({
        method: 'GET',
        url: `/lol-champions/v1/inventories/${summonerID}/champions-minimal`,
    }, credentials);

    if (!resp.ok) {
        throw new Error(`获取英雄列表失败！${JSON.stringify(await resp.json(), null, 2)}`);
    }

    const d = await resp.json();
    // console.log(d);
    return d.filter(x => x?.freeToPlay || x?.ownership?.owned)
        .map((champion: any) => championList.findIndex(x => x.id == champion.id));
}

export async function selectChampion(championId: number) {
    const credentials = await authenticate();
    const sessionResp = await createHttp1Request({
        method: "GET",
        url: "/lol-champ-select/v1/session"
    }, credentials);

    if (!sessionResp.ok) {
        throw new Error(`获取英雄选择信息失败！${JSON.stringify(await sessionResp.json(), null, 2)}`);
    }

    const sessionData = await sessionResp.json();
    // console.log(JSON.stringify(sessionData, null, 2));
    const localPlayerCellId = sessionData.localPlayerCellId;
    const phase = sessionData.timer.phase;

    for (const a of sessionData.actions.flatMap((x: any) => x)) {
        console.log(a);

        console.log(`actionId: ${a.id}, type: ${a.type}, completed: ${a.completed}
            actorCellId: ${a.actorCellId}, localPlayerCellId: ${localPlayerCellId}, phase: ${phase}`);
        if (a.actorCellId !== localPlayerCellId || a.completed) continue;

        const actionId = a.id;
        const type = a.type;


        if (type !== 'pick') continue;

        const resp = await createHttp1Request({
            method: 'PATCH',
            url: `/lol-champ-select/v1/session/actions/${actionId}`,
            body: {
                "type": type,
                "championId": championList[championId].id,
                // "completed": true
            }
        }, credentials);

        if (!resp.ok) {
            throw new Error(`选择英雄失败！${JSON.stringify(await resp.json(), null, 2)}`);
        }
    }
}

export async function getSummonerInfo(): Promise<{
    id: string,
    name: string
}> {
    const credentials = await authenticate();
    const resp = await createHttp1Request({
        method: 'GET',
        url: '/lol-summoner/v1/current-summoner',
    }, credentials);
    if (!resp.ok) {
        throw new Error(`获取召唤师信息失败！${JSON.stringify(await resp.json(), null, 2)}`);
    }
    const d = await resp.json();
    return {
        id: d.summonerId,
        name: d.displayName
    }
}

export async function restartUI(): Promise<void> {
    const credentials = await authenticate();
    const resp = await createHttp1Request({
        method: 'POST',
        url: '/riotclient/kill-and-restart-ux',
    }, credentials);
    if (!resp.ok) {
        throw new Error(`重启客户端失败！${JSON.stringify(await resp.json(), null, 2)}`);
    }
}
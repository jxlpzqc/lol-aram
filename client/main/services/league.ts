// @ts-nocheck
import { authenticate, createHttp1Request } from 'league-connect';
import championList from '../../renderer/public/assets/champions.json';

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

export async function createNewGame(gameName: string, password: string) {
    const credentials = await authenticate();
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
                    "spectatorPolicy": "NotAllowed",
                    "teamSize": 5
                },
                "lobbyName": gameName,
                "lobbyPassword": password
            },
            "isCustom": true,
            "queueId": 450
        }
    }, credentials);

    if (response.status !== 200) {
        throw new Error(`创建房间失败！${await response.json()}`);
    }
}

export async function joinGame(gameName: string, password: string, team: 'blue' | 'red' = 'blue') {
    const credentials = await authenticate();

    await createHttp1Request({
        method: 'POST',
        url: '/lol-lobby/v1/custom-games/refresh',
    }, credentials);

    const resp = await createHttp1Request({
        method: 'GET',
        url: '/lol-lobby/v1/custom-games',
    }, credentials);
    const data = await resp.json();
    // @ts-ignore
    const d = data?.find((game: any) => game.lobbyName === gameName);
    const id = d?.id;
    if (!id) {
        throw new Error(`未找到房间${gameName}`);
    }
    await createHttp1Request({
        method: 'POST',
        url: `/lol-lobby/v1/custom-games/${id}/join`,
        body: !!password ? {
            "password": password
        } : {}
    }, credentials);


    // then set team
    const summonerResp = await createHttp1Request({
        method: 'GET',
        url: '/lol-summoner/v1/current-summoner',
    }, credentials);

    const summonerData = await summonerResp.json();

    const currentSummonerId = summonerData.summonerId;

    const lobbyResp = await createHttp1Request({
        method: 'GET',
        url: `/lol-lobby/v2/lobby`,
    }, credentials);

    const lobbyData = await lobbyResp.json();

    const isInRed = (lobbyData.gameConfig.customTeam200
        .findIndex((x: any) => x.summonerId === currentSummonerId) !== -1);

    if ((isInRed && team === 'blue') || (!isInRed && team === 'red')) {
        await createHttp1Request({
            method: 'POST',
            url: `/lol-lobby/v1/lobby/custom/switch-teams`,
        }, credentials);
    }
}

export async function startGame() {
    const credentials = await authenticate();
    await createHttp1Request({
        method: 'POST',
        url: '/lol-lobby/v1/lobby/custom/start-champ-select',
    }, credentials);
}

export async function getOwnedChampions(): Promise<number[]> {
    const credentials = await authenticate();
    const resp = await createHttp1Request({
        method: 'GET',
        url: '/lol-champions/v1/owned-champions-minimal',
    }, credentials);
    const d = await resp.json();
    console.log(championList)
    return d.map((champion: any) => championList.findIndex(x => x.id == champion.id));
}

export async function selectChampion(championId: number) {
    const credentials = await authenticate();
    const sessionResp = await createHttp1Request({
        method: "GET",
        url: "/lol-champ-select/v1/session"
    }, credentials);
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

        const ret = await createHttp1Request({
            method: 'PATCH',
            url: `/lol-champ-select/v1/session/actions/${actionId}`,
            body: {
                "type": type,
                "championId": championList[championId].id,
                "completed": true
            }
        }, credentials);
        console.log(await ret.json());
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
    const d = await resp.json();
    return {
        id: d.summonerId,
        name: d.displayName
    }
}
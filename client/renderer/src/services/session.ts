import leagueHandler from '@root/client/renderer/src/services/league';
import { disconnectFromRoom } from './room';
// let _registed: boolean = false;
// let _summonerId: string | null = null;
// let _realName: string | null = null;
// let _summonerName: string | null = null;
// let _sessionID: string | null = null;
// let _server: string | null = null;

const sessionService = {
    loginWeb(info: {
        server: string,
    }) {
        if (!info.server) {
            throw new Error("请填写完整信息！");
        }
        global?.sessionStorage?.setItem("registed", "true");
        global?.sessionStorage?.setItem("server", info.server);
    },

    async loadChampions() {
        const champions = await leagueHandler.getOwnedChampions(sessionService.summonerId!);
        global?.sessionStorage?.setItem("champions", JSON.stringify(champions));
    },

    login(info: {
        server: string,
        sessionID: string,
        summonerId: string,
        realName: string,
        summonerName: string
    }) {
        if (!info.server || !info.sessionID || !info.summonerId || !info.realName || !info.summonerName) {
            throw new Error("请填写完整信息！");
        }
        global?.sessionStorage?.setItem("server", info.server);
        global?.sessionStorage?.setItem("sessionID", info.sessionID);
        global?.sessionStorage?.setItem("summonerId", info.summonerId);
        global?.sessionStorage?.setItem("realName", info.realName);
        global?.sessionStorage?.setItem("summonerName", info.summonerName);
        global?.sessionStorage?.setItem("registed", "true");

        global?.localStorage?.setItem("server", info.server);
        global?.localStorage?.setItem("realName", info.realName);
    },
    logout() {
        disconnectFromRoom();
        global?.sessionStorage?.clear();
    },
    get server(): string | null {
        return global?.sessionStorage?.getItem("server");
    },
    get sessionID(): string | null {
        return global?.sessionStorage?.getItem("sessionID");
    },
    get registed(): boolean {
        return global?.sessionStorage?.getItem("registed") === "true";
    },
    get summonerId(): string | null {
        return global?.sessionStorage?.getItem("summonerId");
    },
    get realName(): string | null {
        return global?.sessionStorage?.getItem("realName");
    },
    get summonerName(): string | null {
        return global?.sessionStorage?.getItem("summonerName");
    },
    get champions(): number[] {
        return JSON.parse(global?.sessionStorage?.getItem("champions") || "[]");
    }
};

export default sessionService;
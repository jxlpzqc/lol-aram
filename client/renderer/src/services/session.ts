let _registed: boolean = false;
let _summonerId: string | null = null;
let _realName: string | null = null;
let _summonerName: string | null = null;
let _sessionID: string | null = null;
let _server: string | null = null;

export default {

    regist(info: {
        server: string,
        sessionID: string,
        summonerId: string,
        realName: string,
        summonerName: string
    }) {
        if (!info.server || !info.sessionID || !info.summonerId || !info.realName || !info.summonerName) {
            throw new Error("请填写完整信息！");
        }
        _registed = true;
        _sessionID = info.sessionID;
        _summonerId = info.summonerId;
        _realName = info.realName;
        _summonerName = info.summonerName;
        _server = info.server;

        localStorage.setItem("server", info.server);
        localStorage.setItem("realName", info.realName);
    },
    get server(): string | null {
        return _server;
    },
    get sessionID(): string | null {
        return _sessionID;
    },
    get registed(): boolean {
        return _registed;
    },
    get summonerId(): string | null {
        return _summonerId;
    },
    get realName(): string | null {
        return _realName;
    },
    get summonerName(): string | null {
        return _summonerName;
    },
};
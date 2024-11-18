import { io, Socket } from "socket.io-client";

export type RoomDTO = {
    id: string;
    name: string;
    status: 'waiting' | 'playing';
    playerNumber: number;
};

export type SocketRoomDTO = {
    id: string;
    name: string;
    status: 'waiting' | 'playing' | 'finished';
    playerNumber: number;
    avaliableChampions: number[];
    users: (UserDTO | null)[];
}


export type GameData = {
    champion: number;
    remainRandom: number;
};

export type RoomGameData = {
    blueTeamAvailableChampions: number[];
    redTeamAvailableChampions: number[];
    championsPool: number[];
};


export type UserDTO = {
    id: string;
    name: string;
    gameID: string;
    gameData?: GameData;
};

// const baseURL = "lol.fancybag.cn:22001";
const baseURL = "localhost:5000";

export async function getAllRooms(): Promise<RoomDTO[]> {
    const ret = await fetch("http://" + baseURL + "/rooms")
    const data = await ret.json();
    return data as RoomDTO[];
}

export type RoomSocketOpts = {
    roomID: string
    roomName: string,
    userID: string,
    userName: string,
    userGameID: string,
    onRoom?: (data: SocketRoomDTO) => void,
    onDisconnect?: () => void,
    onTime?: (data: { time: number }) => void,
    onPlay?: () => void,
    onEnd?: () => void,
}

export function getRoomSocket({
    roomID, roomName, userID, userName, userGameID, onDisconnect, onRoom, onPlay, onEnd, onTime
}: RoomSocketOpts): Socket {

    const socket = io(`ws://${baseURL}/room`, {
        query: {
            roomID,
            roomName,
            id: userID,
            name: userName,
            gameID: userGameID,
        }
    });
    socket.on("connect", () => {
        console.log("connected");
    });

    socket.on("disconnect", () => {
        console.log("disconnected");
        onDisconnect?.();
    });

    socket.on("roomUpdated", (data) => {
        console.log("room", data);
        onRoom?.(data);
    });

    socket.on("time", (data) => {
        console.log("time", data);
        onTime?.(data);
    });

    socket.on("play", () => {
        console.log("play");
        onPlay?.();
    });

    socket.on("end", () => {
        console.log("end");
        onEnd?.();
    });

    socket.connect();

    return socket;

}

export async function changeSeat(socket: Socket, seat: number) {
    await socket.emitWithAck("changeSeat", { seat });
}

export async function startGame(socket: Socket) {
    await socket.emitWithAck("play");
}

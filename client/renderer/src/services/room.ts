import { io, Socket } from "socket.io-client";
import session from "./session";
import { RoomDTO, RoomInListDTO } from '../../../../types/contract';

export async function getAllRooms(): Promise<RoomInListDTO[]> {
    const ret = await fetch("http://" + session.server + "/rooms")
    const data = await ret.json();
    return data as RoomInListDTO[];
}

export type RoomSocketOpts = {
    roomID: string
    roomName: string,
    userID: string,
    userName: string,
    userGameID: string,
    onRoom?: (data: RoomDTO) => void,
    onConnect?: () => void,
    onDisconnect?: (reason: string) => void,
    onTime?: (data: { time: number }) => void,
    onPlay?: () => void,
    onEnd?: () => void,
}

export function getRoomSocket({
    roomID, roomName, userID, userName, userGameID, onDisconnect, onRoom, onPlay, onEnd, onTime,
    onConnect
}: RoomSocketOpts): Socket {

    const socket = io(`ws://${session.server}/room`, {
        query: {
            roomID,
            roomName,
            id: userID,
            name: userName,
            gameID: userGameID,
        },
        timeout: 10000
    });
    socket.on("connect", () => {
        console.log("connected");
        onConnect?.();
    });

    socket.on('connect_error', (error) => {
        console.log("connect_error", error);
        onDisconnect?.(error.message);
    });

    socket.on("disconnect", (data) => {
        console.log("disconnected");
        onDisconnect?.(data);
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

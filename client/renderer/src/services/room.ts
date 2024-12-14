import { io, Socket } from "socket.io-client";
import session from "./session";
import { CreateRoomRequest, JoinRoomRequest, LeagueGameEogData, ProgressDTO, RankingDTO, RoomDTO, RoomInListDTO, UserGameSummaryDTO } from '@shared/contract';
import leagueHandler from "./league";
import { v4 } from "uuid";
import sessionService from "./session";

export async function getAllRooms(): Promise<RoomInListDTO[]> {
  const ret = await fetch("http://" + session.server + "/rooms")
  const data = await ret.json();
  return data as RoomInListDTO[];
}

export async function getRankings(): Promise<RankingDTO[]> {
  const ret = await fetch("http://" + session.server + "/rankings")
  const data = await ret.json();
  return data as RankingDTO[];
}

export async function getUserGames(userid: string): Promise<UserGameSummaryDTO[]> {
  const ret = await fetch("http://" + session.server + `/users/${userid}/games`)
  const data = await ret.json();
  return data as UserGameSummaryDTO[];
}

export async function getGameEog(gameid: string): Promise<LeagueGameEogData> {
  const ret = await fetch("http://" + session.server + `/games/${gameid}`)
  const data = await ret.json();
  return data as LeagueGameEogData;
}

export type RoomSocketOpts = {
  roomID: string
  roomName: string,
  waitingTime: number,
  championList: number[],
  userID: string,
  userName: string,
  userGameID: string,
  onRoom?: (data: RoomDTO) => void,
  onConnect?: () => void,
  onDisconnect?: (reason: string) => void,
  onTime?: (data: { time: number }) => void
}

export function getRoomSocket({
  roomID, roomName, waitingTime, userID, championList,
  userName, userGameID, onDisconnect, onRoom, onTime,
  onConnect
}: RoomSocketOpts): Socket {

  const socket = io(`ws://${session.server}/room`, {
    query: {
      roomID,
      id: userID,
      name: userName,
      gameID: userGameID,
      // used for creating room
      roomName,
      waitingTime,
      champions: championList
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

  socket.connect();

  return socket;

}

export async function changeSeat(socket: Socket, seat: number) {
  await socket.emitWithAck("changeSeat", { seat });
}

export async function startGame(socket: Socket) {
  await socket.emitWithAck("play");
}

export async function executeGame(
  roomInfo: RoomDTO,
  socket: Socket,
  updateProgress?: (data: ProgressDTO[]) => void
): Promise<RoomDTO> {
  let processes: ProgressDTO[] = [];

  function emitResult(_event: any, data: any) {
    console.log("end-of-game", data);
    socket.emit("end-of-game", data);
  }

  leagueHandler.addOnEndGameListener(emitResult);

  const handleProgress = (data: ProgressDTO) => {
    let idx = processes.findIndex((p) => p.id === data.id);
    if (idx !== -1) {
      processes[idx] = data;
    } else {
      processes.push(data);
    }
    updateProgress?.([...processes]);
  }
  socket.on("executeProgress", handleProgress);

  const createHandler = (event: string, realHandler: (arg: any) => any | Promise<any>) => {
    return async (arg: any) => {
      try {
        const ret = await realHandler(arg);
        console.log("emit", event + ":success", ret);
        await socket.emitWithAck(event + ":success", ret);
      } catch (e) {
        console.log("emit", event + ":fail", e?.toString());
        await socket.emitWithAck(event + ":fail", e?.toString());
      }
    }
  }

  const handleCreateRoom = async ({ team }: CreateRoomRequest) => {
    const gameName = roomInfo.id;
    const password = v4();
    console.log("create room", gameName, password);

    await leagueHandler.createNewGame(gameName, password, sessionService.summonerId!, team);

    return {
      roomName: gameName,
      password
    } as JoinRoomRequest;
  }

  const createRoomHandler = createHandler("createRoom", handleCreateRoom);
  socket.on("createRoom", createRoomHandler);

  const handleJoinRoom = async ({ roomName, password, team }: JoinRoomRequest) => {
    await leagueHandler.joinGame(roomName, password, sessionService.summonerId!, team);
  }

  const joinRoomHandler = createHandler("joinRoom", handleJoinRoom);
  socket.on("joinRoom", joinRoomHandler);

  const handleStartGame = async () => {
    await leagueHandler.startGame();
  }
  const startGameHandler = createHandler("startGame", handleStartGame);
  socket.on("startGame", startGameHandler);

  const handlePick = async () => {
    const currentUser = roomInfo.users.find(x => x?.id == session.sessionID);
    const champion = currentUser?.gameData?.champion;
    if (!champion) throw new Error("Could not get champion");
    await leagueHandler.selectChampion(champion);
  }
  const pickHandler = createHandler("pick", handlePick);
  socket.on("pick", pickHandler);

  socket.emit("prepareExecute");

  const ret = await new Promise<RoomDTO>((resolve, _reject) => {
    socket.once("finish", resolve);
  });

  leagueHandler.removeOnEndGameListener(emitResult);
  socket.off("executeProgress", handleProgress);
  socket.off("createRoom", createRoomHandler);
  socket.off("joinRoom", joinRoomHandler);
  socket.off("startGame", startGameHandler);
  socket.off("pick", pickHandler);

  return ret;
}

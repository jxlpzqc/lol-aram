import { io, Socket } from "socket.io-client";
import session from "./session";
import { CreateRoomRequest, JoinRoomRequest, LeagueGameEogData, NegotiateResponse, ProgressDTO, RankingDTO, RoomDTO, RoomInListDTO, UserGameSummaryDTO } from '@shared/contract';
import leagueHandler from "./league";
import { v4, v4 as uuidv4 } from 'uuid';
import sessionService from "./session";
import championList from '@renderer/public/assets/champions.json';

export async function negotiateWithServer(server: string, version: string) {
  const ret = await fetch("http://" + server + "/negotiate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version,
    }),
  });
  const data = await ret.json();
  return data as NegotiateResponse;
}

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

type RoomUserOpts = {
  userID: string,
  userName: string,
  userGameID: string,
  championList: number[],
}

type CreateRoomOpts = {
  roomName: string,
  password: string,
  waitingTime: number,
}

type JoinRoomOpts = {
  roomID: string,
  password: string,
}

export type ConnectRoomOpts = ({
  type: "create",
} & CreateRoomOpts & RoomUserOpts) | ({
  type: "join",
} & JoinRoomOpts & RoomUserOpts);

type Listener<T extends Event> = (event: T) => void;

class DisconnectEvent extends Event {
  constructor(public reason: string) { super("disconnect"); }
}

class RoomUpdatedEvent extends Event {
  constructor(public data: RoomDTO) { super("roomUpdated"); }
}

class TimeEvent extends Event {
  constructor(public time: number) { super("time"); }
}
class ProgressEvent extends Event {
  constructor(public data: ProgressDTO[]) { super("progressUpdated"); }
}

export type NeedManualOperationOpts = {
  type: "createRoom",
  roomName: string,
  password: string,
  team: "blue" | "red",
} | {
  type: "joinRoom",
  roomName: string,
  password: string,
  team: "blue" | "red",
} | {
  type: "startGame"
} | {
  type: "pick",
  champion: number,
};

class NeedManualOperationEvent extends Event {
  constructor(public data: NeedManualOperationOpts) { super("needManualOperation"); }
}

class ManualOperationResultEvent extends Event {
  constructor(public success: boolean) { super("manualOperationResult"); }
}

export class RoomSocket {
  private socketEvents = new EventTarget()

  latestRoomInfo: RoomDTO | null = null;

  keepInScreenRoomInfo: RoomDTO | null = null;

  constructor(private socket: Socket) {

    this.socket.on("connect", () => {
      this.socketEvents.dispatchEvent(new Event("connect"));
    });

    this.socket.on('connect_error', (error) => {
      console.log("connect_error", error);
      this.socketEvents.dispatchEvent(new DisconnectEvent(error.message));
    });

    this.socket.on("disconnect", (data) => {
      console.log("disconnected");
      let reason: string = data;
      if (data === "io server disconnect") reason = "服务器已经将您移出房间";
      else if (data === "io client disconnect") reason = "您已经离开房间";
      else if (data === "ping timeout") reason = "连接超时";
      this.socketEvents.dispatchEvent(new DisconnectEvent(reason));
      disconnectFromRoom();
    });

    this.socket.on("roomUpdated", (data: RoomDTO) => {
      console.log("[DEBUG] room is updated", data);
      if (data.status === "executing" || data.status === "playing") {
        this.socketEvents.dispatchEvent(new Event("needNavigateToRoom"));
      }
      if (data.status === "executing") {
        this.keepInScreenRoomInfo = data;
        this.executeGame();
      }
      this.latestRoomInfo = data;
      this.socketEvents.dispatchEvent(new RoomUpdatedEvent(data));
    });

    this.socket.on("time", (data) => {
      this.socketEvents.dispatchEvent(new TimeEvent(data.time));
    });
  }

  get internalSocket() {
    return this.socket;
  }

  addEventListener(event: "disconnect", listener: Listener<DisconnectEvent>): void;
  addEventListener(event: "connect", listener: Listener<Event>): void;
  addEventListener(event: "roomUpdated", listener: Listener<RoomUpdatedEvent>): void;
  addEventListener(event: "time", listener: Listener<TimeEvent>): void;
  addEventListener(event: "progressUpdated", listener: Listener<ProgressEvent>): void;
  addEventListener(event: "needManualOperation", listener: Listener<NeedManualOperationEvent>): void;
  addEventListener(event: "manualOperationResult", listener: Listener<ManualOperationResultEvent>): void;
  addEventListener(event: "needNavigateToRoom", listener: Listener<Event>): void;
  addEventListener(event: any, listener: any) {
    this.socketEvents.addEventListener(event, listener);
  }

  removeEventListener(event: "disconnect", listener: Listener<DisconnectEvent>): void;
  removeEventListener(event: "connect", listener: Listener<Event>): void;
  removeEventListener(event: "roomUpdated", listener: Listener<RoomUpdatedEvent>): void;
  removeEventListener(event: "time", listener: Listener<TimeEvent>): void;
  removeEventListener(event: "progressUpdated", listener: Listener<ProgressEvent>): void;
  removeEventListener(event: "needManualOperation", listener: Listener<NeedManualOperationEvent>): void;
  removeEventListener(event: "manualOperationResult", listener: Listener<ManualOperationResultEvent>): void;
  removeEventListener(event: "needNavigateToRoom", listener: Listener<Event>): void;
  removeEventListener(event: any, listener: any) {
    this.socketEvents.removeEventListener(event, listener);
  }

  async changeSeat(seat: number) {
    await this.socket.emitWithAck("changeSeat", { seat });
  }

  async startGame() {
    await this.socket.emitWithAck("play");
  }

  async autoArrange() {
    await this.socket.emitWithAck("autoarrange");
  }

  async endGame() {
    await this.socket.emitWithAck("end");
  }

  async pickChampion(champion: number) {
    await this.socket.emitWithAck("pick", { champion });
  }

  async randomChampion() {
    await this.socket.emitWithAck("random");
  }

  sendManualOperationResult(success: boolean) {
    this.socketEvents.dispatchEvent(new ManualOperationResultEvent(success));
  }

  private progressList: ProgressDTO[] = [];

  get progress() {
    return this.progressList as ReadonlyArray<ProgressDTO>;
  }

  private emitUpdateProgress() {
    this.socketEvents.dispatchEvent(new ProgressEvent(this.progressList));
  }

  private emitNeedManualOperation(data: NeedManualOperationOpts) {
    this.socketEvents.dispatchEvent(new NeedManualOperationEvent(data));
  }

  private async executeGame(): Promise<RoomDTO> {
    const TIMEOUT = 10000;
    const RETRY_TIMES = 3;

    if (this.latestRoomInfo === null) {
      throw new Error("No room info");
    }

    this.progressList = [];
    this.emitUpdateProgress();

    const socket = this.socket;

    const handleEndGame = (_event: any, data: any) => {
      console.log("end-of-game", data);
      socket.emit("end-of-game", data);
    }

    leagueHandler.addOnEndGameListener(handleEndGame);

    const handleProgress = (data: ProgressDTO) => {
      let idx = this.progressList.findIndex((p) => p.id === data.id);
      if (idx !== -1) {
        this.progressList[idx] = data;
      } else {
        this.progressList.push(data);
      }
      this.emitUpdateProgress();
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

    const createRealHandler = <P = void, Ret = void, S1 = P, S2 = S1>({
      doing,
      getManualOpts,
      getReturnValue = (p, s1, s2) => s1 as never as Ret,
      prepare = (props) => props as never as S1,
    }: {
      doing: (p: P, s1: S1) => Promise<S2>,
      getManualOpts: (p: P, s1: S1) => NeedManualOperationOpts,
      getReturnValue?: (p: P, s1: S1, s2: S2 | undefined) => Ret,
      prepare?: (props: P) => S1 | Promise<S1>,
    }
    ) => (async (props: P) => {
      const s1 = await prepare(props);
      let s2: S2 | undefined = undefined;

      let handled = false;
      for (let i = 0; i < RETRY_TIMES; i++) {
        try {
          s2 = await Promise.race([
            new Promise<S2>((_, reject) => { setTimeout(reject, TIMEOUT) }),
            doing(props, s1),
          ])
          handled = true;
          break;
        } catch (e) {
          console.error(e);
        }
      }

      if (!handled) {
        this.emitNeedManualOperation(getManualOpts(props, s1));

        await new Promise<void>((resolve, reject) => {
          const handler = (event: ManualOperationResultEvent) => {
            this.removeEventListener("manualOperationResult", handler);
            if (event.success) {
              resolve();
            } else {
              reject(new Error("Manual operation failed or cancelled"));
            }
          }
          this.addEventListener("manualOperationResult", handler);
        });

      }
      return getReturnValue(props, s1, s2);
    });

    const handleCreateRoom = createRealHandler<CreateRoomRequest, JoinRoomRequest, { gameName: string, password: string, team: "blue" | "red" }, void>(
      {
        doing: async ({ team }, { gameName, password }) => {
          await leagueHandler.createNewGame(gameName, password, sessionService.summonerId!, team);
        },
        prepare: () => {
          if (this.latestRoomInfo === null) throw new Error("No room info");
          // fix: when use room id, there will be duplicate rooms in league client
          const gameName = v4();
          const password = v4().replace(/-/g, "").substring(0, 8);
          const team = this.latestRoomInfo.users.findIndex(x => x?.id == session.sessionID) < 5 ? "blue" : "red";
          console.log("create room", gameName, password);
          return { gameName, password, team }
        },
        getManualOpts: (_, s1) => ({ type: "createRoom", roomName: s1.gameName, password: s1.password, team: s1.team }),
        getReturnValue: (_, s1) => ({ roomName: s1.gameName, password: s1.password }),
      }
    );

    const createRoomHandler = createHandler("createRoom", handleCreateRoom);
    socket.on("createRoom", createRoomHandler);

    const handleJoinRoom = createRealHandler<JoinRoomRequest, void, void>(
      {
        doing: async ({ roomName, password, team }) => {
          await leagueHandler.joinGame(roomName, password, sessionService.summonerId!, team);
        },
        getManualOpts: ({ roomName, password, team }) => ({ type: "joinRoom", roomName, password, team: team || "blue" }),
      }
    )

    const joinRoomHandler = createHandler("joinRoom", handleJoinRoom);
    socket.on("joinRoom", joinRoomHandler);

    const handleStartGame = createRealHandler(
      {
        doing: async () => {
          await leagueHandler.startGame();
        },
        getManualOpts: () => ({ type: "startGame" }),
      }
    )

    const startGameHandler = createHandler("startGame", handleStartGame);
    socket.on("startGame", startGameHandler);

    const handlePick = createRealHandler<void, void, number, void>({
      doing: async (_, champion) => {
        await leagueHandler.selectChampion(champion);
      },
      getManualOpts: (_, champion) => ({ type: "pick", champion }),
      prepare: () => {
        if (!this.latestRoomInfo) throw new Error("No room info");
        const currentUser = this.latestRoomInfo.users.find(x => x?.id == session.sessionID);
        const champion = currentUser?.gameData?.champion;
        if (!champion) throw new Error("Could not get champion");
        return champion;
      }
    })

    const pickHandler = createHandler("pick", handlePick);
    socket.on("pick", pickHandler);

    socket.emit("prepareExecute");

    const ret = await new Promise<RoomDTO>((resolve, _reject) => {
      socket.once("finish", resolve);
    });

    leagueHandler.removeOnEndGameListener(handleEndGame);
    socket.off("executeProgress", handleProgress);
    socket.off("createRoom", createRoomHandler);
    socket.off("joinRoom", joinRoomHandler);
    socket.off("startGame", startGameHandler);
    socket.off("pick", pickHandler);

    return ret;
  }
}

let socket: RoomSocket | null = null;
const socketChangeEvents = new EventTarget();

export function addRoomSocketChangeListener(listener: Listener<Event>): void {
  socketChangeEvents.addEventListener("change", listener);
}

export function removeRoomSocketChangeListener(listener: Listener<Event>): void {
  socketChangeEvents.removeEventListener("change", listener);
}

export function getRoomSocket() {
  return socket;
}

export function connectToRoom(opts: ConnectRoomOpts): RoomSocket {
  if (socket) {
    socket.internalSocket.disconnect();
    socket = null;
  }
  socket = new RoomSocket(io(`ws://${session.server}/room`, {
    query: opts.type === "join" ? {
      roomID: opts.roomID,
      id: opts.userID,
      password: opts.password,
      name: opts.userName,
      gameID: opts.userGameID,
      champions: opts.championList
    } : {
      roomName: opts.roomName,
      id: opts.userID,
      waitingTime: opts.waitingTime,
      password: opts.password,
      name: opts.userName,
      gameID: opts.userGameID,
      champions: opts.championList
    },
    timeout: 10000,
  }));

  socketChangeEvents.dispatchEvent(new Event("change"));
  return socket;
}

export function connectToRoomAndWait(opts: ConnectRoomOpts): Promise<RoomSocket> {
  return new Promise((resolve, reject) => {
    const socket = connectToRoom(opts);
    const onSocketConnect = () => {
      clearListeners();
      resolve(socket);
    }
    const onSocketDisconnect = (e: DisconnectEvent) => {
      clearListeners();
      reject(e.reason);
    }
    const clearListeners = () => {
      socket.removeEventListener("connect", onSocketConnect);
      socket.removeEventListener("disconnect", onSocketDisconnect);
    }
    socket.addEventListener("connect", onSocketConnect);
    socket.addEventListener("disconnect", onSocketDisconnect);
  });
}

export function disconnectFromRoom() {
  if (socket) {
    socket.internalSocket.disconnect();
    socket = null;
    socketChangeEvents.dispatchEvent(new Event("change"));
  }
}

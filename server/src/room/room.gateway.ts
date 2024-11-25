import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { from, Observable } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { Server, Socket } from 'socket.io';
import * as rooms from '../rooms';
import { Logger } from '@nestjs/common';
import { JoinRoomRequest, CreateRoomRequest, ProgressDTO } from '@shared/contract';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'room',
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomGateway.name);

  private socketToUserInfo(client: Socket): rooms.UserInfo {
    let { id, name, gameID, champions: championStr } = client.handshake.query;
    // console.log(client.handshake.query);
    if (Array.isArray(id)) id = id[0];
    if (Array.isArray(name)) name = name[0];
    if (Array.isArray(gameID)) gameID = gameID[0];
    let champions = [];
    champions = (championStr as unknown as string).split(',').map((c) => parseInt(c));
    return {
      id,
      gameID,
      name,
      ownedChampions: champions
    };
  }

  private socketToRoomInfo(client: Socket): rooms.RoomInfo {
    let { roomID } = client.handshake.query;
    if (Array.isArray(roomID)) roomID = roomID[0];
    return rooms.getRoom(roomID);
  }

  handleConnection(client: Socket, ...args: any[]) {
    const userInfo = this.socketToUserInfo(client);

    if (rooms.getRoomByUser(userInfo.id)) {
      rooms.quitRoom(rooms.getRoomByUser(userInfo.id)!.id, userInfo.id);
    }

    let { roomID, roomName, waitingTime } = client.handshake.query;

    if (Array.isArray(roomID)) roomID = roomID[0];
    if (Array.isArray(roomName)) roomName = roomName[0];

    if (Array.isArray(waitingTime)) waitingTime = waitingTime[0];
    const waitingTimeNum = parseInt(waitingTime) || 60;

    try {
      roomID = rooms.joinRoom(roomID, userInfo, client, {
        name: roomName,
        waitingTime: waitingTimeNum
      });
      client.handshake.query.roomID = roomID;

      this.logger.log(`User ${userInfo.id} connected to room ${roomID}`);

      this.notifyRoom(rooms.getRoom(roomID));
    } catch (e) {
      this.logger.error(e);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    let { id, roomID } = client.handshake.query;
    if (Array.isArray(id)) id = id[0];
    if (Array.isArray(roomID)) roomID = roomID[0];
    try {
      rooms.quitRoom(roomID, id);
      this.logger.log(`User ${id} disconnected from room ${roomID}`);
      this.notifyRoom(rooms.getRoom(roomID));
    } catch (e) {
      this.logger.error(e);
    }
  }

  private checkNeedStop(room: rooms.RoomInfo, otherAction?: () => void) {
    if (room.needStop) {
      room.needStop = false;
      room.status = 'waiting';
      otherAction?.();
      this.notifyRoom(room);
      throw new Error('Room is stopped');
    }
  }

  private emitToRoom(
    room: rooms.RoomInfo | undefined,
    event: string,
    data: any,
  ) {
    if (!room) return;
    room.users.forEach((userAndSocket) => {
      if (userAndSocket !== null) {
        userAndSocket.socket.emit(event, data);
      }
    });
  }

  private notifyRoom(room: rooms.RoomInfo | undefined, event = "roomUpdated") {
    if (!room) return;
    this.logger.log(`Notifying seats for room ${room.id}`);
    room.users.forEach((userAndSocket) => {
      if (userAndSocket !== null) {
        userAndSocket.socket.emit(event, rooms.roomToClient(room, userAndSocket.user.id));
      }
    });
  }

  @WebSocketServer()
  server: Server;

  @SubscribeMessage('changeSeat')
  changeSeat(client: Socket, data: { seat: number }) {
    const userInfo = this.socketToUserInfo(client);
    const roomInfo = this.socketToRoomInfo(client);
    if (roomInfo.status !== 'waiting') {
      throw new Error('Cannot change seat when game is in progress');
    }
    rooms.changeSeat(roomInfo, userInfo.id, data.seat);
    this.notifyRoom(roomInfo);
  }

  @SubscribeMessage('play')
  async play(client: Socket, data: { card: number }) {

    const roomInfo = this.socketToRoomInfo(client);
    roomInfo.needStop = false;
    roomInfo.status = 'playing';

    rooms.playGame(roomInfo.id);

    this.emitToRoom(roomInfo, 'play', data);
    this.notifyRoom(roomInfo);

    let time = roomInfo.waitingTime;
    while (time > 0) {
      this.emitToRoom(roomInfo, 'time', { time });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.checkNeedStop(roomInfo);

      if (roomInfo.status !== 'playing') return;
      time--;
    }

    if (roomInfo.status !== 'playing') return;
    await this.executeGame(roomInfo);
  }

  private async emitEventAndUpdateProgressWithAck<T = void>(
    socketsRaw: (Socket | undefined)[],
    roomInfo: rooms.RoomInfo,
    event: string,
    data: any,
    progressID: number,
    progressMsg: string,
    progressMsgWhenFail?: string,
    progressMsgWhenFinish?: string,
    progressMsgWhenFinishOne?: (n: number, t: number) => string,
    timeout = 20000): Promise<T[]> {

    const sockets = socketsRaw.filter((s) => s !== undefined) as Socket[];

    const finishExecute = () => {
      this.notifyRoom(roomInfo, 'finish');
      roomInfo.status = 'waiting';
      this.notifyRoom(roomInfo);
    };

    if (!progressMsgWhenFail) {
      progressMsgWhenFail = progressMsg + "失败";
    }

    if (!progressMsgWhenFinish) {
      progressMsgWhenFinish = progressMsg + "已完成";
    }
    if (!progressMsgWhenFinishOne) {
      progressMsgWhenFinishOne = (n, t) => `${progressMsg} ${n} / ${t}`;
    }

    const p = { id: progressID, message: progressMsg, status: 0 };

    this.emitToRoom(roomInfo, 'executeProgress', p);

    for (const socket of sockets) {
      socket.emit(event, data);
    }

    const RETRIES = 2;
    const retryTimes = new Array<number>(sockets.length).fill(0);

    try {
      return await new Promise<T[]>((resolve, reject) => {
        const ret = new Array<T>(sockets.length);
        let ready = 0;
        for (const socket of sockets) {
          socket.once(event + ':success', (data) => {
            ret[sockets.indexOf(socket)] = data;
            ++ready;

            if (ready === sockets.length) {
              p.message = progressMsgWhenFinish;
              p.status = 1;
              this.emitToRoom(roomInfo, 'executeProgress', p);
            } else {
              p.message = progressMsgWhenFinishOne(ready, sockets.length);
              this.emitToRoom(roomInfo, 'executeProgress', p);
            }

            if (ready === sockets.length) {
              resolve(ret);
            }
          });

          const onFail = (data: any) => {
            this.logger.error(`Client ${socket.handshake.query.id} failed to ${event}: ${data}`);
            retryTimes[sockets.indexOf(socket)]++;
            if (retryTimes[sockets.indexOf(socket)] < RETRIES) {
              this.logger.log(`Retrying ${event} for ${socket.handshake.query.id} (${retryTimes[sockets.indexOf(socket)]})`);
              p.message = progressMsgWhenFail + "，正在重试第 " + retryTimes[sockets.indexOf(socket)] + " 次";
              socket.once(event + ':fail', onFail);
              socket.emit(event, data);
            } else {
              reject?.(data);
            }
          }

          socket.once(event + ':fail', onFail);

          const onTimeout = () => {
            this.logger.error(`Client ${socket.handshake.query.id} timeout to ${event}`);
            retryTimes[sockets.indexOf(socket)]++;
            if (retryTimes[sockets.indexOf(socket)] < RETRIES) {
              this.logger.log(`Retrying ${event} for ${socket.handshake.query.id} (${retryTimes[sockets.indexOf(socket)]})`);
              p.message = progressMsg + "超时，正在重试第 " + retryTimes[sockets.indexOf(socket)] + " 次";
              setTimeout(onTimeout, timeout);
              socket.emit(event, data);
            } else {
              reject?.(new Error(progressMsg + "超时"));;
            }
          };

          setTimeout(onTimeout, timeout);

          socket.once('disconnect', reject);
        }
      });

    } catch (e) {
      this.logger.error(e);
      p.message = progressMsgWhenFail + "，具体原因：" + e;
      p.status = 2;
      this.emitToRoom(roomInfo, 'executeProgress', p);

      finishExecute();
      throw e;
    }
  }

  private async executeGame(roomInfo: rooms.RoomInfo) {

    const ck = () => {
      this.checkNeedStop(roomInfo, () => {
        this.emitToRoom(roomInfo, 'executeProgress', {
          id: -100, message: '由于玩家退出，游戏启动进程已停止', status: 2
        });
        this.notifyRoom(roomInfo, 'finish');
      });
    }

    roomInfo.status = 'executing';
    this.notifyRoom(roomInfo);

    let progressID = 0;

    let preparedCount = 0;
    await new Promise<void>((resolve, reject) => {
      const ausers = roomInfo.users.filter((u) => u !== null);
      for (const user of ausers) {
        if (user !== null) {
          user.socket.once('prepareExecute', () => {
            preparedCount++;
            if (preparedCount === ausers.length) {
              this.emitToRoom(roomInfo, 'executeProgress', {
                id: progressID,
                message: '所有玩家准备执行完成',
                status: 1
              });
              resolve();
            } else {
              this.emitToRoom(roomInfo, 'executeProgress', {
                id: progressID,
                message: '等待所有玩家准备执行，当前进度 ' + preparedCount + ' / ' + ausers.length,
                status: 0
              });
            }
          });
          setTimeout(() => {
            if (preparedCount !== ausers.length) {
              this.emitToRoom(roomInfo, 'executeProgress', {
                id: progressID,
                message: '在超时限制内未收到所有玩家的准备就绪',
                status: 2
              });
              reject(new Error('等待所有玩家准备执行超时'));
            }
          }, 20000);
        }
      }
    });
    ++progressID;

    // First player create room
    const firstPlayer = roomInfo.users.find((u) => u !== null);


    const leagueRoomResult = (await this.emitEventAndUpdateProgressWithAck<JoinRoomRequest>([firstPlayer?.socket],
      roomInfo,
      'createRoom',
      { team: rooms.getUserGroup(roomInfo, firstPlayer.user.id) === 0 ? 'blue' : 'red' } as CreateRoomRequest,
      progressID++,
      `${firstPlayer?.user.gameID} 创建房间`))[0];

    ck();

    this.emitToRoom(roomInfo, 'executeProgress', {
      id: progressID,
      message: '请稍等',
      status: 0
    });
    await new Promise(resolve => setTimeout(resolve, 5000));
    ck();

    for (const otherUser of roomInfo.users.filter((u) => u !== firstPlayer && u !== null)) {

      await this.emitEventAndUpdateProgressWithAck(
        [otherUser.socket],
        roomInfo,
        'joinRoom',
        {
          ...leagueRoomResult,
          team: rooms.getUserGroup(roomInfo, otherUser.user.id) === 0 ? 'blue' : 'red'
        },
        progressID++,
        `${otherUser.user.gameID} 加入房间`
      );

      ck();
    }

    await this.emitEventAndUpdateProgressWithAck(
      [firstPlayer?.socket],
      roomInfo,
      'startGame',
      {},
      progressID++,
      `房主开始游戏`
    );

    ck();

    await this.emitEventAndUpdateProgressWithAck(
      roomInfo.users.map((u) => u?.socket),
      roomInfo,
      'pick',
      {},
      progressID++,
      `等待所有玩家选择英雄`,
      "选择英雄失败",
      "所有玩家选择英雄完成",
      (n, t) => `等待所有玩家选择英雄，当前进度 ${n} / ${t}.`,
    );

    ck();

    this.notifyRoom(roomInfo, 'finish');
    roomInfo.status = 'waiting';
    this.notifyRoom(roomInfo);
  }

  @SubscribeMessage('random')
  async random(client: Socket) {
    const roomInfo = this.socketToRoomInfo(client);
    const userInfo = this.socketToUserInfo(client);
    rooms.randomChampion(roomInfo.id, userInfo.id);
    this.notifyRoom(roomInfo);
  }

  @SubscribeMessage('pick')
  async pick(client: Socket, data: { champion: number }) {
    const roomInfo = this.socketToRoomInfo(client);
    const userInfo = this.socketToUserInfo(client);
    rooms.pickChampion(roomInfo.id, userInfo.id, data.champion);
    this.notifyRoom(roomInfo);
  }

  @SubscribeMessage('end')
  exit(client: Socket) {
    const roomInfo = this.socketToRoomInfo(client);
    roomInfo.needStop = true;
  }
}

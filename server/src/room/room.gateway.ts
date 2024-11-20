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
import { CreateRoomResult } from '../../../types/contract';

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
    console.log(client.handshake.query);
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
    roomInfo.status = 'playing';

    rooms.playGame(roomInfo.id);

    this.emitToRoom(roomInfo, 'play', data);
    this.notifyRoom(roomInfo);

    let time = roomInfo.waitingTime;
    while (time > 0) {
      this.emitToRoom(roomInfo, 'time', { time });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (roomInfo.status !== 'playing') return;
      time--;
    }

    if (roomInfo.status !== 'playing') return;
    await this.executeGame(roomInfo);
  }

  private async executeGame(roomInfo: rooms.RoomInfo) {
    const finishExecute = () => {
      this.notifyRoom(roomInfo, 'finish');
      roomInfo.status = 'waiting';
      this.notifyRoom(roomInfo);
    };

    roomInfo.status = 'executing';
    this.notifyRoom(roomInfo);

    // First player create room
    const firstPlayer = roomInfo.users.find((u) => u !== null);

    let progressID = 0;
    let progress = { id: progressID++, message: `等待 ${firstPlayer.user.gameID} 创建房间...`, status: 0 };
    firstPlayer?.socket.emit('createRoom');
    this.emitToRoom(roomInfo, 'executeProgress', progress);

    let leagueRoomResult;
    try {
      leagueRoomResult = await new Promise<CreateRoomResult>((resolve, reject) => {
        firstPlayer?.socket.once('createRoom:success', resolve);
        firstPlayer?.socket.once('createRoom:fail', reject);
        firstPlayer?.socket.once('disconnect', reject);
      });
      progress.message = "房间创建成功";
      progress.status = 1;
      this.emitToRoom(roomInfo, 'executeProgress', progress);
    } catch (e) {
      this.logger.error(e);
      progress.message = "房间创建失败";
      progress.status = 2;
      this.emitToRoom(roomInfo, 'executeProgress', progress);

      finishExecute();
      return;
    }

    for (const otherUser of roomInfo.users.filter((u) => u !== firstPlayer && u !== null)) {
      const progress = { id: progressID++, message: `等待 ${otherUser.user.gameID} 加入房间...`, status: 0 };
      otherUser.socket.emit('joinRoom', leagueRoomResult);
      this.emitToRoom(roomInfo, 'executeProgress', progress);

      try {
        await new Promise<void>((resolve, reject) => {
          otherUser.socket.once('joinRoom:success', resolve);
          otherUser.socket.once('joinRoom:fail', reject);
          otherUser.socket.once('disconnect', reject);
        });
        progress.message = "加入房间成功";
        progress.status = 1;
        this.emitToRoom(roomInfo, 'executeProgress', progress);
      } catch (e) {
        this.logger.error(e);
        progress.message = "加入房间失败";
        progress.status = 2;
        this.emitToRoom(roomInfo, 'executeProgress', progress);

        finishExecute();
        return;
      }
    }

    // first player start game
    progress = { id: progressID++, message: `等待 ${firstPlayer.user.gameID} 开始游戏...`, status: 0 };
    firstPlayer?.socket.emit('startGame');
    this.emitToRoom(roomInfo, 'executeProgress', progress);

    try {
      await new Promise<void>((resolve, reject) => {
        firstPlayer?.socket.once('startGame:success', resolve);
        firstPlayer?.socket.once('startGame:fail', reject);
        firstPlayer?.socket.once('disconnect', reject);
      });
      progress.message = "开始游戏成功";
      progress.status = 1;
      this.emitToRoom(roomInfo, 'executeProgress', progress);
    } catch (e) {
      this.logger.error(e);
      progress.message = "开始游戏失败";
      progress.status = 2;
      this.emitToRoom(roomInfo, 'executeProgress', progress);

      finishExecute();
      return;
    }

    let playerReady = 0;
    const playerCount = roomInfo.users.filter((u) => u !== null).length;

    const genMsg = () => {
      return `等待所有玩家选择英雄，当前进度 ${playerReady} / ${playerCount}.`;
    }

    this.emitToRoom(roomInfo, 'pick', {});
    progress = { id: progressID++, message: genMsg(), status: 0 };
    this.emitToRoom(roomInfo, 'executeProgress', progress);

    try {
      await new Promise<void>((resolve, reject) => {
        for (const user of roomInfo.users.filter((u) => u !== null)) {
          user.socket.once('pick:success', () => {
            playerReady++;
            progress.message = genMsg();
            this.emitToRoom(roomInfo, 'executeProgress', progress);
            if (playerReady === playerCount) {
              resolve();
            }
          });
          user.socket.once('pick:fail', reject);
        }
      });
    } catch (e) {
      this.logger.error(e);
      progress.message = "选择英雄失败";
      progress.status = 2;
      this.emitToRoom(roomInfo, 'executeProgress', progress);

      finishExecute();
      return;
    }

    progress.message = "所有玩家选择英雄完成";
    progress.status = 1;
    this.emitToRoom(roomInfo, 'executeProgress', progress);

    finishExecute();
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
    rooms.exitGame(roomInfo.id);
    this.emitToRoom(roomInfo, 'end', {});
  }
}

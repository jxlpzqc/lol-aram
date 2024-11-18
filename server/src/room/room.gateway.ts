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
import { map } from 'rxjs/operators';
import { Server, Socket } from 'socket.io';
import * as rooms from '../rooms';
import { Logger } from '@nestjs/common';

const TIME_LIMIT = 60;

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'room',
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomGateway.name);

  private socketToUserInfo(client: Socket): rooms.UserInfo {
    let { id, name, gameID } = client.handshake.query;

    if (Array.isArray(id)) id = id[0];
    if (Array.isArray(name)) name = name[0];
    if (Array.isArray(gameID)) gameID = gameID[0];
    return {
      id,
      gameID,
      name,
    };
  }

  private socketToRoomInfo(client: Socket): rooms.RoomInfo {
    let { roomID } = client.handshake.query;
    if (Array.isArray(roomID)) roomID = roomID[0];
    return rooms.getRoom(roomID);
  }

  handleConnection(client: Socket, ...args: any[]) {
    const userInfo = this.socketToUserInfo(client);

    let { roomID, roomName } = client.handshake.query;

    if (Array.isArray(roomID)) roomID = roomID[0];
    if (Array.isArray(roomName)) roomName = roomName[0];

    try {
      roomID = rooms.joinRoom(roomID, userInfo, roomName, client);
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

  private notifyRoom(room: rooms.RoomInfo | undefined) {
    if (!room) return;
    this.logger.log(`Notifying seats for room ${room.id}`);
    room.users.forEach((userAndSocket) => {
      if (userAndSocket !== null) {
        userAndSocket.socket.emit("roomUpdated", rooms.roomToClient(room, userAndSocket.user.id));
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

    let time = TIME_LIMIT;
    while (time > 0) {
      this.emitToRoom(roomInfo, 'time', { time });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      time--;
    }

    roomInfo.status = 'finished';
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
    rooms.exitGame(roomInfo.id);
    this.emitToRoom(roomInfo, 'end', {});
  }
}

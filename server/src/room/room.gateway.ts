import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as rooms from '../rooms';
import { Logger } from '@nestjs/common';
import { JoinRoomRequest, CreateRoomRequest, ProgressDTO } from '@shared/contract';
import { PrismaService } from '../prisma.service';
import { RankScoreService } from '../rankscore.service';

const DEFAULT_RANK_SCORE = 1200;

const delayAndCheckStop = (room: rooms.RoomInfo, ms: number) => {
  let onStop;
  let timeout;
  return Promise.race([
    new Promise((resolve) => {
      timeout = setTimeout(resolve, ms);
    }),
    new Promise((_, reject) => {
      onStop = (e: Error) => {
        reject(e);
      }
      room.needStop.once('stop', onStop);
    })
  ]).finally(() => {
    clearTimeout(timeout);
    room.needStop.off('stop', onStop);
  });
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'room',
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomGateway.name);
  constructor(private readonly db: PrismaService, private readonly rankScoreService: RankScoreService) { }

  private socketToUserInfo(client: Socket): rooms.UserInfo {
    let { id, name, gameID, champions: championStr } = client.handshake.query;
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

  private async getPlayerRankScore(info: rooms.UserInfo): Promise<number> {
    const user = await this.db.user.findUnique({
      where: {
        summonerId: info.id
      }
    });

    if (!user) throw new Error('User not found');

    return user.rankScore;
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const userInfo = this.socketToUserInfo(client);

    // if user not exist, create user else update user
    await this.db.user.upsert({
      where: {
        summonerId: userInfo.id
      },
      update: {
        name: userInfo.gameID,
        nickname: userInfo.name,
      },
      create: {
        summonerId: userInfo.id,
        name: userInfo.gameID,
        nickname: userInfo.name,
        rankScore: DEFAULT_RANK_SCORE
      }
    });
    userInfo.rankScore = await this.getPlayerRankScore(userInfo);

    let { roomID, roomName, waitingTime, password } = client.handshake.query;

    if (Array.isArray(roomID)) roomID = roomID[0];
    if (Array.isArray(roomName)) roomName = roomName[0];
    if (Array.isArray(waitingTime)) waitingTime = waitingTime[0];
    if (Array.isArray(password)) password = password[0];

    const waitingTimeNum = parseInt(waitingTime) || 60;

    try {
      roomID = rooms.joinRoom(roomID, userInfo, client, {
        name: roomName,
        waitingTime: waitingTimeNum
      }, password);
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

  @SubscribeMessage('autoarrange')
  async autoarrange(client: Socket) {
    const roomInfo = this.socketToRoomInfo(client);

    // fix rankscore with recent win rate
    for (const user of roomInfo.users.filter((u) => !!u)) {
      const recentGames = await this.db.gameUserMapping.findMany({
        orderBy: {
          game: {
            time: 'desc'
          }
        },
        where: {
          user: {
            summonerId: user.user.id
          }
        }
      });
      const lastGameWin = recentGames?.[0]?.isWin;
      let sameCount = 0;

      for (let i = 1; i < recentGames.length; ++i) {
        if (recentGames[i].isWin === lastGameWin) sameCount++;
        else break;
      }
      const recentScoreFix = (lastGameWin ? 40 : -40) * Math.pow(sameCount, 1.5);
      user.user.rankScore = await this.getPlayerRankScore(user.user);
      user.user.autoArrangeRankScore = user.user.rankScore + recentScoreFix;
      this.logger.log(`Autorange score ${user.user.gameID}: ${user.user.autoArrangeRankScore} (${user.user.rankScore} + ${recentScoreFix})`)
    }
    rooms.autoArrangeRoom(roomInfo);
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
      try {
        await delayAndCheckStop(roomInfo, 1000);
      } catch (e) {
        this.logger.error("The room is maybe stopped.", e);
        roomInfo.status = 'waiting';
        this.notifyRoom(roomInfo);
        return;
      }

      if (roomInfo.status !== 'playing') return;
      time--;
    }

    if (roomInfo.status !== 'playing') return;
    await this.executeGame(roomInfo);
  }

  private emitEventAndUpdateProgressWithAck<T = void>(
    socketsRaw: (Socket | undefined)[],
    roomInfo: rooms.RoomInfo,
    event: string,
    data: any,
    progressID: number,
    progressMsg: string,
    progressMsgWhenFail?: string,
    progressMsgWhenFinish?: string,
    progressMsgWhenFinishOne?: (n: number, t: number) => string,
  ): Promise<T[]> {

    const sockets = socketsRaw.filter((s) => s !== undefined) as Socket[];

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

    return new Promise<T[]>((resolveAll, rejectAll) => {
      const ret = new Array<T>(sockets.length);
      let ready = 0;

      const socketCleanUpCallbacksList = [];

      for (const socket of sockets) {

        // const cleanupCallbacks = () => {
        //   socket.off(event + ':success', onSuccess);
        //   socket.off(event + ':fail', onFail);
        //   socket.off('disconnect', onDisconnect);
        // };

        const notifyAndReject = (msg: string, reject: (d: Error) => void) => {
          p.message = progressMsgWhenFail + "，具体原因：" + msg;
          p.status = 2;
          this.emitToRoom(roomInfo, 'executeProgress', p);
          reject(new Error(msg));
        }


        // setCallback
        const cleanUpCallbacks = [];
        socketCleanUpCallbacksList.push(cleanUpCallbacks);

        Promise.race([
          new Promise((resolve, reject) => {
            const onSuccess = (data: T) => {
              p.message = progressMsgWhenFinishOne(ready, sockets.length);
              this.emitToRoom(roomInfo, 'executeProgress', p);
              resolve(data);
            };
            socket.on(event + ':success', onSuccess);
            cleanUpCallbacks.push(() => socket.off(event + ':success', onSuccess));
          }),
          new Promise((resolve, reject) => {
            const onFail = (failData: any) => {
              this.logger.error(`Client ${socket.handshake.query.id} failed to ${event}: ${failData}`);
              notifyAndReject(failData, reject);
            }
            socket.on(event + ':fail', onFail);
            cleanUpCallbacks.push(() => socket.off(event + ':fail', onFail));
          }),
          new Promise((resolve, reject) => {
            const onDisconnect = () => {
              this.logger.error(`Client ${socket.handshake.query.id} disconnected`);
              notifyAndReject(progressMsg + "失败，客户端断开连接", reject);
            }
            socket.on('disconnect', () => onDisconnect);
            cleanUpCallbacks.push(() => socket.off('disconnect', onDisconnect));
          }),
          new Promise((resolve, reject) => {
            const onStop = () => {
              this.logger.error(`Client ${socket.handshake.query.id} stopped`);
              notifyAndReject("游戏进程已经终止", reject);
            }
            roomInfo.needStop.on('stop', onStop);
            cleanUpCallbacks.push(() => roomInfo.needStop.off('stop', onStop));
          }),
        ]).then((d: T) => {
          cleanUpCallbacks.forEach((c) => c());
          ret[sockets.indexOf(socket)] = d;
          ++ready;
          if (ready === sockets.length) {
            p.message = progressMsgWhenFinish;
            p.status = 1;
            this.emitToRoom(roomInfo, 'executeProgress', p);
            socketCleanUpCallbacksList.forEach((c) => c.forEach((cc) => cc()));
            resolveAll(ret);
          }
        }).catch((e) => {
          socketCleanUpCallbacksList.forEach((c) => c.forEach((cc) => cc()));
          rejectAll(e);
        });

      }
    });
  }

  private async executeGame(roomInfo: rooms.RoomInfo) {

    roomInfo.status = 'executing';
    this.notifyRoom(roomInfo);

    let progressID = 0;
    let preparedCount = 0;

    try {
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


      this.emitToRoom(roomInfo, 'executeProgress', {
        id: progressID,
        message: '请稍等',
        status: 0
      });

      await delayAndCheckStop(roomInfo, 5000);

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
      }

      await delayAndCheckStop(roomInfo, 2000);

      await this.emitEventAndUpdateProgressWithAck(
        [firstPlayer?.socket],
        roomInfo,
        'startGame',
        {},
        progressID++,
        `房主开始游戏`
      );


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

    } catch (e) {
      progressID++;
      this.logger.error(`Error when executing game: ${e}, then waiting for game result`);
    } finally {
      try {
        const selfProgessID = progressID++;

        this.emitToRoom(roomInfo, "executeProgress", {
          id: selfProgessID,
          message: "正在等待游戏结果",
          status: 0
        });

        const cleanups = [];
        const gameEndData = await Promise.race([
          ...roomInfo.users.filter((u) => !!u).map((user) => new Promise<any>((resolve, reject) => {
            const onEndOfGame = (d: any) => {
              resolve(d);
            };
            cleanups.push(() => user.socket.off('end-of-game', onEndOfGame));
            user.socket.on('end-of-game', onEndOfGame);
          })),
          new Promise((_, reject) => {
            cleanups.push(() => roomInfo.needStop.off('stop', reject))
            roomInfo.needStop.once('stop', reject);
          }),
        ]).catch((e) => {
          this.emitToRoom(roomInfo, "executeProgress", {
            id: selfProgessID,
            message: "等待游戏结果已经取消",
            status: 2
          });
          throw e;
        }).finally(() => {
          cleanups.forEach((c) => c());
        });

        this.emitToRoom(roomInfo, "executeProgress", {
          id: selfProgessID,
          message: "游戏结果已经生成",
          status: 1,
        });

        await this.rankScoreService.handleEndOfGameData(gameEndData);
      } catch (e) {
        this.logger.error(e);
      }

      this.notifyRoom(roomInfo, 'finish');
      roomInfo.status = 'waiting';
      this.notifyRoom(roomInfo);
    }
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
    roomInfo.needStop.emit('stop')
  }
}

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

const DEFAULT_RANK_SCORE = 1200;

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'room',
})
export class RoomGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RoomGateway.name);
  constructor(private readonly db: PrismaService) { }

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
      // room.status = 'waiting';
      otherAction?.();
      // this.notifyRoom(room);
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
    roomInfo.needStop = false;
    roomInfo.status = 'playing';

    rooms.playGame(roomInfo.id);

    this.emitToRoom(roomInfo, 'play', data);
    this.notifyRoom(roomInfo);

    let time = roomInfo.waitingTime;
    while (time > 0) {
      this.emitToRoom(roomInfo, 'time', { time });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.checkNeedStop(roomInfo, () => {
        roomInfo.status = 'waiting';
        this.notifyRoom(roomInfo);
      });

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

    // const finishExecute = () => {
    //   this.notifyRoom(roomInfo, 'finish');
    //   roomInfo.status = 'waiting';
    //   this.notifyRoom(roomInfo);
    // };

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

    const RETRIES = 3;
    const retryTimes = new Array<number>(sockets.length).fill(0);

    try {
      return await new Promise<T[]>((resolve, reject) => {
        const ret = new Array<T>(sockets.length);
        let ready = 0;
        let timeoutHandles = new Array<NodeJS.Timeout | undefined>(sockets.length).fill(undefined);

        for (const socket of sockets) {
          let timeoutHandle = timeoutHandles[sockets.indexOf(socket)];
          const cleanupCallbacks = () => {
            socket.off(event + ':success', onSuccess);
            socket.off(event + ':fail', onFail);
            socket.off('disconnect', onDisconnect);
            timeoutHandle && clearTimeout(timeoutHandle);
          };

          const resetTimeout = () => {
            timeoutHandle && clearTimeout(timeoutHandle);
            timeoutHandle = setTimeout(onTimeout, timeout);
          }

          const onSuccess = (data: any) => {
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

            cleanupCallbacks();

            if (ready === sockets.length) {
              resolve(ret);
            }
          };

          const onFail = (failData: any) => {
            // // NOTE: ignore joinRoom fail when already in game
            // if (event === 'joinRoom' && `${failData}`.includes("because you are already in game")) {
            //   cleanupCallbacks();
            //   resolve(undefined);
            // }

            this.logger.error(`Client ${socket.handshake.query.id} failed to ${event}: ${failData}`);
            retryTimes[sockets.indexOf(socket)]++;
            if (retryTimes[sockets.indexOf(socket)] < RETRIES) {
              this.logger.log(`Retrying ${event} for ${socket.handshake.query.id} (${retryTimes[sockets.indexOf(socket)]})`);
              p.message = progressMsgWhenFail + "，正在重试第 " + retryTimes[sockets.indexOf(socket)] + " 次";
              this.emitToRoom(roomInfo, 'executeProgress', p);
              resetTimeout();
              setTimeout(() => {
                socket.emit(event, data);
              }, 2000);
            } else {
              cleanupCallbacks();
              reject?.(failData);
            }
          }

          const onTimeout = () => {
            this.logger.error(`Client ${socket.handshake.query.id} timeout to ${event}`);
            retryTimes[sockets.indexOf(socket)]++;
            if (retryTimes[sockets.indexOf(socket)] < RETRIES) {
              this.logger.log(`Retrying ${event} for ${socket.handshake.query.id} (${retryTimes[sockets.indexOf(socket)]})`);
              p.message = progressMsg + "超时，正在重试第 " + retryTimes[sockets.indexOf(socket)] + " 次";
              this.emitToRoom(roomInfo, 'executeProgress', p);
              resetTimeout();
              socket.emit(event, data);
            } else {
              cleanupCallbacks();
              reject?.(new Error(progressMsg + "超时"));;
            }
          };

          const onDisconnect = () => {
            this.logger.error(`Client ${socket.handshake.query.id} disconnected`);
            cleanupCallbacks();
            reject?.(new Error(progressMsg + "失败，客户端断开连接"));
          }

          socket.on(event + ':success', onSuccess);
          socket.on(event + ':fail', onFail);
          socket.on('disconnect', onDisconnect);
          resetTimeout();
        }
      });

    } catch (e) {
      this.logger.error(e);
      p.message = progressMsgWhenFail + "，具体原因：" + e;
      p.status = 2;
      this.emitToRoom(roomInfo, 'executeProgress', p);

      throw e;
    }
  }

  private async executeGame(roomInfo: rooms.RoomInfo) {

    const ck = (msg = '由于玩家退出，游戏启动进程已停止', selfProgressId = undefined) => {
      if (selfProgressId === undefined) selfProgressId = progressID;
      this.checkNeedStop(roomInfo, () => {
        this.emitToRoom(roomInfo, 'executeProgress', {
          id: selfProgressId, message: msg, status: 2
        });
      });
    }

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

      await new Promise(resolve => setTimeout(resolve, 2000));
      ck();

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

    } catch (e) {
      progressID++;
      this.logger.error(`Error when executing game: ${e}, then waiting for game result`);
    } finally {
      try {
        let intervalId;

        const selfProgessID = progressID++;

        this.emitToRoom(roomInfo, "executeProgress", {
          id: selfProgessID,
          message: "正在等待游戏结果",
          status: 0
        });

        const gameEndData = await new Promise<any>((resolve, reject) => {
          const onEndofGame = (d: any) => {
            offAll();
            clearInterval(intervalId);
            resolve(d);
          }

          const offAll = () => {
            for (const user of roomInfo.users.filter(u => !!u)) {
              user.socket.off("end-of-game", onEndofGame);
            }
          }

          intervalId = setInterval(() => {
            // console.log("Waiting for game result canceled...");
            try {
              ck("等待游戏结果已经取消，启动进程结束", selfProgessID);
            } catch (e) {
              offAll();
              clearInterval(intervalId);
              reject(e);
            }
          }, 1000);

          for (const user of roomInfo.users.filter((u) => !!u)) {
            user.socket.on('end-of-game', onEndofGame);
          }
        });

        this.emitToRoom(roomInfo, "executeProgress", {
          id: selfProgessID,
          message: "游戏结果已经生成",
          status: 1,
        });

        /**
         * Calculate delta score
         * @param win the game is win
         * @param gameCount game count in this season
         * @param scoreDifference other team - this team
         */
        const getDelta = (win: boolean, gameCount: number, scoreDifference: number) => {
          let d: number;
          if (win)
            d = 20 + (1 / (gameCount + 4)) * 80 + Math.max(-5, (scoreDifference) / 50)
          else
            d = -20 + Math.min(5, (scoreDifference) / 50)
          return Math.round(d);
        }

        const handleEndOfGameData = async (data) => {
          // console.log(data);
          // save data to game
          await this.db.game.create({
            data: {
              gameId: data.gameId.toString(),
              statusBlock: JSON.stringify(data),
            }
          })

          for (const team of data.teams) {
            for (const player of team.players) {
              const smid: number = player.summonerId;
              const isWin = team.isWinningTeam;
              const gameCount = (await this.db.user.findUnique({
                where: {
                  summonerId: smid.toString()
                }
              }).games() || []).length;
              const blueTeamScore = roomInfo.users.slice(0, 5).map((u) => u?.user.rankScore || 0).reduce((a, b) => a + b, 0);
              const redTeamScore = roomInfo.users.slice(5).map((u) => u?.user.rankScore || 0).reduce((a, b) => a + b, 0);
              const isBlue = rooms.getUserGroup(roomInfo, smid.toString()) === 0;
              const scoreDifference = isBlue ? redTeamScore - blueTeamScore : blueTeamScore - redTeamScore;
              const delta = getDelta(isWin, gameCount, scoreDifference);

              await this.db.user.upsert({
                where: {
                  summonerId: smid.toString()
                },
                create: {
                  summonerId: smid.toString(),
                  name: player.summonerName || "N/A",
                  nickname: "",
                  rankScore: DEFAULT_RANK_SCORE + delta
                },
                update: {
                  rankScore: {
                    increment: delta
                  }
                }
              })

              await this.db.gameUserMapping.create({
                data: {
                  gameId: data.gameId.toString(),
                  userId: smid.toString(),
                  isWin,
                  scoreDelta: delta
                }
              });

              this.logger.log(`Game ${data.gameId} finish, update user ${player.summonerId} (${player.summonerName}) with wining: ${team.isWinningTeam}`)
            }
          }


          for (const user of roomInfo.users.filter((u) => !!u)) {
            user.user.rankScore = await this.getPlayerRankScore(user.user);
          }
          this.notifyRoom(roomInfo);
        }
        await handleEndOfGameData(gameEndData);
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
    roomInfo.needStop = true;
  }
}

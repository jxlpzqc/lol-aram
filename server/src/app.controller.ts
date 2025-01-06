import { Body, Controller, DefaultValuePipe, Get, Logger, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import * as rooms from './rooms';
import { LeagueGameEogData, RankingDTO, RoomInListDTO, UserGameSummaryDTO, ServerInfo, NegotiateResponse, NegotiateRequest, ServerInfoBanner, BackfillResponse, BackfillReqeust } from '@shared/contract';
import { PrismaService } from './prisma.service';
import * as fs from 'fs/promises'
import { RankScoreService } from './rankscore.service';
import { version } from '@server/package.json'
import * as semver from "semver"


const isHideRankScore = process.env.HIDE_RANKSCORE === "1" || false

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(
    private readonly db: PrismaService,
    private readonly rankScoreService: RankScoreService
  ) { }

  @Post('negotiate')
  async negotiate(@Body() req: NegotiateRequest): Promise<NegotiateResponse> {
    // open files in assets/banners
    let files = [];
    try {
      files = await fs.readdir('./assets/banners');
    } catch (e) {
      this.logger.error(e)
    }

    const banners: ServerInfoBanner[] = [];

    for (const file of files) {
      if (file.endsWith(".jpg") || file.endsWith(".png")) {
        const base64start = `data:image/${file.endsWith(".jpg") ? "jpeg" : "png"};base64,`
        const buffer = await fs.readFile(`./assets/banners/${file}`);
        banners.push({
          type: 'image',
          url: base64start + buffer.toString('base64'),
          time: 10000
        })
      }
    }

    const serverInfo: ServerInfo = {
      banners: [
        ...banners,
        { type: 'video', url: '/images/default-banner.webm' }
      ]
    };

    if (semver.gte(req.version, "0.5.0")) {
      return { serverInfo, ok: true, serverVersion: version }
    } else if (semver.gte(req.version, "0.4.0")) {
      return { serverInfo, ok: true, message: "当前版本受部分支持，如需体验完整功能，请更新到 0.5.0 以上版本", serverVersion: version }
    }
    return { serverInfo, ok: false, message: "当前版本不支持，请更新到 0.4.0 以上版本", serverVersion: version }
  }

  @Post('backfill')
  async backfillGame(@Body() req: BackfillReqeust): Promise<BackfillResponse> {
    const { server, data } = req;
    if (!data.gameId)
      return { success: false, message: "没有游戏ID" };
    const game = await this.db.game.findUnique({
      where: {
        gameId_server: {
          gameId: data.gameId.toString(),
          server
        }
      },
    });
    if (!!game)
      return { success: false, message: "这局游戏已经存在" };

    await this.rankScoreService.handleEndOfGameData(data, server);
    return { success: true };
  }

  @Get('rooms')
  getRooms(): RoomInListDTO[] {
    return rooms.getRooms().map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      server: room.server,
      playerNumber: room.users.filter((u) => u !== null).length,
      hasPassword: !!room.password
    }));
  }

  @Get('rankings')
  async getRankings(): Promise<RankingDTO[]> {
    let ret = await this.db.$queryRaw`SELECT
      summonerId, 
      u.server AS server,
      name, 
      nickname, 
      rankScore, 
      COUNT(gum.gameid) AS games, 
      COUNT(IIF(gum.isWin, 1, NULL)) AS winnedGames, 
      COUNT(IIF(gum.isWin, NULL, 1)) AS failedGames, 
      COUNT(IIF(gum.isWin, 1, NULL)) * 1.0 / COUNT(gum.gameid)  AS winRate
    FROM "User" u
    LEFT JOIN "GameUserMapping" gum ON u.summonerId = gum.userId
    GROUP BY u.summonerId
    ORDER BY rankScore DESC
    ` as RankingDTO[];

    if (isHideRankScore) {
      ret = ret.map(x => ({
        ...x,
        rankScore: 0
      })).sort((a, b) => (a.summonerId.localeCompare(b.summonerId)))
    }

    return ret;
  }

  @Get('games')
  async getGames(
    @Query("userid") userid: string,
    @Query("server") server: string,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("pageSize", new DefaultValuePipe(1000), ParseIntPipe) pageSize: number): Promise<UserGameSummaryDTO[]> {

    const result = await this.db.user.findUnique({
      where: {
        summonerId_server: {
          summonerId: userid,
          server: server,
        }
      },
      include: {
        games: {
          take: pageSize,
          skip: page * pageSize,
          orderBy: {
            game: {
              time: "desc"
            }
          },
          include: {
            game: true
          }
        }
      },
    })
    return result.games.map((gameMapping) => {
      const game = gameMapping.game;
      const id = game.gameId;
      const eogData = JSON.parse(game.statusBlock) as LeagueGameEogData;
      const playerDataWithWin = eogData.teams.flatMap(x => x.players.map(u => ({
        player: u,
        win: x.isWinningTeam
      }))).find(x => x.player.summonerId.toString() === userid);

      if (!playerDataWithWin) return null;

      return {
        gameId: id,
        isWin: playerDataWithWin.win,
        playerData: playerDataWithWin.player,
        scoreDelta: isHideRankScore ? 0 : gameMapping.scoreDelta,
      }
    }).filter((x) => x !== null);
  }


  /**
   * @deprecated
   */
  @Get('users/:userid/games')
  async legacyGetGames(
    @Param("userid") userid: string,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("pageSize", new DefaultValuePipe(1000), ParseIntPipe) pageSize: number): Promise<UserGameSummaryDTO[]> {
    return await this.getGames(userid, "HN1", page, pageSize);
  }

  @Get('games/:server/:gameid')
  async getGame(@Param("server") server: string, @Param("gameid") gameid: string): Promise<LeagueGameEogData> {
    const game = await this.db.game.findUnique({
      where: {
        gameId_server: {
          gameId: gameid,
          server
        }
      },
    });
    const d = JSON.parse(game.statusBlock) as LeagueGameEogData;
    for (const team of d.teams) {
      for (const player of team.players) {
        player.summonerName = (await this.db.user.findUnique({
          where: {
            summonerId_server: {
              summonerId: player.summonerId.toString(),
              server
            }
          }
        })).name;
      }
    }
    if (d.teams[0]?.teamId === 200 && d.teams[1]?.teamId === 100) {
      d.teams.reverse();
    }


    d.localPlayer = undefined;
    d.mucJwtDto = undefined;
    d.multiUserChatId = undefined;
    d.multiUserChatPassword = undefined;
    return d;
  }

  /**
   * @deprecated
   */
  @Get('games/:gameid')
  async legacyGetGame(@Param("gameid") gameid: string): Promise<LeagueGameEogData> {
    return await this.getGame("HN1", gameid);
  }
}

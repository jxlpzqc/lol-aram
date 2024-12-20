import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import * as rooms from './rooms';
import { LeagueGameEogData, RankingDTO, RoomInListDTO, UserGameSummaryDTO } from '@shared/contract';
import { PrismaService } from './prisma.service';

const isHideRankScore = process.env.HIDE_RANKSCORE === "1" || false

@Controller()
export class AppController {
  constructor(private readonly db: PrismaService) { }

  @Get('rooms')
  getRooms(): RoomInListDTO[] {
    return rooms.getRooms().map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      playerNumber: room.users.filter((u) => u !== null).length,
    }));
  }

  @Get('rankings')
  async getRankings(): Promise<RankingDTO[]> {
    let ret = await this.db.$queryRaw`SELECT
      summonerId, 
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

  @Get('users/:userid/games')
  async getGames(
    @Param("userid") userid: string,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("pageSize", new DefaultValuePipe(1000), ParseIntPipe) pageSize: number): Promise<UserGameSummaryDTO[]> {

    const result = await this.db.user.findUnique({
      where: {
        summonerId: userid,
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
        scoreDelta: gameMapping.scoreDelta,
      }
    }).filter((x) => x !== null);
  }

  @Get('games/:gameid')
  async getGame(@Param("gameid") gameid: string): Promise<LeagueGameEogData> {
    const game = await this.db.game.findUnique({
      where: {
        gameId: gameid,
      },
    });
    const d = JSON.parse(game.statusBlock) as LeagueGameEogData;
    d.localPlayer = undefined;
    d.mucJwtDto = undefined;
    d.multiUserChatId = undefined;
    d.multiUserChatPassword = undefined;
    return d;
  }
}

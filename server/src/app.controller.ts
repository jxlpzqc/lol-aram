import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import * as rooms from './rooms';
import { LeagueGameEogData, RankingDTO, RoomInListDTO, UserGameSummaryDTO } from '@shared/contract';
import { PrismaService } from './prisma.service';


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
    const result = await this.db.user.findMany({
      include: {
        _count: {
          select: {
            games: true
          }
        },
      },
      orderBy: {
        rankScore: 'desc'
      }
    })

    return result.map((user) => ({
      summonerId: user.summonerId,
      name: user.name,
      nickname: user.nickname,
      rankScore: user.rankScore,
      games: user._count.games,
    }));
  }

  @Get('users/:userid/games')
  async getGames(
    @Param("userid") userid: string,
    @Query("page", new DefaultValuePipe(0), ParseIntPipe) page: number,
    @Query("pageSize", new DefaultValuePipe(10), ParseIntPipe) pageSize: number): Promise<UserGameSummaryDTO[]> {

    const result = await this.db.game.findMany({
      where: {
        users: {
          some: {
            userId: userid
          },
        },
      },
      take: pageSize,
      skip: page * pageSize,
    });
    return result.map((game) => {
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

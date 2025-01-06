import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { LeagueGameEogData } from "@root/shared/contract";

const DEFAULT_RANK_SCORE = 1200;


@Injectable()
export class RankScoreService {

  private readonly logger = new Logger(RankScoreService.name);
  constructor(private readonly db: PrismaService) { }

  /**
   * Calculate delta score
   * @param {boolean} win the game is win
   * @param {number} gameCount game count in this season
   * @param {number} scoreDifference other team - this team
   */
  getDelta(win: boolean, gameCount: number, scoreDifference: number) {
    let d: number;
    if (win)
      d = 20 + (1 / (gameCount + 4)) * 80 + Math.max(-5, (scoreDifference) / 50)
    else
      d = -20 + Math.min(5, (scoreDifference) / 50)
    return Math.round(d);
  }

  /**
   * 
   * @param {import("@prisma/client").PrismaClient} db 
   * @param {import("../../shared/contract").LeagueGameEogData} data 
   */
  async handleEndOfGameData(data: LeagueGameEogData, server: string) {
    const db = this.db;
    if (await db.game.findUnique({
      where: {
        gameId_server: {
          gameId: data.gameId.toString(),
          server: server,
        }
      }
    })) {
      this.logger.error(`Game ${data.gameId} already exist, skip`)
      return;
    }
    // save data to game
    await db.game.create({
      data: {
        gameId: data.gameId.toString(),
        statusBlock: JSON.stringify(data),
        server
      }
    })

    let teamRankScores = [0, 0]

    for (let i = 0; i < 2; i++) {
      const team = data.teams[i];
      for (const player of team.players) {
        const smid = player.summonerId;
        const score = (await db.user.findUnique({
          where: {
            summonerId_server: {
              summonerId: smid.toString(),
              server: server
            }
          }
        }))?.rankScore || DEFAULT_RANK_SCORE;
        const teamId = team.teamId === 100 ? 0 : 1;
        teamRankScores[teamId] += score;
      }
    }

    for (const team of data.teams) {
      for (const player of team.players) {
        const smid = player.summonerId;
        const isWin = team.isWinningTeam;
        const gameCount = (await db.user.findUnique({
          where: {
            summonerId_server: {
              summonerId: smid.toString(),
              server
            }
          }
        }).games() || []).length;



        const blueTeamScore = teamRankScores[0];
        const redTeamScore = teamRankScores[1];
        const isBlue = team.teamId === 100;
        const scoreDifference = isBlue ? redTeamScore - blueTeamScore : blueTeamScore - redTeamScore;
        const delta = this.getDelta(isWin, gameCount, scoreDifference);

        await db.user.upsert({
          where: {
            summonerId_server: {
              summonerId: smid.toString(),
              server
            }
          },
          create: {
            summonerId: smid.toString(),
            name: player.summonerName || "N/A",
            nickname: "",
            rankScore: DEFAULT_RANK_SCORE + delta,
            server
          },
          update: {
            rankScore: {
              increment: delta
            }
          }
        })

        await db.gameUserMapping.create({
          data: {
            gameId: data.gameId.toString(),
            userId: smid.toString(),
            isWin,
            scoreDelta: delta,
            server
          }
        });

        this.logger.log(`Game ${data.gameId} finish, update user ${player.summonerId} (${player.summonerName}) with wining: ${team.isWinningTeam}`)
      }
    }
  }
}




#!/usr/bin/env npx ts-node
import { PrismaClient } from "@prisma/client";
import { RankScoreService } from "../src/rankscore.service";
import { PrismaService } from "../src/prisma.service";
import { LeagueGameEogData } from "@root/shared/contract";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { Logger } from "@nestjs/common";


const DEFAULT_RANK_SCORE = 1200;

const handleEndOfGameData = async (
  game: { gameId: string, statusBlock: string },
  users: { id: string, score: number, gamecount: number }[],
  db: PrismaService,
  service: RankScoreService) => {
  // console.log(data);

  const data: LeagueGameEogData = JSON.parse(game.statusBlock);

  let teamRankScores = [0, 0]

  for (let i = 0; i < 2; i++) {
    const team = data.teams[i];
    for (const player of team.players) {
      const smid = player.summonerId;
      const score = (await db.user.findUnique({
        where: {
          summonerId: smid.toString()
        }
      }))?.rankScore || DEFAULT_RANK_SCORE;
      const teamId = team.teamId === 100 ? 0 : 1;
      teamRankScores[teamId] += score;
    }
  }

  for (const team of data.teams) {
    for (const player of team.players) {
      const smid = player.summonerId.toString();
      const user = users.find(x => x.id == smid);

      const isWin = team.isWinningTeam;
      const gameCount = user?.gamecount || 0;

      const blueTeamScore = teamRankScores[0];
      const redTeamScore = teamRankScores[1];
      const isBlue = team.teamId === 100;
      const scoreDifference = isBlue ? redTeamScore - blueTeamScore : blueTeamScore - redTeamScore;
      const delta = service.getDelta(isWin, gameCount, scoreDifference);


      const newscore = (user?.score || DEFAULT_RANK_SCORE) + delta;

      await db.user.upsert({
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
          rankScore: newscore
        }
      })

      await db.gameUserMapping.upsert({
        where: {
          userId_gameId: {
            gameId: game.gameId,
            userId: smid
          }
        },
        update: {
          isWin,
          scoreDelta: delta
        },
        create: {
          gameId: data.gameId.toString(),
          userId: smid.toString(),
          isWin,
          scoreDelta: delta
        }
      });

      if (user) {
        user.score = newscore;
        user.gamecount++;
      } else {
        users.push({
          id: smid,
          score: newscore,
          gamecount: gameCount + 1
        })
      }
    }
  }
}

async function main() {

  const app = await NestFactory.createApplicationContext(AppModule);
  const db = app.get(PrismaService);
  const rankScoreService = app.get(RankScoreService);

  const users = await db.user.findMany();
  const initialUsers = [];
  const logger = new Logger("RecalculateScore");

  for (const user of users) {
    const scoreDelta = (await db.gameUserMapping.aggregate({
      where: {
        userId: user.summonerId
      },
      _sum: {
        scoreDelta: true
      }
    }))?._sum.scoreDelta || 0;
    initialUsers.push({
      id: user.summonerId,
      name: user.name,
      nickname: user.nickname,
      score: user.rankScore - scoreDelta,
      gamecount: 0
    })
  }

  logger.log("Initial users and scores: ");
  for (const user of initialUsers) {
    logger.log(`${user.id} | ${user.name} | ${user.score}`);
  }

  const games = await db.game.findMany({
    orderBy: {
      time: 'asc'
    }
  });

  logger.log("Recalculating scores for games... ");

  for (const game of games) {
    logger.log(`Processing ${game.gameId}...`);
    await handleEndOfGameData(game, initialUsers, db, rankScoreService);
  }

  logger.log("Recalculation completed");
}

main();

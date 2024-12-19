#!/usr/bin/env node
// @ts-check
import { PrismaClient } from "@prisma/client";


const DEFAULT_RANK_SCORE = 1200;

/**
 * Calculate delta score
 * @param {boolean} win the game is win
 * @param {number} gameCount game count in this season
 * @param {number} scoreDifference other team - this team
 */
const getDelta = (win, gameCount, scoreDifference) => {
  /** @type {number} */
  let d;
  if (win)
    d = 20 + (1 / (gameCount + 4)) * 80 + Math.max(-5, (scoreDifference) / 50)
  else
    d = -20 + Math.min(5, (scoreDifference) / 50)
  return Math.round(d);
}

/**
 * 
 * @param {import("@prisma/client").PrismaClient} db 
 * @param {{gameId: string, statusBlock: string}} game
 * @param {{id: string, score: number, gamecount: number}[]} users
 */
const handleEndOfGameData = async (game, users, db) => {
  // console.log(data);

  /** @type {import("../shared/contract").LeagueGameEogData} */
  const data = JSON.parse(game.statusBlock);

  let teamRankScores = [0, 0]

  for (let teamid = 0; teamid < 2; teamid++) {
    const team = data.teams[teamid];
    for (const player of team.players) {
      const smid = player.summonerId.toString();
      const score = users.find(x => x.id == smid)?.score || DEFAULT_RANK_SCORE;
      teamRankScores[teamid] += score;
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
      const delta = getDelta(isWin, gameCount, scoreDifference);


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

  const db = new PrismaClient({
    // log: ["query"],
  });
  db.$connect();

  const users = await db.user.findMany();
  const initialUsers = [];

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

  console.log("Initial users and scores: ");
  for (const user of initialUsers) {
    console.log(`${user.id} | ${user.name} | ${user.score}`);
  }

  const games = await db.game.findMany({
    orderBy: {
      time: 'asc'
    }
  });

  console.log("Recalculating scores for games... ");

  for (const game of games) {
    await handleEndOfGameData(game, initialUsers, db);
  }

  console.log("Recalculation completed");
}

main();

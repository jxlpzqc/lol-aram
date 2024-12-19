#!/usr/bin/env node
// @ts-check
import { PrismaClient } from "@prisma/client";
import { parseArgs } from "node:util";
import { promises as fs } from "node:fs";


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
 * @param {import("../shared/contract").LeagueGameEogData} data 
 */
const handleEndOfGameData = async (data, db) => {
  // console.log(data);
  // save data to game
  await db.game.create({
    data: {
      gameId: data.gameId.toString(),
      statusBlock: JSON.stringify(data),
    }
  })

  let teamRankScores = [0, 0]

  for (let teamid = 0; teamid < 2; teamid++) {
    const team = data.teams[teamid];
    for (const player of team.players) {
      const smid = player.summonerId;
      const score = (await db.user.findUnique({
        where: {
          summonerId: smid.toString()
        }
      }))?.rankScore || 1200;
      teamRankScores[teamid] += score;
    }
  }

  for (const team of data.teams) {
    for (const player of team.players) {
      const smid = player.summonerId;
      const isWin = team.isWinningTeam;
      const gameCount = (await db.user.findUnique({
        where: {
          summonerId: smid.toString()
        }
      }).games() || []).length;



      const blueTeamScore = teamRankScores[0];
      const redTeamScore = teamRankScores[1];
      const isBlue = team.teamId === 100;
      const scoreDifference = isBlue ? redTeamScore - blueTeamScore : blueTeamScore - redTeamScore;
      const delta = getDelta(isWin, gameCount, scoreDifference);

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
          scoreDelta: delta
        }
      });

      console.log(`Game ${data.gameId} finish, update user ${player.summonerId} (${player.summonerName}) with wining: ${team.isWinningTeam}`)
    }
  }
}

async function main() {

  const db = new PrismaClient({
    log: ["query"],
  });
  db.$connect();
  const args = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
  });

  const files = args.positionals;

  if (!files.length) {
    console.error("No files to process.");
    return;
  }

  for (const file of files) {
    console.log(`Processing ${file}...`);
    const data = JSON.parse(await fs.readFile(file, "utf-8"))
    await handleEndOfGameData(data, db);
  }
}

main();

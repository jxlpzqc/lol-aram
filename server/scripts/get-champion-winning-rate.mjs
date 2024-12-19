#!/usr/bin/env node
// @ts-check
import { PrismaClient } from "@prisma/client";

/**
 * 
 * @param {import("@prisma/client").PrismaClient} db 
 * @return {Promise<{id:number, name:string, winning: number, all: number}[]>}
 */
const calculate = async (db) => {
  /** @type {{id:number, name:string, winning: number, all: number}[]} */
  const champions = [];
  const games = await db.game.findMany();
  for (const game of games) {
    /** @type {import("../../shared/contract").LeagueGameEogData} */
    const data = JSON.parse(game.statusBlock);
    for (const team of data.teams) {
      for (const player of team.players) {
        const championId = player.championId;
        const isWin = team.isWinningTeam;
        const champion = champions.find(x => x.id === championId);
        if (champion) {
          champion.all++;
          if (isWin) {
            champion.winning++;
          }
        } else {
          champions.push({
            id: championId,
            name: player.championName,
            winning: isWin ? 1 : 0,
            all: 1
          });
        }
      }
    }
  }
  return champions;
}

async function main() {
  const db = new PrismaClient();
  db.$connect();

  const champions = await calculate(db);
  champions.sort((a, b) => {
    const rateA = a.winning / a.all;
    const rateB = b.winning / b.all;
    return rateB - rateA;
  });

  console.log("Champion | Win | Fail | All | Winning Rate");

  for (const champion of champions) {
    const rate = champion.winning / champion.all * 100;
    console.log(`${champion.name} | ${champion.winning} | ${champion.all - champion.winning} | ${champion.all} | ${rate.toFixed(3)}%`);
  }
}

main();

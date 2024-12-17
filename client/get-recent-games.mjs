#!/usr/bin/env node
// @ts-check
import { createHttp1Request, authenticate } from "league-connect";
import { createInterface } from "readline/promises";
import { promises as fs } from "fs";
import championList from "./renderer/public/assets/champions.json" with { type: "json"}

/**
 * 
 * @returns {Promise<import("./get-recent-games").RecentGamesResult>}
 */
async function getRecentGames() {
  const credentials = await authenticate();

  const resp = await createHttp1Request({
    method: "GET",
    url: "/lol-match-history/v1/products/lol/current-summoner/matches",
  }, credentials);

  return resp.json();
}

/**
 * 
 * @param {number} gameid 
 * @returns {Promise<import("./get-recent-games").RecentGameData>}
 */
async function getGameInfo(gameid) {
  const credentials = await authenticate();

  const resp = await createHttp1Request({
    method: "GET",
    url: `/lol-match-history/v1/games/${gameid}`,
  }, credentials);

  return resp.json();

}

/**
 * @type {(championId: number) => string | undefined}
 */
const getChampionName = (championId) => {
  return championList.find(champion => champion.id == championId)?.name;
}

/**
 * 
 * @param {import("./get-recent-games").RecentGameData} game 
 * @returns {import("@shared/contract").LeagueGameEogData}
 */
function recentGameToEogData(game) {

  /**
   * @type {import("@shared/contract").LeagueGameEogTeam[]}
   */
  // @ts-ignore
  const teams = game.teams.map((team, k) => ({
    teamId: team.teamId,
    fullId: team.teamId,
    isWinningTeam: team.win === "Win",
    isPlayerTeam: false,
    isBottomTeam: k === 0,
    tag: "补录数据",
    name: "Team " + team.teamId,
    memberStatusString: "",
    players: game.participants.filter(p => p.teamId === team.teamId).map(p => {

      const parId = game.participantIdentities.find(pi => pi.participantId === p.participantId)?.player;

      /**
       * @type {import("@shared/contract").LeagueGameEogPlayer}
       */
      const player = {
        botPlayer: false,
        championId: p.championId,
        championName: getChampionName(p.championId) || "Unknown",
        gameId: game.gameId,
        items: [p.stats.item0, p.stats.item1, p.stats.item2, p.stats.item3, p.stats.item4, p.stats.item5, p.stats.item6],
        spell1Id: p.spell1Id,
        spell2Id: p.spell2Id,
        summonerId: parId?.summonerId || 0,
        summonerName: parId?.summonerName || "Unknown",
        teamId: p.teamId,
        wins: 0,
        puuid: parId?.puuid || "Unknown",
        selectedPosition: "Unknown",
        stats: {
          ASSISTS: p.stats.assists,
          BARRACKS_KILLED: p.stats.turretKills,
          CHAMPIONS_KILLED: p.stats.kills,
          GAME_ENDED_IN_EARLY_SURRENDER: p.stats.gameEndedInEarlySurrender ? 1 : 0,
          GAME_ENDED_IN_SURRENDER: p.stats.gameEndedInSurrender ? 1 : 0,
          GOLD_EARNED: p.stats.goldEarned,
          LARGEST_CRITICAL_STRIKE: p.stats.largestCriticalStrike,
          LARGEST_KILLING_SPREE: p.stats.largestKillingSpree,
          LARGEST_MULTI_KILL: p.stats.largestMultiKill,
          LEVEL: p.stats.champLevel,
          MAGIC_DAMAGE_DEALT_PLAYER: p.stats.magicDamageDealtToChampions,
          MAGIC_DAMAGE_DEALT_TO_CHAMPIONS: p.stats.magicDamageDealtToChampions,
          MAGIC_DAMAGE_TAKEN: p.stats.magicalDamageTaken,
          MINIONS_KILLED: p.stats.totalMinionsKilled,
          NEUTRAL_MINIONS_KILLED: p.stats.neutralMinionsKilled,
          NUM_DEATHS: p.stats.deaths,
          PERK0: p.stats.perk0,
          PERK0_VAR1: p.stats.perk0Var1,
          PERK0_VAR2: p.stats.perk0Var2,
          PERK0_VAR3: p.stats.perk0Var3,
          PERK1: p.stats.perk1,
          PERK1_VAR1: p.stats.perk1Var1,
          PERK1_VAR2: p.stats.perk1Var2,
          PERK1_VAR3: p.stats.perk1Var3,
          PERK2: p.stats.perk2,
          PERK2_VAR1: p.stats.perk2Var1,
          PERK2_VAR2: p.stats.perk2Var2,
          PERK2_VAR3: p.stats.perk2Var3,
          PERK3: p.stats.perk3,
          PERK3_VAR1: p.stats.perk3Var1,
          PERK3_VAR2: p.stats.perk3Var2,
          PERK3_VAR3: p.stats.perk3Var3,
          PERK4: p.stats.perk4,
          PERK4_VAR1: p.stats.perk4Var1,
          PERK4_VAR2: p.stats.perk4Var2,
          PERK4_VAR3: p.stats.perk4Var3,
          PERK5: p.stats.perk5,
          PERK5_VAR1: p.stats.perk5Var1,
          PERK5_VAR2: p.stats.perk5Var2,
          PERK5_VAR3: p.stats.perk5Var3,
          PHYSICAL_DAMAGE_DEALT_PLAYER: p.stats.physicalDamageDealtToChampions,
          PHYSICAL_DAMAGE_DEALT_TO_CHAMPIONS: p.stats.physicalDamageDealtToChampions,
          PHYSICAL_DAMAGE_TAKEN: p.stats.physicalDamageTaken,
          SIGHT_WARDS_BOUGHT_IN_GAME: p.stats.visionWardsBoughtInGame,
          TIME_CCING_OTHERS: p.stats.timeCCingOthers,
          PERK_PRIMARY_STYLE: p.stats.perkPrimaryStyle,
          PERK_SUB_STYLE: p.stats.perkSubStyle,
          TOTAL_DAMAGE_DEALT: p.stats.totalDamageDealt,
          TOTAL_DAMAGE_DEALT_TO_CHAMPIONS: p.stats.totalDamageDealtToChampions,
          TOTAL_DAMAGE_TAKEN: p.stats.totalDamageTaken,
          TOTAL_HEAL: p.stats.totalHeal,
          TOTAL_TIME_CROWD_CONTROL_DEALT: p.stats.totalTimeCrowdControlDealt,
          TOTAL_DAMAGE_DEALT_TO_OBJECTIVES: p.stats.damageDealtToObjectives,
          TOTAL_DAMAGE_DEALT_TO_TURRETS: p.stats.damageDealtToTurrets,
          TOTAL_DAMAGE_DEALT_TO_BUILDINGS: p.stats.damageDealtToTurrets,
          TOTAL_DAMAGE_SELF_MITIGATED: p.stats.damageSelfMitigated,
          TRUE_DAMAGE_DEALT_PLAYER: p.stats.trueDamageDealtToChampions,
          TRUE_DAMAGE_DEALT_TO_CHAMPIONS: p.stats.trueDamageDealtToChampions,
          TRUE_DAMAGE_TAKEN: p.stats.trueDamageTaken,
          TURRETS_KILLED: p.stats.turretKills,
          VISION_WARDS_BOUGHT_IN_GAME: p.stats.visionWardsBoughtInGame,
          WIN: p.stats.win ? 1 : 0,
          TOTAL_HEAL_ON_TEAMMATES: p.stats.totalHeal,
          /* Missing data */
          PLAYER_AUGMENT_1: 0,
          PLAYER_AUGMENT_2: 0,
          PLAYER_AUGMENT_3: 0,
          PLAYER_AUGMENT_4: 0,
          PLAYER_AUGMENT_5: 0,
          PLAYER_AUGMENT_6: 0,
          PLAYER_SUBTEAM: 0,
          PLAYER_SUBTEAM_PLACEMENT: 0,
          SPELL1_CAST: 0,
          SPELL2_CAST: 0,
          TEAM_EARLY_SURRENDERED: 0,
          TEAM_OBJECTIVE: 0,
          TOTAL_DAMAGE_SHIELDED_ON_TEAMMATES: 0,
          TOTAL_TIME_SPENT_DEAD: 0,
          WAS_AFK: 0
        },
        championSquarePortraitPath: "",
        detectedTeamPosition: "",
        isLocalPlayer: false,
        leaver: false,
        leaves: 0,
        level: 0,
        losses: 0,
        profileIconId: 0,
        skinEmblemPaths: [],
        skinSplashPath: "",
        skinTilePath: ""
      };
      return player;
    })

  }));


  /**
   * @type {import("@shared/contract").LeagueGameEogData}
   */
  const ret = {
    gameId: game.gameId,
    gameMode: game.gameMode,
    basePoints: 0,
    battleBoostIpEarned: 0,
    boostXpEarned: 0,
    boostIpEarned: 0,
    causedEarlySurrender: false,
    currentLevel: 0,
    teams,
    difficulty: "",
    earlySurrenderAccomplice: false,
    experienceEarned: 0,
    experienceTotal: 0,
    firstWinBonus: 0,
    gameEndedInEarlySurrender: false,
    gameLength: 0,
    gameMutators: [],
    gameType: "",
    globalBoostXpEarned: 0,
    invalid: false,
    ipEarned: 0,
    ipTotal: 0,
    leveledUp: false,
    // @ts-ignore
    localPlayer: undefined,
    loyaltyBoostXpEarned: 0,
    missionsXpEarned: 0,
    myTeamStatus: "",
    newSpells: [],
    nextLevelXp: 0,
    preLevelUpExperienceTotal: 0,
    preLevelUpNextLevelXp: 0,
    previousLevel: 0,
    previousXpTotal: 0,
    queueType: "",
    ranked: false,
    reportGameId: 0,
    // @ts-ignore
    rerollData: undefined,
    rpEarned: 0,
    teamBoost: undefined,
    teamEarlySurrendered: false,
    timeUntilNextFirstWinBonus: 0,
    xbgpBoostXpEarned: 0
  }
  return ret;
}



async function main() {
  const recentGames = await getRecentGames();
  console.log("Summoner's recent games:");
  for (const gameInfo of recentGames.games.games) {
    console.log(`${gameInfo.gameId} | ${gameInfo.gameMode} | ${getChampionName(gameInfo.participants[0].championId)} | ${gameInfo.teams[0].win}`);
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const gameid = await rl.question("Enter a game id to get more info: ");
  const gameInfo = await getGameInfo(parseInt(gameid));

  console.log(`Converting to end-of-game data...`);
  const eogData = recentGameToEogData(gameInfo);

  await fs.writeFile("gameinfo.json", JSON.stringify(eogData, null, 2));
  rl.close();
  console.log(`Game info written to gameinfo.json`);
}

main();

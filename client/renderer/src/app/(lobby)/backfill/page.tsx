"use client";
import { useContext, useEffect, useState } from "react";
import LeaguePage from "../../../components/LeaguePage";
import leagueHandler from '@root/client/renderer/src/services/league';
import LoadingPage from "../../../components/LoadingPage";
import { RecentGameData, RecentGamesResult } from "@root/client/main/services/league.typings";
import championList from '@renderer/public/assets/champions.json';
import FailPage from "../../../components/FailPage";
import { GlobalContext } from "../../context";
import { backfillGame as serverBackfillGame } from "@renderer/src/services/room";
import { LeagueGameEogData } from "@root/shared/contract";
import sessionService from "../../../services/session";

export default function () {
  const [status, setStatus] = useState(0);
  const [data, setData] = useState<RecentGamesResult>();
  const [failReason, setFailReason] = useState("");

  const { notify, modals } = useContext(GlobalContext);
  const getItems = async () => {
    setStatus(0);
    try {
      const d = await leagueHandler.getRecentGames();
      setData(d);
      setStatus(1);
    } catch (e) {
      if (e instanceof Error) setFailReason(e.message);
      setStatus(2);
      return;
    }
  }

  const backfillGame = async (gameId: number) => {
    try {
      notify?.open({
        content: "正在从客户端读取对局信息，请稍等...",
      })
      const data = await leagueHandler.getGameEogInfo(gameId);

      console.log("[DEBUG] game eog data", data);

      if (data.gameType !== "CUSTOM_GAME") {
        throw new Error("只能补登自定义模式对局");
      }

      const resp = await serverBackfillGame(recentGameToEogData(data), sessionService.platformId!)

      if (!resp.success)
        throw new Error(resp.message)

      notify?.open({
        content: "补登成功！",
      })
    } catch (e) {
      if (e instanceof Error)
        notify?.open({
          content: "补登失败，" + e.message,
        });
    }
  }


  useEffect(() => {
    getItems();
  }, []);


  let body;

  if (status === 0) {
    body = <LoadingPage message="正在获取最近对局记录" noPage />;
  } else if (status === 1) {
    body = <table className="league-table">
      <thead>
        <tr>
          <th>游戏ID</th>
          <th>英雄</th>
          <th>K / D / A</th>
          <th>对局结果</th>
        </tr>
      </thead>
      <tbody>
        {
          data?.games?.games?.filter(x => x.gameType === "CUSTOM_GAME" && x.gameMode === "ARAM").map((game, i) => {
            if (game.participants.length === 0) return null;
            const p = game.participants[0];
            const champion = championList.find(c => c.id === p.championId)
            if (!champion) return null;
            const confirmText = "我已知晓上述问题，我确定要补登这场对局";
            return <tr key={game.gameId} className="cursor-pointer" onClick={async () => {
              const result = await modals?.prompt({
                children: <div>
                  <h2 className="text-xl font-bold mb-2">警告</h2>
                  <p>您确定要补登此对局吗？</p>
                  <p className="py-4">这一场您玩的英雄为{champion.name}，并{p.stats.win ? "获得了胜利" : "输掉了对局"}。</p>
                  <p className="text-red-400">错误的补登会破坏服务器数据的完整性。</p>
                  <p>请输入或复制下面的文字，并继续</p>
                  <p className="py-4 select-all">{confirmText}</p>
                </div>,
                height: 360
              });
              if (result?.success) {
                if (result.value !== confirmText) {
                  notify?.open({
                    content: "您已经取消补登，因为输入的文字不正确",
                  })
                  return;
                }
                backfillGame(game.gameId);
              }
            }}>
              <td className="w-[200px]">{game.gameId}</td>
              <td>
                <img src={champion.portraitURL || ""} className="w-8 h-8 inline-block mr-2" />
                {champion.name}
              </td>
              <td>
                {p.stats.kills} / {p.stats.deaths} / {p.stats.assists}
              </td>
              <td className={p.stats.win ? "text-blue-400" : "text-red-400"}>
                {p.stats.win ? "胜利" : "失败"}
              </td>
            </tr>
          })
        }
      </tbody>
    </table>
  } else {
    body = <FailPage reason={failReason} noPage buttonTitle="重试" onButtonClick={getItems} />
  }

  return <LeaguePage title="战绩补登" inNavPage titleToolButtons={
    <button onClick={getItems} className="league-btn">刷新</button>
  }>
    <h3 className="font-bold pb-4 border-b border-slate-600">请选择下面需要补登的游戏，如找不到，您可以<a href="#" onClick={async () => {
      const result = await modals?.prompt({
        children: <div className="my-4">
          <p>您可以采用下图的方式获取游戏ID</p>
          <img src="/images/help-gameid.png" className="w-full" />
          <p className="mt-4">请输入需要补登的游戏ID：</p>
        </div>,
        height: 400
      });
      if (result?.success && result.value) {
        const confirmRes = await modals?.confirm("错误的补登会破坏数据完整性，确定要继续吗？");
        if (confirmRes) backfillGame(parseInt(result.value));
      }
    }} className="text-blue-400">输入游戏ID补登</a></h3>
    <div className="my-4">
      {body}
    </div>
  </LeaguePage>


}


function recentGameToEogData(game: RecentGameData): LeagueGameEogData {

  const getChampionName = (championId: number) => {
    return championList.find(champion => champion.id == championId)?.name;
  }


  // @ts-ignore
  const teams: LeagueGameEogTeam[] = game.teams.map((team, k) => ({
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


  const ret: LeagueGameEogData = {
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
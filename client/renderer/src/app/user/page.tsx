"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { UserGameSummaryDTO } from '../../../../../shared/contract';
import { getUserGames } from "../../services/room";
import LoadingPage from "../../components/LoadingPage";
import FailPage from "../../components/FailPage";
import LeaguePage from "../../components/LeaguePage";
import { GameEogChampion, GameEogSpellAndItems } from "../game/GameEog";

export default function () {
  const params = useSearchParams();
  const router = useRouter();
  const userid = params.get('userid');
  const summonerName = params.get('summonerName');

  const [status, setStatus] = useState(0);
  const [failMsg, setFailMsg] = useState("");
  const [data, setData] = useState<UserGameSummaryDTO[]>([]);

  const getItems = async () => {
    if (userid === null) {
      setStatus(2);
      setFailMsg("参数错误！");
      return;
    }
    try {
      const res = await getUserGames(userid);
      setData(res);
      setStatus(1);
    } catch (e) {
      setStatus(2);
      setFailMsg(`获取失败！ ${e}`);
    }

  }

  useEffect(() => {
    getItems();

  }, [userid]);


  let body;

  if (status === 0) {
    body = <LoadingPage noPage message="正在获取..." />
  } else if (status === 2) {
    body = <FailPage noPage reason={failMsg} buttonTitle="重试" onButtonClick={getItems} />
  } else if (data?.length === 0) {
    body = <div className="my-20 flex flex-col justify-center items-center">
      <img src="/images/poro.svg" className="w-1/4 max-w-[200px]" />
      <div className="text-xl mt-4">该召唤师暂未进行过任何对局。</div>
    </div>
  } else {
    body = <table className="league-table">
      <thead>
        <tr>
          <th>英雄</th>
          <th>胜负</th>
          <th>排位分</th>
          <th>出装及技能</th>
          <th>K / D / A</th>
          <th>金钱</th>
          <th>伤害</th>
          <th>承伤</th>
          <th>治疗</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr className="cursor-pointer" onClick={() => {
            router.push(`game?gameid=${item.gameId}`);
          }} key={item.gameId}>
            <td>
              <GameEogChampion championId={item.playerData.championId}
                name={item.playerData.championName} level={item.playerData.stats.LEVEL}
              />
            </td>
            <td className={`${item.isWin ? 'text-blue-400' : 'text-red-400'} font-bold`} >{item.isWin ? '胜利' : '失败'}</td>
            <td className={`${item.isWin ? 'text-blue-400' : 'text-red-400'}`} >{item.scoreDelta >= 0 && '+'} {item.scoreDelta}</td>
            <td>
              <GameEogSpellAndItems spells={[item.playerData.spell1Id, item.playerData.spell2Id]} items={item.playerData.items} />
            </td>
            <td>{item.playerData.stats.CHAMPIONS_KILLED} / {item.playerData.stats.NUM_DEATHS} / {item.playerData.stats.ASSISTS}</td>
            <td>{item.playerData.stats.GOLD_EARNED}</td>
            <td>{item.playerData.stats.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS}</td>
            <td>{item.playerData.stats.TOTAL_DAMAGE_TAKEN}</td>
            <td>{item.playerData.stats.TOTAL_HEAL}</td>
          </tr>
        ))}
      </tbody>
    </table>
  }

  return (
    <LeaguePage title={(summonerName ? summonerName + "的" : "") + "对局记录"} showBack titleToolButtons={
      <div>
        <button className="league-btn" onClick={getItems}>刷新</button>
      </div>
    }>
      {body}
    </LeaguePage>
  );

}
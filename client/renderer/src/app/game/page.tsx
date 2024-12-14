"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { LeagueGameEogData, UserGameSummaryDTO } from '@shared/contract';
import { getGameEog, getUserGames } from "../../services/room";
import LoadingPage from "../../components/LoadingPage";
import FailPage from "../../components/FailPage";
import LeaguePage from "../../components/LeaguePage";
import championList from '@renderer/public/assets/champions.json';
import itemsList from '@renderer/public/assets/items.json';
import summonerSpellsList from '@renderer/public/assets/summoner-spells.json';

export const GameEogChampion = (props: {
  championId: number;
  name: string;
  level: number;
}) => {
  const champion = championList.find(c => c.id === props.championId);
  const portaitURL = champion?.portraitURL || "";

  return (
    <div className="flex items-center gap-2">
      <div className="font-bold">{props.level}</div>
      <img title={champion?.name} src={portaitURL} className="w-8 h-8" />

      <div>{props.name}</div>
    </div>
  )
}

export const GameEogSpellAndItems = (props: {
  spells: number[];
  items: number[];
}) => {
  const spells = props.spells.map(i => summonerSpellsList.find(it => it.id === i));
  const items = props.items.map(i => itemsList.find(it => it.id === i));


  return (
    <div className="flex gap-1">

      {items.map((item, index) => (
        <img title={item?.name} src={item?.iconURL} key={index} className="w-8 h-8 bg-slate-800" />
      ))}

      <div className="w-4"></div>

      {spells.map((spell, index) => (
        <img title={spell?.name} src={spell?.iconURL} key={'spell' + index} className="w-8 h-8 bg-slate-800" />
      ))}

    </div>
  );
}

export default function () {
  const params = useSearchParams();
  const router = useRouter();
  const userid = params.get('gameid');

  const [status, setStatus] = useState(0);
  const [failMsg, setFailMsg] = useState("");
  const [data, setData] = useState<LeagueGameEogData>();

  const getItems = async () => {
    if (userid === null) {
      setStatus(2);
      setFailMsg("参数错误！");
      return;
    }
    try {
      const res = await getGameEog(userid);
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
  } else {
    body = <div>
      {
        data?.teams.map((d, i) => (
          <div>
            <h2 className="font-extrabold text-xl my-2 px-2">队伍 {i + 1}</h2>

            <table className="league-table table-fixed">
              <thead>
                <tr>
                  <th>英雄</th>
                  <th>出装及技能</th>
                  <th>K / D / A</th>
                  <th>金钱</th>
                  <th>伤害</th>
                  <th>承伤</th>
                  <th>治疗</th>
                </tr>
              </thead>
              <tbody>
                {d.players.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <GameEogChampion championId={item.championId} name={item.summonerName} level={item.stats.LEVEL} />
                    </td>
                    <td width={400}>
                      <GameEogSpellAndItems spells={[
                        item.spell1Id,
                        item.spell2Id
                      ]} items={item.items} />
                    </td>
                    <td width={120}>{item.stats.CHAMPIONS_KILLED} / {item.stats.NUM_DEATHS} / {item.stats.ASSISTS}</td>
                    <td width={100}>{item.stats.GOLD_EARNED}</td>
                    <td width={100}>{item.stats.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS}</td>
                    <td width={100}>{item.stats.TOTAL_DAMAGE_TAKEN}</td>
                    <td width={100}>{item.stats.TOTAL_HEAL}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      }
    </div>
  }

  return (
    <LeaguePage title={"对局详情"} showBack titleToolButtons={
      <div>
        <button className="league-btn" onClick={getItems}>刷新</button>
      </div>
    }>
      {body}
    </LeaguePage>
  );

}
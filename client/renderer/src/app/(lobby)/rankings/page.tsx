"use client";
import { useEffect, useState } from "react";
import LeaguePage from "../../../components/LeaguePage";
import { RankingDTO } from "@root/shared/contract";
import { getRankings } from "../../../services/room";
import { useRouter } from "next/navigation";
import LoadingPage from "../../../components/LoadingPage";
import FailPage from "../../../components/FailPage";
import { isWeb } from "../../../services/env";
import sessionService from '@renderer/src/services/session';
import LeagueNav from "../../../components/LeagueNav";

export default function RankingsPage() {

  const [data, setData] = useState<RankingDTO[]>([]);
  const [status, setStatus] = useState(0);
  const [failMsg, setFailMsg] = useState("");

  const router = useRouter();

  const getItems = async () => {
    try {
      setData(await getRankings());
      setStatus(1);
    } catch (e) {
      setStatus(2);
      setFailMsg(`获取失败！ ${e}`);
    }
  };

  useEffect(() => {
    getItems();
  }, []);


  let body;

  if (status === 0) {
    body = <LoadingPage noPage message="正在获取..." />
  } else if (status === 2) {
    body = <FailPage noPage reason={failMsg} buttonTitle="重试" onButtonClick={getItems} />
  } else if (data.length === 0) {
    body = <div className="my-20 flex flex-col justify-center items-center">
      <img src="/images/poro.svg" className="w-1/4 max-w-[200px]" />
      <div className="text-xl mt-4">天梯排名暂无召唤师。</div>
    </div>
  } else {
    body = <table className="league-table">
      <thead>
        <tr>
          <th>#</th>
          <th>游戏ID</th>
          <th className="w-10">昵称</th>
          <th>排位分</th>
          <th>游戏场次</th>
          <th>胜场</th>
          <th>败场</th>
          <th>胜率</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr className="cursor-pointer" onClick={() => {
            router.push(`/user?userid=${item.summonerId}&summonerName=${item.name}`);
          }}>
            <td>{index + 1}</td>
            <td>{item.name}</td>
            <td className="truncate max-w-[400px]" title={item.nickname}>{item.nickname}</td>
            <td>{item.rankScore}</td>
            <td>{item.games}</td>
            <td>{item.winnedGames}</td>
            <td>{item.failedGames}</td>
            <td>{(item.winRate * 100).toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  }

  const message = data.every(x => x.rankScore !== 0) ? null : <div>
    <img src='/images/red-warning.png' className='w-5 h-5 mr-2 inline' />
    该服务器可能隐藏了排位分和排名信息
  </div>;

  return (
    <LeaguePage title="天梯排名" inNavPage={!isWeb()} titleToolButtons={
      <div className="flex gap-4 items-center">
        {message}
        <button className="league-btn" onClick={getItems}>刷新</button>
      </div>
    }>
      {body}
    </LeaguePage>
  );
}



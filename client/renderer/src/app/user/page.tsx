'use client';
import { useRouter } from "next/navigation";
import LeagueButtonGroup from "../../components/LeagueButtonGroup";
import { useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import league from "../../services/league";
import LoadingPage from "../../components/LoadingPage";
import FailPage from "../../components/FailPage";
import sessionService from "../../services/session";

export default function () {

  const router = useRouter();

  const summonerId = useRef<string | null>();
  const [realName, setRealName] = useState(localStorage.getItem("realName") || "");
  const [gameID, setGameID] = useState(localStorage.getItem("gameID") || "");
  const [server, setServer] = useState(localStorage.getItem("server") || "lol.fancybag.cn:22001");

  const [status, setStatus] = useState(0);
  const [failMsg, setFailMsg] = useState("");

  const getInfo = async () => {
    setStatus(0);
    try {
      const info = await league.getSummonerInfo();
      summonerId.current = info.id;
      setGameID(info.name);
      setStatus(1);
    } catch (e) {
      setFailMsg("获取召唤师信息失败！请检查客户端是否启动。");
      setStatus(2);
    }
  }

  useEffect(() => {
    getInfo();
  }, []);

  const regist = () => {
    try {
      sessionService.regist({
        server: server,
        sessionID: localStorage.getItem("id") || v4(),
        realName,
        summonerName: gameID,
        summonerId: summonerId.current || ""
      });

      localStorage.setItem("realName", realName);
      localStorage.setItem("gameID", gameID);
      router.replace(`/`);
    } catch (e) {
      if (e instanceof Error)
        setFailMsg(e.message);
      setStatus(2);
    }
  }

  if (status === 0) {
    return <LoadingPage message="正在获取召唤师信息..." />
  } else if (status === 2) {
    return <FailPage reason={failMsg} buttonTitle="重试" onButtonClick={getInfo} />
  }

  return (
    <div className="m-8">
      <h1 className="text-3xl font-sans font-bold">
        <img src='/images/rift.png' className="w-10 h-10 inline-block mr-4" />
        欢迎
      </h1>
      <div className="my-8 *:my-2 flex flex-col max-w-[300px] mx-auto">
        <label className="block text-sm font-medium text-gray-100">服务器地址</label>
        <input type="text" className="league-input" placeholder="请输入服务器地址" value={server} onChange={(e) => {
          setServer(e.target.value);
        }} />

        <label className="block text-sm font-medium text-gray-100">真实姓名</label>
        <input type="text" className="league-input" placeholder="请输入真实姓名" value={realName} onChange={(e) => {
          setRealName(e.target.value);
        }} />
        <label className="block text-sm font-medium text-gray-100">游戏ID</label>

        <input type="text" className="league-input" readOnly placeholder="请输入游戏ID" value={gameID} onChange={(e) => {
          setGameID(e.target.value);
        }} />
      </div>

      <div className="flex justify-center">
        <LeagueButtonGroup text="进入" onConfirm={async () => {
          regist();
        }} onCancel={() => {
          router.back();
        }} />
      </div>


    </div>
  );

}
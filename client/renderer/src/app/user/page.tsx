'use client';
import { useRouter } from "next/navigation";
import LeagueButtonGroup from "../../components/LeagueButtonGroup";
import { useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import league from "../../services/league";
import LoadingPage from "../../components/LoadingPage";
import FailPage from "../../components/FailPage";
import sessionService from "../../services/session";
import { setVolume as soundServiceSetVolume } from '../../services/sound';
import LeaguePage from "../../components/LeaguePage";

export default function () {

  const router = useRouter();

  const summonerId = useRef<string | null>();
  const [realName, setRealName] = useState(globalThis?.localStorage?.getItem("realName") || "");
  const [gameID, setGameID] = useState(globalThis?.localStorage?.getItem("gameID") || "");
  const [server, setServer] = useState(globalThis?.localStorage?.getItem("server") || "lol.fancybag.cn:22001");

  const [status, setStatus] = useState(0);
  const [failMsg, setFailMsg] = useState("");
  const [volume, setVolume] = useState(globalThis?.localStorage?.getItem("volume") ?
    parseInt(globalThis?.localStorage?.getItem("volume") || "50") : 50);

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
      const id = globalThis?.localStorage?.getItem("id") || v4();
      sessionService.regist({
        server: server,
        sessionID: id,
        realName,
        summonerName: gameID,
        summonerId: summonerId.current || ""
      });

      soundServiceSetVolume(volume);

      globalThis?.localStorage?.setItem("id", id);
      globalThis?.localStorage?.setItem("realName", realName);
      globalThis?.localStorage?.setItem("gameID", gameID);
      globalThis?.localStorage?.setItem("volume", volume.toString());
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
    <LeaguePage title="欢迎" showButton confirmText="进入" onConfirm={() => {
      regist();
    }} onCancel={() => {
      router.back();
    }}>

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

        <label className="block text-sm font-medium text-gray-100">音效音量</label>
        <input type="range" className="league-input-range" min="0" max="100" step="1" value={volume} onChange={(e) => {
          setVolume(parseInt(e.target.value));
        }} />
      </div>

    </LeaguePage>


  );

}
'use client';
import { useRouter } from "next/navigation";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import league from "../../services/league";
import LoadingPage from "../../components/LoadingPage";
import FailPage from "../../components/FailPage";
import sessionService from "../../services/session";
import { setVolume as soundServiceSetVolume } from '../../services/sound';
import LeaguePage from "../../components/LeaguePage";
import { isWeb } from "../../services/env";
import { GlobalContext } from "../context";
import getConfig from "next/config";
import { negotiateWithServer } from "../../services/room";
import { ServerInfoBanner } from '@shared/contract';

const debounce = (func: Function, delay: number, timerRef: React.MutableRefObject<any>) => {
  return function (...args: any) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      func.apply(undefined, args)
    }, delay);
  }
}

function Banner({ banner, onFinish }: { banner?: ServerInfoBanner, onFinish?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (!banner || banner.type === 'video') return;
    const timeout = setTimeout(() => {
      onFinish?.();
    }, banner.time || 5000);
    return () => {
      clearTimeout(timeout);
    }
  }, [banner])

  if (!banner) return <div className="h-full w-full flex items-center justify-center">
    <video autoPlay loop muted className="h-full w-full object-cover">
      <source src="/images/default-banner.webm" type="video/webm" />
    </video>
  </div>;

  return <div className="h-full w-full flex items-center justify-center">
    {banner.type === 'video' ? <video ref={videoRef} autoPlay muted className="h-full w-full object-cover" onError={onFinish} onEnded={() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      onFinish?.();
    }} src={banner.url} />
      : <img src={banner.url} className="h-full w-full object-cover" />}
  </div>
}

const DEFAULT_BANNERS: ServerInfoBanner[] = [
  { type: 'video', url: '/images/default-banner.webm' }
];

export default function () {

  const version = process.env.version;
  const router = useRouter();

  const summonerId = useRef<string | null>();
  const [realName, setRealName] = useState(globalThis?.localStorage?.getItem("realName") || "");
  const [gameID, setGameID] = useState("");
  const [server, setServer] = useState(globalThis?.localStorage?.getItem("server") || (isWeb() ? "lol.fancybag.cn/api" : "lol.fancybag.cn:22001"));

  // 0 - loading, 1 - success, 2 - fail
  const [status, setStatus] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [failMsg, setFailMsg] = useState("");

  const [registBusy, setRegistBusy] = useState(false);

  const [banners, setBanners] = useState<ServerInfoBanner[]>(DEFAULT_BANNERS);
  const [banner, setBanner] = useState<ServerInfoBanner>();

  useEffect(() => {
    setBanner(banners[0]);
  }, [banners]);


  const { webSocketStatus } = useContext(GlobalContext);

  const timerRef = useRef(0);

  const getServerInfo = debounce(async (server: string) => {
    await getInfo(server);
  }, 1000, timerRef);

  const onServerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setServer(e.target.value);
    setStatus(2);
    getServerInfo(e.target.value);
  }

  const getInfo = async (server: string) => {
    setStatus(0);

    if (webSocketStatus === 'close') {
      setFailMsg("无法连接客户端，请检查客户端是否启动，我们将自动尝试重连");
      setStatus(2);
      return;
    }

    if (webSocketStatus === 'connecting') {
      setLoadingMsg("正在连接客户端...");
      return;
    }

    try {
      setLoadingMsg("正在和服务器协商...");
      const ret = await negotiateWithServer(server, version || "0.0.0");

      if (ret.serverInfo?.banners && ret.serverInfo.banners.length > 0) {
        setBanners(ret.serverInfo.banners);
      } else {
        setBanners(DEFAULT_BANNERS);
      }

      if (ret.ok) {
        setFailMsg(ret.message || "");
      } else {
        setStatus(2);
        setFailMsg(ret.message || "服务器响应异常");
        return;
      }
    } catch (e) {
      setStatus(2);
      setBanners(DEFAULT_BANNERS);
      if (e instanceof Error && e.message === "Failed to fetch") e = "请输入正确服务器地址";
      setFailMsg("无法连接服务器，" + e);
      return;
    }


    try {
      setLoadingMsg("正在获取召唤师信息...");
      const info = await league.getSummonerInfo();
      summonerId.current = info.id;
      setGameID(info.name);
      setStatus(1);
    } catch (e) {
      setFailMsg("获取召唤师信息失败...");
      setStatus(2);
    }
  }

  useEffect(() => {
    getInfo(server);
  }, [webSocketStatus]);

  const regist = async () => {
    setRegistBusy(true);
    if (isWeb()) {
      sessionService.loginWeb({ server });
      globalThis?.localStorage?.setItem("server", server);
      router.replace(`/rankings`);
      return;
    }
    if (!summonerId.current) return;
    try {
      const id = summonerId.current.toString();
      sessionService.login({
        server: server,
        sessionID: id,
        realName,
        summonerName: gameID,
        summonerId: summonerId.current
      });

      await sessionService.loadChampions();

      router.replace(`/`);
    } catch (e) {
      if (e instanceof Error)
        setFailMsg(e.message);
      setStatus(2);
    }
    setRegistBusy(false);
  }


  return (
    <div className="h-screen bg-[#0005] flex">
      <div className="fixed inset-0 z-[-1]">
        <Banner banner={banner} onFinish={() => {
          if (banner) setBanner(banners[(banners.indexOf(banner) + 1) % banners.length]);
        }} />
      </div>

      <div className="grow flex flex-col justify-between m-8">
        <img src="/images/lop-logo-text.png" className="w-[200px]" />
        <div className="text-xs">
          <p>League of PRIDE 是一款辅助创建大乱斗内战对局的工具</p>
          <p>当前版本：{version}</p>
          <p>开放源代码地址：https://github.com/jxlpzqc/lol-aram</p>
        </div>
      </div>


      <div className="py-10 px-10 bg-[#000a] *:my-2 flex flex-col w-[360px]">
        <label className="block text-sm font-medium text-gray-100">服务器地址</label>
        <input type="text" className="league-input" placeholder="请输入服务器地址" value={server} onChange={onServerChange} />

        <label className="block text-sm font-medium text-gray-100">昵称</label>
        <input type="text" className="league-input" placeholder="请输入昵称" value={realName} onChange={(e) => {
          setRealName(e.target.value);
        }} />
        <label className="block text-sm font-medium text-gray-100">游戏ID</label>

        <input type="text" className="league-input" readOnly placeholder="请输入游戏ID" value={gameID} onChange={(e) => {
          setGameID(e.target.value);
        }} />

        <div className="h-20 flex items-center">
          {
            status === 0 ? <div className="flex items-center">
              <img src='/images/spinner.png' className='w-8 h-8 animate-spin mr-4' />
              {loadingMsg}
            </div> : !!failMsg ? <div>
              <img src='/images/red-warning.png' className='w-4 h-4 mr-2 inline' />
              <span className="text-red-500 mr-2">{failMsg}</span>
              <span className="inline cursor-pointer" onClick={() => { getInfo(server) }}>重试</span>
            </div> : null
          }
        </div>

        <button className="league-btn " disabled={status !== 1 || registBusy} onClick={regist}>
          <div className="flex justify-center items-center">
            {registBusy && <img src='/images/spinner.png' className='w-4 h-4 animate-spin mr-4' />}
            登录
          </div>
        </button>

      </div>

    </div>


  );

}
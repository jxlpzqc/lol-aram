import { clsx } from "clsx"
import styles from "./LeagueNav.module.css"
import Link from "next/link"
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { GlobalContext } from "../app/context";
import sessionService from '@renderer/src/services/session';
import { playSound } from "../services/sound";

function UserNavItem({
  name, status, avatar
}: {
  name?: string,
  status: "open" | "close" | "connecting",
  avatar: string
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setOpen(true);
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    setOpen(false);
  }

  const [championsNum, setChampionsNum] = useState(sessionService.champions.length);
  const [championsRefresing, setChampionsRefreshing] = useState(false);

  const { socket, notify } = useContext(GlobalContext);

  const refreshChampions = async () => {
    if (championsRefresing) return;
    setChampionsRefreshing(true);
    try {
      await sessionService.loadChampions();
      setChampionsNum(sessionService.champions.length);
      if (socket) {
        notify?.open({
          content: "刷新英雄列表后，需要重新进入房间才能生效",
        })
      }
    } catch {
      notify?.open({
        content: "刷新英雄列表失败",
      })
    }
    setChampionsRefreshing(false);
  }

  return <li className={clsx(styles["nav-btn"], "!py-0 !px-0")} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} >
    <div className="flex items-center relative h-full">
      <img className="w-10 h-10 mx-4 rounded-full" src={avatar} />
      <div className="mr-4">
        <div className="text-sm w-40 line-clamp-1 trucate">{name}</div>
        <Status status={status} />
      </div>
      <div className={clsx("absolute top-full right-0 w-full bg-[#010a13] border-[#463714] border-2 border-solid shadow-xl shadow-black", { "hidden": !open })}>
        <ul>
          <li className={styles["user-dropdown-item"]} onClick={refreshChampions}>
            {championsRefresing ? "正在刷新英雄列表..." : `刷新英雄列表 (${championsNum})`}</li>
          <li className={styles["user-dropdown-item"]} onClick={() => {
            router.push("/user/?summonerName=我&userid=" + sessionService.sessionID)
          }}>对战记录</li>
          <li className={styles["user-dropdown-item"]} onClick={() => {
            sessionService.logout();
            router.push("/login")
          }}>退出登录</li>
        </ul>
      </div>
    </div>
  </li>

}


function Status({
  status
}: { status: "open" | "close" | "connecting" }) {
  let body = null;
  if (status === "open") {
    body = <>
      <span className="h-3 w-3 inline-block rounded-full bg-green-500 mr-1"></span>
      客户端已连接
    </>
  } else if (status === "close") {
    body = <>
      <span className="h-3 w-3 inline-block rounded-full bg-red-500 mr-1"></span>
      客户端已断开
    </>
  } else if (status === "connecting") {
    body = <>
      <span className="h-3 w-3 inline-block rounded-full bg-yellow-500 mr-1"></span>
      客户端连接中
    </>
  }

  return <div className="text-xs">
    {body}
  </div>
}

export default function ({
  links, activeHref, onSettingsClick
}: {
  links: { href: string, text: string }[],
  activeHref: string,
  onSettingsClick?: () => void
}) {

  const router = useRouter();

  const globalData = useContext(GlobalContext);

  const onNavClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("." + styles["nav-btn"])) {
      playSound("/sounds/sfx-uikit-button-gold-click.ogg", "sound");
    }
  }

  const [isSSR, setIsSSR] = useState(true);

  useEffect(() => {
    setIsSSR(false);
  }, []);

  return <div>
    <div className={clsx(styles["nav-bar"])} onClick={onNavClick}>
      <div className={clsx(styles["play-btn-frame"])}>
        <img className={clsx(styles["logo"])} src="/images/lop-logo.png" />
        <button disabled={!globalData.socket?.internalSocket?.connected} className={clsx(styles["play-btn"])} onClick={() => {
          playSound("/sounds/sfx-uikit-button-gold-click.ogg", "sound");
          router.push("/lobby/")
        }}>房间</button>
      </div>
      <ul className="flex items-center h-full">
        {
          links.map((link) => (
            <Link href={link.href} key={link.href} className={clsx(styles["nav-btn"], activeHref === link.href ? styles["nav-btn-active"] : "")}>
              <li>
                {link.text}
              </li>
            </Link>
          ))
        }
      </ul>
      <div className="grow"></div>

      {/* Add this to escape Hydration failed problem */}
      {!isSSR &&
        <ul className="flex items-center h-full">
          <li className={clsx(styles["nav-btn"])} onClick={onSettingsClick}>
            设置
          </li>
          <UserNavItem name={sessionService.summonerName || "PRIDE 用户"} status={globalData.webSocketStatus} avatar="/images/avatar.jpg" />
        </ul>
      }
    </div>
  </div >
}
'use client';
import localFont from "next/font/local";
import "./globals.css";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import sessionService from "../services/session"
import leagueHandler from "../services/league";
import { isWeb } from "../services/env";
import { GlobalContext, GlobalContextModel } from './context';
import { addRoomSocketChangeListener, getRoomSocket, removeRoomSocketChangeListener } from "../services/room";
import { useNotification } from "rc-notification";
import league from "../services/league";
import { playSound } from "../services/sound";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const router = useRouter();
  const pathname = usePathname();

  const [notify, contextHolder] = useNotification({
    prefixCls: "league-notification",
    closable: true,
    closeIcon: <img src="/images/icon-x.png" className="w-4 h-4" />,
  });
  const [socket, setSocket] = useState(getRoomSocket());
  const [webSocketStatus, setWebSocketStatus] = useState("close" as "open" | "close" | "connecting");

  if (isWeb()) {
    const server = global.window?.localStorage.getItem("server");
    sessionService.loginWeb({ server: server || "lol.fancybag.cn/api" });
  }

  useEffect(() => {
    if (isWeb()) {
      if (pathname === "/room" || pathname === "/") {
        router.replace("/rankings");
      }
      return;
    }

    if (!sessionService.registed && pathname !== "/update" && pathname !== '/update.html' && pathname !== "/login") {
      router.push("/login");
    }

    let componentUnloaded = false;

    const connectToWebSocketUntilSuccess = async () => {
      while (!componentUnloaded) {
        try {
          await leagueHandler.startWebSocket();
          break;
        } catch (e) {
          console.error("connect to websocket error", e);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    connectToWebSocketUntilSuccess();

    const onWebSocketStatusChanged = (e: any, d: 'open' | 'close' | 'connecting') => {
      console.log("onWebSocketStatusChanged", d);
      setWebSocketStatus(d);
      if (d === 'close') {
        connectToWebSocketUntilSuccess();
      }
      // if (d === 'close') {
      //   console.log("onWebSocketClose", e, d);
      //   if (pathname !== "/update" && pathname !== '/update.html' && pathname !== "/settings") {
      //     router.push("/settings");
      //   }
      // }
    }
    const onRoomSocketChange = () => {
      setSocket(getRoomSocket());
    }

    (async () => {
      setWebSocketStatus(await leagueHandler.getWebSocketStatus());
    })();
    leagueHandler.addWebSocketStatusChangedListener(onWebSocketStatusChanged);
    addRoomSocketChangeListener(onRoomSocketChange)
    return () => {
      componentUnloaded = true;
      leagueHandler.removeWebSocketStatusChangedListener(onWebSocketStatusChanged);
      removeRoomSocketChangeListener(onRoomSocketChange);
    }
  }, []);

  useEffect(() => {
    const onRoomNeedNavigateToRoom = () => {
      router.push("/room");
    }

    socket?.addEventListener('needNavigateToRoom', onRoomNeedNavigateToRoom);
    return () => {
      socket?.removeEventListener('needNavigateToRoom', onRoomNeedNavigateToRoom);
    }
  }, [socket]);

  useEffect(() => {
    const onLeagueBtnClick = (e: MouseEvent) => {
      if (e.target instanceof HTMLElement) {
        const button = e.target.closest("button");
        if (button && button.classList.contains("league-btn")) {
          playSound('/sounds/sfx-uikit-generic-click-small.ogg', 'sound');
        }
      }
    }

    global?.document.addEventListener("click", onLeagueBtnClick);

    return () => {
      global?.document.removeEventListener("click", onLeagueBtnClick);
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <title>League of PRIDE</title>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense>
          {contextHolder}
          <GlobalContext.Provider value={{
            socket,
            webSocketStatus: webSocketStatus,
            notify
          }}>
            {children}
          </GlobalContext.Provider>
        </Suspense>
      </body>
    </html>
  );
}

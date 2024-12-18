'use client';
import localFont from "next/font/local";
import "./globals.css";
import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import sessionService from "../services/session"
import leagueHandler from "../services/league";
import { isWeb } from "../services/env";

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

  if (isWeb()) {
    const server = global.window?.localStorage.getItem("server");
    sessionService.registWeb({ server: server || "lol.fancybag.cn/api" });
  }

  useEffect(() => {
    if (isWeb()) {
      if (pathname === "/room" || pathname === "/") {
        router.replace("/rankings");
      }
      return;
    }

    if (!sessionService.registed && pathname !== "/update" && pathname !== '/update.html' && pathname !== "/settings") {
      router.push("/settings");
    }

    const onWebSocketClose = (e: any, d: any) => {
      console.log("onWebSocketClose", e, d);
      if (pathname !== "/update" && pathname !== '/update.html' && pathname !== "/settings") {
        router.push("/settings");
      }
    }
    leagueHandler.addWebSocketClosedListener(onWebSocketClose);
    return () => {
      leagueHandler.removeWebSocketClosedListener(onWebSocketClose);
    }
  });

  return (
    <html lang="en">
      <head>
        <title>League of PRIDE</title>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense>
          {children}
        </Suspense>
      </body>
    </html>
  );
}

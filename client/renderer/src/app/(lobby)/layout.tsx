"use client";
import { usePathname } from "next/navigation";
import LeagueNav from "../../components/LeagueNav"
import Settings from "./components/Settings";
import { useState } from "react";
import LeagueModal from "../../components/LeagueModal";
import { isWeb } from "../../services/env";

type RouteItem = {
  href: string;
  backgroundImage?: string;
  showInNav?: boolean;
  navText?: string;
  ownedByNavHref?: string;
}

const routes: RouteItem[] = [
  { href: "/", backgroundImage: "/images/arcane2024_epe_background.png", showInNav: true, navText: "房间列表" },
  { href: "/rankings/", showInNav: true, navText: "天梯排行" },
  { href: "/backfill/", showInNav: true, navText: "战绩补登" },
  { href: "/game/", showInNav: false, ownedByNavHref: "/rankings/" },
  { href: "/user/", showInNav: false, ownedByNavHref: "/rankings/" },
  { href: "/lobby/", showInNav: false, backgroundImage: "/images/background-freljord.jpg" },
]

export default function ({ children }: React.PropsWithChildren<{}>) {
  const pathname = usePathname();

  const route = routes.find(r => r.href === pathname);

  const activePath = route?.ownedByNavHref || pathname;

  let backgroundStyle = "linear-gradient(to bottom, #000, #0008)";

  if (route?.backgroundImage) {
    backgroundStyle = `linear-gradient(to bottom, #000, #0008), bottom / cover no-repeat url('${route.backgroundImage}')`;
  }

  const [settingModalOpen, setSettingModalOpen] = useState(false);

  if (isWeb()) {
    return children;
  }

  return <div className="h-screen flex flex-col" style={{
    background: backgroundStyle,
  }}>
    <LeagueNav
      links={routes.filter(x => x.showInNav).map(u => ({ href: u.href, text: u.navText || "" }))}
      activeHref={activePath}
      onSettingsClick={() => setSettingModalOpen(true)}
    />
    <LeagueModal open={settingModalOpen}
      onClose={() => setSettingModalOpen(false)} width={500} height="67%">
      <Settings onClose={() => setSettingModalOpen(false)} />
    </LeagueModal>
    <div className="grow overflow-auto">
      {children}
    </div>
  </div>
}
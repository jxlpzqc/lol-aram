"use client";
import { useContext, useEffect, useState } from "react";
import RoomWaiting from "./components/RoomWaiting";
import { RoomDTO } from "@root/shared/contract";
import { useRouter } from "next/navigation";
import LoadingPage from "../../../components/LoadingPage";
import { GlobalContext } from "../../context";
import { disconnectFromRoom } from "../../../services/room";
import FailPage from "../../../components/FailPage";

export default function () {
  const socket = useContext(GlobalContext).socket;
  const [roomInfo, setRoomInfo] = useState<RoomDTO | null>(socket?.latestRoomInfo || null);
  const router = useRouter();

  useEffect(() => {
    const onRoom = (e: { data: RoomDTO }) => {
      setRoomInfo(e.data);
    }
    socket?.addEventListener('roomUpdated', onRoom);

    return () => {
      socket?.removeEventListener('roomUpdated', onRoom);
    }
  }, [socket]);

  if (!socket) {
    return <div className="mt-20">
      <FailPage noPage reason="当前未连接到任何房间中" buttonTitle="回到房间列表" onButtonClick={() => {
        router.replace('/');
      }} />
    </div>
  }

  if (!roomInfo) {
    return <div className="mt-20">
      <LoadingPage noPage message="正在连接..." />
    </div>
  }

  return <RoomWaiting roomName={roomInfo?.name || "未知房间"}
    time={roomInfo?.totalTime || 60}
    seats={roomInfo?.users}
    onJoin={async (x) => {
      await socket?.changeSeat(x);
    }} onStartGame={async () => {
      await socket?.startGame();
    }} onAutoArrange={async () => {
      await socket?.autoArrange();
    }} onQuit={async () => {
      await disconnectFromRoom();
      router.replace('/');
    }} />
}
"use client"
import { getAllRooms } from "../services/room";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import sessionService from "../services/session";
import LoadingPage from "../components/LoadingPage";
import FailPage from "../components/FailPage";
import { RoomInListDTO } from "../../../../types/contract";


export default function Home() {
  const [rooms, setRooms] = useState<RoomInListDTO[]>([]);

  const [status, setStatus] = useState(0);
  const [failMsg, setFailMsg] = useState("");

  const fetchRooms = async (withoutLoading: boolean = false) => {
    if (!sessionService.registed) {
      setStatus(2);
      setFailMsg("请先配置服务器！");
      return;
    }
    if (!withoutLoading) setStatus(0);
    try {
      setRooms(await getAllRooms());
      setStatus(1);
    } catch (e) {
      setStatus(2);
      setFailMsg(`获取房间列表失败！ ${e}`);
    }
  }

  const router = useRouter();

  const gotoRoom = (roomid: string) => {
    router.push(`/room?roomid=${roomid}`);
  }

  const createRoom = () => {
    router.push(`/room/create`);
  }

  const setUser = () => {
    router.push(`/user`);
  }

  useEffect(() => {
    fetchRooms();

    const interval = setInterval(() => {
      fetchRooms(true);
    }, 3000);

    return () => {
      clearInterval(interval);
    }
  }, []);

  let body;

  if (status === 0) {
    body = <LoadingPage noPage message="正在获取..." />
  } else if (status === 2) {
    body = <FailPage noPage reason={failMsg} buttonTitle="重试" onButtonClick={fetchRooms} />
  } else {
    body = <table className="table-auto w-full">
      <thead>
        <tr>
          <th className="text-left py-4 pl-2">房间名</th>
          <th className="text-left py-4">状态</th>
          <th className="text-left py-4">人数</th>
        </tr>
      </thead>
      <tbody>
        {rooms.map((room) => (
          <tr className="hover:outline-[#785a28] hover:outline" key={room.id} onClick={() => { gotoRoom(room.id) }}>
            <td className="py-2 pl-2">{room.name}</td>
            <td className="py-2">{room.status == 'waiting' ? "等待中" : "游戏中"}</td>
            <td className="py-2">{room.playerNumber} / 10 </td>
          </tr>
        ))}
      </tbody>

    </table>

  }

  return (
    <div className="m-8">
      <h1 className="text-3xl font-sans font-bold">
        <img src='/images/rift.png' className="w-10 h-10 inline-block mr-4" />
        房间列表
      </h1>
      <div className="flex justify-end">
        <button className="league-btn mx-4" onClick={() => { fetchRooms() }}>刷新</button>
        <button className="league-btn mx-4" onClick={createRoom}>新建房间</button>
        <button className="league-btn mx-4" onClick={setUser}>配置</button>
      </div>
      <div className="my-8">
        {body}
      </div>
    </div>
  );
}

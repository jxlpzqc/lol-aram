"use client"
import { getAllRooms, RoomDTO } from "../services/room";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


export default function Home() {
  const [rooms, setRooms] = useState<RoomDTO[]>([]);

  const fetchRooms = async () => {
    try {
      setRooms(await getAllRooms());
    } catch (e) {
      console.error(e);
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
  }, []);

  useEffect(() => {
    if (localStorage.getItem("id") === null) {
      router.push("/user");
    }
  });


  return (
    <div className="m-8">
      <h1 className="text-3xl font-sans font-bold">PRIDE 青训营 房间列表</h1>
      <div className="flex justify-end">
        <button className="league-btn mx-4" onClick={fetchRooms}>刷新</button>
        <button className="league-btn mx-4" onClick={createRoom}>新建房间</button>
        <button className="league-btn mx-4" onClick={setUser}>设置用户</button>

      </div>
      <div className="my-8">
        <table className="table-auto w-full">
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



      </div>

    </div>
  );
}

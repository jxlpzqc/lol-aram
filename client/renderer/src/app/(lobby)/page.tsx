"use client"
import { connectToRoom, getAllRooms } from "../../services/room";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useRef, useState } from "react";
import sessionService from "../../services/session";
import LoadingPage from "../../components/LoadingPage";
import FailPage from "../../components/FailPage";
import { RoomInListDTO } from "@shared/contract";
import LeagueModal from "../../components/LeagueModal";
import CreateRoom from "./components/CreateRoom";
import leagueHandler from "../../services/league";
import { GlobalContext } from "../context";


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
  const { socket, notify } = useContext(GlobalContext);

  const gotoRoom = async (roomid: string, password: string) => {
    if (roomid === socket?.latestRoomInfo?.id) {
      notify?.open({
        content: "你已经在这个房间里了！",
      })
      return;
    }

    await connectToRoom({
      type: 'join',
      roomID: roomid,
      password: password,
      userID: sessionService.sessionID!,
      userName: sessionService.realName!,
      userGameID: sessionService.summonerName!,
      championList: sessionService.champions,
    })
    router.push("/lobby");
  }

  const passwordRef = useRef<HTMLInputElement>(null);

  const openPasswordModal = (roomid: string) => {
    setPasswordModalID(roomid);
    setPassword("");
    passwordRef.current?.focus();
  }

  const [createRoomModal, setCreateRoomModal] = useState(false);
  const [roomFilter, setRoomFilter] = useState("");
  const [passwordModalID, setPasswordModalID] = useState<string>();
  const [password, setPassword] = useState("");

  const createRoom = () => {
    setCreateRoomModal(true);
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

  const displayRooms = rooms.filter(x => x.name.indexOf(roomFilter) !== -1);

  if (status === 0) {
    body = <LoadingPage noPage message="正在获取..." />
  } else if (status === 2) {
    body = <FailPage noPage reason={failMsg} buttonTitle="重试" onButtonClick={fetchRooms} />
  } else if (displayRooms.length === 0) {
    body = <div className="my-20 flex flex-col justify-center items-center">
      <img src="/images/poro.svg" className="w-1/4 max-w-[200px]" />
      <div className="text-xl mt-4">暂无房间，请{roomFilter ? "重新输入关键词" : "新建房间"}</div>
    </div>
  } else {
    body = <table className="league-table">
      <thead>
        <tr>
          <th></th>
          <th>房间名</th>
          <th>状态</th>
          <th>人数</th>
        </tr>
      </thead>
      <tbody>
        {displayRooms.map((room) => (
          <tr className="cursor-pointer" key={room.id} onClick={() => { room.hasPassword ? openPasswordModal(room.id) : gotoRoom(room.id, "") }}>
            <td className="w-8">{room.hasPassword &&
              <img src="/images/lock.png" className="h-4" />}
            </td>
            <td>{room.name}</td>
            <td>{room.status == 'waiting' ? "等待中" : "游戏中"}</td>
            <td>{room.playerNumber} / 10 </td>
          </tr>
        ))}
      </tbody>

    </table>

  }


  return (
    <div className="flex flex-col grow p-8">
      <LeagueModal width={400} open={createRoomModal} onClose={() => { setCreateRoomModal(false) }} >
        <CreateRoom onCancel={() => { setCreateRoomModal(false) }} />
      </LeagueModal>
      <LeagueModal width={400} height={200} open={passwordModalID !== undefined} onClose={() => { setPasswordModalID(undefined) }} >
        <div className="p-8">
          <div className="text-lg mb-4 font-bold">输入房间密码</div>
          <div className="flex gap-4 items-center mt-8">
            <input ref={passwordRef} onKeyDown={(e) => {
              if (e.key === "Enter") {
                gotoRoom(passwordModalID!, password);
                e.preventDefault();
              }
            }} type="password" value={password} className="league-input grow" onChange={(e) => { setPassword(e.target.value) }} />
            <button className="league-btn" onClick={() => { gotoRoom(passwordModalID!, password) }}>加入</button>
          </div>
        </div>
      </LeagueModal>

      <div className="flex justify-between items-center pb-4 border-b border-slate-600">
        <h1 className="text-lg font-sans font-bold">
          房间列表
        </h1>
        <div className="flex gap-4">
          <button className="league-btn league-btn-icon !text-sm" onClick={() => { fetchRooms() }}>
            <img src="/images/icon-refresh.png" className="w-5" />
          </button>
          <input type="text" placeholder="寻找一场对局" className="league-input !text-sm" value={roomFilter} onChange={(e) => { setRoomFilter(e.target.value) }} />
          <button className="league-btn !text-sm" onClick={createRoom}>建房</button>
        </div>
      </div>
      <div className="my-8 grow overflow-y-auto *:my-2">
        {body}
      </div>
    </div>
  );

}

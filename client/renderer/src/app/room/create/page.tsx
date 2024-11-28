'use client';
import { useRouter } from "next/navigation";
import LeagueButtonGroup from "../../../components/LeagueButtonGroup";
import { useState } from "react";
import LeaguePage from "../../../components/LeaguePage";

export default function () {

  const router = useRouter();

  const gotoRoom = () => {
    if (!roomName) {
      setFailMsg("请输入房间名！");
      return;
    }
    if (waitingTime <= 5 || waitingTime >= 300) {
      setFailMsg("等待时间必须在5-300之间！");
      return;
    }

    router.push(`/room?newRoomName=${roomName}&waitingTime=${waitingTime}`);
  }

  const [roomName, setRoomName] = useState("新建房间");
  const [waitingTime, setWaitingTime] = useState(60);
  const [failMsg, setFailMsg] = useState("");


  return (
    <LeaguePage title="创建房间" confirmText="创建房间"
      showButton onConfirm={() => { gotoRoom() }} onCancel={() => { router.back() }}>

      <div className="my-8 *:my-2 flex flex-col max-w-[300px] mx-auto">
        <label className="block text-sm font-medium text-slate-100">房间名</label>
        <input type="text" className="league-input" placeholder="请输入房间名" value={roomName} onChange={(e) => {
          setRoomName(e.target.value);
        }} />

        <label className="block text-sm font-medium text-slate-100">等待时间 （秒）</label>
        <input type="number" className="league-input" placeholder="请输入等待时间" value={waitingTime} onChange={(e) => {
          setWaitingTime(parseInt(e.target.value));
        }} />
      </div>
      {failMsg && <div className="text-center text-red-500">{failMsg}</div>}
    </LeaguePage>


  );

}
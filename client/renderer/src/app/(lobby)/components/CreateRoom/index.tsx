'use client';
import { useRouter } from "next/navigation";
import { useContext, useState } from "react";
import LeaguePage from "../../../../components/LeaguePage";
import { connectToRoomAndWait } from "@root/client/renderer/src/services/room";
import sessionService from '@renderer/src/services/session';
import leagueHandler from "@root/client/renderer/src/services/league";
import { GlobalContext } from "../../../context";

export default function ({
  onCancel
}: {
  onCancel?: () => void;
}) {

  const router = useRouter();

  const notify = useContext(GlobalContext).notify;

  const gotoRoom = async () => {
    if (!roomName) {
      setFailMsg("请输入房间名！");
      return;
    }
    if (waitingTime < 5 || waitingTime > 300) {
      setFailMsg("等待时间必须在5-300之间！");
      return;
    }
    try {
      await connectToRoomAndWait({
        type: "create",
        roomName: roomName,
        waitingTime: waitingTime,
        userID: sessionService.sessionID!,
        userName: sessionService.realName!,
        userGameID: sessionService.summonerName!,
        championList: sessionService.champions,
        password: password,
      })
    } catch (e) {
      setFailMsg(`创建房间失败！ ${e}`);
      return;
    }

    router.push("/lobby");
  }

  const [roomName, setRoomName] = useState("新建房间");
  const [waitingTime, setWaitingTime] = useState(60);
  const [failMsg, setFailMsg] = useState("");
  const [password, setPassword] = useState("");


  return (
    <LeaguePage inNavPage title="创建房间" confirmText="创建房间"
      showButton onConfirm={() => { gotoRoom() }} onCancel={onCancel}>

      <div className="*:my-2 flex flex-col mx-auto">
        <label className="block text-sm font-medium text-slate-100">房间名</label>
        <input type="text" className="league-input" placeholder="请输入房间名" value={roomName} onChange={(e) => {
          setRoomName(e.target.value);
        }} />

        <label className="block text-sm font-medium text-slate-100">等待时间 （秒）</label>
        <input type="number" className="league-input" placeholder="请输入等待时间" value={waitingTime} onChange={(e) => {
          setWaitingTime(parseInt(e.target.value));
        }} />

        <label className="block text-sm font-medium text-slate-100">房间密码 （如有必要）</label>
        <input type="password" className="league-input" placeholder="请输入密码" value={password} onChange={(e) => {
          setPassword(e.target.value);
        }} />
      </div>
      {failMsg && <div className="text-center text-red-500">{failMsg}</div>}
    </LeaguePage>
  );

}
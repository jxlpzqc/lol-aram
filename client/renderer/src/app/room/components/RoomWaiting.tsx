import { UserDTO } from "@shared/contract";
import LeaguePage from "../../../components/LeaguePage";
import sessionService from '@renderer/src/services/session';

type Props = {
  roomName: string;
  time: number;
  seats: (UserDTO | null)[];
  onJoin?: (seat: number) => void;
  onKick?: (seat: number) => void;
  onStartGame?: () => void;
  onQuit?: () => void;
  onAutoArrange?: () => void;
}

function SeatCard({ seat, onJoin, onKick }: { seat?: UserDTO | null, onJoin: () => void, onKick: () => void }) {
  const self = seat?.id === sessionService.sessionID;

  return <div className="h-16 px-4 flex border-b-solid border-b-slate-600 border-b justify-between items-center">
    {!seat ? <div>（空）</div> :
      <div>
        <div>{seat.gameID} <span className={`inline-block mx-2 px-2 text-sm text-black rounded-md ${!self ? "bg-[#f5d185]" : "bg-blue-200"}`}>{seat.rankScore} </span></div>
        <div className="text-sm">{seat.name}</div>
      </div>}

    <div className="flex gap-x-4">
      <button onClick={onJoin} className="league-btn">
        {seat ? "换位" : "加入"}</button>
      {/* {seat && <button onClick={onKick} className="league-btn">踢人</button>} */}
    </div>


  </div>
}

export default function ({ roomName, time, seats, onJoin, onKick, onStartGame, onQuit, onAutoArrange }: Props) {


  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

  const scores = [
    seats.slice(0, 5).reduce((x, c) => (x + (c?.rankScore || 0)), 0),
    seats.slice(5, 10).reduce((x, c) => (x + (c?.rankScore || 0)), 0)
  ];

  const bluePercentage = sigmoid((scores[0] - scores[1]) / 500) * 100;
  const redPercentage = 100 - bluePercentage;

  return <LeaguePage title={roomName} showButton
    confirmText="开始游戏" onConfirm={onStartGame} onCancel={onQuit} >
    <div className="w-full max-w-[1200px] mx-auto p-4 flex justify-end items-center gap-4">
      <div className="italic">当前房间英雄选择时间：{time} 秒</div>
      <button className="league-btn" onClick={onAutoArrange}>自动排列</button>
    </div>
    <div className="w-full max-w-[1200px] mx-auto px-4 py-4">
      <div className="flex h-1">
        <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${bluePercentage}%` }}></div>
        <div className="h-full bg-red-400 transition-all duration-300" style={{ width: `${redPercentage}%` }}></div>
      </div>
    </div>
    <div className="flex w-full max-w-[1200px] mx-auto gap-x-8">
      {
        [0, 1].map((i) => (
          <div className="w-1/2" key={i}>
            <h3 className="px-4 font-bold text-xl">队伍{i + 1} （{scores[i]}）</h3>
            <div>
              {
                new Array(5).fill(0).map((_, j) => {
                  const seat = seats.length > i * 5 + j ? seats[i * 5 + j] : null;
                  return <SeatCard seat={seat} key={j} onJoin={() => {
                    onJoin?.(i * 5 + j);
                  }} onKick={() => {
                    onKick?.(i * 5 + j);
                  }} />
                })
              }
            </div>
          </div>
        ))
      }
    </div>
  </LeaguePage>
}

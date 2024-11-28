import { UserDTO } from "@shared/contract";
import LeaguePage from "../../../components/LeaguePage";

type Props = {
  roomName: string;
  time: number;
  seats: (UserDTO | null)[];
  onJoin?: (seat: number) => void;
  onKick?: (seat: number) => void;
  onStartGame?: () => void;
  onQuit?: () => void;
}

function SeatCard({ seat, onJoin, onKick }: { seat?: UserDTO | null, onJoin: () => void, onKick: () => void }) {
  return <div className="h-16 px-4 flex border-b-solid border-b-slate-600 border-b justify-between items-center">
    {!seat ? <div>（空）</div> :
      <div>
        <div>{seat.gameID}</div>
        <div className="text-sm">{seat.name}</div>
      </div>}

    <div className="flex gap-x-4">
      <button onClick={onJoin} className="league-btn">
        {seat ? "换位" : "加入"}</button>
      {/* {seat && <button onClick={onKick} className="league-btn">踢人</button>} */}
    </div>


  </div>
}

export default function ({ roomName, time, seats, onJoin, onKick, onStartGame, onQuit }: Props) {

  return <LeaguePage title={roomName} showButton
    confirmText="开始游戏" onConfirm={onStartGame} onCancel={onQuit} >
    <div className="italic text-right pr-4">当前房间英雄选择时间：{time} 秒</div>
    <div className="flex w-full max-w-[1200px] mx-auto gap-x-8">
      {
        [0, 1].map((i) => (
          <div className="w-1/2" key={i}>
            <h3 className="px-4 font-bold text-xl">队伍{i + 1}</h3>
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

"use client"
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import RoomWaiting from './components/RoomWaiting';
import { changeSeat, executeGame, getRoomSocket, startGame } from '../../services/room';
import LeagueButtonGroup from '../../components/LeagueButtonGroup';
import ChampionPick from './components/ChampionPick';
import { RoomDTO, UserDTO, ProgressDTO } from '@shared/contract';
import sessionService from '../../services/session';
import FailPage from '../../components/FailPage';
import LoadingPage from '../../components/LoadingPage';
import GameExecutor from './components/GameExecutor';
import leagueHandler from '../../services/league';

function Connecting() {
  return <LoadingPage message='正在连接房间...' />;
}

function ConnectionFailed({ connectionFailedReason }: { connectionFailedReason: string }) {
  const router = useRouter();
  return <FailPage buttonTitle='返回' reason={"连接失败：" + connectionFailedReason} onButtonClick={
    () => { router.back() }} />;
}

export default function Room() {
  const params = useSearchParams();
  const router = useRouter();

  const [connectionStatus, setConnectionStatus] = useState(0);
  const [connectionFailedReason, setConnectionFailedReason] = useState('');

  const [seats, setSeats] = useState<(UserDTO | null)[]>([]);
  const [remaingTime, setRemainingTime] = useState(-1);
  const [totalTime, setTotalTime] = useState(-1);
  const [availableChampions, setAvailableChampions] = useState<number[]>([]);
  const [diceNumber, setDiceNumber] = useState(0);

  const [progress, setProgress] = useState<ProgressDTO[]>([]);

  const roomInfo = useRef<RoomDTO | null>(null);
  // 0: waiting 1: playing 2: executing 3: finished
  const [status, setStatus] = useState<number>(0);

  const finishedSeats = useRef<(UserDTO | null)[]>([]);

  const socket = useRef<Socket | null>(null);

  const connectToRoom = async () => {
    let championList;
    try {
      championList = await leagueHandler.getOwnedChampions(sessionService.summonerId!);
    } catch (e) {
      setConnectionFailedReason("无法从客户端获取英雄列表");
    }

    socket.current = getRoomSocket({
      roomID: params.get('roomid') || '',
      roomName: params.get('newRoomName') || '',
      waitingTime: parseInt(params.get('waitingTime') || '60'),
      userID: sessionService.sessionID!,
      userGameID: sessionService.summonerName!,
      championList: championList || [],
      userName: sessionService.realName!,
      onRoom: (data) => {
        router.replace(`/room?roomid=${data.id}`);
        setSeats(data.users || []);

        roomInfo.current = data;

        setTotalTime(data.totalTime);

        setStatus(status => {
          // if status == 3 and data is waiting, keep screen in finish screen;
          if (status !== 3 || data.status !== 'waiting') {
            if (data.status === 'waiting') return 0;
            else if (data.status === 'playing') return 1;
            else if (data.status === 'executing') {
              (async () => {
                if (!socket.current) return;
                finishedSeats.current = (await executeGame(data, socket.current, (x) => {
                  console.log("update progress", x);
                  setProgress(x);
                })).users;
                setStatus(3);
              })();
              return 2;
            }
          }
          return status;
        });

        setAvailableChampions(data.avaliableChampions);
        const self = data.users?.find((u) => u?.id === sessionService.sessionID);
        console.log("users", data.users, self);
        if (self) {
          setDiceNumber(self.gameData?.remainRandom || 0);
        }
      },
      onTime: ({ time }) => {
        setRemainingTime(time);
      },
      onDisconnect: (reason) => {
        setConnectionStatus(2);
        setConnectionFailedReason(reason);
      },
      onConnect: () => {
        setConnectionStatus(1);
      }
    })
  };

  useEffect(() => {
    console.log("use effect");
    connectToRoom();
    return () => {
      socket.current?.disconnect();
      setTimeout(() => {
        socket.current?.disconnect();
      }, 5000);
    }
  }, []);

  const onReplay = () => {
    const data = roomInfo.current;
    if (!data) return;
    if (data.status === 'waiting') setStatus(0);
    else if (data.status === 'playing') setStatus(1);
    else if (data.status === 'executing') setStatus(2);
  };

  if (connectionStatus === 0) {
    return <Connecting />;
  } else if (connectionStatus === 2) {
    return <ConnectionFailed connectionFailedReason={connectionFailedReason} />;
  } else {
    if (status === 0) {
      return <div className='m-8'>
        <RoomWaiting seats={seats} onJoin={async (x) => {
          if (socket.current)
            await changeSeat(socket.current, x);
        }} />
        <div className='mt-20 mx-auto flex justify-center'>
          <LeagueButtonGroup text='开始游戏' onConfirm={async () => {
            if (socket.current)
              await startGame(socket.current);
          }} onCancel={() => {
            router.replace('/');
          }} />
        </div>
      </div>
    } else if (status === 1 || status === 2 || status === 3) {
      return <div className='h-screen w-screen'>

        <ChampionPick
          totalTime={totalTime}
          seats={status !== 3 ? seats : finishedSeats.current}
          remainingTime={remaingTime}
          finished={status !== 1}
          availableChampions={availableChampions} diceNumber={diceNumber} onRandom={async () => {
            socket.current?.emit('random');
          }} onChange={async (championID) => {
            socket.current?.emit('pick', { champion: championID });
          }} onEnd={async () => {
            socket.current?.emit('end');
          }}
        />
        {status !== 1 && <div className=' bg-[#000000aa] fixed w-full h-full left-0 top-0 flex justify-center items-center'>
          <div className='w-1/2 h-2/3 bg-[#010a13] border-[#463714] border-2 border-solid'>
            <GameExecutor finished={status === 3} progress={progress} seats={seats}
              replay={onReplay} />
          </div>
        </div>}
      </div>
    }
  }

}

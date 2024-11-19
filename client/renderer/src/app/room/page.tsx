"use client"
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import RoomWaiting from './components/RoomWaiting';
import { changeSeat, getRoomSocket, startGame, UserDTO } from '../../services/room';
import LeagueButtonGroup from '../../components/LeagueButtonGroup';
import ChampionPick from './components/ChampionPick';

function Connecting() {
  return <div className='flex flex-col w-full h-screen gap-8 items-center justify-center'>
    <img src='/images/lol_icon.png' className='w-40 h-40' />
    <div className='flex items-center justify-center'>
      <img src='/images/spinner.png' className='w-16 h-16 animate-spin' />
      <div className='text-white p-4 rounded-lg'>
        连接到房间中...
      </div>
    </div>
  </div>
}

function ConnectionFailed({ connectionFailedReason }: { connectionFailedReason: string }) {
  const router = useRouter();
  return <div className='flex flex-col w-full h-screen gap-8 items-center justify-center'>
    <img src='/images/lol_icon.png' className='w-40 h-40' />
    <div className='flex items-center justify-center'>
      <div className='text-white p-4 rounded-lg'>
        连接失败：{connectionFailedReason}
      </div>
    </div>
    <div>
      <button className='league-btn' onClick={() => {
        router.back();
      }}>返回</button>
    </div>
  </div>
}

export default function Room() {
  const params = useSearchParams();
  const router = useRouter();

  const [connectionStatus, setConnectionStatus] = useState(0);
  const [connectionFailedReason, setConnectionFailedReason] = useState('');

  const [seats, setSeats] = useState<(UserDTO | null)[]>([]);
  const [remaingTime, setRemainingTime] = useState(-1);
  const [availableChampions, setAvailableChampions] = useState<number[]>([]);
  const [diceNumber, setDiceNumber] = useState(0);
  const [finished, setFinished] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);

  const socket = useRef<Socket | null>(null);

  useEffect(() => {
    socket.current = getRoomSocket({
      roomID: params.get('roomid') || '',
      roomName: params.get('newRoomName') || '',
      userID: localStorage.getItem('id')!,
      userGameID: localStorage.getItem('gameID')!,
      userName: localStorage.getItem('realName')!,
      onRoom: (data) => {
        router.replace(`/room?roomid=${data.id}`);
        setSeats(data.users || []);
        setAvailableChampions(data.avaliableChampions);
        setFinished(data.status === 'finished');
        const self = data.users?.find((u) => u?.id === localStorage.getItem('id'));
        if (self) {
          setDiceNumber(self.gameData?.remainRandom || 0);
        }

      },
      onTime: ({ time }) => {
        setRemainingTime(time);
      },
      onPlay: () => {
        setIsPlaying(true);
      },
      onEnd: () => {
        setIsPlaying(false);
      },
      onDisconnect: (reason) => {
        setConnectionStatus(2);
        setConnectionFailedReason(reason);
      },
      onConnect: () => {
        setConnectionStatus(1);
      }
    })

    return () => {
      socket.current?.disconnect();
    }
  }, []);

  if (connectionStatus === 0) {
    return <Connecting />;
  } else if (connectionStatus === 2) {
    return <ConnectionFailed connectionFailedReason={connectionFailedReason} />;
  }

  return <div>
    {
      !isPlaying ?
        <div className='m-8'>
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


        </div> :
        <ChampionPick seats={seats} remainingTime={remaingTime} selfID={localStorage.getItem('id')!}
          finished={finished}
          availableChampions={availableChampions} diceNumber={diceNumber} onRandom={async () => {
            socket.current?.emit('random');
          }} onChange={async (championID) => {
            socket.current?.emit('pick', { champion: championID });
          }}
        />
    }
  </div>

}

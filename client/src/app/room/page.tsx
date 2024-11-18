"use client"
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import RoomWaiting from './components/RoomWaiting';
import { changeSeat, getRoomSocket, startGame, UserDTO } from '@/services/room';
import LeagueButtonGroup from './components/LeagueButtonGroup';
import ChampionPick from './components/ChampionPick';

export default function Room() {
  const params = useSearchParams();
  const router = useRouter();

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
      }
    })

    return () => {
      socket.current?.disconnect();
    }
  }, []);




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

"use client"
import { useRouter, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { addRoomSocketChangeListener, getRoomSocket, NeedManualOperationOpts, removeRoomSocketChangeListener } from '../../services/room';
import LeagueButtonGroup from '../../components/LeagueButtonGroup';
import ChampionPick from './components/ChampionPick';
import { RoomDTO, UserDTO, ProgressDTO } from '@shared/contract';
import sessionService from '../../services/session';
import FailPage from '../../components/FailPage';
import LoadingPage from '../../components/LoadingPage';
import GameExecutor from './components/GameExecutor';
import leagueHandler from '../../services/league';
import LeagueModal from '../../components/LeagueModal';
import { GlobalContext } from '../context';
import { CreateRoomManualOperation, JoinRoomManualOperation, PickChampionManualOperation, StartGameManualOperation } from './components/ManualOperations';
import { pauseSound, playSound } from '../../services/sound';

export default function Room() {
  const router = useRouter();
  const { socket, notify } = useContext(GlobalContext);

  const [manualOperation, setManualOperation] = useState<NeedManualOperationOpts>();

  const [roomInfo, setRoomInfo] = useState<RoomDTO | null>(socket?.latestRoomInfo || null);
  const [remaingTime, setRemainingTime] = useState(socket?.latestRoomInfo?.totalTime || 60);
  const [availableChampions, setAvailableChampions] = useState<number[]>([]);
  const [progress, setProgress] = useState<ProgressDTO[]>([]);

  const diceNumber = roomInfo?.users?.find((u) => u?.id === sessionService.sessionID)?.gameData?.remainRandom || 0;

  // 0: waiting 1: playing 2: executing 3: finished
  const [status, setStatus] = useState<number>(
    roomInfo?.status === 'waiting' ? 0 :
      roomInfo?.status === 'playing' ? 1 : 2
  );

  useEffect(() => {
    if (status === 0) {
      router.back();
    }
  }, [status]);

  useEffect(() => {
    playSound('/sounds/music-cs-allrandom-howlingabyss.ogg', 'music');

    return () => {
      pauseSound('music');
      pauseSound('pickSound')
    };
  }, []);

  useEffect(() => {
    const onProgressUpdated = (e: { data: ProgressDTO[] }) => {
      setProgress([...e.data]);
    }
    const onRoomUpdated = (e: { data: RoomDTO }) => {
      const data = e.data;
      setStatus(status => {
        // if executing || finished -> waiting, keep screen in finish screen;
        if ((status === 2 || status === 3) && data.status === 'waiting') return 3;

        if (data.status === 'waiting') return 0;
        else if (data.status === 'playing') return 1;
        else if (data.status === 'executing') {
          pauseSound('music');
          return 2;
        }
        else return status;
      });
      setRoomInfo(data);
      setAvailableChampions(data.avaliableChampions);
    };
    const onTime = (e: { time: number }) => {
      setRemainingTime(e.time);
      if (e.time <= 10) {
        playSound('/sounds/sfx-cs-timer-tick-small.ogg', 'sound');
      }
    }
    const onDisconnect = (e: { reason: string }) => {
      notify?.open({
        content: "连接断开：" + e.reason,
      });
      router.back();
    }

    const onManualOperation = (e: { data: NeedManualOperationOpts }) => {
      setManualOperation(e.data);
    }

    socket?.addEventListener("progressUpdated", onProgressUpdated);
    socket?.addEventListener("roomUpdated", onRoomUpdated);
    socket?.addEventListener("time", onTime);
    socket?.addEventListener("disconnect", onDisconnect);
    socket?.addEventListener("needManualOperation", onManualOperation)

    return () => {
      socket?.removeEventListener("progressUpdated", onProgressUpdated);
      socket?.removeEventListener("roomUpdated", onRoomUpdated);
      socket?.removeEventListener("time", onTime);
      socket?.removeEventListener("disconnect", onDisconnect);
      socket?.removeEventListener("needManualOperation", onManualOperation);
    };

  }, [socket]);

  const onReplay = () => {
    router.back();
  };

  if (!roomInfo) {
    return <FailPage reason='无房间信息' buttonTitle='返回' onButtonClick={() => {
      router.back();
    }} />;
  }

  let manualOperationModal = null;
  const onManualOk = () => {
    socket?.sendManualOperationResult(true);
    setManualOperation(undefined);
  };
  const onManualCancel = () => {
    socket?.sendManualOperationResult(false);
    setManualOperation(undefined);
  };

  const modalGenericProps = {
    onOk: onManualOk,
    onCancel: onManualCancel,
  };

  if (manualOperation?.type === 'createRoom') {
    manualOperationModal = <LeagueModal width={600} zIndex={102} open={manualOperation?.type === 'createRoom'} canClose={false}>
      <CreateRoomManualOperation roomName={manualOperation.roomName} password={manualOperation.password} team={manualOperation.team} {...modalGenericProps} />
    </LeagueModal>;
  } else if (manualOperation?.type === 'joinRoom') {
    manualOperationModal = <LeagueModal width={600} zIndex={102} open canClose={false}>
      <JoinRoomManualOperation roomName={manualOperation.roomName} password={manualOperation.password} team={manualOperation.team} {...modalGenericProps} />
    </LeagueModal>
  } else if (manualOperation?.type === 'startGame') {
    manualOperationModal = <LeagueModal width={400} zIndex={102} open canClose={false}>
      <StartGameManualOperation {...modalGenericProps} />
    </LeagueModal>
  } else if (manualOperation?.type === 'pick') {
    manualOperationModal = <LeagueModal width={400} zIndex={102} open canClose={false}>
      <PickChampionManualOperation champion={manualOperation.champion} {...modalGenericProps} />
    </LeagueModal>
  }



  return <div className='h-screen w-screen'>
    <ChampionPick
      totalTime={roomInfo.totalTime}
      seats={status !== 3 ? roomInfo.users : socket?.keepInScreenRoomInfo?.users}
      remainingTime={remaingTime}
      finished={status !== 1}
      availableChampions={availableChampions} diceNumber={diceNumber} onRandom={async () => {
        socket?.randomChampion();
      }} onChange={async (championID) => {
        socket?.pickChampion(championID);
      }} onEnd={async () => {
        socket?.endGame();
      }}
    />
    {status !== 1 && <LeagueModal open canClose={false}>
      <GameExecutor finished={roomInfo.status === "waiting"} progress={progress} seats={socket?.keepInScreenRoomInfo?.users || roomInfo.users}
        onReplay={onReplay}
        onEnd={() => {
          socket?.endGame();
        }} />
    </LeagueModal>}

    {manualOperationModal}
  </div>
}


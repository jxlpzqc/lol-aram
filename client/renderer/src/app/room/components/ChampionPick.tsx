import styles from './ChampionPick.module.css'
import champions from '../../../../public/assets/champions.json'
import sessionService from '../../../services/session';
import { UserDTO } from '../../../../../../types/contract';

type PlayerCardProps = {
  isRight?: boolean;
  gameID?: string;
  name?: string;
  championID?: number;
};

type Champion = {
  id: number;
  name: string;
  alias: string;
  portraitURL: string;
  skinURL: string;
  pickSoundURL: string;
}

const championList: Champion[] = champions as Champion[];

function PlayerCard(props: PlayerCardProps) {
  const portraitURL = !props.championID ? "" : championList[props.championID].portraitURL;
  const skinURL = !props.championID ? "" : championList[props.championID].skinURL;
  const championName = !props.championID ? "" : championList[props.championID].name;
  const gameID = !props.gameID ? "N/A" : props.gameID;
  const userName = !props.name ? "N/A" : props.name;

  const style = {
    background: `no-repeat ${props.isRight ? '30%' : '70%'} 20% / auto 400% url('${skinURL}')`
  };

  return <div style={style}
    className={`${props.isRight ? styles['player-card-right'] : styles['player-card']} flex px-8 py-4 items-center border-b  border-slate-800 ${props.isRight ? "flex-row-reverse" : ""} `} >
    <div className={styles['player-portraits'] + " h-16 w-16 p-1"}>
      <img className='rounded-full' src={portraitURL} />
    </div>
    <div className='px-4'>
      {championName && <div className='text-lg font-bold'>{championName}</div>}
      <div>{gameID} ({userName})</div>
    </div>
  </div>
}

type ChampionPickProps = {
  seats?: (UserDTO | null)[];
  availableChampions?: number[];
  finished?: boolean;
  remainingTime?: number;
  totalTime?: number;
  diceNumber?: number;
  onChange?: (championID: number) => void;
  onRandom?: () => void;
};

export default function ({ seats, remainingTime, totalTime, finished, diceNumber, availableChampions, onChange, onRandom }: ChampionPickProps) {

  const self = seats?.find(x => x?.id === sessionService.sessionID);
  const selfChampionID = self?.gameData?.champion;
  const selfSkinURL = selfChampionID ? championList[selfChampionID].skinURL : "";

  const containerStyles = {
    background: `no-repeat center / 80% url('/images/ban-ring-component.svg'),
        no-repeat center / cover url('/images/skin-splash-darken.png'),
        no-repeat center / cover url('${selfSkinURL}')`
  }

  const percentage = (remainingTime && totalTime) ? (remainingTime / totalTime) * 100 : 0;

  return <div className="w-full h-full flex flex-col" style={containerStyles}>
    <div className='h-24 fixed top-0 w-full'>
      {!finished ? (
        <><div className='flex h-full justify-center items-center'>
          <span className='pr-8'>可用</span>
          {
            new Array(10).fill(0).map((_, i) => {
              const item = availableChampions && availableChampions.length > i ?
                <img src={championList[availableChampions[i]].portraitURL} /> : null;

              return <div onClick={() => {
                if (availableChampions && availableChampions.length > i)
                  onChange?.(availableChampions[i]);
              }} key={i} className='h-12 w-12 border-slate-700 border-2 mx-2 bg-[#eeeeee33]'>
                {item}
              </div>
            })
          }

        </div>
          <div className='flex w-[700px] mx-auto flex-col items-center text-4xl font-bold font-sans'>
            <div className='h-1' style={{ background: '#2fb3d8', width: `${percentage}%` }}></div>
            <div className='mt-2'>{remainingTime}</div>
          </div>
        </>
      ) : (
        <div className='text-4xl py-4 font-bold font-sans text-center'>请在客户端选择您的英雄开始游戏</div>
      )}
    </div>
    <div className='flex grow justify-between'>
      <div className='flex flex-col justify-center items-stretch w-[420px]'>
        {
          seats?.slice(0, 5).filter(x => !!x).map((seat, i) => (
            <PlayerCard key={i} gameID={seat.gameID} name={seat.name} championID={seat.gameData?.champion} />
          ))
        }
      </div>
      <div className='mb-[10vh] self-end'>
        {!finished && <button onClick={onRandom} className={styles['random-btn']}>
          <div className='flex justify-center gap-4 text-2xl font-bold'>
            <img src='/images/dice.png' />
            <span>{diceNumber}</span>
          </div>
        </button>}
      </div>
      <div className='flex flex-col justify-center items-stretch w-[420px]'>
        {
          seats?.slice(5, 10).filter(x => !!x).map((seat, i) => (
            <PlayerCard key={i} isRight={true} gameID={seat.gameID} name={seat.name} championID={seat.gameData?.champion} />
          ))
        }
      </div>
    </div>
  </div>
}

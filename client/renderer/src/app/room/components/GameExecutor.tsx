import { useRouter } from "next/navigation";
import { ProgressDTO, RoomDTO, UserDTO } from "@shared/contract"
import LeagueButtonGroup from "../../../components/LeagueButtonGroup";
import { useEffect, useRef } from "react";
import styles from "./GameExecutor.module.css";

type Props = {
  seats?: (UserDTO | null)[],
  progress?: ProgressDTO[]
  finished?: boolean,
  replay?: () => void
}

function ProgressItem({ progress }: { progress: ProgressDTO }) {
  let icon;
  if (progress.status === 0) {
    icon = <img src='/images/spinner.png' className='w-8 h-8 animate-spin' />
  } else if (progress.status === 1) {
    icon = <img src="/images/checkmark-gold2.svg" className="w-8 h-8" />
  } else {
    icon = <img src="/images/red-warning.png" className="w-8 h-8" />
  }


  return <div className="flex justify-start items-center py-2">
    {icon}
    <div className={`${progress.status == 0}?"font-bold":"" ml-4`}>
      {progress.message}
    </div>
  </div>
}


export default function ({
  seats, progress, finished, replay
}: Props) {

  const router = useRouter();

  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!progressRef?.current) return;
    progressRef.current.scrollTo({
      behavior: 'smooth',
      top: progressRef.current.scrollHeight - progressRef.current.clientHeight
    });
  });

  return <div className="p-8 h-full flex flex-col">

    <h1 className="text-3xl font-sans font-bold">
      <img src='/images/rift.png' className="w-10 h-10 inline-block mr-4" />
      游戏启动进程
    </h1>

    <div className={`grow overflow-auto py-8 ${styles['hide-scrollbar']}`} ref={progressRef}>
      {
        progress?.map(x => (
          <ProgressItem progress={x} />
        ))
      }
    </div>

    <div className="flex justify-center">
      {
        finished && <LeagueButtonGroup text="再来一局" onConfirm={replay}
          onCancel={() => {
            router.back();
          }} />
      }
    </div>
  </div>
}
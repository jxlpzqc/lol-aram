type Props = {
  reason: string;
  buttonTitle?: string;
  onButtonClick?: () => void;
  noPage?: boolean;
}

export default function ({ reason, buttonTitle, onButtonClick, noPage }: Props) {
  return <div className={`flex flex-col w-full ${!noPage ? "h-screen" : ""} gap-8 items-center justify-center`}>
    <img src='/images/lol_icon.png' className='w-40 h-40' />
    <div className='flex items-center justify-center'>
      <div className='text-white p-4 rounded-lg'>
        {reason}
      </div>
    </div>
    <div>
      <button className='league-btn' onClick={onButtonClick}>{buttonTitle}</button>
    </div>
  </div>
}
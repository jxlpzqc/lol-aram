type Props = {
  message: string;
  noPage?: boolean;
}


export default function (props: Props) {
  return <div className={`flex flex-col w-full ${!props.noPage ? "h-screen" : ""} gap-8 items-center justify-center`}>
    <img src='/images/lol_icon.png' className='w-40 h-40' />
    <div className='flex items-center justify-center'>
      <img src='/images/spinner.png' className='w-16 h-16 animate-spin' />
      <div className='text-white p-4 rounded-lg'>
        {props.message || "连接中..."}
      </div>
    </div>
  </div>
}


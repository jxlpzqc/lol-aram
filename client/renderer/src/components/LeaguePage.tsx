import LeagueButtonGroup from "./LeagueButtonGroup"

type Props = {
  title: string,
  showButton?: boolean,
  confirmText?: string,
  onConfirm?: () => void,
  onCancel?: () => void
}

export default function (props: React.PropsWithChildren<Props>) {
  return <div className="h-screen p-8">
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-sans font-bold">
        <img src='/images/rift.png' className="w-10 h-10 inline-block mr-4" />
        {props.title}
      </h1>
      <div className="my-8 grow overflow-y-auto *:my-2">
        {props.children}
      </div>
      {
        props.showButton && <div className="flex justify-center">
          <LeagueButtonGroup
          text={props.confirmText || "确定"}
          onConfirm={props.onConfirm}
          onCancel={props.onCancel}
        />
        </div>
      }
    </div>
  </div>

}
"use client";
import React from "react"
import LeagueButtonGroup from "./LeagueButtonGroup"
import { useRouter } from "next/navigation";

type Props = {
  title: React.ReactNode,
  titleToolButtons?: React.ReactNode,
  showButton?: boolean,
  confirmText?: string,
  showBack?: boolean,
  onConfirm?: () => void,
  onCancel?: () => void
}

const BackIcon = ({ onClick }: {
  onClick?: () => void
}) => (<svg onClick={onClick} className="inline-block w-5 h-5 mr-2 hover:brightness-150" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4390" width="200" height="200"><path d="M711.841477 976.738462l88.300308-86.171569L404.393354 513.969231 800.141785 137.371569 711.841477 51.2 227.796677 513.969231 711.841477 976.738462z" fill="#b19f71" p-id="4391"></path></svg>);

export default function (props: React.PropsWithChildren<Props>) {
  const router = useRouter();

  return <div className="h-screen p-8">
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-sans font-bold">
          {props.showBack && <BackIcon onClick={props.onCancel || (() => {
            router.back();
          })} />}

          <img src='/images/rift.png' className="w-10 h-10 inline-block mr-4" />
          {props.title}
        </h1>
        {props.titleToolButtons}
      </div>
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
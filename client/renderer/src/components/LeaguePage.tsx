"use client";
import React from "react"
import LeagueButtonGroup from "./LeagueButtonGroup"
import { useRouter } from "next/navigation";
import clsx from "clsx";

type Props = {
  title: React.ReactNode,
  titleToolButtons?: React.ReactNode,
  showButton?: boolean,
  confirmText?: string,
  showBack?: boolean,
  onConfirm?: () => void,
  onCancel?: () => void,
  inNavPage?: boolean,
}

const BackIcon = ({ onClick, inNavPage }: {
  onClick?: () => void,
  inNavPage?: boolean,
}) => (
  <button className={clsx(`bg-[url('/images/button-back-arrow.png')]
  hover:bg-[url('/images/button-back-arrow-over.png')]
  active:bg-[url('/images/button-back-arrow-down.png')]
  disabled:bg-[url('/images/button-back-arrow-disabled.png')]
  bg-no-repeat bg-center bg-contain w-10 h-10 text-transparent`, {
    "w-8 h-8": inNavPage
  })} onClick={onClick} >
  </button>
);

export default function (props: React.PropsWithChildren<Props>) {
  const router = useRouter();

  return <div className={clsx(!props.inNavPage ? "h-screen" : "h-full")}>
    <div className="flex flex-col h-full">
      <div className="flex p-8 justify-between items-center">
        <h1 className={clsx(!props.inNavPage ? "text-3xl" : "text-lg", "font-sans font-bold flex items-center")}>
          {props.showBack && <BackIcon inNavPage={props.inNavPage} onClick={props.onCancel || (() => {
            router.back();
          })} />}

          <img src='/images/rift.png' className={clsx("w-10 h-10 inline-block mr-4", { "w-8 h-8": props.inNavPage })} />
          {props.title}
        </h1>
        <div className="text-sm">
        {props.titleToolButtons}
        </div>
      </div>
      <div className="px-8 grow overflow-y-auto">
        {props.children}
      </div>
      {
        props.showButton && <div className="flex justify-center p-8">
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
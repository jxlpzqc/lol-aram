'use client';
import { useEffect, useState } from "react";
import autoUpdate from "../../services/autoupdate";
import type { UpdateInfo } from "electron-updater";

export default function () {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(-1);
  const [isStart, setIsStart] = useState(false);

  const getInfo = async () => {
    const _info = await autoUpdate.getInfo();
    setInfo(_info);
  };

  const startUpdate = async () => {
    setIsStart(true);
    await autoUpdate.startUpdate();
  }

  useEffect(() => {
    getInfo();
    const listener = (_: any, percent: number) => {
      setProgress(percent);
    }
    autoUpdate.addProgressListener(listener);
    return () => {
      autoUpdate.removeProgressListener(listener);
    };
  }, []);

  return <div className="h-screen p-8">
    <div className="flex flex-col h-full">
      <h1 className="text-3xl font-sans font-bold">
        <img src='/images/rift.png' className="w-10 h-10 inline-block mr-4" />
        软件更新
      </h1>
      <div className="my-8 mx-auto grow overflow-y-auto *:my-2">
        <div>
          <span className="font-bold">版本号：</span>
          <span>{info?.version}</span>
        </div>
        <div>
          <span className="font-bold">发布日期：</span>
          <span>{info?.releaseDate}</span>
        </div>
        <div>
          <span className="font-bold">更新日志：</span>
        </div>
        <div className="typography" dangerouslySetInnerHTML={{ __html: info?.releaseNotes?.toString() || "暂无更新日志" }}>
        </div>
      </div>

      {
        !isStart ? <div className="flex justify-center gap-4 my-8">
          <button className="league-btn" onClick={() => {
            startUpdate();
          }}>现在更新</button>
          <button className="league-btn" onClick={() => {
            if (globalThis.window) globalThis.window.location.href = "/";
          }}>下次更新</button>
        </div> : <div className="flex justify-center">
          <progress className="w-1/2" value={progress} max="100"></progress>
        </div>
      }
    </div>
  </div>
}
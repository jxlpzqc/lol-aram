'use client';
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { setVolume as soundServiceSetVolume } from "../../../../services/sound";

type Props = {
  onClose?: () => void;
}

export default function (props: Props) {

  const [soundVolume, setSoundVolume] = useState(globalThis?.localStorage?.getItem("volume") ? parseInt(globalThis?.localStorage?.getItem("soundVolume") || "50") : 50);
  const [musicVolume, setMusicVolume] = useState(globalThis?.localStorage?.getItem("musicVolume") ? parseInt(globalThis?.localStorage?.getItem("soundVolume") || "50") : 50);
  const [pickSoundVolume, setPickSoundVolume] = useState(globalThis?.localStorage?.getItem("pickSoundVolume") ? parseInt(globalThis?.localStorage?.getItem("soundVolume") || "50") : 50);

  const settingVolume = (volume: number, track: 'sound' | 'music' | 'pickSound') => {
    if (track === 'sound') setSoundVolume(volume);
    else if (track === 'music') setMusicVolume(volume);
    else setPickSoundVolume(volume);

    let opts;
    if (track === 'sound') opts = { soundVolume: volume };
    else if (track === 'music') opts = { musicVolume: volume };
    else opts = { pickSoundVolume: volume };
    soundServiceSetVolume(opts);
    globalThis?.localStorage?.setItem("volume", volume.toString());
  }

  return (
    <div className="h-full flex flex-col p-8">
      <h2 className="font-bold text-2xl">设置</h2>

      <div className="*:my-2 py-8 grow overflow-auto">
        <label className="block text-sm font-medium text-gray-100">音效音量：{~~soundVolume}</label>
        <input type="range" className="league-input-range w-full" min="0" max="100" step="1" value={soundVolume} onChange={(e) => {
          const volume = parseInt(e.target.value);
          settingVolume(volume, 'sound');
        }} />
        <label className="block text-sm font-medium text-gray-100">音乐音量：{~~musicVolume}</label>
        <input type="range" className="league-input-range w-full" min="0" max="100" step="1" value={musicVolume} onChange={(e) => {
          const volume = parseInt(e.target.value);
          settingVolume(volume, 'music');
        }} />
        <label className="block text-sm font-medium text-gray-100">英雄语音音量：{~~pickSoundVolume}</label>
        <input type="range" className="league-input-range w-full" min="0" max="100" step="1" value={pickSoundVolume} onChange={(e) => {
          const volume = parseInt(e.target.value);
          settingVolume(volume, 'pickSound');
        }} />
      </div>

      <div className="flex justify-center">
        <button className="league-btn" onClick={props.onClose}>已完成</button>
      </div>


    </div>


  );

}
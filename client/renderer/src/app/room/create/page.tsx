'use client';
import { useRouter } from "next/navigation";
import LeagueButtonGroup from "../components/LeagueButtonGroup";
import { useState } from "react";

export default function () {

    const router = useRouter();

    const gotoRoom = (newRoomName = "") => {
        router.push(`/room?newRoomName=${newRoomName}`);
    }

    const [roomName, setRoomName] = useState("新建房间");


    return (
        <div className="m-8">
            <h1 className="text-3xl font-sans font-bold">创建房间</h1>
            <div className="my-8">
                <label className="block text-sm font-medium text-gray-700">房间名</label>
                <input type="text" className="league-input" placeholder="请输入房间名" value={roomName} onChange={(e) => {
                    setRoomName(e.target.value);
                }} />
            </div>

            <LeagueButtonGroup text="创建房间" onConfirm={async () => {
                gotoRoom(roomName);
            }} />

        </div>
    );

}
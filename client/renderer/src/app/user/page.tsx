'use client';
import { useRouter } from "next/navigation";
import LeagueButtonGroup from "../room/components/LeagueButtonGroup";
import { useState } from "react";
import { v4 } from "uuid";

export default function () {

    const router = useRouter();

    const [realName, setRealName] = useState("");
    const [gameID, setGameID] = useState("");

    const regist = () => {
        if (!realName || !gameID) {
            alert("请输入真实姓名和游戏ID");
            return;
        }

        localStorage.setItem("id", v4());
        localStorage.setItem("realName", realName);
        localStorage.setItem("gameID", gameID);
        router.replace(`/`);
    }

    return (
        <div className="m-8">
            <h1 className="text-3xl font-sans font-bold">初始化</h1>
            <div className="my-8">
                <label className="block text-sm font-medium text-gray-700">真实姓名</label>
                <input type="text" className="league-input" placeholder="请输入真实姓名" value={realName} onChange={(e) => {
                    setRealName(e.target.value);
                }} />
                <label className="block text-sm font-medium text-gray-700">游戏ID</label>

                <input type="text" className="league-input" placeholder="请输入游戏ID" value={gameID} onChange={(e) => {
                    setGameID(e.target.value);
                }} />
            </div>

            <LeagueButtonGroup text="注册" onConfirm={async () => {
                regist();
            }} />

        </div>
    );

}
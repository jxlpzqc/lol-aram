import championList from '@renderer/public/assets/champions.json';
import leagueHandler from '@root/client/renderer/src/services/league';
import { useState } from 'react';
import sessionService from '@renderer/src/services/session';

type GenericProps = {
  onOk?: () => void;
  onCancel?: () => void;
}

type CreateRoomManualOperationProps = {
  roomName: string;
  password: string;
  team: 'blue' | 'red';
} & GenericProps


function Helper(props: {
  onRetry?: () => void | Promise<void>;
}) {
  const restartUI = () => {
    leagueHandler.restartUI();
  };

  const [loading, setLoading] = useState(false);

  const onRetryClick = async () => {
    setLoading(true);
    try {
      await props.onRetry?.();
    } catch (e) {
    }
    setLoading(false);
  }

  return <>
    <p className='pt-4'>如果您的客户端出现了问题，可以点击下面的按钮解决。</p>

    <div className='flex gap-4 pb-8'>
      <button className="league-btn" onClick={restartUI} >重启客户端 UI</button>
      <button className="league-btn" onClick={onRetryClick} disabled={loading}>
        {loading ? "重试中..." : "自动重试"}
      </button >
    </div>

  </>
}

export function CreateRoomManualOperation(props: CreateRoomManualOperationProps) {

  const copyText = (str: string) => {
    navigator.clipboard.writeText(str)
  }

  return <div className="h-full flex flex-col p-8 ">
    <h2 className="text-2xl font-bold">创建自定义对局失败</h2>

    <div className="grow overflow-auto py-4 *:my-2">
      <p>您在自动创建房间时遇到了错误，请手动修复该错误并继续</p>
      <p>请创建一个这样的房间：</p>
      <p className="font-bold pt-4">房间名：{props.roomName} <button className="league-btn !text-xs inline-block ml-4" onClick={() => { copyText(props.roomName) }} >复制</button></p>
      <p className="font-bold pb-4">密码：{props.password} <button className="league-btn !text-xs inline-block ml-4" onClick={() => { copyText(props.password) }} >复制</button></p>
      <p>在创建自定义对局时，请加入
        <span className={props.team === 'red' ? 'text-red-400' : 'text-blue-400'}>{props.team === 'red' ? "红色方（右侧）" : "蓝色方（左侧）"}</span>
      </p>

      <Helper onRetry={async () => {
        await leagueHandler.createNewGame(props.roomName, props.password, sessionService.sessionID!, props.team);
        props.onOk?.();
      }} />

      <p>创建完成后请点击下方按钮继续</p>
    </div>

    <div className="flex justify-center gap-4 mt-4">
      <button onClick={props.onOk} className="league-btn">我已完成</button>
      <button onClick={props.onCancel} className="league-btn">取消</button>
    </div>
  </div>
}

type JoinRoomManualOperationProps = CreateRoomManualOperationProps


export function JoinRoomManualOperation(props: JoinRoomManualOperationProps) {

  const copyText = (str: string) => {
    navigator.clipboard.writeText(str)
  }

  return <div className="h-full flex flex-col p-8 ">
    <h2 className="text-2xl font-bold">加入自定义对局失败</h2>

    <div className="grow overflow-auto py-4 *:my-2">
      <p>您在自动加入房间时遇到了错误，请手动修复该错误并继续</p>
      <p>请在客户端 PLAY -&gt; 加入自定义对局 中刷新房间列表，并加入以下房间 </p>
      <p className="font-bold pt-4">房间名：{props.roomName} <button className="league-btn !text-xs inline-block ml-4" onClick={() => { copyText(props.roomName) }} >复制</button></p>
      <p className="font-bold pb-4">密码：{props.password} <button className="league-btn !text-xs inline-block ml-4" onClick={() => { copyText(props.password) }} >复制</button></p>
      <p>进入房间后，请加入
        <span className={props.team === 'red' ? 'text-red-400' : 'text-blue-400'}>{props.team === 'red' ? "红色方（右侧）" : "蓝色方（左侧）"}</span>
      </p>

      <p className="pt-4 font-bold">或者您也可以让您的好友邀请您进入到该房间中。</p>

      <Helper onRetry={async () => {
        await leagueHandler.joinGame(props.roomName, props.password, sessionService.sessionID!, props.team);
        props.onOk?.();
      }} />

      <p>加入完成后请点击下方按钮继续</p>
    </div>

    <div className="flex justify-center gap-4 mt-4">
      <button onClick={props.onOk} className="league-btn">我已完成</button>
      <button onClick={props.onCancel} className="league-btn">取消</button>
    </div>
  </div>
}

export function StartGameManualOperation(props: GenericProps) {
  return <div className="h-full flex flex-col p-8 ">
    <h2 className="text-2xl font-bold">开始游戏失败</h2>

    <div className="grow overflow-auto py-4 *:my-2">
      <p>您在开始游戏时遇到了错误，请手动修复该错误并继续</p>
      <p>请检查您的队伍是否已经准备就绪，然后再次尝试开始游戏</p>

      <Helper onRetry={async () => {
        await leagueHandler.startGame();
        props.onOk?.();
      }} />

      <p>开始游戏完成后，请点击下面的按钮继续</p>
    </div>

    <div className="flex justify-center gap-4 mt-4">
      <button onClick={props.onOk} className="league-btn">我已完成</button>
      <button onClick={props.onCancel} className="league-btn">取消</button>
    </div>
  </div>
}

export function PickChampionManualOperation(props: GenericProps & { champion: number }) {

  const champion = championList[props.champion];

  return <div className="h-full flex flex-col p-8 ">
    <h2 className="text-2xl font-bold">选择英雄失败</h2>

    <div className="grow overflow-auto py-4 *:my-2">
      <p>您在选择英雄时遇到了错误，请手动修复该错误并继续</p>
      <p>您这一局要选的英雄是：</p>
      <img src={champion.portraitURL || ""} className="w-20 h-20" />
      <p>{champion.alias} - {champion.name}</p>

      <Helper onRetry={async () => {
        await leagueHandler.selectChampion(props.champion);
        props.onOk?.();
      }} />

      <p>选择英雄之后，请点击下面的按钮继续</p>
    </div>

    <div className="flex justify-center gap-4 mt-4">
      <button onClick={props.onOk} className="league-btn">我已完成</button>
      <button onClick={props.onCancel} className="league-btn">取消</button>
    </div>
  </div>
}
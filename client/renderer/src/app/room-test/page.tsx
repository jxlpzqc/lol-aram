"use client";
import ChampionPick from "../room/components/ChampionPick";

export default function Room() {

  return <div className="w-full h-screen">
    <ChampionPick availableChampions={[1, 2, 3, 4]}
      remainingTime={50}
      totalTime={50}
      seats={[
        {
          id: '1',
          gameID: 'TestGameID',
          name: 'TestName',
          gameData: {
            champion: 1,
            remainRandom: 2
          }
        },
        {
          id: '2',
          gameID: 'TestGameID',
          name: 'TestName',
          gameData: {
            champion: 2,
            remainRandom: 2
          }
        },
         {
          id: '3',
          gameID: 'TestGameID',
          name: 'TestName',
          gameData: {
            champion: 3,
            remainRandom: 2
          }
        }, {
          id: '4',
          gameID: 'TestGameID',
          name: 'TestName'
        }, null, null, null, null, null, null,
      ]} />
  </div>

}

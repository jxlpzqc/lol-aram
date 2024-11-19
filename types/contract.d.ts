
export type GameDataDTO = {
  champion: number;
  remainRandom: number;
};

export type RoomGameDataDTO = {
  blueTeamAvailableChampions: number[];
  redTeamAvailableChampions: number[];
  championsPool: number[];
};

export type UserDTO = {
  id: string | "<hidden>";
  name: string;
  gameID: string;
  gameData?: GameDataDTO;
};

export type RoomStatus = 'waiting' | 'playing' | 'executing' | 'finished';


export type RoomDTO = {
  id: string;
  name: string;
  status: RoomStatus;
  avaliableChampions: number[];
  users: (UserDTO | null)[];
}

export type RoomInListDTO = {
  id: string;
  name: string;
  status: RoomStatus;
  playerNumber: number;
};
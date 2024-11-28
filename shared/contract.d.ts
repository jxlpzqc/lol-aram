
export type GameDataDTO = {
  champion: number;
  remainRandom: number;
};

export type UserDTO = {
  id: string | "<hidden>";
  name: string;
  gameID: string;
  gameData?: GameDataDTO;
  ownedChampions?: number[];
};

export type RoomStatus = 'waiting' | 'playing' | 'executing';


export type RoomDTO = {
  id: string;
  name: string;
  status: RoomStatus;
  avaliableChampions: number[];
  users: (UserDTO | null)[];
  totalTime: number;
}

export type RoomInListDTO = {
  id: string;
  name: string;
  status: RoomStatus;
  playerNumber: number;
};

export type CreateRoomRequest = {
  team: 'blue' | 'red';
}

export type JoinRoomRequest = {
  roomName: string;
  password: string;
  team?: 'blue' | 'red';
}

export type ProgressDTO = {
  id: number;
  message: string;
  status: 0 | 1 | 2;
}
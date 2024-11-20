import { v4 as uuidv4 } from 'uuid';
import { Socket } from 'socket.io';

import type { GameDataDTO, RoomDTO, RoomStatus, UserDTO } from '../../types/contract';

export type RoomGameData = {
  blueTeamAvailableChampions: number[];
  redTeamAvailableChampions: number[];
  usedChampions: number[];
};

export type GameData = GameDataDTO;
export type UserInfo = UserDTO & {
  ownedChampions: number[]
};

export type UserAndSocket = {
  user: UserInfo;
  socket: Socket;
};

export type RoomInfo = {
  id: string;
  name: string;
  waitingTime: number;
  status: RoomStatus;
  users: (UserAndSocket | null)[];
  roomGameDatas?: RoomGameData;
};

const rooms: RoomInfo[] = [];

function generateID(): string {
  return uuidv4();
}

const MAX_SEATS = 10;
const CHAMPIONS = 169;
const MAX_RANDOM = 2;

function createRoom(opts: RoomCreateOptions, user: UserInfo, socket: Socket): RoomInfo {
  const room: RoomInfo = {
    id: generateID(),
    name: opts.name,
    waitingTime: opts.waitingTime,
    status: 'waiting',
    users: new Array(MAX_SEATS).fill(null),
  };
  rooms.push(room);
  return room;
}

export function changeSeat(room: RoomInfo, userid: string, seat: number) {
  // old seat number
  const oldSeat = room.users.findIndex((u) => u?.user.id === userid);
  const userAndSocket = room.users[oldSeat];

  if (oldSeat === -1 || oldSeat === seat) {
    throw new Error('User not in room or already in seat');
  }

  // if seat is already taken, swap
  if (room.users[seat] !== null) {
    room.users[oldSeat] = room.users[seat];
    room.users[seat] = userAndSocket;
  } else {
    room.users[seat] = userAndSocket;
    room.users[oldSeat] = null;
  }
}

function getFirstEmptySeat(room: RoomInfo): number {
  const idx = room.users.findIndex((u) => u === null);
  if (idx === -1) {
    throw new Error('No empty seats');
  }
  return idx;
}

export function getRooms(): RoomInfo[] {
  return rooms;
}

export function getRoom(id: string): RoomInfo | undefined {
  return rooms.find((room) => room.id === id);
}

export type RoomCreateOptions = {
  name: string;
  waitingTime: number;
};

export function joinRoom(
  roomID: string,
  user: UserInfo,
  socket: Socket,
  roomCreateOptions?: RoomCreateOptions,
): string {
  let room = getRoom(roomID);
  if (room) {
    if (room.users.find((u) => u?.user.id === user.id)) {
      throw new Error('User already in room');
    }
  } else {
    room = createRoom(roomCreateOptions, user, socket);
  }

  if (room.status !== 'waiting') {
    throw new Error('Cannot join room when game is in progress');
  }

  if (room.users.every((u) => u !== null)) {
    throw new Error('Room is full');
  }

  room.users[getFirstEmptySeat(room)] = { user, socket };
  return room.id;
}

export function quitRoom(roomID: string, userid: string) {
  const room = getRoom(roomID);
  if (room) {
    if (room.status !== 'waiting') {
      throw new Error('Cannot quit room when game is in progress');
    }

    room.users[room.users.findIndex((u) => u?.user.id === userid)] = null;
  } else {
    throw new Error('Room not found');
  }

  if (room.users.every((u) => u === null)) {
    rooms.splice(
      rooms.findIndex((r) => r.id === roomID),
      1,
    );
  }
}

function rollChampion(user: UserAndSocket, usedChampions: number[]) {
  const rollSet = user.user
    .ownedChampions.filter(x => !usedChampions.includes(x));

  const randomIdx = Math.floor(Math.random() * rollSet.length);
  const champion = rollSet[randomIdx];
  return champion;
}

export function playGame(roomID: string) {
  const room = getRoom(roomID);
  if (!room) {
    throw new Error('Room not found');
  }
  room.status = 'playing';
  room.roomGameDatas = {
    blueTeamAvailableChampions: [],
    redTeamAvailableChampions: [],
    usedChampions: []
  };
  for (let i = 0; i < MAX_SEATS; i++) {
    if (room.users[i]) {
      room.users[i].user.gameData = {
        champion: rollChampion(room.users[i], room.roomGameDatas.usedChampions),
        remainRandom: MAX_RANDOM,
      };
      room.roomGameDatas.usedChampions.push(room.users[i].user.gameData.champion);
    }
  }
}

export function randomChampion(roomID: string, userid: string) {
  const room = getRoom(roomID);
  if (!room) {
    throw new Error('Room not found');
  }
  if (room.status != 'playing') throw new Error('Game not started');

  const seatId = room?.users.findIndex((u) => u?.user.id === userid);
  if (seatId === -1) {
    throw new Error('User not in room');
  }

  const user = room?.users[seatId].user;
  if (user.gameData.remainRandom == 0) throw new Error('No more randoms');

  // new champion
  const newChampionIdx =
    MAX_SEATS +
    room.roomGameDatas.blueTeamAvailableChampions.length +
    room.roomGameDatas.redTeamAvailableChampions.length;
  const newChampion = rollChampion(room.users[seatId], room.roomGameDatas.usedChampions);
  room.roomGameDatas.usedChampions.push(newChampion);

  const oldChampion = user.gameData.champion;

  if (seatId < MAX_SEATS / 2) {
    room.roomGameDatas.blueTeamAvailableChampions.push(oldChampion);
  } else {
    room.roomGameDatas.redTeamAvailableChampions.push(oldChampion);
  }
  user.gameData.champion = newChampion;
  user.gameData.remainRandom--;
}

export function exitGame(roomID: string) {
  const room = getRoom(roomID);
  if (!room) {
    throw new Error('Room not found');
  }
  if (room.status !== 'playing')
    throw new Error("Only game in playing mode can be exited");
  room.status = 'waiting';
  room.roomGameDatas = undefined;
  room.users.forEach((u) => {
    if (u) {
      u.user.gameData = undefined;
    }
  });
}

export function pickChampion(roomID: string, userid: string, champion: number) {
  if (champion < 0 || champion >= CHAMPIONS) {
    throw new Error('Invalid champion');
  }
  const room = getRoom(roomID);
  if (!room) {
    throw new Error('Room not found');
  }
  if (room.status != 'playing') throw new Error('Game not started');

  const seatId = room?.users.findIndex((u) => u?.user.id === userid);
  if (seatId === -1) {
    throw new Error('User not in room');
  }

  const avaliableChampions = seatId < MAX_SEATS / 2 ?
    room.roomGameDatas?.blueTeamAvailableChampions : room.roomGameDatas?.redTeamAvailableChampions;

  if (avaliableChampions?.findIndex((c) => c === champion) === -1) {
    throw new Error('Champion not available');
  }

  avaliableChampions.splice(avaliableChampions.findIndex((c) => c === champion), 1);
  avaliableChampions.push(room.users[seatId].user.gameData.champion);

  room.users[seatId].user.gameData.champion = champion;
}

export function roomToClient(room: RoomInfo, userid: string): RoomDTO {

  const currentUserGroup = room.users.findIndex((u) => u?.user.id === userid) / (MAX_SEATS / 2);

  return {
    id: room.id,
    name: room.name,
    status: room.status,
    totalTime: room.waitingTime,
    avaliableChampions: currentUserGroup === 0 ?
      room.roomGameDatas?.blueTeamAvailableChampions : room.roomGameDatas?.redTeamAvailableChampions,
    users: room.users.map((x, i) =>
      x === null
        ? null
        : {
          ...x.user,
          id: x.user.id === userid ? x.user.id : "<hidden>",
          gameData: (room.status === 'waiting' ||
            (i / (MAX_SEATS / 2)) === currentUserGroup) ?
            x.user.gameData : undefined,
        },
    )
  }
}

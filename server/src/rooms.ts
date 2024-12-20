import { v4 as uuidv4 } from 'uuid';
import { Socket } from 'socket.io';

import type { GameDataDTO, RoomDTO, RoomStatus, UserDTO } from '@shared/contract';

export type RoomGameData = {
  blueTeamAvailableChampions: number[];
  redTeamAvailableChampions: number[];
  usedChampions: number[];
};

export type GameData = GameDataDTO;
export type UserInfo = UserDTO & {
  autoArrangeRankScore?: number
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
  needStop?: boolean;
};

const isHideRankScore = process.env.HIDE_RANKSCORE === "1" || false

const rooms: RoomInfo[] = [];

function generateID(): string {
  return uuidv4();
}

const MAX_SEATS = 10;
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

export function getRoomByUser(userid: string): RoomInfo | undefined {
  // TODO: optimize it
  return rooms.find((room) => room.users.find((u) => u?.user.id === userid));
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
    if (!roomCreateOptions.name)
      throw new Error('Name must be provided when creating a new room');
    if (roomCreateOptions.waitingTime < 5 || roomCreateOptions.waitingTime > 300)
      throw new Error('Waiting time must be between 5 and 300 seconds');

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
    if (room.users.findIndex((u) => u?.user.id === userid) === -1) {
      throw new Error('User not in room');
    }

    if (room.status !== 'waiting') {
      // throw new Error('Cannot quit room when game is in progress');
      room.needStop = true;
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
  const newChampion = rollChampion(room.users[seatId], room.roomGameDatas.usedChampions);
  if (newChampion === undefined)
    throw new Error('Could not roll champion');

  room.roomGameDatas.usedChampions.push(newChampion);

  const oldChampion = user.gameData.champion;

  if (getSeatIndexGroup(seatId) === 0) {
    room.roomGameDatas.blueTeamAvailableChampions.push(oldChampion);
  } else {
    room.roomGameDatas.redTeamAvailableChampions.push(oldChampion);
  }
  user.gameData.champion = newChampion;
  user.gameData.remainRandom--;
}

export function pickChampion(roomID: string, userid: string, champion: number) {
  if (champion == 0) {
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

  const avaliableChampions = getSeatIndexGroup(seatId) === 0 ?
    room.roomGameDatas?.blueTeamAvailableChampions : room.roomGameDatas?.redTeamAvailableChampions;

  if (avaliableChampions?.findIndex((c) => c === champion) === -1) {
    throw new Error('Champion not available');
  }

  if (room.users[seatId].user.ownedChampions.findIndex((c) => c === champion) === -1) {
    throw new Error('User does not own this champion');
  }

  avaliableChampions.splice(avaliableChampions.findIndex((c) => c === champion), 1);
  avaliableChampions.push(room.users[seatId].user.gameData.champion);

  room.users[seatId].user.gameData.champion = champion;
}

export function getUserGroup(room: RoomInfo, userid: string): number {
  return room.users.findIndex((u) => u?.user.id === userid) < (MAX_SEATS / 2) ? 0 : 1;
}

export function getSeatIndexGroup(idx: number): number {
  return idx < (MAX_SEATS / 2) ? 0 : 1;
}

export function autoArrangeRoom(room: RoomInfo) {
  if (room.status !== 'waiting') {
    throw new Error("Auto arrange must be executed in a waiting room.")
  }

  // divide not null seats into two groups, make the difference of rank score as small as possible
  const users = room.users.filter((u) => u !== null);

  const nextCombination = (arr: number[], n: number, m: number) => {
    let i = m - 1;
    while (i >= 0 && arr[i] === n - m + i) {
      i--;
    }
    if (i < 0) return false;
    arr[i]++;
    for (let j = i + 1; j < m; j++) {
      arr[j] = arr[j - 1] + 1;
    }
    return true;
  }

  const combination = new Array(Math.floor(users.length / 2)).fill(0).map((_, i) => i);
  let result: number[];
  let notBestResults: number[][];

  const getDifference = () => {
    const blueTeam = combination.reduce((x, c) => (x + (users[c].user.autoArrangeRankScore || 0)), 0);
    const redTeam = users.reduce((x, c, i) => (combination.includes(i) ? x : x + (c.user.autoArrangeRankScore || 0)), 0);
    return Math.abs(blueTeam - redTeam);
  }

  const NOTBEST_THRESHOLD = 300;

  let minDifference = getDifference();
  result = [...combination];

  while (nextCombination(combination, users.length, Math.floor(users.length / 2))) {
    const combinationCopy = [...combination];
    if (getDifference() < minDifference) {
      minDifference = getDifference();
      result = combinationCopy;
    }
    if (getDifference() < NOTBEST_THRESHOLD) {
      notBestResults.push(combinationCopy);
    }
  }

  const results = Array.from(new Set([result, ...notBestResults]))

  // get random from results
  result = results[Math.floor(Math.random() * results.length)];

  // redTeam result
  const blueTeamIdxResult = result;
  const redTeamIdxResult = new Array(users.length).fill(0).map((_, i) => i).filter((x) => !blueTeamIdxResult.includes(x));

  const teamsIdx = [blueTeamIdxResult, redTeamIdxResult];

  // rearrage
  for (let team = 0; team < 2; team++) {
    const teamIdxResult = teamsIdx[team];
    for (let i = 0; i < MAX_SEATS / 2; i++) {
      if (i < teamIdxResult.length) room.users[team * 5 + i] = users[teamIdxResult[i]];
      else room.users[team * 5 + i] = null;
    }
  }
}

export function roomToClient(room: RoomInfo, userid: string): RoomDTO {

  const currentUserGroup = getUserGroup(room, userid);

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
          ownedChampions: x.user.id === userid ? x.user.ownedChampions : undefined,
          id: x.user.id === userid ? x.user.id : "<hidden>",
          gameData: (room.status !== 'playing' ||
            getSeatIndexGroup(i) === currentUserGroup) ?
            x.user.gameData : undefined,
          rankScore: isHideRankScore ? 0 : x.user.rankScore
        },
    )
  }
}

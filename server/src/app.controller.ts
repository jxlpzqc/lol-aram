import { Controller, Get } from '@nestjs/common';
import * as rooms from './rooms';

type RoomDTO = {
  id: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  playerNumber: number;
};

@Controller()
export class AppController {
  @Get('rooms')
  getRooms(): RoomDTO[] {
    return rooms.getRooms().map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      playerNumber: room.users.filter((u) => u !== null).length,
    }));
  }
}

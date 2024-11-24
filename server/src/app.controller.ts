import { Controller, Get } from '@nestjs/common';
import * as rooms from './rooms';
import { RoomInListDTO } from '@shared/contract';

@Controller()
export class AppController {
  @Get('rooms')
  getRooms(): RoomInListDTO[] {
    return rooms.getRooms().map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      playerNumber: room.users.filter((u) => u !== null).length,
    }));
  }
}

import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway';

@Module({
  providers: [RoomGateway],
})
export class RoomModule {}

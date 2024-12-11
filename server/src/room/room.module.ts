import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [RoomGateway, PrismaService],
})
export class RoomModule {}

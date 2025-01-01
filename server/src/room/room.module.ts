import { Module } from '@nestjs/common';
import { RoomGateway } from './room.gateway';
import { PrismaService } from '../prisma.service';
import { RankScoreService } from '../rankscore.service';

@Module({
  providers: [RoomGateway, PrismaService, RankScoreService],
})
export class RoomModule { }

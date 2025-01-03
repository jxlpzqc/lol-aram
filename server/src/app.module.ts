import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RoomModule } from './room/room.module';
import { PrismaService } from './prisma.service';
import { RankScoreService } from './rankscore.service';

@Module({
  imports: [RoomModule],
  controllers: [AppController],
  providers: [PrismaService, RankScoreService],
})
export class AppModule { }

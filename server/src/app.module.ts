import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RoomModule } from './room/room.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [RoomModule],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule { }

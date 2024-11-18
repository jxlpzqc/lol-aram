import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RoomModule } from './room/room.module';

@Module({
  imports: [RoomModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

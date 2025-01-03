import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { RoomModule } from './room/room.module';
import { PrismaService } from './prisma.service';
import { RankScoreService } from './rankscore.service';
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  nestWinstonModuleUtilities.format.nestLike("PRIDE"),
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

const devLoggerOpts: winston.LoggerOptions = {
  level: 'debug',
  transports: [new winston.transports.Console({ format: consoleFormat })],
};

const prodLoggerOpts: winston.LoggerOptions = {
  level: 'info',
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.DailyRotateFile({ filename: 'app-%DATE%.log', dirname: process.env.LOG_OUTPUT_DIR || 'logs', format: fileFormat }),
  ],
};

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [RoomModule, WinstonModule.forRoot({
    transports: isProd ? prodLoggerOpts.transports : devLoggerOpts.transports,
  })],
  controllers: [AppController],
  providers: [PrismaService, RankScoreService],
})
export class AppModule { }

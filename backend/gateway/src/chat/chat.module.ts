import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { Message } from '../entities/message.entity';
import { Interview } from '../entities/interview.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Interview]),
    HttpModule,
    ConfigModule,
  ],
  providers: [ChatGateway],
})
export class ChatModule {}

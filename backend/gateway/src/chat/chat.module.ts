import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { Message } from '../entities/message.entity';
import { Interview } from '../entities/interview.entity';
import { InterviewsModule } from '../interviews/interviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Interview]),
    HttpModule,
    ConfigModule,
    InterviewsModule,
  ],
  providers: [ChatGateway],
})
export class ChatModule {}

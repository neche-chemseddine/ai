import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { Interview } from '../entities/interview.entity';
import { Tenant } from '../entities/tenant.entity';

@Module({
  imports: [
    HttpModule, 
    ConfigModule,
    TypeOrmModule.forFeature([Interview, Tenant])
  ],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}

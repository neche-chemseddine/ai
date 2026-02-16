import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Message } from '../entities/message.entity';
import { Interview } from '../entities/interview.entity';
import { InterviewsService } from '../interviews/interviews.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly MAX_QUESTIONS = 3; // Configurable limit

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly interviewsService: InterviewsService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('start_interview')
  async handleStart(
    @MessageBody() data: { interviewId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const interview = await this.interviewRepository.findOne({ 
      where: { id: data.interviewId },
      relations: ['messages'] 
    });

    if (!interview) return;

    // If it's a new interview (no messages yet), trigger the AI opener
    if (interview.messages.length === 0 && interview.status !== 'completed') {
      interview.status = 'active';
      await this.interviewRepository.save(interview);

      client.emit('interviewer_typing', { typing: true });

      const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8001');
      const cv_session_id = (interview.rubric as any)?.cv_session_id;

      try {
        const response = await firstValueFrom(
          this.httpService.post(`${aiServiceUrl}/v1/chat/generate`, {
            cv_session_id: cv_session_id,
            message: "INIT_INTERVIEW",
            is_init: true,
            history: []
          })
        );

        const aiText = response.data.response;
        
        const aiMsg = this.messageRepository.create({
          interview: { id: data.interviewId },
          role: 'assistant',
          content: aiText,
        });
        await this.messageRepository.save(aiMsg);

        client.emit('interviewer_message', {
          interviewId: data.interviewId,
          text: aiText,
          role: 'assistant',
        });
      } catch (error) {
        console.error('Error in handleJoin AI call:', error.message);
      } finally {
        client.emit('interviewer_typing', { typing: false });
      }
    }
  }

  @SubscribeMessage('candidate_message')
  async handleMessage(
    @MessageBody() data: { interviewId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`[ChatGateway] Received candidate_message for interview ${data.interviewId}`);
    const interview = await this.interviewRepository.findOne({ 
      where: { id: data.interviewId },
      relations: ['messages'] 
    });
    
    if (!interview || interview.status === 'completed') {
      console.error(`[ChatGateway] Interview not found or already completed: ${data.interviewId}`);
      return;
    }

    // 1. Save candidate message to DB
    try {
      const userMsg = this.messageRepository.create({
        interview: { id: data.interviewId },
        role: 'user',
        content: data.text,
      });
      const saved = await this.messageRepository.save(userMsg);
      console.log(`[ChatGateway] Candidate message saved with ID: ${saved.id}`);
    } catch (err) {
      console.error(`[ChatGateway] Failed to save candidate message: ${err.message}`);
    }
    
    // Increment question count and reload interview with full message history
    await this.interviewRepository.update(data.interviewId, { 
      question_count: interview.question_count + 1 
    });

    const updatedInterview = await this.interviewRepository.findOne({
      where: { id: data.interviewId },
      relations: ['messages'],
      order: { messages: { id: 'ASC' } }
    });

    if (!updatedInterview) return;

    // 2. Emit typing indicator
    client.emit('interviewer_typing', { typing: true });

    // 3. Call AI Service for real generation
    const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8001');
    const cv_session_id = (updatedInterview.rubric as any)?.cv_session_id;

    try {
      // If we reached the limit, we tell the AI to conclude
      const isLastQuestion = updatedInterview.question_count >= this.MAX_QUESTIONS;
      
      const response = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/v1/chat/generate`, {
          cv_session_id: cv_session_id,
          message: isLastQuestion 
            ? `${data.text} (Note: This is the last response. Conclude the interview and say goodbye.)` 
            : data.text,
          history: updatedInterview.messages.map(m => ({ role: m.role, content: m.content }))
        })
      );

      const aiText = response.data.response;
      
      const aiMsg = this.messageRepository.create({
        interview: { id: data.interviewId },
        role: 'assistant',
        content: aiText,
      });
      await this.messageRepository.save(aiMsg);

      client.emit('interviewer_message', {
        interviewId: data.interviewId,
        text: aiText,
        role: 'assistant',
      });

      // 4. Handle session closure
      if (isLastQuestion) {
        client.emit('session_completed', { 
          message: "Interview completed. Generating your technical report..." 
        });
        
        // Trigger report generation in background
        await this.interviewsService.evaluateInterview(interview.id, interview.tenant_id);
        
        client.emit('report_ready', { 
          message: "Your evaluation is complete. Thank you!" 
        });
      }

    } catch (error) {
      console.error('Error calling AI Service:', error.message);
      client.emit('interviewer_message', {
        interviewId: data.interviewId,
        text: "I'm sorry, I'm having trouble processing your message right now.",
        role: 'assistant',
      });
    } finally {
      client.emit('interviewer_typing', { typing: false });
    }
  }
}

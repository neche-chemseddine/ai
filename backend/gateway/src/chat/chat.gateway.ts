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
import { Message } from '../entities/message.entity';
import { Interview } from '../entities/interview.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('candidate_message')
  async handleMessage(
    @MessageBody() data: { interviewId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const interview = await this.interviewRepository.findOne({ where: { id: data.interviewId } });
    if (!interview) {
      console.error(`Interview not found: ${data.interviewId}`);
      return;
    }

    // 1. Save candidate message to DB
    const userMsg = this.messageRepository.create({
      interview,
      role: 'user',
      content: data.text,
    });
    await this.messageRepository.save(userMsg);
    
    // 2. Emit typing indicator
    client.emit('interviewer_typing', { typing: true });

    // 3. Mock AI Service call (to be refined)
    setTimeout(async () => {
      const aiText = `AI response to: ${data.text}`;
      
      const aiMsg = this.messageRepository.create({
        interview,
        role: 'assistant',
        content: aiText,
      });
      await this.messageRepository.save(aiMsg);

      client.emit('interviewer_message', {
        interviewId: data.interviewId,
        text: aiText,
        role: 'assistant',
      });
      client.emit('interviewer_typing', { typing: false });
    }, 2000);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from '../entities/message.entity';
import { Interview } from '../entities/interview.entity';
import { Socket } from 'socket.io';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let messageRepo: any;
  let interviewRepo: any;
  let httpService: any;

  const mockMessageRepo = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn().mockImplementation(async (msg) => ({ id: 'msg-uuid', ...msg })),
  };

  const mockInterviewRepo = {
    findOne: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://ai-service:8001'),
  };

  const mockSocket = {
    id: 'test-socket-id',
    emit: jest.fn(),
  } as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: getRepositoryToken(Interview), useValue: mockInterviewRepo },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    messageRepo = module.get(getRepositoryToken(Message));
    interviewRepo = module.get(getRepositoryToken(Interview));
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleMessage', () => {
    it('should save user message, call AI service, and emit response', async () => {
      const interviewId = 'int-123';
      const text = 'Hello AI';
      const mockInterview = { 
        id: interviewId, 
        messages: [],
        rubric: { cv_session_id: 'sid-123' }
      };

      interviewRepo.findOne.mockResolvedValue(mockInterview);
      httpService.post.mockReturnValue(of({ data: { response: 'AI Answer' } }));

      await gateway.handleMessage({ interviewId, text }, mockSocket);

      // 1. Check user message saved
      expect(interviewRepo.findOne).toHaveBeenCalled();
      expect(messageRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        content: text,
        role: 'user',
      }));

      // 2. Check AI service called
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/v1/chat/generate'),
        expect.objectContaining({ message: text })
      );

      // 3. Check AI response saved and emitted
      expect(messageRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        content: 'AI Answer',
        role: 'assistant',
      }));
      expect(mockSocket.emit).toHaveBeenCalledWith('interviewer_message', expect.objectContaining({
        text: 'AI Answer',
        role: 'assistant',
      }));
      expect(mockSocket.emit).toHaveBeenCalledWith('interviewer_typing', { typing: false });
    });
  });
});

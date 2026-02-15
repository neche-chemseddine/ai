import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from '../entities/message.entity';
import { Interview } from '../entities/interview.entity';
import { Socket } from 'socket.io';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InterviewsService } from '../interviews/interviews.service';
import { of } from 'rxjs';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let messageRepo: any;
  let interviewRepo: any;
  let httpService: any;
  let interviewsService: any;

  const mockMessageRepo = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn().mockImplementation(async (msg) => ({ id: 'msg-uuid', ...msg })),
  };

  const mockInterviewRepo = {
    findOne: jest.fn(),
    save: jest.fn().mockImplementation(async (int) => int),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://ai-service:8001'),
  };

  const mockInterviewsService = {
    evaluateInterview: jest.fn().mockResolvedValue({}),
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
        { provide: InterviewsService, useValue: mockInterviewsService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    messageRepo = module.get(getRepositoryToken(Message));
    interviewRepo = module.get(getRepositoryToken(Interview));
    httpService = module.get(HttpService);
    interviewsService = module.get(InterviewsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleMessage', () => {
    it('should increment question_count and call AI service', async () => {
      const interviewId = 'int-123';
      const text = 'Answer 1';
      const mockInterview = { 
        id: interviewId, 
        tenant_id: 'ten-1',
        messages: [],
        rubric: { cv_session_id: 'sid-123' },
        question_count: 0,
        status: 'active'
      };

      interviewRepo.findOne.mockResolvedValue(mockInterview);
      httpService.post.mockReturnValue(of({ data: { response: 'Next Question' } }));

      await gateway.handleMessage({ interviewId, text }, mockSocket);

      // Verify question_count incremented
      expect(mockInterview.question_count).toBe(1);
      expect(interviewRepo.save).toHaveBeenCalledWith(mockInterview);
      
      // Verify AI service call
      expect(httpService.post).toHaveBeenCalled();
      
      // Verify message emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('interviewer_message', expect.objectContaining({
        text: 'Next Question'
      }));
    });

    it('should trigger evaluation when MAX_QUESTIONS reached', async () => {
      const interviewId = 'int-123';
      const text = 'Final Answer';
      const mockInterview = { 
        id: interviewId, 
        tenant_id: 'ten-1',
        messages: [],
        rubric: { cv_session_id: 'sid-123' },
        question_count: 2, // 2 + 1 = 3 (MAX)
        status: 'active'
      };

      interviewRepo.findOne.mockResolvedValue(mockInterview);
      httpService.post.mockReturnValue(of({ data: { response: 'Goodbye' } }));

      await gateway.handleMessage({ interviewId, text }, mockSocket);

      // Verify progress tracking
      expect(mockInterview.question_count).toBe(3);
      
      // Verify session_completed emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('session_completed', expect.any(Object));
      
      // Verify auto-completion & evaluation trigger
      expect(interviewsService.evaluateInterview).toHaveBeenCalledWith(interviewId, 'ten-1');
      
      // Verify report_ready emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('report_ready', expect.any(Object));
    });

    it('should not allow messages if status is completed', async () => {
      const interviewId = 'int-123';
      const mockInterview = { 
        id: interviewId, 
        status: 'completed'
      };

      interviewRepo.findOne.mockResolvedValue(mockInterview);

      await gateway.handleMessage({ interviewId, text: 'hi' }, mockSocket);

      expect(httpService.post).not.toHaveBeenCalled();
    });
  });
});

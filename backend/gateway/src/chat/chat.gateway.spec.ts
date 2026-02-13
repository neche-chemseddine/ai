import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Message } from '../entities/message.entity';
import { Interview } from '../entities/interview.entity';
import { Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let messageRepo: any;
  let interviewRepo: any;

  const mockMessageRepo = {
    create: jest.fn().mockImplementation(dto => dto),
    save: jest.fn().mockImplementation(async (msg) => ({ id: 'msg-uuid', ...msg })),
  };

  const mockInterviewRepo = {
    findOne: jest.fn(),
  };

  const mockSocket = {
    id: 'test-socket-id',
    emit: jest.fn(),
  } as unknown as Socket;

  beforeEach(async () => {
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: getRepositoryToken(Interview), useValue: mockInterviewRepo },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    messageRepo = module.get(getRepositoryToken(Message));
    interviewRepo = module.get(getRepositoryToken(Interview));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleMessage', () => {
    it('should save user message and emit typing then response', async () => {
      const interviewId = 'int-123';
      const text = 'Hello AI';
      const mockInterview = { id: interviewId };

      interviewRepo.findOne.mockResolvedValue(mockInterview);

      await gateway.handleMessage({ interviewId, text }, mockSocket);

      // 1. Check user message saved
      expect(interviewRepo.findOne).toHaveBeenCalledWith({ where: { id: interviewId } });
      expect(messageRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        content: text,
        role: 'user',
      }));
      expect(messageRepo.save).toHaveBeenCalled();

      // 2. Check typing emitted
      expect(mockSocket.emit).toHaveBeenCalledWith('interviewer_typing', { typing: true });

      // 3. Fast-forward time for AI response
      jest.advanceTimersByTime(2000);

      // Wait for any pending promises in the setTimeout
      await Promise.resolve(); 

      // 4. Check AI response saved and emitted
      expect(messageRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        role: 'assistant',
      }));
      expect(mockSocket.emit).toHaveBeenCalledWith('interviewer_message', expect.objectContaining({
        text: expect.stringContaining('AI response to:'),
        role: 'assistant',
      }));
      expect(mockSocket.emit).toHaveBeenCalledWith('interviewer_typing', { typing: false });
    });

    it('should not proceed if interview is not found', async () => {
      interviewRepo.findOne.mockResolvedValue(null);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await gateway.handleMessage({ interviewId: 'bad-id', text: 'hi' }, mockSocket);

      expect(messageRepo.save).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

describe('InterviewsController', () => {
  let controller: InterviewsController;

  const mockInterviewsService = {
    processCv: jest.fn(),
    findAllByTenant: jest.fn(),
    generateInvite: jest.fn(),
    evaluateInterview: jest.fn(),
    getInterviewByToken: jest.fn(),
  };

  const mockHttpService = {};
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterviewsController],
      providers: [
        { provide: InterviewsService, useValue: mockInterviewsService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<InterviewsController>(InterviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { InterviewsService } from './interviews.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Interview } from '../entities/interview.entity';
import { Tenant } from '../entities/tenant.entity';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { InternalServerErrorException } from '@nestjs/common';

describe('InterviewsService', () => {
  let service: InterviewsService;
  let httpService: HttpService;
  let interviewRepository: any;

  const mockInterviewRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockTenantRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key, defaultVal) => {
        if (key === 'AI_SERVICE_URL') return 'http://ai-service:8001';
        if (key === 'FRONTEND_URL') return 'http://localhost:5173';
        return defaultVal;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Interview), useValue: mockInterviewRepository },
        { provide: getRepositoryToken(Tenant), useValue: mockTenantRepository },
      ],
    }).compile();

    service = module.get<InterviewsService>(InterviewsService);
    httpService = module.get<HttpService>(HttpService);
    interviewRepository = module.get(getRepositoryToken(Interview));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processCv', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
    } as Express.Multer.File;
    const tenantId = 'tenant-123';

    it('should successfully process a CV and generate an invite', async () => {
      const aiResponse = {
        data: {
          chunk_count: 5,
          cv_session_id: 'session-123',
        },
        status: 200,
      };

      mockHttpService.post.mockReturnValue(of(aiResponse));
      mockInterviewRepository.create.mockReturnValue({ id: 'uuid-123' });
      mockInterviewRepository.save.mockResolvedValue({
        id: 'uuid-123',
        tenant_id: tenantId,
        candidate_name: 'Candidate',
        status: 'pending',
        rubric: { chunks: 5, cv_session_id: 'session-123' },
      });
      // Mock findOne for the generateInvite call inside processCv
      mockInterviewRepository.findOne.mockResolvedValue({
        id: 'uuid-123',
        tenant_id: tenantId,
      });

      const result = await service.processCv(mockFile, tenantId);

      expect(result).toHaveProperty('inviteUrl');
      expect(result.interviewId).toBe('uuid-123');
      expect(mockHttpService.post).toHaveBeenCalled();
      expect(mockInterviewRepository.save).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if AI service fails', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('AI Service Down')));

      await expect(service.processCv(mockFile, tenantId)).rejects.toThrow(InternalServerErrorException);
    });
  });
});

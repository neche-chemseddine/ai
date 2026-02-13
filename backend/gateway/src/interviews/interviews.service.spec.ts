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
  let tenantRepository: any;

  const mockInterviewRepository = {
    create: jest.fn(),
    save: jest.fn(),
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
    get: jest.fn().mockReturnValue('http://ai-service:8001'),
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
    tenantRepository = module.get(getRepositoryToken(Tenant));
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

    it('should successfully process a CV', async () => {
      const aiResponse = {
        data: {
          chunk_count: 5,
          cv_session_id: 'session-123',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };

      mockHttpService.post.mockReturnValue(of(aiResponse));
      mockTenantRepository.findOne.mockResolvedValue({ id: 1, name: 'Default Tenant' });
      mockInterviewRepository.create.mockReturnValue({ id: 'uuid-123' });
      mockInterviewRepository.save.mockResolvedValue({
        id: 'uuid-123',
        candidate_name: 'Candidate',
        status: 'active',
        rubric: { chunks: 5, cv_session_id: 'session-123' },
      });

      const result = await service.processCv(mockFile);

      expect(result).toEqual({
        interviewId: 'uuid-123',
        chunk_count: 5,
        cv_session_id: 'session-123',
      });
      expect(mockHttpService.post).toHaveBeenCalled();
      expect(mockInterviewRepository.save).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if AI service fails', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('AI Service Down')));

      await expect(service.processCv(mockFile)).rejects.toThrow(InternalServerErrorException);
    });

    it('should create a tenant if one does not exist', async () => {
        const aiResponse = {
          data: { chunk_count: 1, cv_session_id: 'sid' },
          status: 200,
        };
        mockHttpService.post.mockReturnValue(of(aiResponse));
        mockTenantRepository.findOne.mockResolvedValue(null);
        mockTenantRepository.create.mockReturnValue({ name: 'Default Tenant' });
        mockTenantRepository.save.mockResolvedValue({ id: 1, name: 'Default Tenant' });
        mockInterviewRepository.create.mockReturnValue({});
        mockInterviewRepository.save.mockResolvedValue({ id: 'int-1' });
  
        await service.processCv(mockFile);
  
        expect(mockTenantRepository.create).toHaveBeenCalled();
        expect(mockTenantRepository.save).toHaveBeenCalled();
      });
  });
});

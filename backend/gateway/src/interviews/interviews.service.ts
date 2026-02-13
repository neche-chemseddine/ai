import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import { Interview } from '../entities/interview.entity';
import { Tenant } from '../entities/tenant.entity';

@Injectable()
export class InterviewsService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepository: Repository<Interview>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async processCv(file: Express.Multer.File) {
    const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8001');
    
    // 1. Forward to AI Service for parsing
    const formData = new FormData();
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/v1/cv/parse`, formData, {
          headers: formData.getHeaders(),
        }),
      );

      // 2. Create a mock tenant if none exists (for MVP Phase 1 simplicity)
      let tenant = await this.tenantRepository.findOne({ where: { name: 'Default Tenant' } });
      if (!tenant) {
        tenant = this.tenantRepository.create({ name: 'Default Tenant' });
        await this.tenantRepository.save(tenant);
      }

      // 3. Persist Interview to DB
      const interview = this.interviewRepository.create({
        candidate_name: 'Candidate', // Should be extracted from CV or input later
        tenant: tenant,
        status: 'active',
        rubric: { 
          chunks: response.data.chunk_count,
          cv_session_id: response.data.cv_session_id 
        },
      });
      const savedInterview = await this.interviewRepository.save(interview);

      return {
        interviewId: savedInterview.id,
        ...response.data,
      };
    } catch (error) {
      console.error('Error in processCv:', error.message);
      throw new InternalServerErrorException('Failed to process CV');
    }
  }
}

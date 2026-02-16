import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';
import * as crypto from 'crypto';
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

  async processCv(file: Express.Multer.File, tenantId: string, candidateName: string = 'Candidate') {
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

      // 2. Persist Interview to DB
      const interview = this.interviewRepository.create({
        candidate_name: candidateName,
        tenant_id: tenantId,
        status: 'pending',
        rubric: { 
          chunks: response.data.chunk_count,
          cv_session_id: response.data.cv_session_id,
          cv_summary: response.data.cv_summary
        },
      });
      const savedInterview = await this.interviewRepository.save(interview);

      // 3. Generate initial invite
      return this.generateInvite(savedInterview.id, tenantId);
    } catch (error) {
      console.error('Error in processCv:', error.message);
      throw new InternalServerErrorException('Failed to process CV');
    }
  }

  async generateInvite(interviewId: string, tenantId: string) {
    const interview = await this.interviewRepository.findOne({ 
      where: { id: interviewId, tenant_id: tenantId } 
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24h expiry

    interview.access_token = token;
    interview.expires_at = expiresAt;
    
    await this.interviewRepository.save(interview);

    const baseUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    return {
      interviewId: interview.id,
      inviteUrl: `${baseUrl}/interview/${token}`,
      expiresAt: interview.expires_at,
    };
  }

  async getInterviewByToken(token: string) {
    const interview = await this.interviewRepository.findOne({
      where: { 
        access_token: token,
        expires_at: MoreThan(new Date())
      }
    });

    if (!interview) {
      throw new NotFoundException('Interview link invalid or expired');
    }

    if (interview.status === 'completed') {
      throw new BadRequestException('Interview already completed');
    }

    return interview;
  }

  async findAllByTenant(tenantId: string) {
    return this.interviewRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' }
    });
  }

  async findOne(id: string, tenantId: string) {
    const interview = await this.interviewRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['messages'],
      order: { messages: { created_at: 'ASC' } }
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async updateStage(token: string, stage: string) {
    const interview = await this.getInterviewByToken(token);
    interview.current_stage = stage;
    if (stage === 'quiz' || stage === 'coding' || stage === 'chat') {
      interview.status = 'active';
    }
    return this.interviewRepository.save(interview);
  }

  async getOrCreateQuiz(token: string) {
    const interview = await this.getInterviewByToken(token);
    if (interview.quiz_results?.quiz) {
      return interview.quiz_results.quiz;
    }

    const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8001');
    const cv_summary = (interview.rubric as any)?.cv_summary || "Senior Software Engineer";
    
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/v1/quiz/generate`, {
          cv_session_id: interview.rubric?.cv_session_id,
          cv_summary: cv_summary,
          num_questions: 5
        })
      );

      interview.quiz_results = { ...interview.quiz_results, quiz: response.data.quiz };
      await this.interviewRepository.save(interview);
      return response.data.quiz;
    } catch (error) {
      console.error('Error in getOrCreateQuiz:', error.message);
      throw new InternalServerErrorException('Failed to generate quiz');
    }
  }

  async submitQuiz(token: string, results: any) {
    const interview = await this.getInterviewByToken(token);
    interview.quiz_results = { ...interview.quiz_results, attempts: results };
    return this.interviewRepository.save(interview);
  }

  async getOrCreateCoding(token: string) {
    const interview = await this.getInterviewByToken(token);
    if (interview.coding_results?.challenge) {
      return interview.coding_results.challenge;
    }

    const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8001');
    const cv_summary = (interview.rubric as any)?.cv_summary || "Senior Software Engineer";

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/v1/coding/generate`, {
          cv_session_id: interview.rubric?.cv_session_id,
          cv_summary: cv_summary,
          language: 'python'
        })
      );

      interview.coding_results = { ...interview.coding_results, challenge: response.data };
      await this.interviewRepository.save(interview);
      return response.data;
    } catch (error) {
      console.error('Error in getOrCreateCoding:', error.message);
      throw new InternalServerErrorException('Failed to generate coding challenge');
    }
  }

  async submitCoding(token: string, solution: string, results: any) {
    const interview = await this.getInterviewByToken(token);
    interview.coding_solution = solution;
    interview.coding_results = { ...interview.coding_results, execution_results: results };
    return this.interviewRepository.save(interview);
  }

  async evaluateInterview(interviewId: string, tenantId: string) {
    const interview = await this.interviewRepository.findOne({
      where: { id: interviewId, tenant_id: tenantId },
      relations: ['messages']
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8001');

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${aiServiceUrl}/v1/report/generate`, {
          candidate_name: interview.candidate_name,
          transcript: interview.messages.map(m => ({ role: m.role, content: m.content })),
          cv_session_id: interview.rubric?.cv_session_id,
          quiz_results: interview.quiz_results,
          coding_solution: interview.coding_solution,
          coding_results: interview.coding_results
        })
      );

      interview.rubric = {
        ...interview.rubric,
        evaluation: response.data.evaluation
      };
      interview.report_url = response.data.report_filename;
      interview.status = 'completed';

      return this.interviewRepository.save(interview);
    } catch (error) {
      console.error('Error in evaluateInterview:', error.message);
      throw new InternalServerErrorException('Failed to generate report');
    }
  }
}

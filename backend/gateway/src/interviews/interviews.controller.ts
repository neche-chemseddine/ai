import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, UseGuards, Request, Get, Param, Body, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterviewsService } from './interviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Controller('api/v1/interviews')
export class InterviewsController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCv(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
    @Body('candidateName') candidateName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are allowed');
    }
    return this.interviewsService.processCv(file, req.user.tenant_id, candidateName);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req) {
    return this.interviewsService.findAllByTenant(req.user.tenant_id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.interviewsService.findOne(id, req.user.tenant_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invite')
  async generateInvite(@Param('id') id: string, @Request() req) {
    return this.interviewsService.generateInvite(id, req.user.tenant_id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/evaluate')
  async evaluate(@Param('id') id: string, @Request() req) {
    return this.interviewsService.evaluateInterview(id, req.user.tenant_id);
  }

  @Get('session/:token')
  async getSession(@Param('token') token: string) {
    return this.interviewsService.getInterviewByToken(token);
  }

  @Post('session/:token/stage')
  async updateStage(@Param('token') token: string, @Body('stage') stage: string) {
    return this.interviewsService.updateStage(token, stage);
  }

  @Get('session/:token/quiz')
  async getQuiz(@Param('token') token: string) {
    return this.interviewsService.getOrCreateQuiz(token);
  }

  @Post('session/:token/quiz/submit')
  async submitQuiz(@Param('token') token: string, @Body('results') results: any) {
    return this.interviewsService.submitQuiz(token, results);
  }

  @Get('session/:token/coding')
  async getCoding(@Param('token') token: string) {
    return this.interviewsService.getOrCreateCoding(token);
  }

  @Post('session/:token/coding/submit')
  async submitCoding(@Param('token') token: string, @Body('solution') solution: string, @Body('results') results: any) {
    return this.interviewsService.submitCoding(token, solution, results);
  }

  @Get('reports/:filename')
  async downloadReport(@Param('filename') filename: string, @Res() res: Response) {
    const aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8001');
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${aiServiceUrl}/v1/report/download/${filename}`, {
          responseType: 'arraybuffer',
        })
      );
      res.set('Content-Type', 'application/pdf');
      res.send(response.data);
    } catch (error) {
      res.status(404).send('Report not found');
    }
  }
}

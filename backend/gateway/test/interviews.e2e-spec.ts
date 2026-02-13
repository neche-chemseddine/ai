import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { join } from 'path';
import { App } from 'supertest/types';
import * as fs from 'fs';

describe('InterviewsController (e2e)', () => {
  let app: INestApplication<App>;
  const testFilePath = join(__dirname, 'test.pdf');
  
  const mockHttpService = {
    post: jest.fn(),
  };

  beforeAll(async () => {
    // Create a dummy file for testing
    fs.writeFileSync(testFilePath, 'fake pdf content');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(mockHttpService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('/api/v1/interviews/upload (POST)', () => {
    const aiResponse = {
      data: {
        chunk_count: 3,
        cv_session_id: 'test-session-uuid',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    };

    mockHttpService.post.mockReturnValue(of(aiResponse));

    return request(app.getHttpServer())
      .post('/api/v1/interviews/upload')
      .attach('file', testFilePath)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('interviewId');
        expect(res.body.chunk_count).toBe(3);
        expect(res.body.cv_session_id).toBe('test-session-uuid');
      });
  });

  it('/api/v1/interviews/upload (POST) - No file', () => {
    return request(app.getHttpServer())
      .post('/api/v1/interviews/upload')
      .expect(400);
  });
});

/**
 * Health HTTP integration: GET /health/realtime deploy preflight.
 * Run: `npx jest health-http.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { HealthController } from './health.controller';
import { MessagingRealtimeHealthService } from '../messaging-realtime/messaging-realtime-health.service';
import {
  resetMessagingRedisAdapterBoundForTests,
  setMessagingRedisAdapterBound,
} from '../messaging-realtime/messaging-realtime-redis-state';

describe('health HTTP (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        MessagingRealtimeHealthService,
        {
          provide: AuthSessionConfigService,
          useValue: { sessionCookieName: 'dating_session' },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    resetMessagingRedisAdapterBoundForTests();
  });

  it('GET /health returns 200', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      service: 'dating-api',
    });
    expect(typeof res.body.ts).toBe('string');
  });

  it('GET /health/realtime returns messaging preflight shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/realtime')
      .expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      service: 'dating-api',
      messaging: {
        namespace: '/ws/messaging',
        socketIoPath: '/socket.io',
        redisAdapter: false,
        sessionCookieName: 'dating_session',
      },
    });
    expect(typeof res.body.ts).toBe('string');
  });

  it('GET /health/realtime reflects redisAdapter when bound', async () => {
    setMessagingRedisAdapterBound(true);

    const res = await request(app.getHttpServer())
      .get('/health/realtime')
      .expect(200);

    expect(res.body.messaging.redisAdapter).toBe(true);
  });
});

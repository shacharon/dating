/**
 * Readiness HTTP integration with real HealthService (Prisma mocked).
 * Run: `npx jest health-ready.integration.spec.ts --runInBand`
 */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MessagingRealtimeHealthService } from '../messaging-realtime/messaging-realtime-health.service';
import { MessagingWsRateLimitService } from '../messaging-realtime/messaging-ws-rate-limit.service';
import { SentryConfigService } from '../observability/sentry-config.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  resetMessagingRedisAdapterBoundForTests,
  setMessagingRedisAdapterBound,
} from '../messaging-realtime/messaging-realtime-redis-state';

const wsRateLimitStub = {
  isUsingRedisStore: jest.fn().mockReturnValue(false),
};

describe('health ready HTTP (integration)', () => {
  let app: INestApplication<App>;
  const originalNodeEnv = process.env.NODE_ENV;
  let queryRaw: jest.Mock;

  beforeAll(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        MessagingRealtimeHealthService,
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
        { provide: MessagingWsRateLimitService, useValue: wsRateLimitStub },
        {
          provide: AuthSessionConfigService,
          useValue: { sessionCookieName: 'dating_session' },
        },
        {
          provide: SentryConfigService,
          useValue: { sentryTestRouteEnabled: false },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  afterEach(() => {
    resetMessagingRedisAdapterBoundForTests();
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('GET /health/ready returns 200 when DB ok (non-production)', async () => {
    process.env.NODE_ENV = 'development';

    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(res.body.checks).toEqual({ database: 'ok', redisAdapter: 'ok' });
  });

  it('GET /health/ready returns 503 when DB ping fails', async () => {
    queryRaw.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503);

    expect(res.body.checks.database).toBe('failed');
  });

  it('GET /health/ready returns 503 in production when redis adapter unbound', async () => {
    process.env.NODE_ENV = 'production';
    resetMessagingRedisAdapterBoundForTests();

    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503);

    expect(res.body.checks).toEqual({ database: 'ok', redisAdapter: 'failed' });
  });

  it('GET /health/ready returns 200 in production when redis adapter bound', async () => {
    process.env.NODE_ENV = 'production';
    setMessagingRedisAdapterBound(true);

    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(res.body.checks).toEqual({ database: 'ok', redisAdapter: 'ok' });
  });
});

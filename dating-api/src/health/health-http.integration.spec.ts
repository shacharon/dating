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
import { HealthService } from './health.service';
import { MessagingRealtimeHealthService } from '../messaging-realtime/messaging-realtime-health.service';
import { MessagingWsRateLimitService } from '../messaging-realtime/messaging-ws-rate-limit.service';
import { SentryConfigService } from '../observability/sentry-config.service';
import {
  resetMessagingRedisAdapterBoundForTests,
  setMessagingRedisAdapterBound,
} from '../messaging-realtime/messaging-realtime-redis-state';

const wsRateLimitStub = {
  isUsingRedisStore: jest.fn().mockReturnValue(false),
};

const readinessStub = {
  getReadiness: jest.fn().mockResolvedValue({
    ok: true,
    service: 'dating-api',
    ts: new Date().toISOString(),
    checks: { database: 'ok', redisAdapter: 'ok' },
  }),
};

function buildProviders(sentryEnabled: boolean) {
  return [
    MessagingRealtimeHealthService,
    {
      provide: MessagingWsRateLimitService,
      useValue: wsRateLimitStub,
    },
    {
      provide: AuthSessionConfigService,
      useValue: { sessionCookieName: 'dating_session' },
    },
    {
      provide: SentryConfigService,
      useValue: { sentryTestRouteEnabled: sentryEnabled },
    },
    {
      provide: HealthService,
      useValue: readinessStub,
    },
  ];
}

describe('health HTTP (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: buildProviders(false),
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
        wsRateLimitRedis: false,
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

  it('GET /health/ready returns 200 when readiness is ok', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(res.body).toMatchObject({
      ok: true,
      service: 'dating-api',
      checks: { database: 'ok', redisAdapter: 'ok' },
    });
    expect(readinessStub.getReadiness).toHaveBeenCalled();
  });

  it('GET /health/ready returns 503 when readiness fails', async () => {
    readinessStub.getReadiness.mockResolvedValueOnce({
      ok: false,
      service: 'dating-api',
      ts: new Date().toISOString(),
      checks: { database: 'failed', redisAdapter: 'ok' },
    });

    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503);

    expect(res.body).toMatchObject({
      ok: false,
      service: 'dating-api',
      checks: { database: 'failed', redisAdapter: 'ok' },
    });
  });
});

describe('health HTTP — sentry-test route', () => {
  let app: INestApplication<App>;

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /health/sentry-test returns 404 when route disabled', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: buildProviders(false),
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/health/sentry-test').expect(404);
  });

  it('GET /health/sentry-test returns 500 when route enabled', async () => {
    await app?.close();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: buildProviders(true),
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).get('/health/sentry-test').expect(500);
  });
});

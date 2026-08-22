import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  MessagingRealtimeHealthService,
  type RealtimeHealthSnapshot,
} from '../messaging-realtime/messaging-realtime-health.service';
import { SentryConfigService } from '../observability/sentry-config.service';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const snapshot: RealtimeHealthSnapshot = {
    namespace: '/ws/messaging',
    socketIoPath: '/socket.io',
    redisAdapter: false,
    wsRateLimitRedis: false,
    sessionCookieName: 'dating_session',
  };

  const messagingHealthMock = {
    getSnapshot: jest.fn().mockReturnValue(snapshot),
  };

  const readinessServiceMock = {
    getReadiness: jest.fn().mockResolvedValue({
      ok: true,
      service: 'dating-api',
      ts: new Date().toISOString(),
      checks: { database: 'ok', redisAdapter: 'ok' },
    }),
  };

  const sentryConfigMock = {
    sentryTestRouteEnabled: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: MessagingRealtimeHealthService,
          useValue: messagingHealthMock,
        },
        { provide: SentryConfigService, useValue: sentryConfigMock },
        { provide: HealthService, useValue: readinessServiceMock },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('GET health returns ok payload', () => {
    const result = controller.health();

    expect(result.ok).toBe(true);
    expect(result.service).toBe('dating-api');
    expect(typeof result.ts).toBe('string');
  });

  it('GET health/realtime returns messaging snapshot', () => {
    const result = controller.realtime();

    expect(result.ok).toBe(true);
    expect(result.service).toBe('dating-api');
    expect(typeof result.ts).toBe('string');
    expect(result.messaging).toEqual(snapshot);
    expect(messagingHealthMock.getSnapshot).toHaveBeenCalledTimes(1);
  });
});

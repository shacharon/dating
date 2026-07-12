import { Test, TestingModule } from '@nestjs/testing';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import {
  MESSAGING_SOCKET_IO_PATH,
  MESSAGING_WS_NAMESPACE,
} from './messaging-realtime.constants';
import { MessagingRealtimeHealthService } from './messaging-realtime-health.service';
import {
  resetMessagingRedisAdapterBoundForTests,
  setMessagingRedisAdapterBound,
} from './messaging-realtime-redis-state';
import { MessagingWsRateLimitService } from './messaging-ws-rate-limit.service';

describe('MessagingRealtimeHealthService', () => {
  let service: MessagingRealtimeHealthService;
  let wsRateLimit: { isUsingRedisStore: jest.Mock };

  const configStub = {
    sessionCookieName: 'dating_session',
  };

  beforeEach(async () => {
    resetMessagingRedisAdapterBoundForTests();
    wsRateLimit = { isUsingRedisStore: jest.fn().mockReturnValue(false) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingRealtimeHealthService,
        {
          provide: AuthSessionConfigService,
          useValue: configStub,
        },
        {
          provide: MessagingWsRateLimitService,
          useValue: wsRateLimit,
        },
      ],
    }).compile();

    service = module.get(MessagingRealtimeHealthService);
  });

  afterEach(() => {
    resetMessagingRedisAdapterBoundForTests();
  });

  it('reports redisAdapter false when Redis adapter not bound at boot', () => {
    expect(service.getSnapshot()).toEqual({
      namespace: MESSAGING_WS_NAMESPACE,
      socketIoPath: MESSAGING_SOCKET_IO_PATH,
      redisAdapter: false,
      wsRateLimitRedis: false,
      sessionCookieName: 'dating_session',
    });
  });

  it('reports redisAdapter true when Redis adapter bound at boot', () => {
    setMessagingRedisAdapterBound(true);

    expect(service.getSnapshot().redisAdapter).toBe(true);
  });

  it('reports wsRateLimitRedis from MessagingWsRateLimitService', () => {
    wsRateLimit.isUsingRedisStore.mockReturnValue(true);

    expect(service.getSnapshot().wsRateLimitRedis).toBe(true);
  });

  it('sessionCookieName comes from AuthSessionConfigService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingRealtimeHealthService,
        {
          provide: AuthSessionConfigService,
          useValue: { sessionCookieName: 'custom_session' },
        },
        {
          provide: MessagingWsRateLimitService,
          useValue: wsRateLimit,
        },
      ],
    }).compile();

    expect(module.get(MessagingRealtimeHealthService).getSnapshot()).toMatchObject(
      { sessionCookieName: 'custom_session' },
    );
  });
});

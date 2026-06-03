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

describe('MessagingRealtimeHealthService', () => {
  let service: MessagingRealtimeHealthService;

  const configStub = {
    sessionCookieName: 'dating_session',
  };

  beforeEach(async () => {
    resetMessagingRedisAdapterBoundForTests();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingRealtimeHealthService,
        {
          provide: AuthSessionConfigService,
          useValue: configStub,
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
      sessionCookieName: 'dating_session',
    });
  });

  it('reports redisAdapter true when Redis adapter bound at boot', () => {
    setMessagingRedisAdapterBound(true);

    expect(service.getSnapshot().redisAdapter).toBe(true);
  });

  it('sessionCookieName comes from AuthSessionConfigService', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingRealtimeHealthService,
        {
          provide: AuthSessionConfigService,
          useValue: { sessionCookieName: 'custom_session' },
        },
      ],
    }).compile();

    expect(module.get(MessagingRealtimeHealthService).getSnapshot()).toMatchObject(
      { sessionCookieName: 'custom_session' },
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  MessagingRealtimeHealthService,
  type RealtimeHealthSnapshot,
} from '../messaging-realtime/messaging-realtime-health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const snapshot: RealtimeHealthSnapshot = {
    namespace: '/ws/messaging',
    socketIoPath: '/socket.io',
    redisAdapter: false,
    sessionCookieName: 'dating_session',
  };

  const healthServiceMock = {
    getSnapshot: jest.fn().mockReturnValue(snapshot),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: MessagingRealtimeHealthService,
          useValue: healthServiceMock,
        },
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
    expect(healthServiceMock.getSnapshot).toHaveBeenCalledTimes(1);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../cache/cache.ports';
import { SimpleLogger } from '../logger/simple-logger.service';
import { MessagingWsRateLimitService } from './messaging-ws-rate-limit.service';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import { WsRateLimitStoreProvider } from './messaging-ws-rate-limit-store.provider';
import { WS_RATE_LIMIT_STORE } from './messaging-ws-rate-limit.tokens';
import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
} from './messaging-ws-inbound.constants';

describe('MessagingWsRateLimitService (memory)', () => {
  let service: MessagingWsRateLimitService;

  beforeEach(async () => {
    delete process.env.REDIS_URL;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: REDIS_CLIENT,
          useValue: {
            getClient: () => null,
            isAvailable: () => false,
            isUrlConfigured: () => false,
          },
        },
        WsRateLimitStoreProvider,
        {
          provide: WS_RATE_LIMIT_STORE,
          useExisting: WsRateLimitStoreProvider,
        },
        MessagingWsRateLimitService,
        {
          provide: SimpleLogger,
          useValue: { warn: jest.fn(), log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    const store = module.get(WsRateLimitStoreProvider);
    await store.onModuleInit();
    service = module.get(MessagingWsRateLimitService);
    await service.resetForTests();
  });

  it('uses in-memory store when REDIS_URL is unset', () => {
    expect(service.isUsingRedisStore()).toBe(false);
  });

  it('allows events under the limit', async () => {
    for (let i = 0; i < WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW - 1; i++) {
      await service.consumeInboundSlot('user_a');
    }
    await expect(service.consumeInboundSlot('user_a')).resolves.toBeUndefined();
  });

  it('throws when limit exceeded in window', async () => {
    for (let i = 0; i < WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.consumeInboundSlot('user_a');
    }
    await expect(service.consumeInboundSlot('user_a')).rejects.toThrow(
      WsRateLimitExceededError,
    );
  });

  it('resets after window expires', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    for (let i = 0; i < WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.consumeInboundSlot('user_a');
    }
    await expect(service.consumeInboundSlot('user_a')).rejects.toThrow(
      WsRateLimitExceededError,
    );

    jest
      .spyOn(Date, 'now')
      .mockReturnValue(now + WS_INBOUND_RATE_LIMIT_WINDOW_MS + 1);

    await expect(service.consumeInboundSlot('user_a')).resolves.toBeUndefined();

    jest.restoreAllMocks();
  });
});

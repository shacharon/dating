import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import {
  MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
} from './conversation-message.constants';

describe('ConversationMessageRateLimitService (memory)', () => {
  let service: ConversationMessageRateLimitService;
  const obs = { trace: jest.fn(), error: jest.fn() };

  beforeEach(async () => {
    delete process.env.REDIS_URL;
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationMessageRateLimitService,
        {
          provide: SimpleLogger,
          useValue: { warn: jest.fn(), log: jest.fn(), error: jest.fn() },
        },
        {
          provide: StructuredObservabilityService,
          useValue: obs,
        },
      ],
    }).compile();

    service = module.get(ConversationMessageRateLimitService);
    await service.onModuleInit();
    await service.resetForTests();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('uses in-memory store when REDIS_URL is unset', () => {
    expect(service.isUsingRedisStore()).toBe(false);
  });

  it('allows first consumeSendSlot in a window', async () => {
    await expect(service.consumeSendSlot('user_a')).resolves.toBeUndefined();
    await expect(service.consumeSendSlot('user_a')).resolves.toBeUndefined();
  });

  it('throws HttpException 429 on 11th consumeSendSlot within the same window', async () => {
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.consumeSendSlot('user_a');
    }

    await expect(service.consumeSendSlot('user_a')).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(obs.trace).toHaveBeenCalledWith(
      'me conversations message rate limited userId=user_a',
      ErrorCodes.ME_CONVERSATIONS_MESSAGE_RATE_LIMITED,
    );
    try {
      await service.consumeSendSlot('user_a');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((e as HttpException).getResponse()).toEqual({
        message: 'Too many messages. Please wait.',
      });
    }
  });

  it('allows send again after the rate-limit window expires', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.consumeSendSlot('user_a');
    }
    await expect(service.consumeSendSlot('user_a')).rejects.toBeInstanceOf(
      HttpException,
    );

    jest
      .spyOn(Date, 'now')
      .mockReturnValue(now + MESSAGE_RATE_LIMIT_WINDOW_MS + 1);

    await expect(service.consumeSendSlot('user_a')).resolves.toBeUndefined();

    jest.restoreAllMocks();
  });

  it('resetForTests clears rate-limit state', async () => {
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.consumeSendSlot('user_a');
    }
    await expect(service.consumeSendSlot('user_a')).rejects.toBeInstanceOf(
      HttpException,
    );

    await service.resetForTests();
    await expect(service.consumeSendSlot('user_a')).resolves.toBeUndefined();
  });
});

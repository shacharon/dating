import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../../cache/cache.ports';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { SimpleLogger } from '../../logger/simple-logger.service';
import {
  STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW,
  STORY_VOICE_DRAFT_RATE_LIMIT_WINDOW_MS,
} from './story-voice-draft.constants';
import { StoryVoiceDraftRateLimitService } from './story-voice-draft-rate-limit.service';
import { StoryVoiceDraftRateLimitStoreProvider } from './story-voice-draft-rate-limit-store.provider';

describe('StoryVoiceDraftRateLimitService (memory)', () => {
  let service: StoryVoiceDraftRateLimitService;
  const obs = { trace: jest.fn(), error: jest.fn() };

  beforeEach(async () => {
    delete process.env.REDIS_URL;
    jest.clearAllMocks();
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
        StoryVoiceDraftRateLimitStoreProvider,
        StoryVoiceDraftRateLimitService,
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

    const store = module.get(StoryVoiceDraftRateLimitStoreProvider);
    await store.onModuleInit();
    service = module.get(StoryVoiceDraftRateLimitService);
    await service.resetForTests();
  });

  it('uses in-memory store when REDIS_URL is unset', () => {
    expect(service.isUsingRedisStore()).toBe(false);
  });

  it('allows up to 5 consumeDraftSlot calls in a window', async () => {
    for (let i = 0; i < STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await expect(service.consumeDraftSlot('user_a')).resolves.toBeUndefined();
    }
  });

  it('throws HttpException 429 with voice_draft_rate_limited on 6th call', async () => {
    for (let i = 0; i < STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.consumeDraftSlot('user_a');
    }

    await expect(service.consumeDraftSlot('user_a')).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(obs.trace).toHaveBeenCalledWith(
      'me profile story voice-draft rate limited userId=user_a',
      ErrorCodes.ME_PROFILE_STORY_VOICE_DRAFT_RATE_LIMITED,
    );
    try {
      await service.consumeDraftSlot('user_a');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((e as HttpException).getResponse()).toEqual({
        error: 'voice_draft_rate_limited',
        message: 'Too many voice drafts. Please try again later.',
      });
    }
  });

  it('allows draft again after the rate-limit window expires', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    for (let i = 0; i < STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.consumeDraftSlot('user_a');
    }
    await expect(service.consumeDraftSlot('user_a')).rejects.toBeInstanceOf(
      HttpException,
    );

    jest
      .spyOn(Date, 'now')
      .mockReturnValue(now + STORY_VOICE_DRAFT_RATE_LIMIT_WINDOW_MS + 1);

    await expect(service.consumeDraftSlot('user_a')).resolves.toBeUndefined();

    jest.restoreAllMocks();
  });

  it('resetForTests clears rate-limit state', async () => {
    for (let i = 0; i < STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.consumeDraftSlot('user_a');
    }
    await expect(service.consumeDraftSlot('user_a')).rejects.toBeInstanceOf(
      HttpException,
    );

    await service.resetForTests();
    await expect(service.consumeDraftSlot('user_a')).resolves.toBeUndefined();
  });
});

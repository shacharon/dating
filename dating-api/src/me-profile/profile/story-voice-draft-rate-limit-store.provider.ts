import { Injectable } from '@nestjs/common';
import { createFixedWindowRateLimitStoreProvider } from '../../cache/rate-limit';
import {
  STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW,
  STORY_VOICE_DRAFT_RATE_LIMIT_WINDOW_MS,
  httpStoryVoiceDraftRateLimitRedisKey,
} from './story-voice-draft.constants';
import { StoryVoiceDraftRateLimitExceededError } from './story-voice-draft-rate-limit.error';
import type { StoryVoiceDraftRateLimitStore } from './story-voice-draft-rate-limit-store.interface';

const StoryVoiceDraftRateLimitStoreProviderBase =
  createFixedWindowRateLimitStoreProvider({
    config: {
      maxPerWindow: STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW,
      windowMs: STORY_VOICE_DRAFT_RATE_LIMIT_WINDOW_MS,
      redisKeyForUser: httpStoryVoiceDraftRateLimitRedisKey,
      redisKeyScanPattern: 'http:voice-draft:ratelimit:*',
    },
    createExceeded: () => new StoryVoiceDraftRateLimitExceededError(),
    isExceededError: (e) => e instanceof StoryVoiceDraftRateLimitExceededError,
    redisDegradedEvent: 'http_voice_draft_rate_limit_redis_degraded',
    redisConnectFailedEvent: 'http_voice_draft_rate_limit_redis_connect_failed',
    providerName: 'StoryVoiceDraftRateLimitStoreProvider',
  });

@Injectable()
export class StoryVoiceDraftRateLimitStoreProvider
  extends StoryVoiceDraftRateLimitStoreProviderBase
  implements StoryVoiceDraftRateLimitStore
{
  consumeDraftSlot(userId: string): void | Promise<void> {
    return this.consume(userId);
  }
}

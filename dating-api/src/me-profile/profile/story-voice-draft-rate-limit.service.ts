import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { StoryVoiceDraftRateLimitExceededError } from './story-voice-draft-rate-limit.error';
import { StoryVoiceDraftRateLimitStoreProvider } from './story-voice-draft-rate-limit-store.provider';

export { StoryVoiceDraftRateLimitExceededError } from './story-voice-draft-rate-limit.error';

@Injectable()
export class StoryVoiceDraftRateLimitService {
  constructor(
    private readonly store: StoryVoiceDraftRateLimitStoreProvider,
    private readonly obs: StructuredObservabilityService,
  ) {}

  isUsingRedisStore(): boolean {
    return this.store.isUsingRedisStore();
  }

  async consumeDraftSlot(userId: string): Promise<void> {
    try {
      await this.store.consumeDraftSlot(userId);
    } catch (e) {
      if (e instanceof StoryVoiceDraftRateLimitExceededError) {
        this.obs.trace(
          `me profile story voice-draft rate limited userId=${userId}`,
          ErrorCodes.ME_PROFILE_STORY_VOICE_DRAFT_RATE_LIMITED,
        );
        throw new HttpException(
          {
            error: 'voice_draft_rate_limited',
            message: 'Too many voice drafts. Please try again later.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw e;
    }
  }

  async resetForTests(): Promise<void> {
    await this.store.resetForTests();
  }
}

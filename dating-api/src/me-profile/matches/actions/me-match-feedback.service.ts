import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../../analytics/product-analytics.events';
import { ErrorCodes } from '../../../logging/error-codes';
import { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import type {
  MatchFeedbackDto,
  MatchFeedbackStateDto,
} from './me-match-feedback.dto';
import { MeMatchesService } from '../core/me-matches.service';
import {
  MATCH_FEEDBACK_REPOSITORY,
  type IMatchFeedbackRepository,
} from '../../repositories/match-feedback.repository';

@Injectable()
export class MeMatchFeedbackService {
  constructor(
    @Inject(MATCH_FEEDBACK_REPOSITORY)
    private readonly feedback: IMatchFeedbackRepository,
    private readonly meMatches: MeMatchesService,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
  ) {}

  async getFeedback(
    actorUserId: string,
    candidateProfileId: string,
  ): Promise<MatchFeedbackStateDto> {
    const { candidateProfileId: profileId } =
      await this.meMatches.assertMatchCandidateVisible(
        actorUserId,
        candidateProfileId,
      );

    const sentiment = await this.feedback.findSentiment(actorUserId, profileId);

    return {
      sentiment:
        sentiment === 'positive'
          ? 'POSITIVE'
          : sentiment === 'negative'
            ? 'NEGATIVE'
            : null,
    };
  }

  async upsertFeedback(
    actorUserId: string,
    candidateProfileId: string,
    sentiment: 'positive' | 'negative',
  ): Promise<MatchFeedbackDto> {
    const { candidateProfileId: profileId, targetUserId } =
      await this.meMatches.assertMatchCandidateVisible(
        actorUserId,
        candidateProfileId,
      );

    if (targetUserId === actorUserId) {
      throw new BadRequestException({ error: 'cannot_feedback_self' });
    }

    const row = await this.feedback.upsertSentiment({
      userId: actorUserId,
      matchProfileId: profileId,
      sentiment,
    });

    this.obs.trace(
      `event=match_feedback_upserted userId=${actorUserId} matchProfileId=${profileId} sentiment=${row.sentiment}`,
      ErrorCodes.MATCH_FEEDBACK_UPSERTED,
    );

    this.analytics.track(actorUserId, ProductAnalyticsEvents.MATCH_FEEDBACK, {
      sentiment,
    });

    return {
      matchProfileId: row.matchProfileId,
      sentiment: row.sentiment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { MatchFeedbackSentiment } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  MatchFeedbackDto,
  MatchFeedbackStateDto,
} from './me-match-feedback.dto';
import { MeMatchesService } from './me-matches.service';

@Injectable()
export class MeMatchFeedbackService {
  constructor(
    private readonly prisma: PrismaService,
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

    const row = await this.prisma.matchFeedback.findUnique({
      where: {
        userId_matchProfileId: {
          userId: actorUserId,
          matchProfileId: profileId,
        },
      },
      select: { sentiment: true },
    });

    return { sentiment: row?.sentiment ?? null };
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

    const dbSentiment = wireSentimentToDb(sentiment);

    const row = await this.prisma.matchFeedback.upsert({
      where: {
        userId_matchProfileId: {
          userId: actorUserId,
          matchProfileId: profileId,
        },
      },
      create: {
        userId: actorUserId,
        matchProfileId: profileId,
        sentiment: dbSentiment,
      },
      update: { sentiment: dbSentiment },
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

function wireSentimentToDb(
  sentiment: 'positive' | 'negative',
): MatchFeedbackSentiment {
  return sentiment === 'positive'
    ? MatchFeedbackSentiment.POSITIVE
    : MatchFeedbackSentiment.NEGATIVE;
}

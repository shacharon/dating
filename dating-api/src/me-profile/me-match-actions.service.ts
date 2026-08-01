import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchActionType, MutualMatchStatus } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { PrismaService } from '../prisma/prisma.service';
import type { MatchActionDto, MatchActionStateDto } from './me-match-actions.dto';
import { MeMatchesService } from './me-matches.service';
import {
  MutualMatchesService,
  type MutualMatchDetectResult,
} from './mutual-matches.service';
import { MutualMatchEmailService } from '../notifications/mutual-match-email.service';
import { MatchListRankQueueService } from '../workers/match-list-rank.worker';

@Injectable()
export class MeMatchActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meMatches: MeMatchesService,
    private readonly mutualMatches: MutualMatchesService,
    private readonly mutualMatchEmail: MutualMatchEmailService,
    private readonly analytics: AnalyticsService,
    private readonly matchListRankQueue: MatchListRankQueueService,
  ) {}

  async getActionState(
    actorUserId: string,
    candidateProfileId: string,
  ): Promise<MatchActionStateDto> {
    const { targetUserId } = await this.meMatches.assertMatchCandidateVisible(
      actorUserId,
      candidateProfileId,
    );

    const [row, mutual] = await Promise.all([
      this.prisma.matchAction.findUnique({
        where: {
          actorUserId_targetUserId: {
            actorUserId,
            targetUserId,
          },
        },
        select: { action: true, createdAt: true },
      }),
      this.mutualMatches.findActiveByUserPair(actorUserId, targetUserId),
    ]);

    if (!row) {
      return {
        action: null,
        mutualMatch: !!mutual,
        conversationId: mutual?.id ?? null,
      };
    }

    return {
      action: row.action,
      createdAt: row.createdAt.toISOString(),
      mutualMatch: !!mutual,
      conversationId: mutual?.id ?? null,
    };
  }

  async createAction(
    actorUserId: string,
    candidateProfileId: string,
    action: MatchActionType,
  ): Promise<MatchActionDto> {
    const { candidateProfileId: profileId, targetUserId } =
      await this.meMatches.assertMatchCandidateVisible(
        actorUserId,
        candidateProfileId,
      );

    if (targetUserId === actorUserId) {
      throw new BadRequestException('Cannot act on yourself');
    }

    const { row, detectResult } = await this.prisma.$transaction(async (tx) => {
      const upserted = await tx.matchAction.upsert({
        where: {
          actorUserId_targetUserId: {
            actorUserId,
            targetUserId,
          },
        },
        create: {
          actorUserId,
          targetUserId,
          targetProfileIdSnapshot: profileId,
          action,
        },
        update: {
          action,
          targetProfileIdSnapshot: profileId,
        },
      });

      let detection: MutualMatchDetectResult | null = null;
      if (action === MatchActionType.LIKE) {
        detection = await this.mutualMatches.detectAndCreateMutualMatch(
          actorUserId,
          targetUserId,
          tx,
        );
      }

      return { row: upserted, detectResult: detection };
    });

    const mutualFields =
      action === MatchActionType.LIKE
        ? this.mutualFieldsFromDetectResult(detectResult)
        : { mutualMatch: false, conversationId: null };

    if (detectResult?.created) {
      void this.mutualMatchEmail.notifyNewMutualMatchBestEffort(
        detectResult.mutualMatch,
      );
      const { id: mutualMatchId } = detectResult.mutualMatch;
      this.analytics.track(actorUserId, ProductAnalyticsEvents.MATCH_MUTUAL_CREATED, {
        mutualMatchId,
        otherUserId: targetUserId,
      });
      this.analytics.track(targetUserId, ProductAnalyticsEvents.MATCH_MUTUAL_CREATED, {
        mutualMatchId,
        otherUserId: actorUserId,
      });
    }

    this.analytics.track(actorUserId, ProductAnalyticsEvents.MATCH_ACTION, {
      action: action.toLowerCase(),
      candidateProfileId: profileId,
    });

    await this.meMatches.invalidateMatchListCache(actorUserId);
    await this.matchListRankQueue.enqueueRebuild(actorUserId, 'match_action');

    return {
      id: row.id,
      actorUserId: row.actorUserId,
      targetUserId: row.targetUserId,
      targetProfileIdSnapshot: row.targetProfileIdSnapshot,
      action: row.action,
      createdAt: row.createdAt.toISOString(),
      mutualMatch: mutualFields.mutualMatch,
      conversationId: mutualFields.conversationId,
    };
  }

  private mutualFieldsFromDetectResult(
    row: MutualMatchDetectResult | null,
  ): { mutualMatch: boolean; conversationId: string | null } {
    if (row?.mutualMatch.status === MutualMatchStatus.ACTIVE) {
      return { mutualMatch: true, conversationId: row.mutualMatch.id };
    }
    return { mutualMatch: false, conversationId: null };
  }

  async deleteAction(
    actorUserId: string,
    candidateProfileId: string,
  ): Promise<void> {
    const { targetUserId } = await this.meMatches.assertMatchCandidateVisible(
      actorUserId,
      candidateProfileId,
    );

    const row = await this.prisma.matchAction.findUnique({
      where: {
        actorUserId_targetUserId: {
          actorUserId,
          targetUserId,
        },
      },
      select: { action: true },
    });

    if (!row) {
      throw new NotFoundException('No action to undo');
    }

    if (row.action === MatchActionType.BLOCK) {
      throw new ForbiddenException('Blocked matches cannot be undone');
    }

    await this.prisma.matchAction.delete({
      where: {
        actorUserId_targetUserId: {
          actorUserId,
          targetUserId,
        },
      },
    });

    this.analytics.track(actorUserId, ProductAnalyticsEvents.MATCH_ACTION, {
      action: 'undo',
      candidateProfileId,
    });

    await this.meMatches.invalidateMatchListCache(actorUserId);
    await this.matchListRankQueue.enqueueRebuild(actorUserId, 'match_action');
  }
}

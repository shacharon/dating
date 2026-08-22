import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchActionType, MutualMatchStatus } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import type { MatchActionDto, MatchActionStateDto } from './me-match-actions.dto';
import { MeMatchesService } from './me-matches.service';
import type { MutualMatchDetectResult } from './repositories/match.repository.types';
import { MutualMatchEmailService } from '../notifications/mutual-match-email.service';
import {
  MATCH_LIST_RANK_QUEUE_PORT,
  type MatchListRankQueuePort,
} from '../workers/match-list-rank.ports';
import {
  PUSH_NOTIFICATION_QUEUE_PORT,
  type PushNotificationQueuePort,
} from '../workers/push-notification.ports';
import {
  MATCH_ACTIONS_REPOSITORY,
  type IMatchActionsRepository,
} from './repositories/match.repository';

@Injectable()
export class MeMatchActionsService {
  constructor(
    @Inject(MATCH_ACTIONS_REPOSITORY)
    private readonly matches: IMatchActionsRepository,
    private readonly meMatches: MeMatchesService,
    private readonly mutualMatchEmail: MutualMatchEmailService,
    private readonly analytics: AnalyticsService,
    @Inject(MATCH_LIST_RANK_QUEUE_PORT)
    private readonly matchListRankQueue: MatchListRankQueuePort,
    @Inject(PUSH_NOTIFICATION_QUEUE_PORT)
    private readonly pushQueue: PushNotificationQueuePort,
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
      this.matches.findActionWithCreatedAt(actorUserId, targetUserId),
      this.matches.findActiveMutualByUserPair(actorUserId, targetUserId),
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

    const { row, detectResult, unmatchedExisting } =
      await this.matches.upsertActionAndDetectMutual({
        actorUserId,
        targetUserId,
        targetProfileIdSnapshot: profileId,
        action,
      });

    const mutualFields =
      action === MatchActionType.LIKE
        ? this.mutualFieldsFromDetectResult(detectResult)
        : { mutualMatch: false, conversationId: null };

    if (detectResult?.created) {
      void this.mutualMatchEmail.notifyNewMutualMatchBestEffort(
        detectResult.mutualMatch,
      );
      void this.pushQueue.enqueueMutualMatchBestEffort({
        match: detectResult.mutualMatch,
      });
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

    if (unmatchedExisting || detectResult?.created) {
      await this.meMatches.invalidateMatchListCache(targetUserId);
      await this.matchListRankQueue.enqueueRebuild(
        targetUserId,
        unmatchedExisting ? 'unmatch' : 'match_action',
      );
    }

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

    const row = await this.matches.findActionByActorTarget(
      actorUserId,
      targetUserId,
    );

    if (!row) {
      throw new NotFoundException('No action to undo');
    }

    if (row.action === MatchActionType.BLOCK) {
      throw new ForbiddenException('Blocked matches cannot be undone');
    }

    const { unmatchedExisting } = await this.matches.deleteActionByActorTarget(
      actorUserId,
      targetUserId,
      row.action === MatchActionType.LIKE,
    );

    this.analytics.track(actorUserId, ProductAnalyticsEvents.MATCH_ACTION, {
      action: 'undo',
      candidateProfileId,
    });

    await this.meMatches.invalidateMatchListCache(actorUserId);
    await this.matchListRankQueue.enqueueRebuild(actorUserId, 'match_action');

    if (unmatchedExisting) {
      await this.meMatches.invalidateMatchListCache(targetUserId);
      await this.matchListRankQueue.enqueueRebuild(targetUserId, 'unmatch');
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { MutualMatchStatus } from '@prisma/client';
import { ErrorCodes } from '../../logging/error-codes';
import { AnalyticsService } from '../../analytics/analytics.service';
import { hashConversationId } from '../../analytics/hash-conversation-id';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import {
  MATCH_LIST_RANK_QUEUE_PORT,
  type MatchListRankQueuePort,
} from '../../workers/match-list-rank.ports';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from '../repositories/conversation.repository';
import {
  ConversationForbiddenError,
  ConversationNotFoundError,
} from './me-conversations.errors';
import { buildOtherUserDto } from './conversation-list.mapper';
import { lastReadAtIsoForUser } from './conversation-read-state.helpers';
import type { ConversationDetailDto } from './me-conversations.dto';

@Injectable()
export class ConversationLifecycleService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationsRepo: IConversationRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    @Inject(MATCH_LIST_RANK_QUEUE_PORT)
    private readonly matchListRankQueue: MatchListRankQueuePort,
  ) {}

  async assertActiveConversationParticipant(
    sessionUserId: string,
    conversationId: string,
  ): Promise<{
    id: string;
    userId1: string;
    userId2: string;
    createdAt: Date;
    user1LastReadAt: Date | null;
    user2LastReadAt: Date | null;
  }> {
    const match = await this.conversationsRepo.findMatchById(conversationId);

    if (!match || match.status !== MutualMatchStatus.ACTIVE) {
      throw new ConversationNotFoundError();
    }

    if (match.userId1 !== sessionUserId && match.userId2 !== sessionUserId) {
      throw new ConversationForbiddenError();
    }

    return {
      id: match.id,
      userId1: match.userId1,
      userId2: match.userId2,
      createdAt: match.createdAt,
      user1LastReadAt: match.user1LastReadAt,
      user2LastReadAt: match.user2LastReadAt,
    };
  }

  async getById(
    sessionUserId: string,
    conversationId: string,
  ): Promise<ConversationDetailDto> {
    const match = await this.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    const otherUserId =
      match.userId1 === sessionUserId ? match.userId2 : match.userId1;

    const profile =
      await this.conversationsRepo.findProfileByUserId(otherUserId);

    const asOf = new Date();

    this.obs.trace(
      `me conversations detail id=${conversationId} userId=${sessionUserId}`,
      ErrorCodes.ME_CONVERSATIONS_DETAIL_OK,
    );

    this.analytics.track(
      sessionUserId,
      ProductAnalyticsEvents.CONVERSATION_OPENED,
      {
        conversationIdHash: hashConversationId(conversationId),
      },
    );

    return {
      id: match.id,
      otherUser: buildOtherUserDto(otherUserId, profile ?? undefined, asOf),
      matchedAt: match.createdAt.toISOString(),
      status: 'ACTIVE',
      lastReadAt: lastReadAtIsoForUser(match, sessionUserId),
    };
  }

  async unmatch(sessionUserId: string, conversationId: string): Promise<void> {
    const match = await this.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    await this.conversationsRepo.markUnmatched(
      conversationId,
      sessionUserId,
      new Date(),
    );

    await this.matchListRankQueue.enqueueRebuild(match.userId1, 'unmatch');
    await this.matchListRankQueue.enqueueRebuild(match.userId2, 'unmatch');

    this.obs.trace(
      `me conversations unmatch id=${conversationId} userId=${sessionUserId}`,
      ErrorCodes.ME_CONVERSATIONS_UNMATCH_OK,
    );
  }
}

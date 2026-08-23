import { Inject, Injectable } from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from '../repositories/conversation.repository';
import type { ActiveMatchRow } from '../repositories/conversation.repository.types';
import { ConversationLifecycleService } from './conversation-lifecycle.service';
import {
  lastReadAtForUser,
  lastReadFieldForUser,
} from './conversation-read-state.helpers';
import type {
  ConversationsUnreadTotalDto,
  MarkConversationReadResponseDto,
} from './me-conversations.dto';

@Injectable()
export class ConversationReadStateService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationsRepo: IConversationRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly lifecycle: ConversationLifecycleService,
  ) {}

  async unreadTotal(
    sessionUserId: string,
  ): Promise<ConversationsUnreadTotalDto> {
    const rows =
      await this.conversationsRepo.findActiveMatchesForUser(sessionUserId);

    if (rows.length === 0) {
      return { totalUnread: 0 };
    }

    const unreadSpecs = rows.map((row) => {
      const otherUserId =
        row.userId1 === sessionUserId ? row.userId2 : row.userId1;
      return {
        conversationId: row.id,
        otherUserId,
        lastReadAt: lastReadAtForUser(row, sessionUserId),
      };
    });
    const unreadByConversationId =
      await this.conversationsRepo.batchUnreadCounts(unreadSpecs);

    let totalUnread = 0;
    for (const row of rows) {
      totalUnread += unreadByConversationId.get(row.id) ?? 0;
    }
    return { totalUnread };
  }

  async markAsRead(
    sessionUserId: string,
    conversationId: string,
  ): Promise<MarkConversationReadResponseDto> {
    const match = await this.lifecycle.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    const field = lastReadFieldForUser(match.userId1, sessionUserId);
    const now = new Date();

    await this.conversationsRepo.updateLastReadAt(conversationId, field, now);

    this.obs.trace(
      `me conversations mark-read id=${conversationId} userId=${sessionUserId}`,
      ErrorCodes.ME_CONVERSATIONS_MARK_READ_OK,
    );

    return { lastReadAt: now.toISOString() };
  }

  async countUnreadForParticipant(
    sessionUserId: string,
    conversationId: string,
  ): Promise<number> {
    const match = await this.lifecycle.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    return this.countUnreadForMatchRow(sessionUserId, match);
  }

  private async countUnreadForMatchRow(
    sessionUserId: string,
    row: ActiveMatchRow,
  ): Promise<number> {
    const otherUserId =
      row.userId1 === sessionUserId ? row.userId2 : row.userId1;
    const lastReadAt = lastReadAtForUser(row, sessionUserId);

    return this.conversationsRepo.countUnreadMessages({
      conversationId: row.id,
      otherUserId,
      lastReadAt,
    });
  }
}

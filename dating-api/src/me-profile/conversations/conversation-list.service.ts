import { Inject, Injectable } from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import type { MeConversationsListQuery } from '../dto/me-conversations-list-query.dto';
import { DEFAULT_CONVERSATION_LIST_LIMIT } from '../dto/me-conversations-list-query.dto';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from '../repositories/conversation.repository';
import { ConversationListInvalidCursorError } from './me-conversations.errors';
import {
  decodeConversationListCursor,
  paginateConversationList,
} from './me-conversations-list-cursor';
import { buildOtherUserDto } from './conversation-list.mapper';
import { lastReadAtForUser } from './conversation-read-state.helpers';
import type {
  ConversationListItemDto,
  ConversationListResponseDto,
} from './me-conversations.dto';

@Injectable()
export class ConversationListService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationsRepo: IConversationRepository,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async list(
    sessionUserId: string,
    query: MeConversationsListQuery = {
      limit: DEFAULT_CONVERSATION_LIST_LIMIT,
    },
  ): Promise<ConversationListResponseDto> {
    const limit =
      typeof query.limit === 'number' &&
      Number.isFinite(query.limit) &&
      query.limit >= 1
        ? Math.min(query.limit, 50)
        : DEFAULT_CONVERSATION_LIST_LIMIT;
    const cursor =
      query.cursor != null && query.cursor.trim() !== ''
        ? decodeConversationListCursor(query.cursor.trim())
        : null;
    if (query.cursor != null && query.cursor.trim() !== '' && cursor == null) {
      throw new ConversationListInvalidCursorError();
    }

    const rows =
      await this.conversationsRepo.findActiveMatchesForUser(sessionUserId);

    if (rows.length === 0) {
      this.obs.trace(
        `me conversations list userId=${sessionUserId} count=0`,
        ErrorCodes.ME_CONVERSATIONS_LIST_OK,
      );
      return { conversations: [], nextCursor: null, hasMore: false };
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

    type Ranked = {
      id: string;
      matchedAt: string;
      unreadCount: number;
      otherUserId: string;
    };

    const ranked: Ranked[] = rows.map((row) => {
      const otherUserId =
        row.userId1 === sessionUserId ? row.userId2 : row.userId1;
      return {
        id: row.id,
        matchedAt: row.createdAt.toISOString(),
        unreadCount: unreadByConversationId.get(row.id) ?? 0,
        otherUserId,
      };
    });

    ranked.sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      if (a.matchedAt !== b.matchedAt) {
        return b.matchedAt.localeCompare(a.matchedAt);
      }
      // Lexicographic id ASC — must match isAfterConversationListCursor.
      return a.id.localeCompare(b.id);
    });

    const { page, nextCursor, hasMore } = paginateConversationList(
      ranked,
      cursor,
      limit,
    );

    if (page.length === 0) {
      this.obs.trace(
        `me conversations list userId=${sessionUserId} count=0 page`,
        ErrorCodes.ME_CONVERSATIONS_LIST_OK,
      );
      return { conversations: [], nextCursor: null, hasMore: false };
    }

    const otherUserIds = page.map((p) => p.otherUserId);
    const profiles =
      await this.conversationsRepo.findProfilesByUserIds(otherUserIds);
    const profileByUserId = new Map(profiles.map((p) => [p.userId, p]));
    const asOf = new Date();

    const lastByConversationId =
      await this.conversationsRepo.batchLastMessagesByConversationIds(
        page.map((p) => p.id),
      );

    const conversations: ConversationListItemDto[] = page.map((item) => {
      const profile = profileByUserId.get(item.otherUserId);
      const last = lastByConversationId.get(item.id);
      return {
        id: item.id,
        otherUser: buildOtherUserDto(
          item.otherUserId,
          profile ?? undefined,
          asOf,
        ),
        matchedAt: item.matchedAt,
        unreadCount: item.unreadCount,
        lastMessage: last
          ? {
              text: last.text,
              senderId: last.senderId,
              sentAt: last.createdAt.toISOString(),
            }
          : null,
      };
    });

    this.obs.trace(
      `me conversations list userId=${sessionUserId} count=${conversations.length} hasMore=${hasMore}`,
      ErrorCodes.ME_CONVERSATIONS_LIST_OK,
    );

    return { conversations, nextCursor, hasMore };
  }
}

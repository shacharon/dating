import { Injectable } from '@nestjs/common';
import type { MeConversationsListQuery } from '../dto/me-conversations-list-query.dto';
import { ConversationListService } from './conversation-list.service';
import { ConversationReadStateService } from './conversation-read-state.service';
import { ConversationLifecycleService } from './conversation-lifecycle.service';
import type {
  ConversationDetailDto,
  ConversationListResponseDto,
  ConversationsUnreadTotalDto,
  MarkConversationReadResponseDto,
} from './me-conversations.dto';

export type {
  ConversationDetailDto,
  ConversationLastMessageDto,
  ConversationListItemDto,
  ConversationListResponseDto,
  ConversationOtherUserDto,
  ConversationsUnreadTotalDto,
  MarkConversationReadResponseDto,
} from './me-conversations.dto';

@Injectable()
export class MeConversationsService {
  constructor(
    private readonly listService: ConversationListService,
    private readonly readStateService: ConversationReadStateService,
    private readonly lifecycleService: ConversationLifecycleService,
  ) {}

  list(
    sessionUserId: string,
    query?: MeConversationsListQuery,
  ): Promise<ConversationListResponseDto> {
    return this.listService.list(sessionUserId, query);
  }

  unreadTotal(sessionUserId: string): Promise<ConversationsUnreadTotalDto> {
    return this.readStateService.unreadTotal(sessionUserId);
  }

  assertActiveConversationParticipant(
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
    return this.lifecycleService.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );
  }

  getById(
    sessionUserId: string,
    conversationId: string,
  ): Promise<ConversationDetailDto> {
    return this.lifecycleService.getById(sessionUserId, conversationId);
  }

  markAsRead(
    sessionUserId: string,
    conversationId: string,
  ): Promise<MarkConversationReadResponseDto> {
    return this.readStateService.markAsRead(sessionUserId, conversationId);
  }

  countUnreadForParticipant(
    sessionUserId: string,
    conversationId: string,
  ): Promise<number> {
    return this.readStateService.countUnreadForParticipant(
      sessionUserId,
      conversationId,
    );
  }

  unmatch(sessionUserId: string, conversationId: string): Promise<void> {
    return this.lifecycleService.unmatch(sessionUserId, conversationId);
  }
}

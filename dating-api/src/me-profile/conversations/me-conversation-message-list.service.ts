import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { MeConversationsService } from './me-conversations.service';
import {
  type MessageListDto,
  toMessageDto,
} from './me-conversation-messages.dto';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from '../repositories/conversation.repository';

const MAX_AFTER_POLL_LIMIT = 100;

@Injectable()
export class MeConversationMessageListService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationsRepo: IConversationRepository,
    private readonly conversations: MeConversationsService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async listMessages(
    sessionUserId: string,
    conversationId: string,
    options: { limit: number; before?: string; after?: string },
  ): Promise<MessageListDto> {
    if (options.before && options.after) {
      throw new BadRequestException('Cannot use before and after together.');
    }

    await this.conversations.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    if (options.after) {
      return this.listMessagesAfter(
        sessionUserId,
        conversationId,
        options.after,
        options.limit,
      );
    }

    return this.listMessagesHistory(
      sessionUserId,
      conversationId,
      options.limit,
      options.before,
    );
  }

  private async listMessagesAfter(
    sessionUserId: string,
    conversationId: string,
    after: string,
    limit: number,
  ): Promise<MessageListDto> {
    const cursor = await this.conversationsRepo.findSentMessageCursor(
      conversationId,
      after,
    );
    if (!cursor) {
      throw new BadRequestException('Invalid message cursor.');
    }

    const pollLimit = Math.min(limit, MAX_AFTER_POLL_LIMIT);
    const rows = await this.conversationsRepo.listSentMessagesAfterCursor({
      conversationId,
      cursor,
      limit: pollLimit,
    });

    const messages = rows.map(toMessageDto);

    this.obs.trace(
      `me conversations messages list conversationId=${conversationId} userId=${sessionUserId} after=${after} count=${messages.length}`,
      ErrorCodes.ME_CONVERSATIONS_MESSAGES_LIST_OK,
    );

    return {
      messages,
      pagination: { hasMore: false, nextCursor: null },
    };
  }

  private async listMessagesHistory(
    sessionUserId: string,
    conversationId: string,
    limit: number,
    before?: string,
  ): Promise<MessageListDto> {
    let beforeCursor: { id: string; createdAt: Date } | undefined;
    if (before) {
      const found = await this.conversationsRepo.findSentMessageCursor(
        conversationId,
        before,
      );
      if (!found) {
        throw new BadRequestException('Invalid message cursor.');
      }
      beforeCursor = found;
    }

    const rows = await this.conversationsRepo.listSentMessagesHistory({
      conversationId,
      limit,
      beforeCursor,
    });

    const hasMore = rows.length > limit;
    if (hasMore) {
      rows.pop();
    }

    rows.reverse();

    const messages = rows.map(toMessageDto);
    const nextCursor = hasMore && messages.length > 0 ? messages[0].id : null;

    this.obs.trace(
      `me conversations messages list conversationId=${conversationId} userId=${sessionUserId} count=${messages.length} hasMore=${hasMore}`,
      ErrorCodes.ME_CONVERSATIONS_MESSAGES_LIST_OK,
    );

    return {
      messages,
      pagination: { hasMore, nextCursor },
    };
  }
}

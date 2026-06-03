import { BadRequestException, Injectable } from '@nestjs/common';
import { MessageStatus, type Prisma } from '@prisma/client';
import { MESSAGING_EVENT_MESSAGE_NEW } from '../messaging-realtime/messaging-realtime.constants';
import { RealtimePublisher } from '../messaging-realtime/realtime-publisher.service';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { logProfanityIfDetected } from './conversation-message-profanity';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import { MeConversationsService } from './me-conversations.service';
import { NewMessageEmailService } from '../notifications/new-message-email.service';
import {
  type MessageDto,
  type MessageListDto,
  toMessageDto,
} from './me-conversation-messages.dto';

const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  text: true,
  createdAt: true,
  status: true,
} as const;

const MAX_AFTER_POLL_LIMIT = 100;

@Injectable()
export class MeConversationMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: MeConversationsService,
    private readonly obs: StructuredObservabilityService,
    private readonly messageRateLimit: ConversationMessageRateLimitService,
    private readonly realtime: RealtimePublisher,
    private readonly newMessageEmail: NewMessageEmailService,
  ) {}

  async listMessages(
    sessionUserId: string,
    conversationId: string,
    options: { limit: number; before?: string; after?: string },
  ): Promise<MessageListDto> {
    if (options.before && options.after) {
      throw new BadRequestException(
        'Cannot use before and after together.',
      );
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
    const cursor = await this.prisma.message.findFirst({
      where: {
        id: after,
        conversationId,
        status: MessageStatus.SENT,
      },
      select: { id: true, createdAt: true },
    });
    if (!cursor) {
      throw new BadRequestException('Invalid message cursor.');
    }

    const pollLimit = Math.min(limit, MAX_AFTER_POLL_LIMIT);
    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        status: MessageStatus.SENT,
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: cursor.id } },
        ],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: pollLimit,
      select: messageSelect,
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
    const whereBase: Prisma.MessageWhereInput = {
      conversationId,
      status: MessageStatus.SENT,
    };

    let where: Prisma.MessageWhereInput = whereBase;

    if (before) {
      const cursor = await this.prisma.message.findFirst({
        where: {
          id: before,
          conversationId,
          status: MessageStatus.SENT,
        },
        select: { id: true, createdAt: true },
      });
      if (!cursor) {
        throw new BadRequestException('Invalid message cursor.');
      }

      where = {
        ...whereBase,
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      };
    }

    const rows = await this.prisma.message.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: messageSelect,
    });

    const hasMore = rows.length > limit;
    if (hasMore) {
      rows.pop();
    }

    rows.reverse();

    const messages = rows.map(toMessageDto);
    const nextCursor =
      hasMore && messages.length > 0 ? messages[0].id : null;

    this.obs.trace(
      `me conversations messages list conversationId=${conversationId} userId=${sessionUserId} count=${messages.length} hasMore=${hasMore}`,
      ErrorCodes.ME_CONVERSATIONS_MESSAGES_LIST_OK,
    );

    return {
      messages,
      pagination: { hasMore, nextCursor },
    };
  }

  async sendMessage(
    sessionUserId: string,
    conversationId: string,
    text: string,
  ): Promise<MessageDto> {
    const match = await this.conversations.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Message text is required');
    }

    this.messageRateLimit.assertCanSend(sessionUserId);
    logProfanityIfDetected(this.obs, sessionUserId, conversationId, trimmed);

    const row = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: sessionUserId,
        text: trimmed,
        status: MessageStatus.SENT,
      },
    });

    this.messageRateLimit.recordSend(sessionUserId);

    this.obs.trace(
      `me conversations message send conversationId=${conversationId} userId=${sessionUserId}`,
      ErrorCodes.ME_CONVERSATIONS_MESSAGE_SEND_OK,
    );

    const dto = toMessageDto(row);
    this.publishMessageNewBestEffort(
      match.userId1,
      match.userId2,
      dto,
      conversationId,
    );

    const recipientUserId =
      sessionUserId === match.userId1 ? match.userId2 : match.userId1;
    void this.newMessageEmail.maybeNotifyBestEffort({
      conversationId,
      recipientUserId,
      senderUserId: sessionUserId,
      messageId: dto.id,
    });

    return dto;
  }

  private publishMessageNewBestEffort(
    userId1: string,
    userId2: string,
    payload: MessageDto,
    conversationId: string,
  ): void {
    try {
      this.realtime.publishToUsers(
        [userId1, userId2],
        MESSAGING_EVENT_MESSAGE_NEW,
        payload,
      );
    } catch (err) {
      this.obs.error(
        `messaging message.new publish failed conversationId=${conversationId} messageId=${payload.id}`,
        ErrorCodes.MESSAGING_MESSAGE_NEW_PUBLISH_FAILED,
        err,
      );
    }
  }
}

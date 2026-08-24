import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import { markHttpExceptionObservabilityLogged } from '../../logging/observability-http.exception';
import { AnalyticsService } from '../../analytics/analytics.service';
import { hashConversationId } from '../../analytics/hash-conversation-id';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import {
  CONTENT_MODERATION,
  type ContentModerationPort,
} from '../../content-moderation/content-moderation.ports';
import { ContentViolationService } from '../../content-moderation/content-violation.service';
import {
  isContentModerationEnabled,
  datingPolicySexualScoreMin,
} from '../../content-moderation/content-moderation.types';
import {
  evaluateContentPolicy,
  isDatingPolicyNearMiss,
} from '../../content-moderation/dating-policy';
import { buildModerationUserFacingDetails } from '../../content-moderation/moderation-user-facing';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import { MeConversationsService } from './me-conversations.service';
import { MessageIdempotencyConflictError } from './me-conversations.errors';
import {
  type MessageDto,
  toMessageDto,
} from './me-conversation-messages.dto';
import {
  CONVERSATION_REPOSITORY,
  type IConversationRepository,
} from '../repositories/conversation.repository';
import { MeConversationMessageFanoutService } from './me-conversation-message-fanout.service';

@Injectable()
export class MeConversationMessageSendService {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationsRepo: IConversationRepository,
    private readonly conversations: MeConversationsService,
    private readonly obs: StructuredObservabilityService,
    private readonly messageRateLimit: ConversationMessageRateLimitService,
    private readonly analytics: AnalyticsService,
    @Inject(CONTENT_MODERATION)
    private readonly moderation: ContentModerationPort,
    private readonly contentViolations: ContentViolationService,
    private readonly fanout: MeConversationMessageFanoutService,
  ) {}

  private async assertMessagingAllowed(userId: string): Promise<void> {
    if (!(await this.contentViolations.isUserBlocked(userId, 'message'))) {
      return;
    }

    const status = await this.contentViolations.getUserViolationStatus(userId);
    const mutedUntil = status.mutedUntil;

    this.obs.trace(
      `messaging muted userId=${userId} mutedUntil=${mutedUntil?.toISOString() ?? 'null'}`,
      ErrorCodes.CONTENT_MESSAGING_MUTED,
    );
    const ex = new ForbiddenException({
      error: 'messaging_muted',
      message:
        'Messaging is temporarily restricted due to previous content violations',
      details: {
        mutedUntil: mutedUntil ? mutedUntil.toISOString() : null,
      },
    });
    markHttpExceptionObservabilityLogged(ex);
    throw ex;
  }

  private async moderateMessageText(
    userId: string,
    text: string,
    context: { conversationId: string; recipientUserId: string },
  ): Promise<void> {
    const moderation = await this.moderation.checkContent(text);
    const decision = evaluateContentPolicy(text, moderation);

    if (decision.allow) {
      if (isDatingPolicyNearMiss(text, moderation)) {
        this.obs.trace(
          `content moderation near-miss sexualScore=${moderation.sexualScore} threshold=${datingPolicySexualScoreMin()} surface=message`,
          ErrorCodes.CONTENT_MODERATION_NEAR_MISS,
        );
      }
      return;
    }

    await this.contentViolations.recordViolation({
      userId,
      surface: 'message',
      flaggedText: text,
      category: decision.category,
      score: decision.score,
      action: decision.action,
      conversationId: context.conversationId,
      recipientUserId: context.recipientUserId,
    });

    if (decision.source === 'openai') {
      this.obs.trace(
        `content moderation flagged userId=${userId} surface=message category=${decision.category} conversationId=${context.conversationId} recipientUserId=${context.recipientUserId}`,
        ErrorCodes.CONTENT_MODERATION_FLAGGED,
      );
    } else {
      this.obs.trace(
        `content moderation dating-policy userId=${userId} surface=message source=${decision.source} category=${decision.category} conversationId=${context.conversationId} recipientUserId=${context.recipientUserId}`,
        ErrorCodes.CONTENT_MODERATION_DATING_POLICY,
      );
    }

    const enforcement = await this.contentViolations.enforceViolationThreshold(
      userId,
      'message',
    );

    const userFacing = buildModerationUserFacingDetails({
      text,
      decision,
      surface: 'message',
    });

    const ex = new BadRequestException({
      error: 'message_content_moderation_failed',
      message: 'Your message contains inappropriate content',
      details: {
        category: decision.category,
        source: decision.source,
        ...userFacing,
        ...(enforcement.muteLabel ? { muted: enforcement.muteLabel } : {}),
      },
    });
    markHttpExceptionObservabilityLogged(ex);
    throw ex;
  }

  async sendMessage(
    sessionUserId: string,
    conversationId: string,
    input: { text: string; clientMessageId?: string },
  ): Promise<MessageDto> {
    const match = await this.conversations.assertActiveConversationParticipant(
      sessionUserId,
      conversationId,
    );

    const trimmed = input.text.trim();
    if (!trimmed) {
      throw new BadRequestException('Message text is required');
    }

    const clientMessageId = input.clientMessageId?.trim() || undefined;

    if (clientMessageId) {
      const existing = await this.conversationsRepo.findSentMessageByClientKey(
        {
          conversationId,
          senderId: sessionUserId,
          clientMessageId,
        },
      );
      if (existing) {
        this.assertIdempotentTextMatch(existing.text, trimmed);
        return toMessageDto(existing);
      }
    }

    if (isContentModerationEnabled()) {
      await this.assertMessagingAllowed(sessionUserId);
    }

    if (isContentModerationEnabled()) {
      const recipientUserId =
        sessionUserId === match.userId1 ? match.userId2 : match.userId1;
      await this.moderateMessageText(sessionUserId, trimmed, {
        conversationId,
        recipientUserId,
      });
    }

    await this.messageRateLimit.consumeSendSlot(sessionUserId);

    const { row, created } = await this.conversationsRepo.createSentMessage({
      conversationId,
      senderId: sessionUserId,
      text: trimmed,
      clientMessageId: clientMessageId ?? null,
    });

    if (!created) {
      this.assertIdempotentTextMatch(row.text, trimmed);
      return toMessageDto(row);
    }

    this.obs.trace(
      `me conversations message send conversationId=${conversationId} userId=${sessionUserId}`,
      ErrorCodes.ME_CONVERSATIONS_MESSAGE_SEND_OK,
    );

    this.analytics.track(sessionUserId, ProductAnalyticsEvents.MESSAGE_SENT, {
      conversationIdHash: hashConversationId(conversationId),
    });

    const dto = toMessageDto(row);
    this.fanout.afterPersistBestEffort({
      userId1: match.userId1,
      userId2: match.userId2,
      sessionUserId,
      conversationId,
      dto,
      trimmed,
    });

    return dto;
  }

  private assertIdempotentTextMatch(existingText: string, trimmed: string): void {
    if (existingText !== trimmed) {
      throw new MessageIdempotencyConflictError();
    }
  }
}

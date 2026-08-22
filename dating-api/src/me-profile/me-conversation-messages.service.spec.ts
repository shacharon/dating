import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { MeConversationMessagesService } from './me-conversation-messages.service';
import { parseMessageListLimit } from './me-conversation-messages.dto';
import type { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import type { MeConversationsService } from './me-conversations.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { RealtimePublisher } from '../messaging-realtime/realtime-publisher.service';
import { MESSAGING_EVENT_MESSAGE_NEW } from '../messaging-realtime/messaging-realtime.constants';
import type { NewMessageEmailService } from '../notifications/new-message-email.service';
import type { ContentModerationPort } from '../content-moderation/content-moderation.ports';
import type { ContentViolationService } from '../content-moderation/content-violation.service';
import * as contentModerationTypes from '../content-moderation/content-moderation.types';
import type { IConversationRepository } from './repositories/conversation.repository';

describe('MeConversationMessagesService', () => {
  const sessionUserId = 'user_viewer_1';
  const conversationId = 'mutual_msg_1';
  const otherUserId = 'user_other_a';

  const prisma = {
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;

  const conversationsRepo = {
    findSentMessageCursor: jest.fn(
      (conversationId: string, messageId: string) =>
        prisma.message.findFirst({
          where: {
            id: messageId,
            conversationId,
            status: MessageStatus.SENT,
          },
          select: { id: true, createdAt: true },
        }),
    ),
    listSentMessagesAfterCursor: jest.fn(
      (args: {
        conversationId: string;
        cursor: { id: string; createdAt: Date };
        limit: number;
      }) =>
        prisma.message.findMany({
          where: {
            conversationId: args.conversationId,
            status: MessageStatus.SENT,
            OR: [
              { createdAt: { gt: args.cursor.createdAt } },
              {
                createdAt: args.cursor.createdAt,
                id: { gt: args.cursor.id },
              },
            ],
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: args.limit,
          select: expect.any(Object),
        }),
    ),
    listSentMessagesHistory: jest.fn(
      (args: {
        conversationId: string;
        limit: number;
        beforeCursor?: { id: string; createdAt: Date };
      }) =>
        prisma.message.findMany({
          where: {
            conversationId: args.conversationId,
            status: MessageStatus.SENT,
            ...(args.beforeCursor
              ? {
                  OR: [
                    { createdAt: { lt: args.beforeCursor.createdAt } },
                    {
                      createdAt: args.beforeCursor.createdAt,
                      id: { lt: args.beforeCursor.id },
                    },
                  ],
                }
              : {}),
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: args.limit + 1,
          select: expect.any(Object),
        }),
    ),
    createSentMessage: jest.fn(
      (args: { conversationId: string; senderId: string; text: string }) =>
        prisma.message.create({
          data: { ...args, status: MessageStatus.SENT },
        }),
    ),
  } as unknown as IConversationRepository;

  const conversations = {
    assertActiveConversationParticipant: jest.fn(),
  } as unknown as MeConversationsService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  const messageRateLimit = {
    consumeSendSlot: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConversationMessageRateLimitService;

  const realtime = {
    publishToUsers: jest.fn(),
  } as unknown as RealtimePublisher;

  const newMessageEmail = {
    maybeNotifyBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as NewMessageEmailService;

  const pushQueue = {
    enqueueNewMessageBestEffort: jest.fn().mockResolvedValue('inline:push'),
    enqueueMutualMatchBestEffort: jest.fn().mockResolvedValue(undefined),
    isBullEnabled: jest.fn().mockReturnValue(false),
  };

  const moderation = {
    checkContent: jest.fn().mockResolvedValue({
      flagged: false,
      categories: [],
      primaryCategory: null,
      score: 0,
      sexualScore: null,
      failOpen: false,
    }),
  };

  const contentViolations = {
    getUserViolationStatus: jest.fn().mockResolvedValue({
      status: 'ok',
      mutedUntil: null,
      violationCount: 0,
    }),
    recordViolation: jest.fn().mockResolvedValue(undefined),
    getViolationCount: jest.fn().mockResolvedValue(0),
    isUserBlocked: jest.fn().mockResolvedValue(false),
    enforceViolationThreshold: jest.fn().mockResolvedValue({
      shouldBlock: false,
      reason: 'under_threshold',
    }),
  };

  let service: MeConversationMessagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    (messageRateLimit.consumeSendSlot as jest.Mock).mockReset();
    (messageRateLimit.consumeSendSlot as jest.Mock).mockResolvedValue(
      undefined,
    );
    (realtime.publishToUsers as jest.Mock).mockReset();
    moderation.checkContent.mockResolvedValue({
      flagged: false,
      categories: [],
      primaryCategory: null,
      score: 0,
      sexualScore: null,
      failOpen: false,
    });
    contentViolations.getUserViolationStatus.mockResolvedValue({
      status: 'ok',
      mutedUntil: null,
      violationCount: 0,
    });
    contentViolations.recordViolation.mockResolvedValue(undefined);
    contentViolations.getViolationCount.mockResolvedValue(0);
    contentViolations.isUserBlocked.mockResolvedValue(false);
    contentViolations.enforceViolationThreshold.mockResolvedValue({
      shouldBlock: false,
      reason: 'under_threshold',
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    jest
      .spyOn(contentModerationTypes, 'isContentModerationEnabled')
      .mockReturnValue(true);
    const analytics = { track: jest.fn() } as unknown as AnalyticsService;
    service = new MeConversationMessagesService(
      conversationsRepo,
      conversations,
      obs,
      messageRateLimit,
      realtime,
      newMessageEmail,
      analytics,
      moderation as unknown as ContentModerationPort,
      contentViolations as unknown as ContentViolationService,
      pushQueue as never,
    );
    (
      conversations.assertActiveConversationParticipant as jest.Mock
    ).mockResolvedValue({
      id: conversationId,
      userId1: otherUserId,
      userId2: sessionUserId,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
      user1LastReadAt: null,
      user2LastReadAt: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates message and returns MessageDto for ACTIVE participant with valid text', async () => {
    const createdAt = new Date('2026-05-31T16:00:00.000Z');
    (prisma.message.create as jest.Mock).mockResolvedValue({
      id: 'msg_abc',
      conversationId,
      senderId: sessionUserId,
      text: 'Hello!',
      createdAt,
      status: MessageStatus.SENT,
    });

    const result = await service.sendMessage(
      sessionUserId,
      conversationId,
      'Hello!',
    );

    expect(result).toEqual({
      id: 'msg_abc',
      conversationId,
      senderId: sessionUserId,
      text: 'Hello!',
      createdAt: createdAt.toISOString(),
      status: 'SENT',
    });
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId,
        senderId: sessionUserId,
        text: 'Hello!',
        status: MessageStatus.SENT,
      },
    });
    expect(messageRateLimit.consumeSendSlot).toHaveBeenCalledWith(
      sessionUserId,
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining(conversationId),
      ErrorCodes.ME_CONVERSATIONS_MESSAGE_SEND_OK,
    );
    expect(realtime.publishToUsers).toHaveBeenCalledWith(
      [otherUserId, sessionUserId],
      MESSAGING_EVENT_MESSAGE_NEW,
      result,
    );
    expect(newMessageEmail.maybeNotifyBestEffort).toHaveBeenCalledWith({
      conversationId,
      recipientUserId: otherUserId,
      senderUserId: sessionUserId,
      messageId: 'msg_abc',
    });
    expect(pushQueue.enqueueNewMessageBestEffort).toHaveBeenCalledWith({
      recipientUserId: otherUserId,
      senderUserId: sessionUserId,
      conversationId,
      messagePreview: 'Hello!',
    });
  });

  it('returns MessageDto when publishToUsers throws', async () => {
    const createdAt = new Date('2026-05-31T16:00:00.000Z');
    (prisma.message.create as jest.Mock).mockResolvedValue({
      id: 'msg_fail_pub',
      conversationId,
      senderId: sessionUserId,
      text: 'Hi',
      createdAt,
      status: MessageStatus.SENT,
    });
    (realtime.publishToUsers as jest.Mock).mockImplementation(() => {
      throw new Error('socket down');
    });

    const result = await service.sendMessage(
      sessionUserId,
      conversationId,
      'Hi',
    );

    expect(result.id).toBe('msg_fail_pub');
    expect(obs.error).toHaveBeenCalledWith(
      expect.stringContaining(conversationId),
      ErrorCodes.MESSAGING_MESSAGE_NEW_PUBLISH_FAILED,
      expect.any(Error),
    );
  });

  it('throws HttpException when rate limit exceeded and does not create message', async () => {
    (messageRateLimit.consumeSendSlot as jest.Mock).mockRejectedValue(
      new HttpException({ message: 'Too many messages. Please wait.' }, 429),
    );

    await expect(
      service.sendMessage(sessionUserId, conversationId, 'Hi'),
    ).rejects.toBeInstanceOf(HttpException);
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(realtime.publishToUsers).not.toHaveBeenCalled();
  });

  it('throws BadRequest when message is flagged and does not create', async () => {
    moderation.checkContent.mockResolvedValue({
      flagged: true,
      categories: ['harassment'],
      primaryCategory: 'harassment',
      score: 0.9,
      sexualScore: null,
      failOpen: false,
    });

    try {
      await service.sendMessage(sessionUserId, conversationId, 'bad stuff');
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).getResponse()).toMatchObject({
        error: 'message_content_moderation_failed',
        details: {
          category: 'harassment',
          source: 'openai',
          flaggedText: 'bad stuff',
          flaggedTextIndex: 0,
          flaggedTextLength: 'bad stuff'.length,
          reason: 'Contains harassing or bullying language',
          suggestion: expect.stringContaining('respectfully'),
        },
      });
    }

    expect(contentViolations.recordViolation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: sessionUserId,
        surface: 'message',
        flaggedText: 'bad stuff',
        category: 'harassment',
        action: 'blocked',
        conversationId,
        recipientUserId: otherUserId,
      }),
    );
    expect(contentViolations.enforceViolationThreshold).toHaveBeenCalledWith(
      sessionUserId,
      'message',
    );
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(realtime.publishToUsers).not.toHaveBeenCalled();
  });

  it('throws BadRequest for dating blocklist when OpenAI does not flag', async () => {
    moderation.checkContent.mockResolvedValue({
      flagged: false,
      categories: [],
      primaryCategory: null,
      score: 0.2,
      sexualScore: 0.2,
      failOpen: false,
    });

    try {
      await service.sendMessage(
        sessionUserId,
        conversationId,
        'i want to fuck',
      );
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).getResponse()).toMatchObject({
        error: 'message_content_moderation_failed',
        details: expect.objectContaining({
          source: 'dating_blocklist',
          category: 'dating_policy',
          flaggedText: expect.stringMatching(/want to fuck/i),
          reason: 'Direct sexual solicitation',
        }),
      });
    }

    expect(contentViolations.recordViolation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: sessionUserId,
        surface: 'message',
        flaggedText: 'i want to fuck',
        category: 'dating_policy',
        action: 'blocked',
        conversationId,
        recipientUserId: otherUserId,
      }),
    );
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('includes muteLabel from enforcement in BadRequest details', async () => {
    moderation.checkContent.mockResolvedValue({
      flagged: true,
      categories: ['sexual'],
      primaryCategory: 'sexual',
      score: 0.8,
      sexualScore: null,
      failOpen: false,
    });
    contentViolations.enforceViolationThreshold.mockResolvedValue({
      shouldBlock: true,
      reason: '3_hourly',
      muteLabel: '1 hour',
      mutedUntil: new Date(Date.now() + 60 * 60 * 1000),
    });

    try {
      await service.sendMessage(sessionUserId, conversationId, 'flagged');
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      expect((e as BadRequestException).getResponse()).toMatchObject({
        error: 'message_content_moderation_failed',
        details: expect.objectContaining({
          muted: '1 hour',
          source: 'openai',
          flaggedText: 'flagged',
          reason: 'Contains explicit sexual content',
        }),
      });
    }
  });

  it('throws Forbidden when messaging_muted and mute still active', async () => {
    contentViolations.isUserBlocked.mockResolvedValue(true);
    contentViolations.getUserViolationStatus.mockResolvedValue({
      status: 'messaging_muted',
      mutedUntil: new Date(Date.now() + 60 * 60 * 1000),
      violationCount: 3,
    });

    await expect(
      service.sendMessage(sessionUserId, conversationId, 'Hi'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(messageRateLimit.consumeSendSlot).not.toHaveBeenCalled();
    expect(moderation.checkContent).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('allows send when isUserBlocked clears expired mute', async () => {
    contentViolations.isUserBlocked.mockResolvedValue(false);
    (prisma.message.create as jest.Mock).mockResolvedValue({
      id: 'msg_after_mute',
      conversationId,
      senderId: sessionUserId,
      text: 'Hi',
      createdAt: new Date(),
      status: MessageStatus.SENT,
    });

    await service.sendMessage(sessionUserId, conversationId, 'Hi');

    expect(prisma.message.create).toHaveBeenCalled();
  });

  it('allows send when moderation fail-opens', async () => {
    moderation.checkContent.mockResolvedValue({
      flagged: false,
      categories: [],
      primaryCategory: null,
      score: 0,
      sexualScore: null,
      failOpen: true,
    });
    (prisma.message.create as jest.Mock).mockResolvedValue({
      id: 'msg_failopen',
      conversationId,
      senderId: sessionUserId,
      text: 'maybe',
      createdAt: new Date(),
      status: MessageStatus.SENT,
    });

    await service.sendMessage(sessionUserId, conversationId, 'maybe');

    expect(contentViolations.recordViolation).not.toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalled();
  });

  it('skips mute and moderation when feature flag is off', async () => {
    jest
      .spyOn(contentModerationTypes, 'isContentModerationEnabled')
      .mockReturnValue(false);
    (prisma.message.create as jest.Mock).mockResolvedValue({
      id: 'msg_flag_off',
      conversationId,
      senderId: sessionUserId,
      text: 'Hi',
      createdAt: new Date(),
      status: MessageStatus.SENT,
    });

    await service.sendMessage(sessionUserId, conversationId, 'Hi');

    expect(contentViolations.isUserBlocked).not.toHaveBeenCalled();
    expect(moderation.checkContent).not.toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalled();
  });

  it('throws BadRequestException when text is empty after trim', async () => {
    await expect(
      service.sendMessage(sessionUserId, conversationId, '   '),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(realtime.publishToUsers).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when text is empty string', async () => {
    await expect(
      service.sendMessage(sessionUserId, conversationId, ''),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(realtime.publishToUsers).not.toHaveBeenCalled();
  });

  it('does not publish when message create fails', async () => {
    (prisma.message.create as jest.Mock).mockRejectedValue(
      new Error('db error'),
    );

    await expect(
      service.sendMessage(sessionUserId, conversationId, 'Hi'),
    ).rejects.toThrow('db error');
    expect(realtime.publishToUsers).not.toHaveBeenCalled();
  });

  it('stores trimmed text', async () => {
    (prisma.message.create as jest.Mock).mockResolvedValue({
      id: 'msg_trim',
      conversationId,
      senderId: sessionUserId,
      text: 'Hi there',
      createdAt: new Date(),
      status: MessageStatus.SENT,
    });

    await service.sendMessage(sessionUserId, conversationId, '  Hi there  ');

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ text: 'Hi there' }),
    });
  });

  it('propagates NotFoundException when conversation is missing', async () => {
    (
      conversations.assertActiveConversationParticipant as jest.Mock
    ).mockRejectedValue(
      new NotFoundException({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      }),
    );

    await expect(
      service.sendMessage(sessionUserId, conversationId, 'Hi'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('propagates NotFoundException when conversation is UNMATCHED', async () => {
    (
      conversations.assertActiveConversationParticipant as jest.Mock
    ).mockRejectedValue(
      new NotFoundException({
        error: 'conversation_not_found',
        message: 'Conversation not found.',
      }),
    );

    await expect(
      service.sendMessage(sessionUserId, conversationId, 'Hi'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('propagates ForbiddenException when session user is not a participant', async () => {
    (
      conversations.assertActiveConversationParticipant as jest.Mock
    ).mockRejectedValue(
      new ForbiddenException({
        error: 'conversation_forbidden',
        message: 'You do not have access to this conversation.',
      }),
    );

    await expect(
      service.sendMessage(sessionUserId, conversationId, 'Hi'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  describe('listMessages()', () => {
    const t1 = new Date('2026-05-31T10:00:00.000Z');
    const t2 = new Date('2026-05-31T11:00:00.000Z');
    const t3 = new Date('2026-05-31T12:00:00.000Z');

    it('returns latest page in chronological ASC order with hasMore', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'msg_3',
          conversationId,
          senderId: sessionUserId,
          text: 'Third',
          createdAt: t3,
          status: MessageStatus.SENT,
        },
        {
          id: 'msg_2',
          conversationId,
          senderId: otherUserId,
          text: 'Second',
          createdAt: t2,
          status: MessageStatus.SENT,
        },
        {
          id: 'msg_1',
          conversationId,
          senderId: sessionUserId,
          text: 'First',
          createdAt: t1,
          status: MessageStatus.SENT,
        },
      ]);

      const result = await service.listMessages(sessionUserId, conversationId, {
        limit: 2,
      });

      expect(result.messages.map((m) => m.id)).toEqual(['msg_2', 'msg_3']);
      expect(result.pagination).toEqual({
        hasMore: true,
        nextCursor: 'msg_2',
      });
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId, status: MessageStatus.SENT },
          take: 3,
        }),
      );
      expect(obs.trace).toHaveBeenCalledWith(
        expect.stringContaining('hasMore=true'),
        ErrorCodes.ME_CONVERSATIONS_MESSAGES_LIST_OK,
      );
    });

    it('returns empty history when no messages exist', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.listMessages(sessionUserId, conversationId, {
        limit: 50,
      });

      expect(result).toEqual({
        messages: [],
        pagination: { hasMore: false, nextCursor: null },
      });
    });

    it('queries older messages when before cursor is valid', async () => {
      (prisma.message.findFirst as jest.Mock).mockResolvedValue({
        id: 'msg_2',
        createdAt: t2,
      });
      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'msg_1',
          conversationId,
          senderId: sessionUserId,
          text: 'First',
          createdAt: t1,
          status: MessageStatus.SENT,
        },
      ]);

      const result = await service.listMessages(sessionUserId, conversationId, {
        limit: 50,
        before: 'msg_2',
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('msg_1');
      expect(prisma.message.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'msg_2',
          conversationId,
          status: MessageStatus.SENT,
        },
        select: { id: true, createdAt: true },
      });
    });

    it('throws BadRequestException when before cursor is invalid', async () => {
      (prisma.message.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.listMessages(sessionUserId, conversationId, {
          limit: 50,
          before: 'msg_missing',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });

    it('filters only SENT messages in base query', async () => {
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);

      await service.listMessages(sessionUserId, conversationId, { limit: 50 });

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId, status: MessageStatus.SENT },
        }),
      );
    });

    it('propagates NotFoundException when conversation is missing', async () => {
      (
        conversations.assertActiveConversationParticipant as jest.Mock
      ).mockRejectedValue(
        new NotFoundException({
          error: 'conversation_not_found',
          message: 'Conversation not found.',
        }),
      );

      await expect(
        service.listMessages(sessionUserId, conversationId, { limit: 50 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });

    it('propagates ForbiddenException when session user is not a participant', async () => {
      (
        conversations.assertActiveConversationParticipant as jest.Mock
      ).mockRejectedValue(
        new ForbiddenException({
          error: 'conversation_forbidden',
          message: 'You do not have access to this conversation.',
        }),
      );

      await expect(
        service.listMessages(sessionUserId, conversationId, { limit: 50 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });
  });

  describe('parseMessageListLimit()', () => {
    it('defaults to 50 when limit is omitted', () => {
      expect(parseMessageListLimit()).toBe(50);
      expect(parseMessageListLimit('')).toBe(50);
    });

    it('accepts valid limit in range', () => {
      expect(parseMessageListLimit('25')).toBe(25);
      expect(parseMessageListLimit('100')).toBe(100);
    });

    it('throws BadRequestException for invalid limit', () => {
      expect(() => parseMessageListLimit('0')).toThrow(BadRequestException);
      expect(() => parseMessageListLimit('101')).toThrow(BadRequestException);
      expect(() => parseMessageListLimit('abc')).toThrow(BadRequestException);
    });
  });
});

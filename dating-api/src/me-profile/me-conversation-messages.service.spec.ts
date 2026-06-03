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
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { RealtimePublisher } from '../messaging-realtime/realtime-publisher.service';
import { MESSAGING_EVENT_MESSAGE_NEW } from '../messaging-realtime/messaging-realtime.constants';

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
  } as unknown as PrismaService;

  const conversations = {
    assertActiveConversationParticipant: jest.fn(),
  } as unknown as MeConversationsService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  const messageRateLimit = {
    assertCanSend: jest.fn(),
    recordSend: jest.fn(),
  } as unknown as ConversationMessageRateLimitService;

  const realtime = {
    publishToUsers: jest.fn(),
  } as unknown as RealtimePublisher;

  let service: MeConversationMessagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    (messageRateLimit.assertCanSend as jest.Mock).mockReset();
    (messageRateLimit.recordSend as jest.Mock).mockReset();
    (realtime.publishToUsers as jest.Mock).mockReset();
    service = new MeConversationMessagesService(
      prisma,
      conversations,
      obs,
      messageRateLimit,
      realtime,
    );
    (conversations.assertActiveConversationParticipant as jest.Mock).mockResolvedValue(
      {
        id: conversationId,
        userId1: otherUserId,
        userId2: sessionUserId,
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        user1LastReadAt: null,
        user2LastReadAt: null,
      },
    );
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
    expect(messageRateLimit.assertCanSend).toHaveBeenCalledWith(sessionUserId);
    expect(messageRateLimit.recordSend).toHaveBeenCalledWith(sessionUserId);
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining(conversationId),
      ErrorCodes.ME_CONVERSATIONS_MESSAGE_SEND_OK,
    );
    expect(realtime.publishToUsers).toHaveBeenCalledWith(
      [otherUserId, sessionUserId],
      MESSAGING_EVENT_MESSAGE_NEW,
      result,
    );
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
    (messageRateLimit.assertCanSend as jest.Mock).mockImplementation(() => {
      throw new HttpException(
        { message: 'Too many messages. Please wait.' },
        429,
      );
    });

    await expect(
      service.sendMessage(sessionUserId, conversationId, 'Hi'),
    ).rejects.toBeInstanceOf(HttpException);
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(messageRateLimit.recordSend).not.toHaveBeenCalled();
    expect(realtime.publishToUsers).not.toHaveBeenCalled();
  });

  it('still creates message when profanity is detected and logs profanity trace', async () => {
    (prisma.message.create as jest.Mock).mockResolvedValue({
      id: 'msg_prof',
      conversationId,
      senderId: sessionUserId,
      text: 'badword1 hello',
      createdAt: new Date(),
      status: MessageStatus.SENT,
    });

    await service.sendMessage(
      sessionUserId,
      conversationId,
      'badword1 hello',
    );

    expect(prisma.message.create).toHaveBeenCalled();
    expect(messageRateLimit.recordSend).toHaveBeenCalledWith(sessionUserId);
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('profanity detected'),
      ErrorCodes.ME_CONVERSATIONS_MESSAGE_PROFANITY_DETECTED,
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining(conversationId),
      ErrorCodes.ME_CONVERSATIONS_MESSAGE_SEND_OK,
    );
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
    (conversations.assertActiveConversationParticipant as jest.Mock).mockRejectedValue(
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
    (conversations.assertActiveConversationParticipant as jest.Mock).mockRejectedValue(
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
    (conversations.assertActiveConversationParticipant as jest.Mock).mockRejectedValue(
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
      (conversations.assertActiveConversationParticipant as jest.Mock).mockRejectedValue(
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
      (conversations.assertActiveConversationParticipant as jest.Mock).mockRejectedValue(
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

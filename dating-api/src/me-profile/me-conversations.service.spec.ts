import {
  ConversationForbiddenError,
  ConversationListInvalidCursorError,
  ConversationNotFoundError,
} from './me-conversations.errors';
import { MessageStatus, MutualMatchStatus, ProfileGender } from '@prisma/client';
import { MeConversationsService } from './me-conversations.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import { batchLastMessagesByConversationId } from './me-conversations-last-message-batch';

jest.mock('./me-conversations-last-message-batch', () => ({
  batchLastMessagesByConversationId: jest.fn(),
}));

const batchLastMessagesMock =
  batchLastMessagesByConversationId as jest.MockedFunction<
    typeof batchLastMessagesByConversationId
  >;

describe('MeConversationsService', () => {
  const sessionUserId = 'user_viewer_1';
  const otherUserIdA = 'user_other_a';
  const otherUserIdB = 'user_other_b';

  const listRowReadDefaults = {
    user1LastReadAt: null as Date | null,
    user2LastReadAt: null as Date | null,
  };

  const prisma = {
    mutualMatch: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    userProfile: { findMany: jest.fn(), findUnique: jest.fn() },
    message: { count: jest.fn() },
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  const matchListRankQueue = {
    enqueueRebuild: jest.fn().mockResolvedValue('inline:u'),
  };

  let service: MeConversationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    const analytics = { track: jest.fn() } as unknown as AnalyticsService;
    service = new MeConversationsService(
      prisma,
      obs,
      analytics,
      matchListRankQueue as never,
    );
    (prisma.message.count as jest.Mock).mockResolvedValue(0);
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    batchLastMessagesMock.mockResolvedValue(new Map());
  });

  it('returns empty list when user has no ACTIVE mutual matches', async () => {
    (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.list(sessionUserId);

    expect(result).toEqual({
      conversations: [],
      nextCursor: null,
      hasMore: false,
    });
    expect(prisma.userProfile.findMany).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(batchLastMessagesMock).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalled();
  });

  it('queries only ACTIVE mutual matches for session user', async () => {
    (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([]);

    await service.list(sessionUserId);

    expect(prisma.mutualMatch.findMany).toHaveBeenCalledWith({
      where: {
        status: MutualMatchStatus.ACTIVE,
        OR: [{ userId1: sessionUserId }, { userId2: sessionUserId }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId1: true,
        userId2: true,
        createdAt: true,
        user1LastReadAt: true,
        user2LastReadAt: true,
      },
    });
  });

  it('returns two conversations with correct other users and sort order', async () => {
    const older = new Date('2026-05-30T10:00:00.000Z');
    const newer = new Date('2026-05-31T14:00:00.000Z');
    (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mutual_new',
        userId1: sessionUserId,
        userId2: otherUserIdA,
        createdAt: newer,
        ...listRowReadDefaults,
      },
      {
        id: 'mutual_old',
        userId1: otherUserIdB,
        userId2: sessionUserId,
        createdAt: older,
        ...listRowReadDefaults,
      },
    ]);
    (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'prof_a',
        userId: otherUserIdA,
        nickname: 'Noa',
        gender: ProfileGender.FEMALE,
        birthDate: new Date('1992-03-15T00:00:00.000Z'),
        city: 'TLV',
        country: 'IL',
        locationLabel: 'Tel Aviv',
        desiredPartnerGenders: ['MALE'],
        photos: [{ id: 'photo_a', isPrimary: true }],
      },
      {
        id: 'prof_b',
        userId: otherUserIdB,
        nickname: 'Yonatan',
        gender: ProfileGender.MALE,
        birthDate: new Date('1990-08-01T00:00:00.000Z'),
        city: 'TLV',
        country: 'IL',
        locationLabel: 'Tel Aviv',
        desiredPartnerGenders: ['FEMALE'],
        photos: [],
      },
    ]);

    const result = await service.list(sessionUserId);

    expect(result.conversations).toHaveLength(2);
    expect(result.conversations[0].id).toBe('mutual_new');
    expect(result.conversations[0].otherUser.id).toBe(otherUserIdA);
    expect(result.conversations[0].otherUser.nickname).toBe('Noa');
    expect(result.conversations[0].otherUser.photoUrl).toBe(
      '/api/v1/me/matches/prof_a/photos/photo_a/file',
    );
    expect(result.conversations[0].unreadCount).toBe(0);
    expect(result.conversations[0].lastMessage).toBeNull();
    expect(result.conversations[1].id).toBe('mutual_old');
    expect(result.conversations[1].otherUser.id).toBe(otherUserIdB);
    expect(result.conversations[1].otherUser.photoUrl).toBeNull();
    expect(result.conversations[1].lastMessage).toBeNull();
    expect(result.conversations[0].matchedAt).toBe(newer.toISOString());
    expect(batchLastMessagesMock).toHaveBeenCalledWith(prisma, [
      'mutual_new',
      'mutual_old',
    ]);
  });

  it('resolves other user when session user is userId2', async () => {
    (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mutual_1',
        userId1: otherUserIdA,
        userId2: sessionUserId,
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        ...listRowReadDefaults,
      },
    ]);
    (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'prof_a',
        userId: otherUserIdA,
        nickname: null,
        gender: ProfileGender.FEMALE,
        birthDate: new Date('1992-01-01T00:00:00.000Z'),
        city: null,
        country: null,
        locationLabel: 'Haifa',
        desiredPartnerGenders: null,
        photos: [],
      },
    ]);

    const result = await service.list(sessionUserId);

    expect(result.conversations[0].otherUser.id).toBe(otherUserIdA);
    expect(result.conversations[0].otherUser.profileId).toBe('prof_a');
    expect(result.conversations[0].otherUser.gender).toBe('FEMALE');
    expect(result.conversations[0].otherUser.ageYears).toEqual(expect.any(Number));
  });

  it('returns row with empty profile fields when other profile is missing', async () => {
    (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mutual_orphan',
        userId1: sessionUserId,
        userId2: 'user_deleted',
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        ...listRowReadDefaults,
      },
    ]);
    (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.list(sessionUserId);

    expect(result.conversations).toHaveLength(1);
    expect(result.conversations[0].otherUser).toMatchObject({
      id: 'user_deleted',
      profileId: '',
      nickname: null,
      gender: null,
      ageYears: null,
      locationLabel: null,
      photoUrl: null,
    });
  });

  describe('list() unreadCount', () => {
    it('returns unreadCount from batch query when lastReadAt is null', async () => {
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mutual_1',
          userId1: otherUserIdA,
          userId2: sessionUserId,
          createdAt: new Date('2026-05-31T10:00:00.000Z'),
          ...listRowReadDefaults,
        },
      ]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { conversationId: 'mutual_1', cnt: 3 },
      ]);

      const result = await service.list(sessionUserId);

      expect(result.conversations[0].unreadCount).toBe(3);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.message.count).not.toHaveBeenCalled();
    });

    it('returns zero unread when batch omits conversation (no matching messages)', async () => {
      const readAt = new Date('2026-06-01T12:00:00.000Z');
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mutual_1',
          userId1: otherUserIdA,
          userId2: sessionUserId,
          createdAt: new Date('2026-05-31T10:00:00.000Z'),
          user1LastReadAt: null,
          user2LastReadAt: readAt,
        },
      ]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await service.list(sessionUserId);

      expect(result.conversations[0].unreadCount).toBe(0);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.message.count).not.toHaveBeenCalled();
    });

    it('batches unread for all conversations in one query (not N message.count)', async () => {
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mutual_1',
          userId1: otherUserIdA,
          userId2: sessionUserId,
          createdAt: new Date('2026-05-31T10:00:00.000Z'),
          ...listRowReadDefaults,
        },
        {
          id: 'mutual_2',
          userId1: sessionUserId,
          userId2: otherUserIdB,
          createdAt: new Date('2026-05-31T11:00:00.000Z'),
          ...listRowReadDefaults,
        },
      ]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { conversationId: 'mutual_1', cnt: 1 },
        { conversationId: 'mutual_2', cnt: 2 },
      ]);

      const result = await service.list(sessionUserId);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.message.count).not.toHaveBeenCalled();
      expect(result.conversations.find((c) => c.id === 'mutual_1')?.unreadCount).toBe(
        1,
      );
      expect(result.conversations.find((c) => c.id === 'mutual_2')?.unreadCount).toBe(
        2,
      );
    });

    it('sorts conversations with higher unreadCount before newer matchedAt', async () => {
      const newer = new Date('2026-05-31T14:00:00.000Z');
      const older = new Date('2026-05-30T10:00:00.000Z');
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mutual_new',
          userId1: sessionUserId,
          userId2: otherUserIdA,
          createdAt: newer,
          ...listRowReadDefaults,
        },
        {
          id: 'mutual_old',
          userId1: otherUserIdB,
          userId2: sessionUserId,
          createdAt: older,
          ...listRowReadDefaults,
        },
      ]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { conversationId: 'mutual_new', cnt: 0 },
        { conversationId: 'mutual_old', cnt: 3 },
      ]);

      const result = await service.list(sessionUserId);

      expect(result.conversations[0].id).toBe('mutual_old');
      expect(result.conversations[0].unreadCount).toBe(3);
      expect(result.conversations[1].id).toBe('mutual_new');
      expect(result.conversations[1].unreadCount).toBe(0);
    });
  });

  describe('list() lastMessage', () => {
    it('returns null lastMessage when batch has no row for conversation', async () => {
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mutual_1',
          userId1: otherUserIdA,
          userId2: sessionUserId,
          createdAt: new Date('2026-05-31T10:00:00.000Z'),
          ...listRowReadDefaults,
        },
      ]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);
      batchLastMessagesMock.mockResolvedValue(new Map());

      const result = await service.list(sessionUserId);

      expect(result.conversations[0].lastMessage).toBeNull();
      expect(batchLastMessagesMock).toHaveBeenCalledWith(prisma, ['mutual_1']);
    });

    it('maps newest SENT lastMessage onto list items', async () => {
      const sentAt = new Date('2026-08-01T15:30:00.000Z');
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mutual_1',
          userId1: otherUserIdA,
          userId2: sessionUserId,
          createdAt: new Date('2026-05-31T10:00:00.000Z'),
          ...listRowReadDefaults,
        },
      ]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);
      batchLastMessagesMock.mockResolvedValue(
        new Map([
          [
            'mutual_1',
            {
              conversationId: 'mutual_1',
              text: 'hey there',
              senderId: otherUserIdA,
              createdAt: sentAt,
            },
          ],
        ]),
      );

      const result = await service.list(sessionUserId);

      expect(result.conversations[0].lastMessage).toEqual({
        text: 'hey there',
        senderId: otherUserIdA,
        sentAt: sentAt.toISOString(),
      });
      expect(result.conversations[0].unreadCount).toBe(0);
    });

    it('fetches last messages only for paginated page ids', async () => {
      const t1 = new Date('2026-06-03T00:00:00.000Z');
      const t2 = new Date('2026-06-02T00:00:00.000Z');
      const t3 = new Date('2026-06-01T00:00:00.000Z');
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'c1',
          userId1: sessionUserId,
          userId2: otherUserIdA,
          createdAt: t1,
          ...listRowReadDefaults,
        },
        {
          id: 'c2',
          userId1: sessionUserId,
          userId2: otherUserIdB,
          createdAt: t2,
          ...listRowReadDefaults,
        },
        {
          id: 'c3',
          userId1: otherUserIdA,
          userId2: sessionUserId,
          createdAt: t3,
          ...listRowReadDefaults,
        },
      ]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);

      await service.list(sessionUserId, { limit: 2 });

      expect(batchLastMessagesMock).toHaveBeenCalledWith(prisma, ['c1', 'c2']);
      expect(batchLastMessagesMock).not.toHaveBeenCalledWith(
        prisma,
        expect.arrayContaining(['c3']),
      );
    });
  });

  describe('list() pagination', () => {
    it('returns nextCursor/hasMore and page2 continues sorted order', async () => {
      const t1 = new Date('2026-06-03T00:00:00.000Z');
      const t2 = new Date('2026-06-02T00:00:00.000Z');
      const t3 = new Date('2026-06-01T00:00:00.000Z');
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'c1',
          userId1: sessionUserId,
          userId2: otherUserIdA,
          createdAt: t1,
          ...listRowReadDefaults,
        },
        {
          id: 'c2',
          userId1: sessionUserId,
          userId2: otherUserIdB,
          createdAt: t2,
          ...listRowReadDefaults,
        },
        {
          id: 'c3',
          userId1: otherUserIdA,
          userId2: sessionUserId,
          createdAt: t3,
          ...listRowReadDefaults,
        },
      ]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { conversationId: 'c1', cnt: 1 },
        { conversationId: 'c2', cnt: 0 },
        { conversationId: 'c3', cnt: 0 },
      ]);
      (prisma.userProfile.findMany as jest.Mock).mockResolvedValue([]);

      const page1 = await service.list(sessionUserId, { limit: 2 });
      expect(page1.conversations.map((c) => c.id)).toEqual(['c1', 'c2']);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeTruthy();
      expect(prisma.userProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: { in: [otherUserIdA, otherUserIdB] } },
        }),
      );

      const page2 = await service.list(sessionUserId, {
        limit: 2,
        cursor: page1.nextCursor!,
      });
      expect(page2.conversations.map((c) => c.id)).toEqual(['c3']);
      expect(page2.hasMore).toBe(false);
      expect(page2.nextCursor).toBeNull();
    });

    it('throws ConversationListInvalidCursorError for invalid cursor', async () => {
      await expect(
        service.list(sessionUserId, { limit: 20, cursor: '!!!' }),
      ).rejects.toBeInstanceOf(ConversationListInvalidCursorError);
      expect(prisma.mutualMatch.findMany).not.toHaveBeenCalled();
    });
  });

  describe('unreadTotal()', () => {
    it('sums batched unread counts across conversations', async () => {
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'c1',
          userId1: sessionUserId,
          userId2: otherUserIdA,
          ...listRowReadDefaults,
        },
        {
          id: 'c2',
          userId1: sessionUserId,
          userId2: otherUserIdB,
          ...listRowReadDefaults,
        },
      ]);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { conversationId: 'c1', cnt: 2 },
        { conversationId: 'c2', cnt: 3 },
      ]);

      await expect(service.unreadTotal(sessionUserId)).resolves.toEqual({
        totalUnread: 5,
      });
      expect(prisma.userProfile.findMany).not.toHaveBeenCalled();
    });

    it('returns 0 when inbox empty', async () => {
      (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([]);
      await expect(service.unreadTotal(sessionUserId)).resolves.toEqual({
        totalUnread: 0,
      });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('assertActiveConversationParticipant()', () => {
    const conversationId = 'mutual_assert_1';

    it('returns match row when ACTIVE and session user is participant', async () => {
      const match = {
        id: conversationId,
        userId1: otherUserIdA,
        userId2: sessionUserId,
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        status: MutualMatchStatus.ACTIVE,
        user1LastReadAt: null,
        user2LastReadAt: null,
      };
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(match);

      const result = await service.assertActiveConversationParticipant(
        sessionUserId,
        conversationId,
      );

      expect(result).toMatchObject({
        id: conversationId,
        userId1: otherUserIdA,
        userId2: sessionUserId,
      });
    });

    it('throws ConversationNotFoundError when conversation is UNMATCHED', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        id: conversationId,
        userId1: otherUserIdA,
        userId2: sessionUserId,
        createdAt: new Date('2026-05-31T10:00:00.000Z'),
        status: MutualMatchStatus.UNMATCHED,
      });

      await expect(
        service.assertActiveConversationParticipant(
          sessionUserId,
          conversationId,
        ),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
    });
  });

  describe('getById()', () => {
    const conversationId = 'mutual_detail_1';
    const matchedAt = new Date('2026-05-31T14:00:00.000Z');

    const activeMatch = {
      id: conversationId,
      userId1: otherUserIdA,
      userId2: sessionUserId,
      createdAt: matchedAt,
      status: MutualMatchStatus.ACTIVE,
      user1LastReadAt: null,
      user2LastReadAt: null,
    };

    const candidateProfile = {
      id: 'prof_a',
      userId: otherUserIdA,
      nickname: 'Noa',
      gender: ProfileGender.FEMALE,
      birthDate: new Date('1992-03-15T00:00:00.000Z'),
      city: 'TLV',
      country: 'IL',
      locationLabel: 'Tel Aviv',
      desiredPartnerGenders: ['MALE'],
      photos: [{ id: 'photo_a', isPrimary: true }],
    };

    it('returns detail for ACTIVE mutual match when session user is participant', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(activeMatch);
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        candidateProfile,
      );

      const result = await service.getById(sessionUserId, conversationId);

      expect(result).toMatchObject({
        id: conversationId,
        matchedAt: matchedAt.toISOString(),
        status: 'ACTIVE',
        lastReadAt: null,
        otherUser: {
          id: otherUserIdA,
          profileId: 'prof_a',
          nickname: 'Noa',
          photoUrl: '/api/v1/me/matches/prof_a/photos/photo_a/file',
        },
      });
      expect(obs.trace).toHaveBeenCalled();
    });

    it('throws ConversationNotFoundError when conversation does not exist', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getById(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
    });

    it('throws ConversationNotFoundError when conversation is UNMATCHED', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        status: MutualMatchStatus.UNMATCHED,
      });

      await expect(
        service.getById(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
    });

    it('throws ConversationForbiddenError when session user is not a participant', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        userId1: 'user_stranger',
        userId2: otherUserIdA,
      });

      await expect(
        service.getById(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ConversationForbiddenError);
    });

    it('resolves other user as userId1 when session user is userId2', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(activeMatch);
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(
        candidateProfile,
      );

      const result = await service.getById(sessionUserId, conversationId);

      expect(result.otherUser.id).toBe(otherUserIdA);
      expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: otherUserIdA },
        select: expect.any(Object),
      });
    });

    it('returns empty profile fields when other profile is missing', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(activeMatch);
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getById(sessionUserId, conversationId);

      expect(result.otherUser).toMatchObject({
        id: otherUserIdA,
        profileId: '',
        nickname: null,
        photoUrl: null,
      });
    });
  });

  describe('markAsRead()', () => {
    const conversationId = 'mutual_read_1';

    const activeMatch = {
      id: conversationId,
      userId1: otherUserIdA,
      userId2: sessionUserId,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
      status: MutualMatchStatus.ACTIVE,
      user1LastReadAt: null,
      user2LastReadAt: null,
    };

    it('updates user1LastReadAt when session user is userId1', async () => {
      const matchAsUser1 = {
        ...activeMatch,
        userId1: sessionUserId,
        userId2: otherUserIdA,
      };
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(matchAsUser1);
      (prisma.mutualMatch.update as jest.Mock).mockResolvedValue({});

      const result = await service.markAsRead(sessionUserId, conversationId);

      expect(prisma.mutualMatch.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: { user1LastReadAt: expect.any(Date) },
      });
      expect(result.lastReadAt).toEqual(expect.any(String));
      expect(obs.trace).toHaveBeenCalled();
    });

    it('updates user2LastReadAt when session user is userId2', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(activeMatch);
      (prisma.mutualMatch.update as jest.Mock).mockResolvedValue({});

      await service.markAsRead(sessionUserId, conversationId);

      expect(prisma.mutualMatch.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: { user2LastReadAt: expect.any(Date) },
      });
    });

    it('advances timestamp on second call', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(activeMatch);
      const first = new Date('2026-05-31T10:00:00.000Z');
      const second = new Date('2026-05-31T11:00:00.000Z');
      (prisma.mutualMatch.update as jest.Mock)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      jest
        .spyOn(global, 'Date')
        .mockImplementationOnce(() => first as unknown as Date)
        .mockImplementationOnce(() => second as unknown as Date);

      const firstResult = await service.markAsRead(sessionUserId, conversationId);
      const secondResult = await service.markAsRead(sessionUserId, conversationId);

      expect(firstResult.lastReadAt).toBe(first.toISOString());
      expect(secondResult.lastReadAt).toBe(second.toISOString());
      expect(prisma.mutualMatch.update).toHaveBeenCalledTimes(2);

      jest.restoreAllMocks();
    });

    it('throws ConversationNotFoundError when conversation is UNMATCHED', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        status: MutualMatchStatus.UNMATCHED,
      });

      await expect(
        service.markAsRead(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
      expect(prisma.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('throws ConversationForbiddenError when session user is not a participant', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        userId1: 'user_stranger',
        userId2: otherUserIdA,
      });

      await expect(
        service.markAsRead(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ConversationForbiddenError);
      expect(prisma.mutualMatch.update).not.toHaveBeenCalled();
    });
  });

  describe('countUnreadForParticipant()', () => {
    const conversationId = 'mutual_unread_1';

    const activeMatch = {
      id: conversationId,
      userId1: otherUserIdA,
      userId2: sessionUserId,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
      status: MutualMatchStatus.ACTIVE,
      user1LastReadAt: null,
      user2LastReadAt: null,
    };

    it('counts all peer SENT messages when lastReadAt is null', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(activeMatch);
      (prisma.message.count as jest.Mock).mockResolvedValue(3);

      const count = await service.countUnreadForParticipant(
        sessionUserId,
        conversationId,
      );

      expect(count).toBe(3);
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          conversationId,
          senderId: otherUserIdA,
          status: MessageStatus.SENT,
        },
      });
    });

    it('counts only messages after lastReadAt', async () => {
      const lastRead = new Date('2026-05-31T12:00:00.000Z');
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        user2LastReadAt: lastRead,
      });
      (prisma.message.count as jest.Mock).mockResolvedValue(0);

      const count = await service.countUnreadForParticipant(
        sessionUserId,
        conversationId,
      );

      expect(count).toBe(0);
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          conversationId,
          senderId: otherUserIdA,
          status: MessageStatus.SENT,
          createdAt: { gt: lastRead },
        },
      });
    });

    it('does not count own messages (senderId is other user only)', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(activeMatch);
      (prisma.message.count as jest.Mock).mockResolvedValue(1);

      await service.countUnreadForParticipant(sessionUserId, conversationId);

      expect(prisma.message.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            senderId: otherUserIdA,
          }),
        }),
      );
    });
  });

  describe('getById() lastReadAt', () => {
    const conversationId = 'mutual_detail_read';

    it('returns ISO lastReadAt when session user has read timestamp', async () => {
      const readAt = new Date('2026-06-01T18:00:00.000Z');
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        id: conversationId,
        userId1: otherUserIdA,
        userId2: sessionUserId,
        createdAt: new Date('2026-05-31T14:00:00.000Z'),
        status: MutualMatchStatus.ACTIVE,
        user1LastReadAt: null,
        user2LastReadAt: readAt,
      });
      (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getById(sessionUserId, conversationId);

      expect(result.lastReadAt).toBe(readAt.toISOString());
    });
  });

  describe('unmatch()', () => {
    const conversationId = 'mutual_detail_1';

    const activeMatch = {
      id: conversationId,
      userId1: otherUserIdA,
      userId2: sessionUserId,
      createdAt: new Date('2026-05-31T10:00:00.000Z'),
      status: MutualMatchStatus.ACTIVE,
      user1LastReadAt: null,
      user2LastReadAt: null,
    };

    it('soft-unmatches ACTIVE conversation for participant', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(
        activeMatch,
      );
      (prisma.mutualMatch.update as jest.Mock).mockResolvedValue({});

      await expect(
        service.unmatch(sessionUserId, conversationId),
      ).resolves.toBeUndefined();

      expect(prisma.mutualMatch.update).toHaveBeenCalledWith({
        where: { id: conversationId },
        data: expect.objectContaining({
          status: MutualMatchStatus.UNMATCHED,
          unmatchedByUserId: sessionUserId,
          unmatchedAt: expect.any(Date),
        }),
      });
      expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledWith(
        otherUserIdA,
        'unmatch',
      );
      expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledWith(
        sessionUserId,
        'unmatch',
      );
      expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledTimes(2);
      expect(obs.trace).toHaveBeenCalled();
    });

    it('throws ConversationNotFoundError when conversation does not exist', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.unmatch(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
      expect(prisma.mutualMatch.update).not.toHaveBeenCalled();
      expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
    });

    it('throws ConversationNotFoundError when conversation is already UNMATCHED', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        status: MutualMatchStatus.UNMATCHED,
      });

      await expect(
        service.unmatch(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ConversationNotFoundError);
      expect(prisma.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('throws ConversationForbiddenError when session user is not a participant', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        userId1: 'user_stranger',
        userId2: otherUserIdA,
      });

      await expect(
        service.unmatch(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ConversationForbiddenError);
      expect(prisma.mutualMatch.update).not.toHaveBeenCalled();
    });
  });
});

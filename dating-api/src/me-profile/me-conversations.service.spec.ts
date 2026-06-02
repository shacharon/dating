import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MessageStatus, MutualMatchStatus, ProfileGender } from '@prisma/client';
import { MeConversationsService } from './me-conversations.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';

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
  } as unknown as PrismaService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let service: MeConversationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeConversationsService(prisma, obs);
    (prisma.message.count as jest.Mock).mockResolvedValue(0);
  });

  it('returns empty list when user has no ACTIVE mutual matches', async () => {
    (prisma.mutualMatch.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.list(sessionUserId);

    expect(result).toEqual({ conversations: [] });
    expect(prisma.userProfile.findMany).not.toHaveBeenCalled();
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
    expect(result.conversations[1].id).toBe('mutual_old');
    expect(result.conversations[1].otherUser.id).toBe(otherUserIdB);
    expect(result.conversations[1].otherUser.photoUrl).toBeNull();
    expect(result.conversations[0].matchedAt).toBe(newer.toISOString());
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
    it('returns unreadCount from message.count when lastReadAt is null', async () => {
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
      (prisma.message.count as jest.Mock).mockResolvedValue(3);

      const result = await service.list(sessionUserId);

      expect(result.conversations[0].unreadCount).toBe(3);
    });

    it('returns zero unread when lastReadAt is set and count is 0', async () => {
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
      (prisma.message.count as jest.Mock).mockResolvedValue(0);

      const result = await service.list(sessionUserId);

      expect(result.conversations[0].unreadCount).toBe(0);
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          conversationId: 'mutual_1',
          senderId: otherUserIdA,
          status: MessageStatus.SENT,
          createdAt: { gt: readAt },
        },
      });
    });

    it('counts only messages from the other user', async () => {
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
      (prisma.message.count as jest.Mock).mockResolvedValue(1);

      await service.list(sessionUserId);

      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          conversationId: 'mutual_1',
          senderId: otherUserIdA,
          status: MessageStatus.SENT,
        },
      });
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
      (prisma.message.count as jest.Mock)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3);

      const result = await service.list(sessionUserId);

      expect(result.conversations[0].id).toBe('mutual_old');
      expect(result.conversations[0].unreadCount).toBe(3);
      expect(result.conversations[1].id).toBe('mutual_new');
      expect(result.conversations[1].unreadCount).toBe(0);
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

    it('throws NotFoundException when conversation is UNMATCHED', async () => {
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
      ).rejects.toBeInstanceOf(NotFoundException);
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

    it('throws NotFoundException when conversation does not exist', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getById(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when conversation is UNMATCHED', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        status: MutualMatchStatus.UNMATCHED,
      });

      await expect(
        service.getById(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when session user is not a participant', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        userId1: 'user_stranger',
        userId2: otherUserIdA,
      });

      await expect(
        service.getById(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ForbiddenException);
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

    it('throws NotFoundException when conversation is UNMATCHED', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        status: MutualMatchStatus.UNMATCHED,
      });

      await expect(
        service.markAsRead(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when session user is not a participant', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        userId1: 'user_stranger',
        userId2: otherUserIdA,
      });

      await expect(
        service.markAsRead(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ForbiddenException);
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
      expect(obs.trace).toHaveBeenCalled();
    });

    it('throws NotFoundException when conversation does not exist', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.unmatch(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when conversation is already UNMATCHED', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        status: MutualMatchStatus.UNMATCHED,
      });

      await expect(
        service.unmatch(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.mutualMatch.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when session user is not a participant', async () => {
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        ...activeMatch,
        userId1: 'user_stranger',
        userId2: otherUserIdA,
      });

      await expect(
        service.unmatch(sessionUserId, conversationId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.mutualMatch.update).not.toHaveBeenCalled();
    });
  });
});

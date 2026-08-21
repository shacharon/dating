import { MatchActionType, MutualMatchStatus } from '@prisma/client';
import { MutualMatchesService } from './mutual-matches.service';
import type { PrismaService } from '../prisma/prisma.service';
import { PrismaMatchRepository } from './repositories/prisma-match.repository';

describe('MutualMatchesService', () => {
  const prisma = {
    matchAction: { findUnique: jest.fn() },
    mutualMatch: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  } as unknown as PrismaService;

  let service: MutualMatchesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MutualMatchesService(new PrismaMatchRepository(prisma));
  });

  describe('sortUserPair', () => {
    it('orders lower id first regardless of argument order', () => {
      expect(service.sortUserPair('user-bbb', 'user-aaa')).toEqual([
        'user-aaa',
        'user-bbb',
      ]);
      expect(service.sortUserPair('user-aaa', 'user-bbb')).toEqual([
        'user-aaa',
        'user-bbb',
      ]);
    });
  });

  describe('detectAndCreateMutualMatch', () => {
    const actorUserId = 'user_me_profile_1';
    const targetUserId = 'user_match_action_cand_1';

    it('creates MutualMatch when reverse LIKE exists', async () => {
      (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue({
        action: MatchActionType.LIKE,
      });
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue(null);
      const createdAt = new Date('2026-05-31T10:00:00.000Z');
      (prisma.mutualMatch.create as jest.Mock).mockResolvedValue({
        id: 'mutual-1',
        userId1: targetUserId,
        userId2: actorUserId,
        status: MutualMatchStatus.ACTIVE,
        createdAt,
        unmatchedAt: null,
        unmatchedByUserId: null,
      });

      const result = await service.detectAndCreateMutualMatch(
        actorUserId,
        targetUserId,
      );

      expect(result).toMatchObject({
        created: true,
        mutualMatch: {
          id: 'mutual-1',
          status: MutualMatchStatus.ACTIVE,
        },
      });
      expect(prisma.mutualMatch.create).toHaveBeenCalledWith({
        data: {
          userId1: targetUserId,
          userId2: actorUserId,
          status: MutualMatchStatus.ACTIVE,
        },
      });
    });

    it('returns null when reverse action is missing', async () => {
      (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.detectAndCreateMutualMatch(actorUserId, targetUserId),
      ).resolves.toBeNull();

      expect(prisma.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('returns null when reverse action is PASS', async () => {
      (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue({
        action: MatchActionType.PASS,
      });

      await expect(
        service.detectAndCreateMutualMatch(actorUserId, targetUserId),
      ).resolves.toBeNull();

      expect(prisma.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('returns null when reverse action is BLOCK', async () => {
      (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue({
        action: MatchActionType.BLOCK,
      });

      await expect(
        service.detectAndCreateMutualMatch(actorUserId, targetUserId),
      ).resolves.toBeNull();

      expect(prisma.mutualMatch.create).not.toHaveBeenCalled();
    });

    it('is idempotent when ACTIVE mutual already exists', async () => {
      (prisma.matchAction.findUnique as jest.Mock).mockResolvedValue({
        action: MatchActionType.LIKE,
      });
      (prisma.mutualMatch.findUnique as jest.Mock).mockResolvedValue({
        id: 'mutual-existing',
        userId1: targetUserId,
        userId2: actorUserId,
        status: MutualMatchStatus.ACTIVE,
        createdAt: new Date('2026-05-31T09:00:00.000Z'),
        unmatchedAt: null,
        unmatchedByUserId: null,
      });

      const result = await service.detectAndCreateMutualMatch(
        actorUserId,
        targetUserId,
      );

      expect(result).toMatchObject({ created: false });
      expect(prisma.mutualMatch.create).not.toHaveBeenCalled();
    });

  });

  describe('findActiveByUserPair', () => {
    it('queries with sorted user ids and ACTIVE status', async () => {
      (prisma.mutualMatch.findFirst as jest.Mock).mockResolvedValue({
        id: 'mutual-1',
        status: MutualMatchStatus.ACTIVE,
      });

      await service.findActiveByUserPair('user-bbb', 'user-aaa');

      expect(prisma.mutualMatch.findFirst).toHaveBeenCalledWith({
        where: {
          userId1: 'user-aaa',
          userId2: 'user-bbb',
          status: MutualMatchStatus.ACTIVE,
        },
      });
    });
  });
});

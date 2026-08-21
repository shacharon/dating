import { MatchActionType, MutualMatchStatus } from '@prisma/client';
import { MATCH_LIST_RANK_PERSIST_CHUNK } from '../match-list-rank-persist.constants';
import { PrismaMatchRepository } from './prisma-match.repository';
import type { PrismaService } from '../../prisma/prisma.service';

describe('PrismaMatchRepository', () => {
  const matchAction = {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  };
  const mutualMatch = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  };
  const matchListRank = {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const prisma = {
    matchAction,
    mutualMatch,
    matchListRank,
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  let repo: PrismaMatchRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn(prisma),
    );
    matchListRank.deleteMany.mockResolvedValue({ count: 0 });
    matchListRank.upsert.mockResolvedValue({});
    repo = new PrismaMatchRepository(prisma);
  });

  it('upsertActionAndDetectMutual runs LIKE detect inside the same transaction client', async () => {
    const row = {
      id: 'a1',
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'p2',
      action: MatchActionType.LIKE,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    matchAction.upsert.mockResolvedValue(row);
    matchAction.findUnique.mockResolvedValue({ action: MatchActionType.LIKE });
    mutualMatch.findUnique.mockResolvedValue(null);
    mutualMatch.create.mockResolvedValue({
      id: 'mm1',
      userId1: 'u1',
      userId2: 'u2',
      status: MutualMatchStatus.ACTIVE,
    });

    const result = await repo.upsertActionAndDetectMutual({
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'p2',
      action: MatchActionType.LIKE,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(matchAction.upsert).toHaveBeenCalled();
    expect(matchAction.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          actorUserId_targetUserId: {
            actorUserId: 'u2',
            targetUserId: 'u1',
          },
        },
      }),
    );
    expect(result.detectResult).toEqual({
      mutualMatch: expect.objectContaining({ id: 'mm1' }),
      created: true,
    });
  });

  it('upsertActionAndDetectMutual skips mutual detect for BLOCK', async () => {
    const row = {
      id: 'a1',
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'p2',
      action: MatchActionType.BLOCK,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    matchAction.upsert.mockResolvedValue(row);

    const result = await repo.upsertActionAndDetectMutual({
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'p2',
      action: MatchActionType.BLOCK,
    });

    expect(result.detectResult).toBeNull();
    expect(matchAction.findUnique).not.toHaveBeenCalled();
    expect(mutualMatch.create).not.toHaveBeenCalled();
  });

  it('replaceRankSnapshot chunks upserts then deletes stale ranks', async () => {
    const rows = Array.from({ length: MATCH_LIST_RANK_PERSIST_CHUNK + 2 }, (_, i) => ({
      candidateProfileId: `c${i}`,
      matchScore: 1 - i * 0.001,
      hardBlocked: false,
    }));
    matchListRank.deleteMany.mockResolvedValue({ count: 3 });

    const result = await repo.replaceRankSnapshot('viewer', rows, new Date('2026-01-02'));

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(matchListRank.upsert).toHaveBeenCalledTimes(rows.length);
    expect(matchListRank.deleteMany).toHaveBeenCalledWith({
      where: {
        viewerUserId: 'viewer',
        candidateProfileId: { notIn: rows.map((r) => r.candidateProfileId) },
      },
    });
    expect(result).toEqual({ rowsWritten: rows.length, rowsDeleted: 3 });
  });
});

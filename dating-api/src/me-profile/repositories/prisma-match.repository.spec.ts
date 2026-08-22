import { MatchActionType, MutualMatchStatus } from '@prisma/client';
import { LATEST_EVAL_BATCH_SIZE } from '../me-profile-analysis.service';
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
    update: jest.fn(),
    updateMany: jest.fn(),
  };
  const matchListRank = {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const userProfileEvaluation = {
    findFirst: jest.fn(),
  };
  const prisma = {
    matchAction,
    mutualMatch,
    matchListRank,
    userProfileEvaluation,
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
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
    expect(result.unmatchedExisting).toBe(false);
  });

  it('upsertActionAndDetectMutual soft-unmatches ACTIVE pair on BLOCK', async () => {
    const row = {
      id: 'a1',
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'p2',
      action: MatchActionType.BLOCK,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    matchAction.upsert.mockResolvedValue(row);
    mutualMatch.updateMany.mockResolvedValue({ count: 1 });

    const result = await repo.upsertActionAndDetectMutual({
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'p2',
      action: MatchActionType.BLOCK,
    });

    expect(result.detectResult).toBeNull();
    expect(result.unmatchedExisting).toBe(true);
    expect(matchAction.findUnique).not.toHaveBeenCalled();
    expect(mutualMatch.create).not.toHaveBeenCalled();
    expect(mutualMatch.updateMany).toHaveBeenCalledWith({
      where: {
        userId1: 'u1',
        userId2: 'u2',
        status: MutualMatchStatus.ACTIVE,
      },
      data: {
        status: MutualMatchStatus.UNMATCHED,
        unmatchedAt: expect.any(Date),
        unmatchedByUserId: 'u1',
      },
    });
  });

  it('upsertActionAndDetectMutual reactivates UNMATCHED on mutual LIKE', async () => {
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
    mutualMatch.findUnique.mockResolvedValue({
      id: 'mm1',
      userId1: 'u1',
      userId2: 'u2',
      status: MutualMatchStatus.UNMATCHED,
      unmatchedAt: new Date('2026-01-01'),
      unmatchedByUserId: 'u1',
    });
    mutualMatch.update.mockResolvedValue({
      id: 'mm1',
      userId1: 'u1',
      userId2: 'u2',
      status: MutualMatchStatus.ACTIVE,
      unmatchedAt: null,
      unmatchedByUserId: null,
    });

    const result = await repo.upsertActionAndDetectMutual({
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'p2',
      action: MatchActionType.LIKE,
    });

    expect(mutualMatch.create).not.toHaveBeenCalled();
    expect(mutualMatch.update).toHaveBeenCalledWith({
      where: { id: 'mm1' },
      data: {
        status: MutualMatchStatus.ACTIVE,
        unmatchedAt: null,
        unmatchedByUserId: null,
      },
    });
    expect(result.detectResult).toEqual({
      mutualMatch: expect.objectContaining({
        id: 'mm1',
        status: MutualMatchStatus.ACTIVE,
      }),
      created: true,
    });
    expect(result.unmatchedExisting).toBe(false);
  });

  it('upsertActionAndDetectMutual soft-unmatches on PASS (idempotent when none)', async () => {
    const row = {
      id: 'a1',
      actorUserId: 'u2',
      targetUserId: 'u1',
      targetProfileIdSnapshot: 'p1',
      action: MatchActionType.PASS,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    matchAction.upsert.mockResolvedValue(row);
    mutualMatch.updateMany.mockResolvedValue({ count: 0 });

    const result = await repo.upsertActionAndDetectMutual({
      actorUserId: 'u2',
      targetUserId: 'u1',
      targetProfileIdSnapshot: 'p1',
      action: MatchActionType.PASS,
    });

    expect(result.unmatchedExisting).toBe(false);
    expect(mutualMatch.updateMany).toHaveBeenCalledWith({
      where: {
        userId1: 'u1',
        userId2: 'u2',
        status: MutualMatchStatus.ACTIVE,
      },
      data: expect.objectContaining({
        status: MutualMatchStatus.UNMATCHED,
        unmatchedByUserId: 'u2',
      }),
    });
  });

  it('deleteActionByActorTarget soft-unmatches when softUnmatchIfLike', async () => {
    matchAction.delete.mockResolvedValue({});
    mutualMatch.updateMany.mockResolvedValue({ count: 1 });

    const result = await repo.deleteActionByActorTarget('u1', 'u2', true);

    expect(result).toEqual({ unmatchedExisting: true });
    expect(matchAction.delete).toHaveBeenCalled();
    expect(mutualMatch.updateMany).toHaveBeenCalled();
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

  it('findLatestEvaluationForProfile orders by createdAt desc take 1', async () => {
    userProfileEvaluation.findFirst.mockResolvedValue({
      id: 'e1',
      profileId: 'p1',
      version: 'v1',
      evaluationJson: {},
      createdAt: new Date('2026-01-01'),
    });

    await repo.findLatestEvaluationForProfile('p1');

    expect(userProfileEvaluation.findFirst).toHaveBeenCalledWith({
      where: { profileId: 'p1' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
  });

  it('findLatestEvaluationsForProfileIds chunks above LATEST_EVAL_BATCH_SIZE', async () => {
    const ids = Array.from(
      { length: LATEST_EVAL_BATCH_SIZE + 1 },
      (_, i) => `p${i}`,
    );
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    await repo.findLatestEvaluationsForProfileIds(ids);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('findLatestEvaluationsForProfileIds maps DISTINCT ON rows by profileId', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      {
        profileId: 'p1',
        evaluationJson: { ok: true },
        createdAt: '2026-02-01T00:00:00.000Z',
        version: 'v1',
      },
    ]);

    const map = await repo.findLatestEvaluationsForProfileIds(['p1', 'p1']);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(map.get('p1')).toEqual({
      profileId: 'p1',
      evaluationJson: { ok: true },
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
      version: 'v1',
    });
  });
});

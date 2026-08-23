import { MeMatchesService } from '../core/me-matches.service';
import type { MatchListRankSnapshot } from '../core/me-matches.service';
import { createMeMatchesServiceForTest } from '../support/me-matches.test-harness';
import { MATCH_LIST_RANK_PERSIST_CHUNK } from './match-list-rank-persist.constants';

describe('MeMatchesService MatchListRank persist', () => {
  function makeService(prisma: {
    matchListRank: {
      deleteMany: jest.Mock;
      upsert: jest.Mock;
    };
    $transaction: jest.Mock;
  }) {
    return createMeMatchesServiceForTest({
      prisma: prisma as never,
      obs: { trace: jest.fn() } as never,
      photoStorage: {} as never,
      mutualMatches: {} as never,
      analytics: { track: jest.fn() } as never,
      cache: { del: jest.fn().mockResolvedValue(undefined), get: jest.fn(), set: jest.fn(), setNx: jest.fn() } as never,
      matchNarrativeGenerator: {} as never,
      matchNarrativeCache: {} as never,
      matchListRankQueue: { enqueueRebuild: jest.fn() } as never,
    });
  }

  it('not_ready clears all ranks for viewer', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 3 });
    const prisma = {
      matchListRank: { deleteMany, upsert: jest.fn() },
      $transaction: jest.fn(),
    };
    const svc = makeService(prisma);
    const snapshot: MatchListRankSnapshot = {
      status: 'not_ready',
      reason: 'no_profile',
      rows: [],
    };
    const result = await svc.persistMatchListRankSnapshot('user_v', snapshot);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { viewerUserId: 'user_v' },
    });
    expect(result).toEqual({ rowsWritten: 0, rowsDeleted: 3 });
  });

  it('ready empty rows clears ranks', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = {
      matchListRank: { deleteMany, upsert: jest.fn() },
      $transaction: jest.fn(),
    };
    const svc = makeService(prisma);
    const result = await svc.persistMatchListRankSnapshot('user_v', {
      status: 'ready',
      rows: [],
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { viewerUserId: 'user_v' },
    });
    expect(result.rowsWritten).toBe(0);
    expect(result.rowsDeleted).toBe(2);
  });

  it('ready upserts then deletes stale ids (upsert-before-delete)', async () => {
    const callOrder: string[] = [];
    const deleteMany = jest.fn().mockImplementation(async () => {
      callOrder.push('deleteMany');
      return { count: 1 };
    });
    const upsert = jest.fn().mockImplementation(async () => {
      callOrder.push('upsert');
      return {};
    });
    const prisma = {
      matchListRank: { deleteMany, upsert },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<void>) => {
        callOrder.push('txn');
        await fn({
          matchListRank: { deleteMany: jest.fn(), upsert },
        });
      }),
    };
    const svc = makeService(prisma);
    const result = await svc.persistMatchListRankSnapshot('user_v', {
      status: 'ready',
      rows: [
        {
          candidateProfileId: 'prof_a',
          matchScore: -1,
          hardBlocked: false,
        },
        {
          candidateProfileId: 'prof_b',
          matchScore: 80,
          hardBlocked: true,
        },
      ],
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0].create.matchScore).toBe(-1);
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        viewerUserId: 'user_v',
        candidateProfileId: { notIn: ['prof_a', 'prof_b'] },
      },
    });
    expect(callOrder.indexOf('upsert')).toBeGreaterThan(-1);
    expect(callOrder.indexOf('deleteMany')).toBeGreaterThan(
      callOrder.lastIndexOf('upsert'),
    );
    expect(result).toEqual({ rowsWritten: 2, rowsDeleted: 1 });
  });

  it('splits upserts across chunk transactions for large snapshots', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      matchListRank: { deleteMany, upsert },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<void>) =>
        fn({
          matchListRank: { deleteMany: jest.fn(), upsert },
        }),
      ),
    };
    const svc = makeService(prisma);
    const rows = Array.from(
      { length: MATCH_LIST_RANK_PERSIST_CHUNK + 1 },
      (_, i) => ({
        candidateProfileId: `prof_${i}`,
        matchScore: i,
        hardBlocked: false,
      }),
    );
    const result = await svc.persistMatchListRankSnapshot('user_v', {
      status: 'ready',
      rows,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledTimes(MATCH_LIST_RANK_PERSIST_CHUNK + 1);
    expect(deleteMany).toHaveBeenCalledTimes(1);
    expect(result.rowsWritten).toBe(MATCH_LIST_RANK_PERSIST_CHUNK + 1);
  });

  it('budget_exceeded persist is a no-op (does not clear ranks)', async () => {
    const deleteMany = jest.fn();
    const prisma = {
      matchListRank: { deleteMany, upsert: jest.fn() },
      $transaction: jest.fn(),
    };
    const svc = makeService(prisma);
    const result = await svc.persistMatchListRankSnapshot('user_v', {
      status: 'budget_exceeded',
      rows: [],
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({ rowsWritten: 0, rowsDeleted: 0 });
  });

  it('rebuildMatchListRanks skips persist+invalidate on budget_exceeded', async () => {
    const prisma = {
      matchListRank: { deleteMany: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn(),
    };
    const cache = { del: jest.fn().mockResolvedValue(undefined), get: jest.fn(), set: jest.fn(), setNx: jest.fn() };
    const svc = createMeMatchesServiceForTest({
      prisma: prisma as never,
      obs: { trace: jest.fn() } as never,
      photoStorage: {} as never,
      mutualMatches: {} as never,
      analytics: { track: jest.fn() } as never,
      cache: cache as never,
      matchNarrativeGenerator: {} as never,
      matchNarrativeCache: {} as never,
      matchListRankQueue: { enqueueRebuild: jest.fn() } as never,
    });
    jest.spyOn(svc, 'buildMatchListRankSnapshot').mockResolvedValue({
      status: 'budget_exceeded',
      rows: [],
    });
    const persistSpy = jest.spyOn(svc, 'persistMatchListRankSnapshot');
    const result = await svc.rebuildMatchListRanks('user_v', 'test');
    expect(result.status).toBe('budget_exceeded');
    expect(result.rowsWritten).toBe(0);
    expect(persistSpy).not.toHaveBeenCalled();
    expect(cache.del).not.toHaveBeenCalled();
  });
});

import { MeMatchesService } from './me-matches.service';
import type { MatchListRankSnapshot } from './me-matches.service';

describe('MeMatchesService MatchListRank persist', () => {
  function makeService(prisma: {
    matchListRank: {
      deleteMany: jest.Mock;
      upsert: jest.Mock;
    };
    $transaction: jest.Mock;
  }) {
    return new MeMatchesService(
      prisma as never,
      { trace: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      { del: jest.fn().mockResolvedValue(undefined) } as never,
      {} as never,
      {} as never,
    );
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

  it('ready upserts and deletes stale ids', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = {
      matchListRank: { deleteMany, upsert },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<void>) =>
        fn({
          matchListRank: { deleteMany, upsert },
        }),
      ),
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
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        viewerUserId: 'user_v',
        candidateProfileId: { notIn: ['prof_a', 'prof_b'] },
      },
    });
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert.mock.calls[0][0].create.matchScore).toBe(-1);
    expect(result).toEqual({ rowsWritten: 2, rowsDeleted: 1 });
  });
});

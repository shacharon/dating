import { MatchListRankQueueService } from './match-list-rank.worker';
import { ModuleRef } from '@nestjs/core';
import {
  MATCH_LIST_RANK_REBUILD_PORT,
  type MatchListRankRebuildPort,
} from './match-list-rank.ports';

describe('MatchListRankQueueService budget requeue', () => {
  const rebuildMatchListRanks = jest.fn();
  const rebuildPort = {
    rebuildMatchListRanks,
  } as unknown as MatchListRankRebuildPort;

  const moduleRef = {
    get: jest.fn().mockReturnValue(rebuildPort),
  } as unknown as ModuleRef;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REDIS_URL;
    (moduleRef.get as jest.Mock).mockReturnValue(rebuildPort);
  });

  it('requeues once with rebuild_budget when budget_exceeded and reason differs', async () => {
    rebuildMatchListRanks
      .mockResolvedValueOnce({
        status: 'budget_exceeded',
        rowsWritten: 0,
        rowsDeleted: 0,
        rebuildMs: 5,
      })
      .mockResolvedValueOnce({
        status: 'ready',
        rowsWritten: 1,
        rowsDeleted: 0,
        rebuildMs: 3,
      });

    const svc = new MatchListRankQueueService(moduleRef);
    await svc.onModuleInit();
    const enqueueSpy = jest.spyOn(svc, 'enqueueRebuild');

    await svc.enqueueRebuild('user_v', 'preferences_changed');
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(rebuildMatchListRanks).toHaveBeenCalledWith(
      'user_v',
      'preferences_changed',
    );
    expect(enqueueSpy).toHaveBeenCalledWith('user_v', 'rebuild_budget');
    await svc.onModuleDestroy();
  });

  it('does not requeue when reason is already rebuild_budget', async () => {
    rebuildMatchListRanks.mockResolvedValue({
      status: 'budget_exceeded',
      rowsWritten: 0,
      rowsDeleted: 0,
      rebuildMs: 5,
    });

    const svc = new MatchListRankQueueService(moduleRef);
    await svc.onModuleInit();
    const enqueueSpy = jest.spyOn(svc, 'enqueueRebuild');

    await svc.enqueueRebuild('user_v', 'rebuild_budget');
    await new Promise((r) => setImmediate(r));

    expect(rebuildMatchListRanks).toHaveBeenCalledTimes(1);
    expect(rebuildMatchListRanks).toHaveBeenCalledWith(
      'user_v',
      'rebuild_budget',
    );
    // Initial enqueueRebuild call only — no follow-up from runJob
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    await svc.onModuleDestroy();
  });
});

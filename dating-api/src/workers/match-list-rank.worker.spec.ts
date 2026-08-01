import { ModuleRef } from '@nestjs/core';
import { MatchListRankQueueService } from './match-list-rank.worker';
import {
  MATCH_LIST_RANK_REBUILD_PORT,
  type MatchListRankRebuildPort,
} from './match-list-rank.ports';

describe('MatchListRankQueueService', () => {
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
    rebuildMatchListRanks.mockResolvedValue({
      status: 'ready',
      rowsWritten: 2,
      rowsDeleted: 1,
      rebuildMs: 12,
    });
  });

  it('enqueueRebuild runs inline when Bull disabled', async () => {
    const svc = new MatchListRankQueueService(moduleRef);
    await svc.onModuleInit();
    expect(svc.isBullEnabled()).toBe(false);

    const id = await svc.enqueueRebuild('user_v', 'test');
    expect(id).toBe('inline:user_v');

    await new Promise((r) => setImmediate(r));
    expect(moduleRef.get).toHaveBeenCalledWith(MATCH_LIST_RANK_REBUILD_PORT, {
      strict: false,
    });
    expect(rebuildMatchListRanks).toHaveBeenCalledWith('user_v', 'test');
    await svc.onModuleDestroy();
  });

  it('enqueueRebuild skips blank viewerUserId', async () => {
    const svc = new MatchListRankQueueService(moduleRef);
    await svc.onModuleInit();
    expect(await svc.enqueueRebuild('  ')).toBe('skipped:blank');
    expect(rebuildMatchListRanks).not.toHaveBeenCalled();
    await svc.onModuleDestroy();
  });
});

import { MatchListRankQueueService } from './match-list-rank.worker';
import type { MeMatchesService } from '../me-profile/me-matches.service';

describe('MatchListRankQueueService', () => {
  const rebuildMatchListRanks = jest.fn();
  const meMatches = {
    rebuildMatchListRanks,
  } as unknown as MeMatchesService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.REDIS_URL;
    rebuildMatchListRanks.mockResolvedValue({
      status: 'ready',
      rowsWritten: 2,
      rowsDeleted: 1,
      rebuildMs: 12,
    });
  });

  it('enqueueRebuild runs inline when Bull disabled', async () => {
    const svc = new MatchListRankQueueService(meMatches);
    await svc.onModuleInit();
    expect(svc.isBullEnabled()).toBe(false);

    const id = await svc.enqueueRebuild('user_v', 'test');
    expect(id).toBe('inline:user_v');

    await new Promise((r) => setImmediate(r));
    expect(rebuildMatchListRanks).toHaveBeenCalledWith('user_v', 'test');
    await svc.onModuleDestroy();
  });

  it('enqueueRebuild skips blank viewerUserId', async () => {
    const svc = new MatchListRankQueueService(meMatches);
    await svc.onModuleInit();
    expect(await svc.enqueueRebuild('  ')).toBe('skipped:blank');
    expect(rebuildMatchListRanks).not.toHaveBeenCalled();
    await svc.onModuleDestroy();
  });
});

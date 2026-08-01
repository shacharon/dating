import { ProfileAnalysisQueueService } from './profile-analysis.worker';
import type { MeProfileAnalysisService } from '../me-profile/me-profile-analysis.service';
import type { MeMatchesService } from '../me-profile/me-matches.service';
import type { MatchListRankQueuePort } from './match-list-rank.ports';

describe('ProfileAnalysisQueueService match list rank enqueue', () => {
  const analysis = {
    runForUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as MeProfileAnalysisService;

  const meMatches = {
    invalidateMatchListCache: jest.fn().mockResolvedValue(undefined),
  } as unknown as MeMatchesService;

  const matchListRankQueue = {
    enqueueRebuild: jest.fn().mockResolvedValue('inline:user'),
  } as unknown as MatchListRankQueuePort;

  let service: ProfileAnalysisQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileAnalysisQueueService(
      analysis,
      meMatches,
      matchListRankQueue,
    );
  });

  it('runJob finally enqueues analysis_complete rebuild', async () => {
    await (
      service as unknown as {
        runJob: (data: { userId: string; profileId: string }) => Promise<void>;
      }
    ).runJob({ userId: 'user_a', profileId: 'prof_a' });

    expect(meMatches.invalidateMatchListCache).toHaveBeenCalledWith('user_a');
    expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledWith(
      'user_a',
      'analysis_complete',
    );
  });

  it('runJob enqueues analysis_complete even when analysis throws', async () => {
    (analysis.runForUser as jest.Mock).mockRejectedValueOnce(
      new Error('analysis failed'),
    );

    await expect(
      (
        service as unknown as {
          runJob: (data: {
            userId: string;
            profileId: string;
          }) => Promise<void>;
        }
      ).runJob({ userId: 'user_b', profileId: 'prof_b' }),
    ).rejects.toThrow('analysis failed');

    expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledWith(
      'user_b',
      'analysis_complete',
    );
  });
});

import { ProfileAnalysisQueueService } from './profile-analysis.worker';
import { profileAnalysisJobId } from './profile-analysis.queue';
import type { MeProfileAnalysisService } from '../me-profile/me-profile-analysis.service';
import type { MeMatchesService } from '../me-profile/me-matches.service';
import type { MatchListRankQueuePort } from './match-list-rank.ports';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import { ErrorCodes } from '../logging/error-codes';
import { recordQueueEvent } from '../observability/custom-metrics';

jest.mock('../observability/custom-metrics', () => ({
  recordProfileAnalysisDurationMs: jest.fn(),
  recordQueueEvent: jest.fn(),
}));

describe('ProfileAnalysisQueueService', () => {
  const analysis = {
    runForUser: jest.fn(),
  } as unknown as MeProfileAnalysisService;

  const meMatches = {
    invalidateMatchListCache: jest.fn().mockResolvedValue(undefined),
  } as unknown as MeMatchesService;

  const matchListRankQueue = {
    enqueueRebuild: jest.fn().mockResolvedValue('inline:user'),
  } as unknown as MatchListRankQueuePort;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let service: ProfileAnalysisQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    (analysis.runForUser as jest.Mock).mockResolvedValue({ status: 'success' });
    service = new ProfileAnalysisQueueService(
      analysis,
      meMatches,
      matchListRankQueue,
      obs,
    );
  });

  async function runJob(data: {
    userId: string;
    profileId: string;
  }): Promise<void> {
    await (
      service as unknown as {
        runJob: (d: { userId: string; profileId: string }) => Promise<void>;
      }
    ).runJob(data);
  }

  it('on success invalidates cache and enqueues analysis_complete rebuild', async () => {
    await runJob({ userId: 'user_a', profileId: 'prof_a' });

    expect(meMatches.invalidateMatchListCache).toHaveBeenCalledWith('user_a');
    expect(matchListRankQueue.enqueueRebuild).toHaveBeenCalledWith(
      'user_a',
      'analysis_complete',
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('rank side-effects ok'),
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_RANK_ENQUEUED,
    );
  });

  it('on failed outcome skips cache invalidate and rebuild', async () => {
    (analysis.runForUser as jest.Mock).mockResolvedValueOnce({
      status: 'failed',
    });

    await runJob({ userId: 'user_b', profileId: 'prof_b' });

    expect(meMatches.invalidateMatchListCache).not.toHaveBeenCalled();
    expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('outcome=failed'),
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_RANK_SKIPPED,
    );
  });

  it('on skipped outcome skips cache invalidate and rebuild', async () => {
    (analysis.runForUser as jest.Mock).mockResolvedValueOnce({
      status: 'skipped',
    });

    await runJob({ userId: 'user_c', profileId: 'prof_c' });

    expect(meMatches.invalidateMatchListCache).not.toHaveBeenCalled();
    expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('outcome=skipped'),
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_RANK_SKIPPED,
    );
  });

  it('on throw does not enqueue rebuild and rethrows', async () => {
    (analysis.runForUser as jest.Mock).mockRejectedValueOnce(
      new Error('analysis failed'),
    );

    await expect(
      runJob({ userId: 'user_d', profileId: 'prof_d' }),
    ).rejects.toThrow('analysis failed');

    expect(meMatches.invalidateMatchListCache).not.toHaveBeenCalled();
    expect(matchListRankQueue.enqueueRebuild).not.toHaveBeenCalled();
    expect(obs.error).toHaveBeenCalledWith(
      expect.stringContaining('run threw'),
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_RUN_FAILED,
      expect.any(Error),
    );
    expect(recordQueueEvent).toHaveBeenCalledWith('profile-analysis', 'failed');
  });

  it('coalesces when Bull rejects duplicate jobId', async () => {
    const jobId = profileAnalysisJobId('user_e');
    const add = jest
      .fn()
      .mockRejectedValue(new Error(`Job ${jobId} already exists`));
    (
      service as unknown as {
        queue: { add: jest.Mock };
        bullEnabled: boolean;
      }
    ).queue = { add };
    (service as unknown as { bullEnabled: boolean }).bullEnabled = true;

    const result = await service.enqueueOrRunInline({
      userId: 'user_e',
      profileId: 'prof_e',
    });

    expect(result).toBe(jobId);
    expect(recordQueueEvent).toHaveBeenCalledWith(
      'profile-analysis',
      'coalesced',
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('coalesced'),
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_COALESCED,
    );
  });

  it('enqueues with stable jobId', async () => {
    const jobId = profileAnalysisJobId('user_f');
    const add = jest.fn().mockResolvedValue({ id: jobId });
    (
      service as unknown as {
        queue: { add: jest.Mock };
        bullEnabled: boolean;
      }
    ).queue = { add };
    (service as unknown as { bullEnabled: boolean }).bullEnabled = true;

    const result = await service.enqueueOrRunInline({
      userId: 'user_f',
      profileId: 'prof_f',
    });

    expect(result).toBe(jobId);
    expect(recordQueueEvent).toHaveBeenCalledWith(
      'profile-analysis',
      'enqueued',
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('enqueued'),
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_ENQUEUED,
    );
  });

  it('rethrows non-coalesce Bull errors with ENQUEUE_FAILED', async () => {
    const add = jest.fn().mockRejectedValue(new Error('Redis connection lost'));
    (
      service as unknown as {
        queue: { add: jest.Mock };
        bullEnabled: boolean;
      }
    ).queue = { add };
    (service as unknown as { bullEnabled: boolean }).bullEnabled = true;

    await expect(
      service.enqueueOrRunInline({
        userId: 'user_g',
        profileId: 'prof_g',
      }),
    ).rejects.toThrow('Redis connection lost');

    expect(obs.error).toHaveBeenCalledWith(
      expect.stringContaining('enqueue failed'),
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_ENQUEUE_FAILED,
      expect.any(Error),
    );
    expect(recordQueueEvent).toHaveBeenCalledWith('profile-analysis', 'failed');
  });

  it('inline when Bull disabled', async () => {
    const result = await service.enqueueOrRunInline({
      userId: 'user_h',
      profileId: 'prof_h',
    });
    expect(result).toBe('inline:prof_h');
    expect(recordQueueEvent).toHaveBeenCalledWith('profile-analysis', 'inline');
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('inline'),
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_INLINE,
    );
  });

  it('returns skipped:blank for blank userId', async () => {
    const result = await service.enqueueOrRunInline({
      userId: '   ',
      profileId: 'prof_blank',
    });
    expect(result).toBe('skipped:blank');
    expect(recordQueueEvent).not.toHaveBeenCalled();
  });

  it('marks degraded when REDIS_URL unset on init', async () => {
    const prev = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      await service.onModuleInit();
      expect(obs.trace).toHaveBeenCalledWith(
        expect.stringContaining('degraded'),
        ErrorCodes.QUEUE_PROFILE_ANALYSIS_DEGRADED,
      );
      expect(recordQueueEvent).toHaveBeenCalledWith(
        'profile-analysis',
        'degraded',
      );
      expect(service.isBullEnabled()).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = prev;
    }
  });
});

describe('profileAnalysisJobId', () => {
  it('formats analysis:{userId}', () => {
    expect(profileAnalysisJobId('u1')).toBe('analysis:u1');
  });
});

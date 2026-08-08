import { Injectable, Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Queue from 'bull';
import {
  MeProfileAnalysisService,
  type ProfileAnalysisRunOutcome,
} from '../me-profile/me-profile-analysis.service';
import { MeMatchesService } from '../me-profile/me-matches.service';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  recordProfileAnalysisDurationMs,
  recordQueueEvent,
} from '../observability/custom-metrics';
import {
  PROFILE_ANALYSIS_QUEUE,
  profileAnalysisJobId,
  type ProfileAnalysisJobData,
} from './profile-analysis.queue';
import {
  MATCH_LIST_RANK_QUEUE_PORT,
  type MatchListRankQueuePort,
} from './match-list-rank.ports';
import {
  PROFILE_ANALYSIS_QUEUE_CONCURRENCY_ENV,
  resolveQueueConcurrency,
} from './queue-concurrency';

/**
 * Bull-backed profile analysis queue. When REDIS_URL is unset or Bull fails to
 * connect, falls back to the pre-Sprint-19 in-process fire-and-forget path.
 */
@Injectable()
export class ProfileAnalysisQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ProfileAnalysisQueueService.name);
  private queue: Queue.Queue<ProfileAnalysisJobData> | null = null;
  private bullEnabled = false;

  constructor(
    private readonly analysis: MeProfileAnalysisService,
    private readonly meMatches: MeMatchesService,
    @Inject(MATCH_LIST_RANK_QUEUE_PORT)
    private readonly matchListRankQueue: MatchListRankQueuePort,
    private readonly obs: StructuredObservabilityService,
  ) {}

  private markDegraded(reason: string): void {
    this.logger.warn(reason);
    this.obs.trace(
      'profile-analysis Bull queue degraded (inline mode)',
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_DEGRADED,
    );
    recordQueueEvent('profile-analysis', 'degraded');
  }

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.markDegraded(
        'REDIS_URL unset — profile-analysis Bull queue disabled (inline degraded mode)',
      );
      return;
    }
    try {
      const concurrency = resolveQueueConcurrency(
        PROFILE_ANALYSIS_QUEUE_CONCURRENCY_ENV,
      );
      const queue = new Queue<ProfileAnalysisJobData>(
        PROFILE_ANALYSIS_QUEUE,
        url,
        {
          defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 60_000 },
            removeOnComplete: 100,
            removeOnFail: 200,
          },
        },
      );
      queue.on('error', (err) => {
        this.logger.warn(`profile-analysis queue error: ${err.message}`);
      });
      queue.process(concurrency, async (job) => {
        await this.runJob(job.data);
      });
      this.queue = queue;
      this.bullEnabled = true;
      this.logger.log(
        `profile-analysis Bull queue ready concurrency=${concurrency}`,
      );
    } catch (err) {
      this.queue = null;
      this.bullEnabled = false;
      this.markDegraded(
        `Bull queue init failed — inline degraded mode: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.queue) return;
    try {
      await this.queue.close();
    } catch {
      /* ignore */
    }
    this.queue = null;
    this.bullEnabled = false;
  }

  isBullEnabled(): boolean {
    return this.bullEnabled && this.queue != null;
  }

  private async runJob(data: ProfileAnalysisJobData): Promise<void> {
    const started = Date.now();
    this.logger.log(
      `profile-analysis job start userId=${data.userId} profileId=${data.profileId}`,
    );
    let outcome: ProfileAnalysisRunOutcome;
    try {
      outcome = await this.analysis.runForUser(data.userId);
    } catch (e: unknown) {
      this.obs.error(
        `profile-analysis run threw userId=${data.userId}`,
        ErrorCodes.QUEUE_PROFILE_ANALYSIS_RUN_FAILED,
        e,
      );
      recordQueueEvent('profile-analysis', 'failed');
      throw e;
    } finally {
      recordProfileAnalysisDurationMs(Date.now() - started);
    }

    if (outcome.status === 'success') {
      await this.meMatches.invalidateMatchListCache(data.userId);
      await this.matchListRankQueue.enqueueRebuild(
        data.userId,
        'analysis_complete',
      );
      this.obs.trace(
        `profile-analysis rank side-effects ok userId=${data.userId}`,
        ErrorCodes.QUEUE_PROFILE_ANALYSIS_RANK_ENQUEUED,
      );
      return;
    }

    this.obs.trace(
      `profile-analysis rank side-effects skipped userId=${data.userId} outcome=${outcome.status}`,
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_RANK_SKIPPED,
    );
  }

  /**
   * Enqueue analysis or run inline when Bull is unavailable.
   * @returns Bull job id, coalesced jobId, `inline:{profileId}`, or `skipped:blank`
   */
  async enqueueOrRunInline(data: ProfileAnalysisJobData): Promise<string> {
    const userId = data.userId?.trim() ?? '';
    if (!userId) {
      this.logger.warn('profile-analysis enqueue skipped: blank userId');
      return 'skipped:blank';
    }
    const payload: ProfileAnalysisJobData = {
      userId,
      profileId: data.profileId,
    };
    if (this.queue && this.bullEnabled) {
      const jobId = profileAnalysisJobId(userId);
      try {
        const job = await this.queue.add(payload, {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
        });
        this.obs.trace(
          `profile-analysis enqueued jobId=${jobId}`,
          ErrorCodes.QUEUE_PROFILE_ANALYSIS_ENQUEUED,
        );
        recordQueueEvent('profile-analysis', 'enqueued');
        return String(job.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/already exists|Job.*exists/i.test(msg)) {
          this.obs.trace(
            `profile-analysis coalesced jobId=${jobId}`,
            ErrorCodes.QUEUE_PROFILE_ANALYSIS_COALESCED,
          );
          recordQueueEvent('profile-analysis', 'coalesced');
          return jobId;
        }
        this.obs.error(
          `profile-analysis enqueue failed jobId=${jobId}`,
          ErrorCodes.QUEUE_PROFILE_ANALYSIS_ENQUEUE_FAILED,
          err,
        );
        recordQueueEvent('profile-analysis', 'failed');
        throw err;
      }
    }
    const inlineId = `inline:${payload.profileId}`;
    this.obs.trace(
      `profile-analysis inline jobId=${inlineId}`,
      ErrorCodes.QUEUE_PROFILE_ANALYSIS_INLINE,
    );
    recordQueueEvent('profile-analysis', 'inline');
    // runJob already emits RUN_FAILED + queue.event failed before rethrowing
    void this.runJob(payload).catch((e: unknown) => {
      this.logger.error(
        `inline profile analysis failed profileId=${payload.profileId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });
    return inlineId;
  }
}

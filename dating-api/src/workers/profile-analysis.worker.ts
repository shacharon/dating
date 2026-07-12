import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Queue from 'bull';
import { MeProfileAnalysisService } from '../me-profile/me-profile-analysis.service';
import { MeMatchesService } from '../me-profile/me-matches.service';
import { recordProfileAnalysisDurationMs } from '../observability/custom-metrics';
import {
  PROFILE_ANALYSIS_QUEUE,
  type ProfileAnalysisJobData,
} from './profile-analysis.queue';

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
  ) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.logger.warn(
        'REDIS_URL unset — profile-analysis Bull queue disabled (inline degraded mode)',
      );
      return;
    }
    try {
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
      queue.process(async (job) => {
        await this.runJob(job.data);
      });
      this.queue = queue;
      this.bullEnabled = true;
      this.logger.log('profile-analysis Bull queue ready');
    } catch (err) {
      this.logger.warn(
        `Bull queue init failed — inline degraded mode: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      this.queue = null;
      this.bullEnabled = false;
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
    try {
      await this.analysis.runForUser(data.userId);
    } finally {
      recordProfileAnalysisDurationMs(Date.now() - started);
      await this.meMatches.invalidateMatchListCache(data.userId);
    }
  }

  /**
   * Enqueue analysis or run inline when Bull is unavailable.
   * @returns Bull job id or `inline:{profileId}`
   */
  async enqueueOrRunInline(data: ProfileAnalysisJobData): Promise<string> {
    if (this.queue && this.bullEnabled) {
      const job = await this.queue.add(data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
      });
      return String(job.id);
    }
    const inlineId = `inline:${data.profileId}`;
    void this.runJob(data).catch((e: unknown) => {
      this.logger.error(
        `inline profile analysis failed profileId=${data.profileId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });
    return inlineId;
  }
}

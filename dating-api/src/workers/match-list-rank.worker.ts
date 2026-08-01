import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Queue from 'bull';
import { MeMatchesService } from '../me-profile/me-matches.service';
import {
  MATCH_LIST_RANK_QUEUE,
  matchListRankRebuildJobId,
  type MatchListRankRebuildJobData,
} from './match-list-rank.queue';

/**
 * Bull-backed MatchListRank rebuild queue (Sprint 31 Story 2).
 * REDIS_URL unset / Bull init failure → inline degraded mode.
 */
@Injectable()
export class MatchListRankQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MatchListRankQueueService.name);
  private queue: Queue.Queue<MatchListRankRebuildJobData> | null = null;
  private bullEnabled = false;

  constructor(private readonly meMatches: MeMatchesService) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.logger.warn(
        'REDIS_URL unset — match-list-rank Bull queue disabled (inline degraded mode)',
      );
      return;
    }
    try {
      const queue = new Queue<MatchListRankRebuildJobData>(
        MATCH_LIST_RANK_QUEUE,
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
        this.logger.warn(`match-list-rank queue error: ${err.message}`);
      });
      queue.process(1, async (job) => {
        await this.runJob(job.data);
      });
      this.queue = queue;
      this.bullEnabled = true;
      this.logger.log('match-list-rank Bull queue ready');
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

  private async runJob(data: MatchListRankRebuildJobData): Promise<void> {
    const viewerUserId = data.viewerUserId?.trim() ?? '';
    if (!viewerUserId) {
      this.logger.warn('match-list-rank job skipped: blank viewerUserId');
      return;
    }
    const started = Date.now();
    const result = await this.meMatches.rebuildMatchListRanks(
      viewerUserId,
      data.reason,
    );
    this.logger.log(
      `match-list-rank rebuild done viewerUserId=${viewerUserId} status=${result.status} rowsWritten=${result.rowsWritten} rowsDeleted=${result.rowsDeleted} rebuildMs=${result.rebuildMs} wallMs=${Date.now() - started} reason=${data.reason ?? ''}`,
    );
  }

  /**
   * Enqueue a full viewer rebuild (jobId coalesce) or run inline when Bull is down.
   * @returns Bull job id, coalesced jobId, or `inline:{viewerUserId}`
   */
  async enqueueRebuild(
    viewerUserId: string,
    reason?: string,
  ): Promise<string> {
    const id = viewerUserId?.trim() ?? '';
    if (!id) {
      this.logger.warn('enqueueRebuild skipped: blank viewerUserId');
      return 'skipped:blank';
    }
    const data: MatchListRankRebuildJobData = {
      viewerUserId: id,
      reason,
    };
    if (this.queue && this.bullEnabled) {
      const jobId = matchListRankRebuildJobId(id);
      try {
        const job = await this.queue.add(data, {
          jobId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60_000 },
        });
        return String(job.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // Bull rejects duplicate jobId while pending/active — coalesce.
        if (/already exists|Job.*exists/i.test(msg)) {
          this.logger.debug(
            `match-list-rank enqueue coalesced jobId=${jobId}: ${msg}`,
          );
          return jobId;
        }
        throw err;
      }
    }
    const inlineId = `inline:${id}`;
    void this.runJob(data).catch((e: unknown) => {
      this.logger.error(
        `inline match-list-rank rebuild failed viewerUserId=${id}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });
    return inlineId;
  }
}

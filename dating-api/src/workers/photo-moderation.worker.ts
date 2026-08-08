import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Queue from 'bull';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PhotoModerationService } from '../photo-storage/photo-moderation.service';
import {
  PHOTO_MODERATION_QUEUE,
  photoModerationJobId,
  type PhotoModerationJobData,
} from './photo-moderation.queue';

/**
 * Bull-backed photo moderation queue. Mirrors profile-analysis: Redis optional;
 * falls back to inline fire-and-forget when REDIS_URL is unset.
 */
@Injectable()
export class PhotoModerationQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PhotoModerationQueueService.name);
  private queue: Queue.Queue<PhotoModerationJobData> | null = null;
  private bullEnabled = false;

  constructor(
    private readonly moderation: PhotoModerationService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL?.trim();
    if (!url) {
      this.logger.warn(
        'REDIS_URL unset — photo-moderation Bull queue disabled (inline degraded mode)',
      );
      return;
    }
    try {
      const queue = new Queue<PhotoModerationJobData>(PHOTO_MODERATION_QUEUE, url, {
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });
      queue.on('error', (err) => {
        this.logger.warn(`photo-moderation queue error: ${err.message}`);
      });
      queue.process(async (job) => {
        await this.moderation.processPendingPhoto(job.data.photoId);
      });
      this.queue = queue;
      this.bullEnabled = true;
      this.logger.log('photo-moderation Bull queue ready');
    } catch (err) {
      this.logger.warn(
        `photo-moderation Bull init failed — inline degraded mode: ${
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

  async enqueueOrRunInline(photoId: string): Promise<string> {
    const id = photoId?.trim() ?? '';
    if (!id) {
      this.logger.warn('photo-moderation enqueue skipped: blank photoId');
      return 'skipped:blank';
    }
    if (this.queue && this.bullEnabled) {
      const jobId = photoModerationJobId(id);
      try {
        const job = await this.queue.add(
          { photoId: id },
          {
            jobId,
            attempts: 3,
            backoff: { type: 'exponential', delay: 30_000 },
          },
        );
        this.obs.trace(
          `photo-moderation enqueued jobId=${jobId}`,
          ErrorCodes.QUEUE_PHOTO_MODERATION_ENQUEUED,
        );
        return String(job.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/already exists|Job.*exists/i.test(msg)) {
          this.obs.trace(
            `photo-moderation coalesced jobId=${jobId}`,
            ErrorCodes.QUEUE_PHOTO_MODERATION_COALESCED,
          );
          return jobId;
        }
        throw err;
      }
    }
    const inlineId = `inline:${id}`;
    this.obs.trace(
      `photo-moderation inline jobId=${inlineId}`,
      ErrorCodes.QUEUE_PHOTO_MODERATION_INLINE,
    );
    void this.moderation.processPendingPhoto(id).catch((e: unknown) => {
      this.logger.error(
        `inline photo moderation failed photoId=${id}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });
    return inlineId;
  }
}

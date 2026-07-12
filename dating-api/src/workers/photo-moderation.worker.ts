import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Queue from 'bull';
import { PhotoModerationService } from '../photo-storage/photo-moderation.service';
import {
  PHOTO_MODERATION_QUEUE,
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

  constructor(private readonly moderation: PhotoModerationService) {}

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
    if (this.queue && this.bullEnabled) {
      const job = await this.queue.add(
        { photoId },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 30_000 },
        },
      );
      return String(job.id);
    }
    const inlineId = `inline:${photoId}`;
    void this.moderation.processPendingPhoto(photoId).catch((e: unknown) => {
      this.logger.error(
        `inline photo moderation failed photoId=${photoId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });
    return inlineId;
  }
}

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RedisCacheService } from '../cache/redis-cache.service';
import { ContentViolationService } from '../content-moderation/content-violation.service';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  CRON_LOCK_MUTE_EXPIRY,
  cronLockDebugValue,
  muteExpiryLockTtlSeconds,
  shouldRunCronTick,
} from './cron-leader.lock';

export const CONTENT_MUTE_EXPIRY_INTERVAL_MS_DEFAULT = 15 * 60 * 1000;

/**
 * Parse `CONTENT_MUTE_EXPIRY_INTERVAL_MS`.
 * - empty/invalid → default 15m
 * - `0` / `off` / `false` → disabled (`null`)
 * - positive int → that many ms
 */
export function resolveMuteExpiryIntervalMs(
  env: NodeJS.ProcessEnv = process.env,
): number | null {
  const raw = env.CONTENT_MUTE_EXPIRY_INTERVAL_MS?.trim().toLowerCase();
  if (raw === undefined || raw === '') {
    return CONTENT_MUTE_EXPIRY_INTERVAL_MS_DEFAULT;
  }
  if (raw === 'off' || raw === 'false') {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    return CONTENT_MUTE_EXPIRY_INTERVAL_MS_DEFAULT;
  }
  if (n === 0) {
    return null;
  }
  return n;
}

/**
 * Periodic clear of expired temporary messaging mutes (setInterval; no @nestjs/schedule).
 */
@Injectable()
export class MuteExpiryEnforcer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MuteExpiryEnforcer.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly violations: ContentViolationService,
    private readonly cache: RedisCacheService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  onModuleInit(): void {
    const intervalMs = resolveMuteExpiryIntervalMs();
    if (intervalMs == null) {
      this.logger.log('mute expiry cron disabled (CONTENT_MUTE_EXPIRY_INTERVAL_MS)');
      return;
    }
    this.timer = setInterval(() => {
      void this.tick().catch((err) => {
        this.logger.warn(
          `mute expiry run failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }, intervalMs);
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Exposed for tests. */
  isTimerActive(): boolean {
    return this.timer != null;
  }

  async tick(): Promise<number> {
    if (this.running) {
      return 0;
    }
    this.running = true;
    try {
      const intervalMs =
        resolveMuteExpiryIntervalMs() ?? CONTENT_MUTE_EXPIRY_INTERVAL_MS_DEFAULT;
      const lock = await this.cache.tryAcquireCronLock(
        CRON_LOCK_MUTE_EXPIRY,
        muteExpiryLockTtlSeconds(intervalMs),
        cronLockDebugValue(),
      );
      if (!shouldRunCronTick(lock)) {
        this.obs.trace(
          `mute-expiry cron skipped lock=${lock}`,
          lock === 'unavailable'
            ? ErrorCodes.CRON_LEADER_UNAVAILABLE
            : ErrorCodes.CRON_LEADER_SKIPPED,
        );
        return 0;
      }
      this.obs.trace(
        'mute-expiry cron leader acquired',
        ErrorCodes.CRON_LEADER_ACQUIRED,
      );
      return await this.violations.clearExpiredMutes();
    } finally {
      this.running = false;
    }
  }
}

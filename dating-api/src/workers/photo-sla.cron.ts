import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { UserProfilePhotoStatus } from '@prisma/client';
import { RedisCacheService } from '../cache/redis-cache.service';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  loadPhotoModerationThresholds,
  type PhotoModerationThresholds,
} from '../photo-storage/photo-moderation.config';
import { PhotoModerationService } from '../photo-storage/photo-moderation.service';
import {
  parseModerationResultJson,
  type PhotoModerationResultJson,
} from '../photo-storage/photo-moderation.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CRON_LOCK_PHOTO_SLA,
  PHOTO_SLA_LOCK_TTL_SECONDS,
  cronLockDebugValue,
  shouldRunCronTick,
} from './cron-leader.lock';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Hourly SLA + stuck-ML enforcer (setInterval; no @nestjs/schedule dependency).
 */
@Injectable()
export class PhotoSlaEnforcer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PhotoSlaEnforcer.name);
  private readonly thresholds: PhotoModerationThresholds;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: PhotoModerationService,
    private readonly obs: StructuredObservabilityService,
    private readonly cache: RedisCacheService,
  ) {
    this.thresholds = loadPhotoModerationThresholds();
  }

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.runHourly().catch((err) => {
        this.logger.warn(
          `photo SLA run failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }, HOUR_MS);
    // Avoid keeping the process alive solely for this timer in tests.
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

  async runHourly(): Promise<{ autoApproved: number; flaggedStuck: number }> {
    if (this.running) {
      return { autoApproved: 0, flaggedStuck: 0 };
    }
    this.running = true;
    try {
      const lock = await this.cache.tryAcquireCronLock(
        CRON_LOCK_PHOTO_SLA,
        PHOTO_SLA_LOCK_TTL_SECONDS,
        cronLockDebugValue(),
      );
      if (!shouldRunCronTick(lock)) {
        this.obs.trace(
          `photo-sla cron skipped lock=${lock}`,
          lock === 'unavailable'
            ? ErrorCodes.CRON_LEADER_UNAVAILABLE
            : ErrorCodes.CRON_LEADER_SKIPPED,
        );
        return { autoApproved: 0, flaggedStuck: 0 };
      }
      this.obs.trace(
        'photo-sla cron leader acquired',
        ErrorCodes.CRON_LEADER_ACQUIRED,
      );
      const flaggedStuck = await this.flagStuckPending();
      const autoApproved = await this.slaAutoApprove();
      await this.maybeAlertCapacity(autoApproved);
      return { autoApproved, flaggedStuck };
    } finally {
      this.running = false;
    }
  }

  private async flagStuckPending(): Promise<number> {
    const cutoff = new Date(
      Date.now() - this.thresholds.mlStuckMinutes * 60_000,
    );
    const stuck = await this.prisma.userProfilePhoto.findMany({
      where: {
        status: UserProfilePhotoStatus.PENDING,
        moderationProvider: 'rekognition',
        createdAt: { lt: cutoff },
      },
      include: { profile: { select: { userId: true } } },
      take: 100,
    });

    for (const row of stuck) {
      const prior = parseModerationResultJson(row.moderationResultJson) ?? {
        source: 'ml' as const,
      };
      const result: PhotoModerationResultJson = {
        ...prior,
        source: 'ml',
        decision: 'flagged',
        error: 'ml_timeout',
      };
      await this.moderation.applyOutcome(
        row.id,
        row.profileId,
        row.profile.userId,
        {
          status: 'FLAGGED_FOR_REVIEW',
          result,
        },
        {
          event: 'ml_error_flagged',
          expectedStatuses: [UserProfilePhotoStatus.PENDING],
        },
      );
    }
    return stuck.length;
  }

  /**
   * Rule A (6h): NSFW mid-band flags with confidence < slaLowConfidence.
   * Does NOT apply to no_face / quality / error flags (confidence 0 would
   * otherwise auto-approve photos that failed face detection).
   * Rule B (24h): any remaining flagged photo (capacity fallback).
   */
  private resolveSlaRule(
    parsed: PhotoModerationResultJson | null,
    olderThanMax: boolean,
  ): 'flagged_6h_low' | 'flagged_24h' | null {
    if (olderThanMax) return 'flagged_24h';

    if (parsed?.error) return null;
    const code = parsed?.rejectionReasonCode;
    if (
      code === 'no_face' ||
      code === 'low_quality' ||
      code === 'not_real_person'
    ) {
      return null;
    }

    const confidence =
      typeof parsed?.mlConfidence === 'number' ? parsed.mlConfidence : null;
    if (confidence === null) return null;
    // Must have been an NSFW mid-band flag (not empty-label / face-only).
    if (confidence < this.thresholds.flagThreshold) return null;
    if (confidence >= this.thresholds.slaLowConfidence) return null;
    return 'flagged_6h_low';
  }

  private async slaAutoApprove(): Promise<number> {
    const now = Date.now();
    const lowCutoff = new Date(now - this.thresholds.slaLowHours * HOUR_MS);
    const maxCutoff = new Date(now - this.thresholds.slaMaxHours * HOUR_MS);

    const flagged = await this.prisma.userProfilePhoto.findMany({
      where: {
        status: UserProfilePhotoStatus.FLAGGED_FOR_REVIEW,
        createdAt: { lt: lowCutoff },
      },
      include: { profile: { select: { userId: true } } },
      take: 200,
    });

    let autoApproved = 0;
    for (const row of flagged) {
      const parsed = parseModerationResultJson(row.moderationResultJson);
      const olderThanMax = row.createdAt < maxCutoff;
      const slaRule = this.resolveSlaRule(parsed, olderThanMax);
      if (!slaRule) continue;

      const result: PhotoModerationResultJson = {
        ...(parsed ?? { source: 'sla' }),
        source: 'sla',
        decision: 'approved',
        slaRule,
      };
      const applied = await this.moderation.applyOutcome(
        row.id,
        row.profileId,
        row.profile.userId,
        { status: 'APPROVED', result },
        {
          event: 'sla_auto_approved',
          expectedStatuses: [UserProfilePhotoStatus.FLAGGED_FOR_REVIEW],
        },
      );
      if (!applied) continue;
      autoApproved += 1;

      if (slaRule === 'flagged_24h') {
        this.obs.trace(
          JSON.stringify({
            logKind: 'photo_moderation',
            event: 'capacity_alert',
            photoId: row.id,
            userId: row.profile.userId,
            timestamp: new Date().toISOString(),
          }),
          ErrorCodes.PHOTO_MODERATION_SLA_CAPACITY_ALERT,
        );
      }
    }
    return autoApproved;
  }

  private async maybeAlertCapacity(justApproved: number): Promise<void> {
    if (justApproved <= 0) return;
    const since = new Date(Date.now() - 24 * HOUR_MS);
    // Approximate: count SLA-approved photos updated in last 24h with source sla.
    const recent = await this.prisma.userProfilePhoto.findMany({
      where: {
        status: UserProfilePhotoStatus.APPROVED,
        moderationProvider: 'sla',
        updatedAt: { gte: since },
      },
      select: { id: true },
      take: this.thresholds.slaAlertPerDay + 5,
    });
    if (recent.length > this.thresholds.slaAlertPerDay) {
      this.obs.trace(
        JSON.stringify({
          logKind: 'photo_moderation',
          event: 'sla_capacity_shortage',
          count: recent.length,
          timestamp: new Date().toISOString(),
        }),
        ErrorCodes.PHOTO_MODERATION_SLA_CAPACITY_SHORTAGE,
      );
    }
  }
}

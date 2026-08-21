import { Inject, Injectable } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  ENFORCEMENT_DAY_MS,
  ENFORCEMENT_HOUR_MS,
  type ContentViolationAction,
  type ContentViolationSurface,
  type EnforcementResult,
  type EnforcementSurface,
  type ViolationStats,
} from './content-moderation.types';
import {
  CONTENT_VIOLATION_REPOSITORY,
  type IContentViolationRepository,
} from './repositories/content-violation.repository';

@Injectable()
export class ContentViolationService {
  constructor(
    @Inject(CONTENT_VIOLATION_REPOSITORY)
    private readonly violations: IContentViolationRepository,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async recordViolation(args: {
    userId: string;
    surface: ContentViolationSurface;
    flaggedText: string;
    category: string;
    score: number | null;
    action: ContentViolationAction;
    /** Message surface only — MutualMatch id */
    conversationId?: string | null;
    recipientUserId?: string | null;
  }): Promise<void> {
    const conversationId = args.conversationId ?? null;
    const recipientUserId = args.recipientUserId ?? null;

    await this.violations.createViolationAndIncrementCount({
      userId: args.userId,
      surface: args.surface,
      flaggedText: args.flaggedText,
      category: args.category,
      score: args.score,
      action: args.action,
      conversationId,
      recipientUserId,
    });

    const contextSuffix =
      conversationId != null || recipientUserId != null
        ? ` conversationId=${conversationId ?? 'null'} recipientUserId=${recipientUserId ?? 'null'}`
        : '';
    this.obs.trace(
      `content violation recorded userId=${args.userId} surface=${args.surface} category=${args.category} action=${args.action} textLength=${args.flaggedText.length}${contextSuffix}`,
      ErrorCodes.CONTENT_VIOLATION_RECORDED,
    );
  }

  /**
   * Count violations for a user.
   * - `surface`: exact match.
   * - `surfacePrefix`: `startsWith` match.
   * - If both provided, exact `surface` wins (prefix ignored).
   */
  async getViolationCount(
    userId: string,
    options?: { surface?: string; surfacePrefix?: string; since?: Date },
  ): Promise<number> {
    return this.violations.countViolations({
      userId,
      surface: options?.surface,
      surfacePrefix: options?.surfacePrefix,
      since: options?.since,
    });
  }

  async getUserViolationStatus(userId: string): Promise<{
    status: string;
    mutedUntil: Date | null;
    violationCount: number;
  }> {
    const user = await this.violations.getUserViolationFields(userId);

    return {
      status: user?.contentViolationStatus ?? 'ok',
      mutedUntil: user?.contentViolationMutedUntil ?? null,
      violationCount: user?.contentViolationCount ?? 0,
    };
  }

  /**
   * Apply progressive thresholds after a violation was recorded.
   * Does not throw HTTP exceptions — callers map `EnforcementResult` to responses.
   */
  async enforceViolationThreshold(
    userId: string,
    surface: EnforcementSurface,
  ): Promise<EnforcementResult> {
    if (surface === 'profile') {
      const count = await this.getViolationCount(userId, {
        surfacePrefix: 'profile_',
      });
      if (count < 3) {
        return { shouldBlock: false, reason: 'under_threshold' };
      }

      await this.violations.setProfileEditBlocked(userId);
      this.obs.trace(
        `user content blocked userId=${userId} reason=profile_edit_blocked profileViolations=${count}`,
        ErrorCodes.CONTENT_USER_BLOCKED,
      );
      return { shouldBlock: true, reason: '3_profile_violations' };
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - ENFORCEMENT_HOUR_MS);
    const oneDayAgo = new Date(now.getTime() - ENFORCEMENT_DAY_MS);

    const [hourly, daily, lifetime] = await Promise.all([
      this.getViolationCount(userId, {
        surface: 'message',
        since: oneHourAgo,
      }),
      this.getViolationCount(userId, {
        surface: 'message',
        since: oneDayAgo,
      }),
      this.getViolationCount(userId, { surface: 'message' }),
    ]);

    let mutedUntil: Date | null | undefined;
    let muteLabel: string | undefined;
    let reason: EnforcementResult['reason'] = 'under_threshold';

    if (lifetime >= 20) {
      mutedUntil = null;
      muteLabel = 'indefinitely';
      reason = '20_lifetime';
    } else if (daily >= 10) {
      mutedUntil = new Date(now.getTime() + ENFORCEMENT_DAY_MS);
      muteLabel = '24 hours';
      reason = '10_daily';
    } else if (hourly >= 3) {
      mutedUntil = new Date(now.getTime() + ENFORCEMENT_HOUR_MS);
      muteLabel = '1 hour';
      reason = '3_hourly';
    }

    if (reason === 'under_threshold') {
      return { shouldBlock: false, reason };
    }

    await this.violations.setMessagingMute(userId, mutedUntil ?? null);
    this.obs.trace(
      `content user muted userId=${userId} duration=${muteLabel} hourly=${hourly} daily=${daily} lifetime=${lifetime} reason=${reason}`,
      ErrorCodes.CONTENT_USER_MUTED,
    );

    return {
      shouldBlock: true,
      mutedUntil: mutedUntil ?? null,
      reason,
      muteLabel,
    };
  }

  async isUserBlocked(
    userId: string,
    surface: EnforcementSurface,
  ): Promise<boolean> {
    const status = await this.getUserViolationStatus(userId);

    if (surface === 'profile') {
      return status.status === 'profile_edit_blocked';
    }

    if (status.status !== 'messaging_muted') {
      return false;
    }

    const mutedUntil = status.mutedUntil;
    const now = new Date();
    if (mutedUntil != null && mutedUntil <= now) {
      await this.violations.resetViolationStatus(userId);
      return false;
    }

    return true;
  }

  /**
   * Batch clear temporary messaging mutes that have expired.
   * Does not touch indefinite mutes (`mutedUntil` null).
   */
  async clearExpiredMutes(): Promise<number> {
    const count = await this.violations.clearExpiredMutes(new Date());

    if (count > 0) {
      this.obs.trace(
        `cleared ${count} expired mutes`,
        ErrorCodes.CONTENT_MUTES_EXPIRED,
      );
    }

    return count;
  }

  async getViolationStats(): Promise<ViolationStats> {
    const {
      byCategory,
      bySurface,
      totalViolations,
      blockedProfileUsers,
      mutedUsers,
    } = await this.violations.getViolationStatsRaw();

    const violationsByCategory: Record<string, number> = {};
    for (const row of byCategory) {
      violationsByCategory[row.category] = row.count;
    }
    const violationsBySurface: Record<string, number> = {};
    for (const row of bySurface) {
      violationsBySurface[row.surface] = row.count;
    }

    const mutedMessageUsersTemporary = mutedUsers.filter(
      (u) => u.contentViolationMutedUntil != null,
    ).length;

    return {
      totalViolations,
      violationsByCategory,
      violationsBySurface,
      blockedProfileUsers,
      mutedMessageUsers: mutedUsers.length,
      mutedMessageUsersTemporary,
      mutedMessageUsersIndefinite:
        mutedUsers.length - mutedMessageUsersTemporary,
    };
  }
}

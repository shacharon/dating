import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ENFORCEMENT_DAY_MS,
  ENFORCEMENT_HOUR_MS,
  type ContentViolationAction,
  type ContentViolationSurface,
  type EnforcementResult,
  type EnforcementSurface,
  type ViolationStats,
} from './content-moderation.types';

@Injectable()
export class ContentViolationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async recordViolation(args: {
    userId: string;
    surface: ContentViolationSurface;
    flaggedText: string;
    category: string;
    score: number;
    action: ContentViolationAction;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userContentViolation.create({
        data: {
          userId: args.userId,
          surface: args.surface,
          flaggedText: args.flaggedText,
          category: args.category,
          score: args.score,
          action: args.action,
        },
      }),
      this.prisma.user.update({
        where: { id: args.userId },
        data: { contentViolationCount: { increment: 1 } },
      }),
    ]);

    this.obs.trace(
      `content violation recorded userId=${args.userId} surface=${args.surface} category=${args.category} action=${args.action} textLength=${args.flaggedText.length}`,
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
    const surfaceFilter =
      options?.surface != null
        ? { surface: options.surface }
        : options?.surfacePrefix != null
          ? { surface: { startsWith: options.surfacePrefix } }
          : {};

    return this.prisma.userContentViolation.count({
      where: {
        userId,
        ...surfaceFilter,
        ...(options?.since != null
          ? { createdAt: { gte: options.since } }
          : {}),
      },
    });
  }

  async getUserViolationStatus(userId: string): Promise<{
    status: string;
    mutedUntil: Date | null;
    violationCount: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        contentViolationStatus: true,
        contentViolationMutedUntil: true,
        contentViolationCount: true,
      },
    });

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

      await this.prisma.user.update({
        where: { id: userId },
        data: { contentViolationStatus: 'profile_edit_blocked' },
      });
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

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: mutedUntil ?? null,
      },
    });
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
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          contentViolationStatus: 'ok',
          contentViolationMutedUntil: null,
        },
      });
      return false;
    }

    return true;
  }

  /**
   * Batch clear temporary messaging mutes that have expired.
   * Does not touch indefinite mutes (`mutedUntil` null).
   */
  async clearExpiredMutes(): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: {
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: {
          not: null,
          lte: new Date(),
        },
      },
      data: {
        contentViolationStatus: 'ok',
        contentViolationMutedUntil: null,
      },
    });

    if (result.count > 0) {
      this.obs.trace(
        `cleared ${result.count} expired mutes`,
        ErrorCodes.CONTENT_MUTES_EXPIRED,
      );
    }

    return result.count;
  }

  async getViolationStats(): Promise<ViolationStats> {
    const [byCategory, bySurface, totalViolations, blockedProfileUsers, mutedUsers] =
      await Promise.all([
        this.prisma.userContentViolation.groupBy({
          by: ['category'],
          _count: { _all: true },
        }),
        this.prisma.userContentViolation.groupBy({
          by: ['surface'],
          _count: { _all: true },
        }),
        this.prisma.userContentViolation.count(),
        this.prisma.user.count({
          where: { contentViolationStatus: 'profile_edit_blocked' },
        }),
        this.prisma.user.findMany({
          where: { contentViolationStatus: 'messaging_muted' },
          select: { contentViolationMutedUntil: true },
        }),
      ]);

    const violationsByCategory: Record<string, number> = {};
    for (const row of byCategory) {
      violationsByCategory[row.category] = row._count._all;
    }
    const violationsBySurface: Record<string, number> = {};
    for (const row of bySurface) {
      violationsBySurface[row.surface] = row._count._all;
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

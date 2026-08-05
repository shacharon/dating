import { Injectable } from '@nestjs/common';
import { buildOpenerWeeklyReport } from '../../matches/conversation-starter/opener-tracking-report';
import {
  PRIORITY_GOOD_MIN,
  PRIORITY_HIGH_MIN,
} from '../../me-profile/match-priority';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  calculateD7Retention,
  calculatePriorityShare,
  parseBetaStartParam,
} from './beta-metrics.helpers';

export type BetaMetricsDto = {
  generatedAt: string;
  betaStart: string;
  activeUsers7d: number;
  signupsSinceBetaStart: number;
  d7: {
    cohortSize: number;
    returnedCount: number;
    rate: number | null;
    advisory: boolean;
  };
  opener: {
    windowDays: 7;
    generated: number;
    displayed: number;
    used: number;
    sent: number;
    replied: number;
    usageRate: number | null;
    responseRate: number | null;
  };
  priorityShare: {
    highCount: number;
    goodCount: number;
    otherCount: number;
    scoredCount: number;
    highShare: number | null;
    goodShare: number | null;
    otherShare: number | null;
  };
  highPriorityEmails7d: number;
};

@Injectable()
export class AdminBetaMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async getMetrics(
    adminUserId: string,
    betaStartRaw?: string,
    asOf: Date = new Date(),
  ): Promise<BetaMetricsDto> {
    const betaStart = parseBetaStartParam(betaStartRaw, asOf);
    const dayMs = 24 * 60 * 60 * 1000;
    const since7d = new Date(asOf.getTime() - 7 * dayMs);
    const since1d = new Date(asOf.getTime() - 1 * dayMs);
    const cohortStart = new Date(asOf.getTime() - 8 * dayMs);
    const cohortEnd = new Date(asOf.getTime() - 7 * dayMs);

    const [
      activeUsers7d,
      signupsSinceBetaStart,
      cohortSize,
      returnedCount,
      openerRows,
      highCount,
      goodCount,
      otherCount,
      highPriorityEmails7d,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          deletedAt: null,
          lastLoginAt: { gte: since7d },
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: betaStart },
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: cohortStart, lt: cohortEnd },
        },
      }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          createdAt: { gte: cohortStart, lt: cohortEnd },
          lastLoginAt: { gte: since1d },
        },
      }),
      this.prisma.conversationStarterCache.findMany({
        where: { createdAt: { gte: since7d, lte: asOf } },
        select: {
          displayed: true,
          used: true,
          sent: true,
          edited: true,
          receivedReply: true,
          responseTimeMin: true,
        },
      }),
      this.prisma.matchListRank.count({
        where: {
          hardBlocked: false,
          matchScore: { gte: PRIORITY_HIGH_MIN },
        },
      }),
      this.prisma.matchListRank.count({
        where: {
          hardBlocked: false,
          matchScore: { gte: PRIORITY_GOOD_MIN, lt: PRIORITY_HIGH_MIN },
        },
      }),
      this.prisma.matchListRank.count({
        where: {
          hardBlocked: false,
          matchScore: { gte: 0, lt: PRIORITY_GOOD_MIN },
        },
      }),
      this.prisma.highPriorityMatchEmailLog.count({
        where: { sentAt: { gte: since7d } },
      }),
    ]);

    const opener = buildOpenerWeeklyReport(openerRows);
    const d7 = calculateD7Retention(cohortSize, returnedCount);
    const priorityShare = calculatePriorityShare({
      highCount,
      goodCount,
      otherCount,
    });

    this.obs.trace(
      `admin beta metrics fetched adminUserId=${adminUserId}`,
      ErrorCodes.ADMIN_BETA_METRICS_FETCHED,
    );

    return {
      generatedAt: asOf.toISOString(),
      betaStart: betaStart.toISOString(),
      activeUsers7d,
      signupsSinceBetaStart,
      d7,
      opener: {
        windowDays: 7,
        generated: opener.generated,
        displayed: opener.displayed,
        used: opener.used,
        sent: opener.sent,
        replied: opener.replied,
        usageRate: opener.usageRate,
        responseRate: opener.responseRate,
      },
      priorityShare,
      highPriorityEmails7d,
    };
  }
}

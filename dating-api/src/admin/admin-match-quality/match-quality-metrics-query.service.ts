import { Injectable } from '@nestjs/common';
import { MatchFeedbackSentiment, Prisma } from '@prisma/client';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { ListNegativeCandidatesResponseDto } from './dto/list-negative-candidates.dto';
import type { MatchQualityCompareDto } from './dto/match-quality-compare.dto';
import type { MatchQualitySummaryDto } from './dto/match-quality-summary.dto';
import {
  type CompareWindowBounds,
  computeCompareDeltas,
  computePositiveRate,
  computeWindowStart,
} from './match-quality-window';

type PeriodMetrics = {
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number | null;
  distinctReporters: number;
  distinctCandidates: number;
};

type NegativeCandidateQueryRow = {
  matchProfileId: string;
  negativeCount: number;
  distinctViewers: number;
  lastNegativeAt: Date;
};

type NegativeCandidateTotalRow = {
  total: number;
};

@Injectable()
export class MatchQualityMetricsQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  private async aggregatePeriodSummary(
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<PeriodMetrics> {
    const where = { createdAt: { gte: rangeStart, lt: rangeEnd } };

    const [feedbackCount, grouped, distinctReporters, distinctCandidates] =
      await Promise.all([
        this.prisma.matchFeedback.count({ where }),
        this.prisma.matchFeedback.groupBy({
          by: ['sentiment'],
          where,
          _count: { _all: true },
        }),
        this.prisma.matchFeedback.findMany({
          where,
          distinct: ['userId'],
          select: { userId: true },
        }),
        this.prisma.matchFeedback.findMany({
          where,
          distinct: ['matchProfileId'],
          select: { matchProfileId: true },
        }),
      ]);

    const positiveCount =
      grouped.find((row) => row.sentiment === MatchFeedbackSentiment.POSITIVE)
        ?._count._all ?? 0;
    const negativeCount =
      grouped.find((row) => row.sentiment === MatchFeedbackSentiment.NEGATIVE)
        ?._count._all ?? 0;

    return {
      feedbackCount,
      positiveCount,
      negativeCount,
      positiveRate: computePositiveRate(feedbackCount, positiveCount),
      distinctReporters: distinctReporters.length,
      distinctCandidates: distinctCandidates.length,
    };
  }

  async getSummary(
    adminUserId: string,
    windowDays: number,
  ): Promise<MatchQualitySummaryDto> {
    const rangeStart = computeWindowStart(windowDays);
    const rangeEnd = new Date();
    const metrics = await this.aggregatePeriodSummary(rangeStart, rangeEnd);

    this.obs.trace(
      `event=admin_match_quality_summary_fetched adminUserId=${adminUserId} windowDays=${windowDays} feedbackCount=${metrics.feedbackCount}`,
      ErrorCodes.ADMIN_MATCH_QUALITY_SUMMARY_FETCHED,
    );

    return {
      windowDays,
      windowStart: rangeStart.toISOString(),
      ...metrics,
    };
  }

  async compareMatchQuality(
    adminUserId: string,
    windows: CompareWindowBounds,
  ): Promise<MatchQualityCompareDto> {
    const [beforeMetrics, afterMetrics] = await Promise.all([
      this.aggregatePeriodSummary(windows.before.start, windows.before.end),
      this.aggregatePeriodSummary(windows.after.start, windows.after.end),
    ]);

    const before = {
      rangeStart: windows.before.start.toISOString(),
      rangeEnd: windows.before.end.toISOString(),
      ...beforeMetrics,
    };
    const after = {
      rangeStart: windows.after.start.toISOString(),
      rangeEnd: windows.after.end.toISOString(),
      ...afterMetrics,
    };

    const deltas = computeCompareDeltas(before, after);

    this.obs.trace(
      `event=admin_match_quality_compare_fetched adminUserId=${adminUserId} beforeStart=${before.rangeStart} afterEnd=${after.rangeEnd} feedbackCountDelta=${deltas.feedbackCountDelta}`,
      ErrorCodes.ADMIN_MATCH_QUALITY_COMPARE_FETCHED,
    );

    return {
      comparedAt: new Date().toISOString(),
      before,
      after,
      deltas,
      notes: {
        adoptionComparison: 'logs_only',
        rollbackHint: 'positive_rate_drop_gt_0.10_with_stable_adoption',
      },
    };
  }

  async listNegativeCandidates(
    windowDays: number,
    limit: number,
    offset: number,
  ): Promise<ListNegativeCandidatesResponseDto> {
    const windowStart = computeWindowStart(windowDays);
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = Math.min(Math.max(offset, 0), 500);

    const [rows, totalRows] = await Promise.all([
      this.prisma.$queryRaw<NegativeCandidateQueryRow[]>(Prisma.sql`
        SELECT
          "matchProfileId",
          COUNT(*)::int AS "negativeCount",
          COUNT(DISTINCT "userId")::int AS "distinctViewers",
          MAX("createdAt") AS "lastNegativeAt"
        FROM "MatchFeedback"
        WHERE sentiment = 'NEGATIVE' AND "createdAt" >= ${windowStart}
        GROUP BY "matchProfileId"
        ORDER BY "negativeCount" DESC, "matchProfileId" ASC
        LIMIT ${take}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<NegativeCandidateTotalRow[]>(Prisma.sql`
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT "matchProfileId"
          FROM "MatchFeedback"
          WHERE sentiment = 'NEGATIVE' AND "createdAt" >= ${windowStart}
          GROUP BY "matchProfileId"
        ) grouped
      `),
    ]);

    const total = totalRows[0]?.total ?? 0;

    return {
      windowDays,
      items: rows.map((row) => ({
        matchProfileId: row.matchProfileId,
        negativeCount: row.negativeCount,
        distinctViewers: row.distinctViewers,
        lastNegativeAt: new Date(row.lastNegativeAt).toISOString(),
      })),
      total,
      limit: take,
      offset: skip,
    };
  }
}

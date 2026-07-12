import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MatchFeedbackSentiment, Prisma } from '@prisma/client';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import {
  buildMatchQualityAuditJson,
  type MatchQualityAuditReport,
} from '../../me-profile/match-quality-audit';
import { MeMatchesService } from '../../me-profile/me-matches.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { CandidateAuditResponseDto } from './dto/candidate-audit-response.dto';
import type { CandidateFeedbackSummaryDto } from './dto/candidate-audit-response.dto';
import type { ListNegativeCandidatesResponseDto } from './dto/list-negative-candidates.dto';
import type { MatchQualityCompareDto } from './dto/match-quality-compare.dto';
import type { MatchQualityExportDto } from './dto/match-quality-export.dto';
import type { MatchQualitySummaryDto } from './dto/match-quality-summary.dto';
import { serializeMatchQualityExportCsv } from './match-quality-export-csv';
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

const AUDIT_UNAVAILABLE = {
  code: 'match_not_visible_to_viewer',
  message:
    'Match detail not available for resolved viewer(s). Try another viewerUserId query param or CLI audit.',
} as const;

@Injectable()
export class AdminMatchQualityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly meMatches: MeMatchesService,
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

  async getCandidateAudit(
    adminUserId: string,
    candidateProfileId: string,
    windowDays: number,
    viewerUserId?: string,
  ): Promise<CandidateAuditResponseDto> {
    const candidate = await this.prisma.userProfile.findUnique({
      where: { id: candidateProfileId },
      select: { id: true },
    });
    if (!candidate) {
      throw new NotFoundException({ error: 'candidate_not_found' });
    }

    const feedbackSummary = await this.buildCandidateFeedbackSummary(
      candidateProfileId,
      windowDays,
    );

    const viewerIds = await this.resolveViewerCandidates(
      candidateProfileId,
      viewerUserId,
    );
    if (viewerIds.length === 0) {
      throw new UnprocessableEntityException({ error: 'viewer_required' });
    }

    const engineReadNormalized = process.env.ENGINE_READ_NORMALIZED === '1';
    let audit: MatchQualityAuditReport | null = null;
    let usedViewerId = viewerIds[viewerIds.length - 1]!;

    for (const vid of viewerIds) {
      usedViewerId = vid;
      try {
        audit = await buildMatchQualityAuditJson({
          viewerUserId: vid,
          candidateProfileId,
          meMatches: this.meMatches,
          prisma: this.prisma,
          engineReadNormalized,
          includeListContext: true,
        });
        this.obs.trace(
          `event=admin_match_quality_audit_fetched adminUserId=${adminUserId} candidateProfileId=${candidateProfileId} viewerUserId=${vid} outcome=${audit.compare.outcome}`,
          ErrorCodes.ADMIN_MATCH_QUALITY_AUDIT_FETCHED,
        );
        break;
      } catch (e) {
        if (e instanceof NotFoundException) {
          continue;
        }
        throw e;
      }
    }

    const response: CandidateAuditResponseDto = {
      candidateProfileId,
      viewerUserId: usedViewerId,
      windowDays,
      feedbackSummary,
      audit,
    };

    if (!audit) {
      response.auditUnavailable = { ...AUDIT_UNAVAILABLE };
    }

    return response;
  }

  private async buildCandidateFeedbackSummary(
    candidateProfileId: string,
    windowDays: number,
  ): Promise<CandidateFeedbackSummaryDto> {
    const windowStart = computeWindowStart(windowDays);
    const where = {
      matchProfileId: candidateProfileId,
      createdAt: { gte: windowStart },
    };

    const [grouped, latest] = await Promise.all([
      this.prisma.matchFeedback.groupBy({
        by: ['sentiment'],
        where,
        _count: { _all: true },
      }),
      this.prisma.matchFeedback.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        select: { sentiment: true },
      }),
    ]);

    const positiveCount =
      grouped.find((row) => row.sentiment === MatchFeedbackSentiment.POSITIVE)
        ?._count._all ?? 0;
    const negativeCount =
      grouped.find((row) => row.sentiment === MatchFeedbackSentiment.NEGATIVE)
        ?._count._all ?? 0;

    return {
      negativeCount,
      positiveCount,
      lastSentiment: latest?.sentiment ?? null,
    };
  }

  private async resolveViewerCandidates(
    profileId: string,
    explicitViewerUserId?: string,
  ): Promise<string[]> {
    const trimmed = explicitViewerUserId?.trim();
    if (trimmed) {
      return [trimmed];
    }

    const rows = await this.prisma.matchFeedback.findMany({
      where: {
        matchProfileId: profileId,
        sentiment: MatchFeedbackSentiment.NEGATIVE,
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
      select: { userId: true },
      take: 3,
    });

    return rows.map((row) => row.userId);
  }

  async exportMatchQuality(
    adminUserId: string,
    windowDays: number,
    format: 'json' | 'csv',
  ): Promise<MatchQualityExportDto | string> {
    const [summary, negatives] = await Promise.all([
      this.getSummary(adminUserId, windowDays),
      this.listNegativeCandidates(windowDays, 20, 0),
    ]);

    const exportDto: MatchQualityExportDto = {
      exportedAt: new Date().toISOString(),
      windowDays: summary.windowDays,
      windowStart: summary.windowStart,
      summary: {
        feedbackCount: summary.feedbackCount,
        positiveCount: summary.positiveCount,
        negativeCount: summary.negativeCount,
        positiveRate: summary.positiveRate,
        distinctReporters: summary.distinctReporters,
        distinctCandidates: summary.distinctCandidates,
      },
      negativeCandidates: negatives.items.map((item) => ({
        matchProfileId: item.matchProfileId,
        negativeCount: item.negativeCount,
        distinctViewers: item.distinctViewers,
        lastNegativeAt: item.lastNegativeAt,
      })),
      notes: {
        adoptionRate: null,
        adoptionSource: 'logs_only',
        drillDownHypotheses: 'manual',
      },
    };

    this.obs.trace(
      `event=admin_match_quality_export_fetched adminUserId=${adminUserId} windowDays=${windowDays} format=${format}`,
      ErrorCodes.ADMIN_MATCH_QUALITY_EXPORT_FETCHED,
    );

    if (format === 'csv') {
      return serializeMatchQualityExportCsv(exportDto);
    }

    return exportDto;
  }
}

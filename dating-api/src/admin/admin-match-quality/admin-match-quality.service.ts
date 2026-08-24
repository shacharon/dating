import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import type { CandidateAuditResponseDto } from './dto/candidate-audit-response.dto';
import type { ListNegativeCandidatesResponseDto } from './dto/list-negative-candidates.dto';
import type { MatchQualityCompareDto } from './dto/match-quality-compare.dto';
import type { MatchQualityExportDto } from './dto/match-quality-export.dto';
import type { MatchQualitySummaryDto } from './dto/match-quality-summary.dto';
import { MatchQualityCandidateAuditService } from './match-quality-candidate-audit.service';
import { serializeMatchQualityExportCsv } from './match-quality-export-csv';
import { MatchQualityMetricsQueryService } from './match-quality-metrics-query.service';
import { type CompareWindowBounds } from './match-quality-window';

@Injectable()
export class AdminMatchQualityService {
  constructor(
    private readonly metricsQuery: MatchQualityMetricsQueryService,
    private readonly candidateAudit: MatchQualityCandidateAuditService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async getSummary(
    adminUserId: string,
    windowDays: number,
  ): Promise<MatchQualitySummaryDto> {
    return this.metricsQuery.getSummary(adminUserId, windowDays);
  }

  async compareMatchQuality(
    adminUserId: string,
    windows: CompareWindowBounds,
  ): Promise<MatchQualityCompareDto> {
    return this.metricsQuery.compareMatchQuality(adminUserId, windows);
  }

  async listNegativeCandidates(
    windowDays: number,
    limit: number,
    offset: number,
  ): Promise<ListNegativeCandidatesResponseDto> {
    return this.metricsQuery.listNegativeCandidates(windowDays, limit, offset);
  }

  async getCandidateAudit(
    adminUserId: string,
    candidateProfileId: string,
    windowDays: number,
    viewerUserId?: string,
  ): Promise<CandidateAuditResponseDto> {
    return this.candidateAudit.getCandidateAudit(
      adminUserId,
      candidateProfileId,
      windowDays,
      viewerUserId,
    );
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

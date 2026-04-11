import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type {
  CompareBodyDto,
  CompareGuardMatchDto,
  CompareHgDiagnosticResult,
  MatchListItemDto,
} from './matches.service';
import type { ChildrenUnsureDirectionsDto, MatchIndexDto, MatchRecordDto } from './match.types';
import type { RebuildStatsDto } from './match-daemon.service';
import { MatchDaemonService } from './match-daemon.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from './matches.service';
import { computeMatchDetailPairHg } from './match-detail-children-unsure';
import { mapMatchRecordToDetailUi, type MatchDetailUiDto } from './match-detail-ui.mapper';
import {
  ChildrenUnsureAnalyticsService,
  type ChildrenUnsureDailySummary,
} from './children-unsure-analytics.service';
import {
  CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_CLICK,
  CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_IMPRESSION,
  HIDE_CHILDREN_UNSURE_QUERY_PARAM,
} from './children-unsure-analytics.constants';
import {
  MATCH_PREVIEW_AGE_PLACEHOLDER,
  MATCH_PREVIEW_CHIPS_SLICE,
  MATCH_TOP_PREVIEW_LIMIT,
} from './children-unsure.product-policy';
import { anyChildrenUnsure, getDisplayScore } from './children-unsure.helpers';
import { parseHideChildrenUnsure } from './children-unsure.query';
import { HolyGrailPairSnapshotTelemetryService } from './holy-grail-pair-snapshot-telemetry.service';
import { tryPickHolyGrailMatchDiagnosticsDto } from './holy-grail-match-diagnostics.wire';
import type { ShadowHgVsLegacyMetricsReport } from './shadow-hg-vs-legacy-metrics';
import { MATCH_RANKING_CONTRACT } from './match-ranking-contract';

/** UI-friendly match preview for /dating/matches list. */
export interface DatingMatchPreviewDto {
  id: string;
  name: string;
  age: number;
  summary: string;
  compatibilityScore: number;
  strongReason: string;
  frictionPoint: string;
  explainability?: {
    positiveChips: string[];
    tensionChip?: string;
    reasonShort: string;
  };
  recommendation?: {
    explainability: {
      positiveChips: string[];
      tensionChip?: string;
      reasonShort: string;
    };
    primaryTakeaway: string;
    caution?: string;
    suggestedNextAction: string;
  };
  children_unsure?: ChildrenUnsureDirectionsDto;
  /** Same as displayed compatibility score under `MATCH_RANKING_CONTRACT` (`HG_GATE_LEGACY_RANK_V1` — legacy-only sort). */
  engineCompatibilityScore?: number;
  /** Optional HG diagnostic triple only; omitted when list row has no valid HG wire slice. */
  readonly hgMutualPass?: boolean;
  readonly hgOverallStatus?: string;
  readonly hgRankScore?: number;
}

@Controller('api/v1/matches')
export class MatchesController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly matchDaemon: MatchDaemonService,
    private readonly prisma: PrismaService,
    private readonly childrenUnsureAnalytics: ChildrenUnsureAnalyticsService,
    private readonly hgPairSnapshotTelemetry: HolyGrailPairSnapshotTelemetryService,
  ) {}

  @Post('rebuild')
  async rebuild(): Promise<{ ok: true; stats: RebuildStatsDto }> {
    const stats = await this.matchDaemon.runOnce();
    return { ok: true, stats };
  }

  @Get('auto')
  async getAuto(): Promise<{ ok: true; index: MatchIndexDto } | { ok: false; message: string }> {
    const index = await this.matchDaemon.getAutoIndex();
    if (!index) {
      return { ok: false, message: 'Auto index not built. Call POST /api/v1/matches/rebuild first.' };
    }
    return { ok: true, index };
  }

  /**
   * HG-only pair diagnostics (live evaluator). Gated by env `ENABLE_HG_COMPARE_DIAGNOSTIC`.
   * No legacy `compareWithStatus`, no ProfileExtractionV2 requirement, no match engine score.
   */
  @Post('compare/hg-diagnostic')
  async compareHgDiagnostic(@Body() body: CompareBodyDto): Promise<CompareHgDiagnosticResult> {
    if (!this.matchesService.isHgCompareDiagnosticEnabled()) {
      throw new ForbiddenException({
        message: 'HG compare diagnostic is disabled (set ENABLE_HG_COMPARE_DIAGNOSTIC=1).',
      });
    }
    try {
      return await this.matchesService.compareHgDiagnostic(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'compareHgDiagnostic failed';
      if (err && typeof err === 'object' && 'status' in err) throw err;
      throw new BadRequestException(message);
    }
  }

  /**
   * Pairwise legacy engine compare. HG directions run first for optional neutral-signal legacy fallback when
   * self-signals are sparse but mutual HG hard-pass holds; `ProfileExtractionV2` is optional (defaults when absent).
   * Response shape unchanged (`READY` | `NOT_ANALYZED` | `INSUFFICIENT_DATA` + nested `match` fields).
   */
  @Post('compare')
  async compare(
    @Body() body: CompareBodyDto,
  ): Promise<
    | { ok: true; status: 'READY'; matchId: string; match: MatchRecordDto }
    | {
        ok: true;
        status: 'NOT_ANALYZED' | 'INSUFFICIENT_DATA';
        matchId: string;
        message: string;
        match: CompareGuardMatchDto;
      }
  > {
    const aId = body?.aId?.trim();
    const bId = body?.bId?.trim();
    if (!aId || !bId) {
      throw new BadRequestException('aId and bId are required');
    }
    if (aId === bId) {
      throw new BadRequestException('aId and bId must be different');
    }
    try {
      const result = await this.matchesService.compare({ aId, bId });
      if (result.status === 'NOT_ANALYZED' || result.status === 'INSUFFICIENT_DATA') {
        return {
          ok: true,
          status: result.status,
          matchId: result.matchId,
          message: result.match.message,
          match: result.match,
        };
      }
      return { ok: true, status: 'READY', matchId: result.matchId, match: result.match };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compare failed';
      if (err && typeof err === 'object' && 'status' in err) throw err;
      throw new BadRequestException(message);
    }
  }

  /**
   * Each item may include optional read-only HG fields when valid:
   * `hgMutualPass`, `hgOverallStatus` (e.g. `PASS:PASS` / `FAIL:FAIL` per direction), `hgRankScore` (soft-pass dimension count).
   * Populated from `match_pair_hg_snapshot` first, else one live HG eval per pair (see `resolvePairHgFieldsFromSnapshotAndRows`).
   * Production sort: `MATCH_RANKING_CONTRACT === HG_GATE_LEGACY_RANK_V1` — legacy `getDisplayScore` / `rankingScore` only;
   * HG fields and `children_unsure` do not change ordering (`match-ranking-contract.ts`).
   * When `ENABLE_HG_LIST_ADMISSION_GATE=1`, before sort: rows **without** a valid HG wire triple stay on the list (lenient);
   * rows **with** a valid triple are removed unless `hgMutualPass === true` (`MatchesService.isHgListAdmissionGateEnabled`).
   */
  @Get()
  async list(
    @Query(HIDE_CHILDREN_UNSURE_QUERY_PARAM) hideChildrenUnsureRaw?: string,
  ): Promise<{ ok: true; items: MatchListItemDto[] }> {
    const hideChildrenUnsure = parseHideChildrenUnsure(hideChildrenUnsureRaw);
    const items = await this.matchesService.list({ hideChildrenUnsure });
    const withChildrenUnsureCount = items.filter((i) => anyChildrenUnsure(i.children_unsure)).length;
    this.childrenUnsureAnalytics.recordListOrTopResponse({
      returnedCount: items.length,
      withChildrenUnsureCount,
      hideFilterActive: hideChildrenUnsure,
    });
    return { ok: true, items };
  }

  /** Same optional HG triple as list items; sort is legacy `getDisplayScore` only (`MATCH_RANKING_CONTRACT === HG_GATE_LEGACY_RANK_V1`). */
  @Get('top')
  async getTop(
    @Query(HIDE_CHILDREN_UNSURE_QUERY_PARAM) hideChildrenUnsureRaw?: string,
  ): Promise<{ ok: true; matches: DatingMatchPreviewDto[] }> {
    const hideChildrenUnsure = parseHideChildrenUnsure(hideChildrenUnsureRaw);
    const items = await this.matchesService.list({ hideChildrenUnsure });
    const withChildrenUnsureCount = items.filter((i) => anyChildrenUnsure(i.children_unsure)).length;
    this.childrenUnsureAnalytics.recordListOrTopResponse({
      returnedCount: items.length,
      withChildrenUnsureCount,
      hideFilterActive: hideChildrenUnsure,
    });
    const sorted = items
      .map((item) => {
        const engineScore = item.finalScore ?? item.overall;
        const rankScore = getDisplayScore(item);
        const otherPerson = item.b;
        const chips =
          item.explainability?.positiveChips?.slice(0, MATCH_PREVIEW_CHIPS_SLICE) ?? [];

        const hasChildrenUnsure = anyChildrenUnsure(item.children_unsure);
        const hgPreview = tryPickHolyGrailMatchDiagnosticsDto(item);

        const preview: DatingMatchPreviewDto = {
          id: item.matchId,
          name: otherPerson.name,
          age: MATCH_PREVIEW_AGE_PLACEHOLDER,
          summary: `Match score: ${Math.round(rankScore)}`,
          compatibilityScore: Math.round(rankScore),
          strongReason: item.shortReason || 'Good compatibility',
          frictionPoint: item.explainability?.tensionChip || 'No major tensions',
          ...(item.explainability && { explainability: item.explainability }),
          ...(item.recommendation && { recommendation: item.recommendation }),
          ...(item.children_unsure && { children_unsure: item.children_unsure }),
          ...(hasChildrenUnsure && { engineCompatibilityScore: Math.round(engineScore) }),
          ...(hgPreview ? { ...hgPreview } : {}),
        };
        return preview;
      })
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, MATCH_TOP_PREVIEW_LIMIT);
    return { ok: true, matches: sorted };
  }

  @Get('analytics/children-unsure/daily')
  async childrenUnsureDailySummary(
    @Query('date') dateUtc?: string,
  ): Promise<{ ok: true; summary: ChildrenUnsureDailySummary }> {
    return { ok: true, summary: this.childrenUnsureAnalytics.getDailySummary(dateUtc) };
  }

  @Get('analytics/hg-pair-snapshot/summary')
  async hgPairSnapshotSummary(): Promise<{
    ok: true;
    cumulative: ReturnType<HolyGrailPairSnapshotTelemetryService['getCumulative']>;
    lastListBatch: ReturnType<HolyGrailPairSnapshotTelemetryService['getLastListBatch']>;
  }> {
    return {
      ok: true,
      cumulative: this.hgPairSnapshotTelemetry.getCumulative(),
      lastListBatch: this.hgPairSnapshotTelemetry.getLastListBatch(),
    };
  }

  /**
   * Shadow metrics for HG vs legacy on the **current** `list()` path (no response shape changes elsewhere).
   * `report.contract` is production `MATCH_RANKING_CONTRACT` (`HG_GATE_LEGACY_RANK_V1`). `admission.*` are counterfactual
   * counts vs a strict mutual-pass gate on HG-wire-complete rows. `ranking.*` compares legacy order to a counterfactual
   * shadow HG sort among HG-complete rows only (not applied in production; there is no hypothetical penalty sort).
   */
  @Get('analytics/shadow-hg-vs-legacy')
  async shadowHgVsLegacy(): Promise<{
    ok: true;
    contract: typeof MATCH_RANKING_CONTRACT;
    report: ShadowHgVsLegacyMetricsReport;
  }> {
    const report = await this.matchesService.getShadowHgVsLegacyMetrics();
    return { ok: true, contract: MATCH_RANKING_CONTRACT, report };
  }

  @Post('analytics/children-unsure/events')
  async childrenUnsureAnalyticsEvent(
    @Body() body: { event?: string },
  ): Promise<{ ok: true; accepted: boolean }> {
    const ev = body?.event;
    if (ev === CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_IMPRESSION) {
      this.childrenUnsureAnalytics.recordBadgeImpression();
      return { ok: true, accepted: true };
    }
    if (ev === CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_CLICK) {
      this.childrenUnsureAnalytics.recordBadgeClick();
      return { ok: true, accepted: true };
    }
    return { ok: true, accepted: false };
  }

  /**
   * Detail body may include the same optional HG triple when valid; snapshot-first in `computeMatchDetailPairHg`
   * (both children + diagnostics from snapshot when possible), else live fallback via `resolvePairHgFieldsFromSnapshotClassifications`.
   * Display score is legacy; `children_unsure` does not reorder lists (`MATCH_RANKING_CONTRACT === HG_GATE_LEGACY_RANK_V1`).
   */
  @Get(':id')
  async getById(@Param('id') id: string): Promise<MatchDetailUiDto> {
    const ctx = await this.matchesService.getReadyMatchDetailContext(id);
    if (!ctx) {
      throw new NotFoundException('Match not found');
    }
    const { match, rowA, rowB } = ctx;
    const normalized: MatchRecordDto = {
      ...match,
      finalScore: match.finalScore ?? match.overall,
    };
    const { children_unsure, holyGrail, telemetry } = await computeMatchDetailPairHg(
      this.prisma,
      normalized.aId,
      normalized.bId,
      { rowA, rowB },
    );
    this.hgPairSnapshotTelemetry.recordDetailResolution(telemetry);
    return mapMatchRecordToDetailUi(normalized, children_unsure, holyGrail);
  }
}

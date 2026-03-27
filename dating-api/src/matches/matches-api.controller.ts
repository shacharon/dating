import { Controller, Get, Post, Query } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesAnalyticsService } from './matches-analytics.service';
import { MatchesScanService } from './matches-scan.service';
import { MatchDaemonService } from './match-daemon.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { MatchAnalyticsLog } from './matches-analytics.service';
import type { FlaggedMatchEntry } from './matches-scan.service';
import type { RebuildStatsDto } from './match-daemon.service';
import { buildShortReason } from './match-short-reason';
import type {
  MatchDebugDto,
  MatchExplainabilityDto,
  MatchRecommendationDto,
} from './match-engine';

export interface MatchesApiItemDto {
  matchId: string;
  finalScore: number;
  /** Balance tier (GREEN / YELLOW / RED) for transparent reasons. */
  tier: string | null;
  compatibility: number | null;
  coveragePercent: number | null;
  lowCoverage: boolean;
  scoreCoverageFactor: number | null;
  coverageFactor: number | null;
  confidence: number | null;
  infoFlags: string[];
  friction: number | null;
  frictionPenalty: number | null;
  rawScore: number | null;
  userAId: string;
  userBId: string;
  userAName: string;
  userBName: string;
  policyVersion: string | null;
  updatedAt: string;
  /** Deterministic one-line reason for matches screen. */
  shortReason: string;
  /** Engine explainability (omitted on older records). */
  explainability?: MatchExplainabilityDto;
  /** User-facing recommendation layer (omitted on older records). */
  recommendation?: MatchRecommendationDto;
  derived?: {
    a: { occupationClass?: string; visibilityNeed?: number; lifeStage?: number };
    b: { occupationClass?: string; visibilityNeed?: number; lifeStage?: number };
  };
  dealbreakers?: Array<{ code: string; severity: string; evidence: string[] }>;
  balance?: {
    positiveScore: number;
    negativeScore: number;
    ratio: number;
    tier: string;
    reasons: string[];
  };
  /** Present only when ?includeDebug=1 (admin/diagnostics). */
  debug?: MatchDebugDto;
}

@Controller('api/matches')
export class MatchesApiController {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly analyticsService: MatchesAnalyticsService,
    private readonly scanService: MatchesScanService,
    private readonly matchDaemon: MatchDaemonService,
    private readonly logger: SimpleLogger,
  ) {}

  @Get()
  async list(
    @Query('policyVersion') policyVersion = 'v2',
    @Query('minCoveragePercent') minCovRaw?: string,
    @Query('includeDebug') includeDebugRaw?: string,
  ): Promise<{ ok: true; items: MatchesApiItemDto[] }> {
    const minCoveragePercent =
      minCovRaw != null && minCovRaw !== '' ? Number(minCovRaw) : undefined;
    const includeDebug = includeDebugRaw === '1' || includeDebugRaw === 'true';

    const records = await this.matchesService.listFull({
      policyVersion,
      minCoveragePercent:
        minCoveragePercent != null && !Number.isNaN(minCoveragePercent)
          ? minCoveragePercent
          : undefined,
    });

    const items: MatchesApiItemDto[] = records.map((r) => {
      const finalScore = r.finalScore ?? r.overall;
      const tier = r.balance?.tier ?? r.debug?.tier ?? null;
      const lowCoverage =
        (r.infoFlags ?? []).includes('LOW_COVERAGE') ||
        (r.coveragePercent != null && r.coveragePercent < 50);
      const dealbreakers = r.dealbreakers ?? [];
      const shortReason = buildShortReason({
        finalScore,
        tier: tier ?? 'UNKNOWN',
        dealbreakers,
      });
      return {
        matchId: r.matchId,
        finalScore,
        tier,
        compatibility: r.compatibility ?? null,
        coveragePercent: r.coveragePercent ?? null,
        lowCoverage,
        scoreCoverageFactor: r.scoreCoverageFactor ?? null,
        coverageFactor: r.coverageFactor ?? null,
        confidence: r.confidence ?? null,
        infoFlags: r.infoFlags ?? [],
        friction: r.friction ?? null,
        frictionPenalty: r.frictionPenalty ?? null,
        rawScore: r.rawScore ?? null,
        userAId: r.aId,
        userBId: r.bId,
        userAName: r.a.name,
        userBName: r.b.name,
        policyVersion: r.policyVersion ?? null,
        updatedAt: r.updatedAt,
        shortReason,
        ...(r.explainability != null && { explainability: r.explainability }),
        ...(r.recommendation != null && { recommendation: r.recommendation }),
        ...(r.derived != null && { derived: r.derived }),
        ...(r.dealbreakers != null && { dealbreakers: r.dealbreakers }),
        ...(r.balance != null && { balance: r.balance }),
        ...(includeDebug && r.debug != null && { debug: r.debug }),
      };
    });

    return { ok: true, items };
  }

  /**
   * Recompute all pairwise matches (load profiles, compare every pair, save + index).
   * Logs before/after: matches count and average score. Does not change scoring logic.
   */
  @Post('recompute-all')
  async recomputeAll(): Promise<{ ok: true; stats: RebuildStatsDto }> {
    const indexBefore = await this.matchDaemon.getAutoIndex();
    const countBefore = indexBefore?.matchCount ?? 0;
    const itemsBefore = indexBefore?.items ?? [];
    const avgScoreBefore =
      itemsBefore.length > 0
        ? itemsBefore.reduce((s, i) => s + (i.finalScore ?? i.overall), 0) / itemsBefore.length
        : 0;

    this.logger.log(
      `recompute_all before: matchesCount=${countBefore} avgScore=${avgScoreBefore.toFixed(2)}`,
      'MatchesApi',
    );

    const stats = await this.matchDaemon.runOnce();

    const indexAfter = await this.matchDaemon.getAutoIndex();
    const countAfter = indexAfter?.matchCount ?? 0;
    const itemsAfter = indexAfter?.items ?? [];
    const avgScoreAfter =
      itemsAfter.length > 0
        ? itemsAfter.reduce((s, i) => s + (i.finalScore ?? i.overall), 0) / itemsAfter.length
        : 0;

    this.logger.log(
      `recompute_all after: matchesCount=${countAfter} avgScore=${avgScoreAfter.toFixed(2)}`,
      'MatchesApi',
    );

    return { ok: true, stats };
  }

  /**
   * Compute match analytics (distribution, metrics, top/worst pairs) and log as JSON.
   * Returns the same payload for API consumers.
   */
  @Post('analytics')
  async analytics(): Promise<{ ok: true; analytics: MatchAnalyticsLog }> {
    const analytics = await this.analyticsService.computeAndLog();
    return { ok: true, analytics };
  }

  /**
   * Scan matches and flag those matching: score>80+friction>5, score>80+coverage<0.5, score<30+similarity>7.
   * Logs each flagged match (matchId, reason, signals); returns the list.
   */
  @Post('scan')
  async scan(): Promise<{ ok: true; flagged: FlaggedMatchEntry[] }> {
    const flagged = await this.scanService.scanAndLog();
    return { ok: true, flagged };
  }
}

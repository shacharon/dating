/**
 * QUARANTINE (Sprint 53 Story 02) — LAB / ADMIN ONLY.
 * Not a product HTTP surface. Product matches: /api/v1/me/*.
 * See docs/ops/LEGACY_HTTP_QUARANTINE.md. Scheduled for deletion (not this PR).
 */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AuthGuard } from '../auth/auth.guard';
import { LegacyBackendAdapter } from '../legacy/legacy-backend.adapter';
import { buildShortReason } from './match-short-reason';
import { resolveEngineFinalScore } from './match-score.util';
import type {
  MatchDebugDto,
  MatchExplainabilityDto,
  MatchRecommendationDto,
} from './match-engine';
export interface MatchesApiItemDto {
  matchId: string;
  finalScore: number;
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
    a: {
      occupationClass?: string;
      visibilityNeed?: number;
      lifeStage?: number;
    };
    b: {
      occupationClass?: string;
      visibilityNeed?: number;
      lifeStage?: number;
    };
  };
  dealbreakers?: Array<{ code: string; severity: string; evidence: string[] }>;
  balance?: {
    positiveScore: number;
    negativeScore: number;
    ratio: number;
    reasons: string[];
  };
  /** Present only when ?includeDebug=1 (admin/diagnostics). */
  debug?: MatchDebugDto;
  /**
   * Optional HG diagnostic triple from live HG eval + profile rows (pair snapshot table removed, Migration 3).
   * Aligned with engine list semantics via this controller; omitted when unavailable or wire-invalid.
   */
  readonly hgMutualPass?: boolean;
  readonly hgOverallStatus?: string;
  readonly hgRankScore?: number;
}

/**
 * @deprecated Lab/admin only (Sprint 53 Story 02). Not product HTTP.
 * Product matches: `/api/v1/me/matches*`. See `docs/ops/LEGACY_HTTP_QUARANTINE.md`.
 *
 * Admin-style match list. When `ENABLE_HG_LIST_ADMISSION_GATE=1`, `listFullWithHolyGrailRows` applies the same
 * membership filter as this list (`GET /api/matches`): rows **without** a valid HG diagnostic triple are **kept**; rows **with**
 * a valid triple are kept only when `hgMutualPass === true` (`hg-list-admission-gate.ts`). Production sort remains
 * `MATCH_RANKING_CONTRACT` (`HG_GATE_LEGACY_RANK_V1`).
 */
@Controller('api/matches')
@UseGuards(AuthGuard, AdminGuard)
export class MatchesApiController {
  constructor(private readonly legacy: LegacyBackendAdapter) {}

  @Get()
  async list(
    @Query('policyVersion') policyVersion = 'v2',
    @Query('minCoveragePercent') minCovRaw?: string,
    @Query('includeDebug') includeDebugRaw?: string,
  ): Promise<{ ok: true; items: MatchesApiItemDto[] }> {
    const minCoveragePercent =
      minCovRaw != null && minCovRaw !== '' ? Number(minCovRaw) : undefined;
    const includeDebug = includeDebugRaw === '1' || includeDebugRaw === 'true';

    const { records, holyGrailRowsById } =
      await this.legacy.matches.listFullWithHolyGrailRows({
        policyVersion,
        minCoveragePercent:
          minCoveragePercent != null && !Number.isNaN(minCoveragePercent)
            ? minCoveragePercent
            : undefined,
      });

    const hgWireByMatchId =
      await this.legacy.matches.resolveHolyGrailDiagnosticsWireForMatchRecords(
        records,
        holyGrailRowsById,
      );

    const items: MatchesApiItemDto[] = records.map((r) => {
      const finalScore = resolveEngineFinalScore(r);
      const lowCoverage =
        (r.infoFlags ?? []).includes('LOW_COVERAGE') ||
        (r.coveragePercent != null && r.coveragePercent < 50);
      const dealbreakers = r.dealbreakers ?? [];
      const shortReason = buildShortReason({
        finalScore,
        dealbreakers,
      });
      const hgWire = hgWireByMatchId.get(r.matchId);
      return {
        matchId: r.matchId,
        finalScore,
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
        ...(hgWire ? { ...hgWire } : {}),
      };
    });

    return { ok: true, items };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import type { MatchPairRuntimeBundle } from '../profiles/profiles-prisma.service';
import { ProfilesPrismaService } from '../profiles/profiles-prisma.service';
import { compareWithStatus } from './match-engine';
import type {
  CompareGuardFailureResultDto,
  CompareResultDto,
} from './match-engine';
import {
  directionsMutualHardPass,
  profileWithNeutralSelfSignalsFallback,
} from './compare-hg-first-helpers';
import type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';
import type {
  ChildrenUnsureDirectionsDto,
  HolyGrailMatchDiagnosticsDto,
  MatchListItemDto,
  MatchRecordDto,
} from './match.types';
import { buildShortReason } from './match-short-reason';
import { PrismaService } from '../prisma/prisma.service';
import { HolyGrailPairSnapshotTelemetryService } from './holy-grail-pair-snapshot-telemetry.service';
import {
  CHILDREN_UNSURE_PROFILE_ROW_SELECT,
  loadChildrenUnsureProfileRowMap,
} from './match-detail-children-unsure';
import { anyChildrenUnsure, getDisplayScore } from './children-unsure.helpers';
import { toCanonicalMatchId } from './match-id';
import { tryPickHolyGrailMatchDiagnosticsDto } from './holy-grail-match-diagnostics.wire';
import {
  holyGrailMatchDiagnosticsFromDirections,
  loadMatchPairHgSnapshotMap,
  resolvePairHgFieldsFromSnapshotAndRows,
  upsertMatchPairHgSnapshots,
} from './match-pair-hg-snapshot';
import { ENABLE_HG_COMPARE_DIAGNOSTIC_ENV } from './hg-compare-diagnostic.constants';
import { ENABLE_HG_LIST_ADMISSION_GATE_ENV } from './hg-list-admission-gate.constants';
import {
  filterMatchRecordsByHgListAdmissionGate,
  listItemPassesHgListAdmissionGate,
  parseHgListAdmissionGateEnv,
} from './hg-list-admission-gate';
import { evaluateHolyGrailPairDirections } from './holy-grail-pair-directions';
import {
  computeShadowHgVsLegacyMetricsFromListItems,
  type ShadowHgVsLegacyMetricsReport,
} from './shadow-hg-vs-legacy-metrics';

export type { CompareResultDto } from './match-engine';
export type { MatchListItemDto } from './match.types';

export { MATCH_RANKING_CONTRACT, type MatchRankingContractId } from './match-ranking-contract';
export { ENABLE_HG_LIST_ADMISSION_GATE_ENV } from './hg-list-admission-gate.constants';
export type { ShadowHgVsLegacyMetricsReport } from './shadow-hg-vs-legacy-metrics';

export interface ListMatchesOptions {
  readonly hideChildrenUnsure?: boolean;
}

export interface CompareBodyDto {
  aId: string;
  bId: string;
}

export interface CompareGuardMatchDto {
  matchId: string;
  aId: string;
  bId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  status: 'NOT_ANALYZED' | 'INSUFFICIENT_DATA';
  message: string;
  compatibility: null;
  partnerFit: null;
  relationshipFit: null;
  coverage: null;
  friction: null;
  overall: null;
  finalScore: null;
}

export type CompareServiceResult =
  | { status: 'READY'; matchId: string; match: MatchRecordDto }
  | { status: 'NOT_ANALYZED'; matchId: string; match: CompareGuardMatchDto }
  | { status: 'INSUFFICIENT_DATA'; matchId: string; match: CompareGuardMatchDto };

/** HG-only diagnostic compare: no legacy engine, no ProfileExtractionV2 gate. */
export type CompareHgDiagnosticSuccess = {
  readonly ok: true;
  readonly matchId: string;
  readonly aId: string;
  readonly bId: string;
  readonly evaluatedAt: string;
  /** Always `live_hg_eval_only` — does not read `match_pair_hg_snapshot`. */
  readonly source: 'live_hg_eval_only';
  readonly a: { readonly id: string; readonly name: string };
  readonly b: { readonly id: string; readonly name: string };
  readonly children_unsure: ChildrenUnsureDirectionsDto;
  readonly holyGrail: HolyGrailMatchDiagnosticsDto;
};

export type CompareHgDiagnosticFailure = {
  readonly ok: false;
  readonly matchId: string;
  readonly aId: string;
  readonly bId: string;
  readonly evaluatedAt: string;
  readonly reason: 'HG_EVAL_UNAVAILABLE';
  readonly message: string;
  readonly a: { readonly id: string; readonly name: string };
  readonly b: { readonly id: string; readonly name: string };
};

export type CompareHgDiagnosticResult = CompareHgDiagnosticSuccess | CompareHgDiagnosticFailure;

@Injectable()
export class MatchesService {
  constructor(
    private readonly profilesPrisma: ProfilesPrismaService,
    private readonly prisma: PrismaService,
    private readonly hgPairSnapshotTelemetry: HolyGrailPairSnapshotTelemetryService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Env `ENABLE_HG_COMPARE_DIAGNOSTIC` = `1` or `true` (case-insensitive) enables POST compare/hg-diagnostic.
   */
  isHgCompareDiagnosticEnabled(): boolean {
    const v =
      this.config.get<string>(ENABLE_HG_COMPARE_DIAGNOSTIC_ENV) ??
      process.env[ENABLE_HG_COMPARE_DIAGNOSTIC_ENV];
    const s = (v ?? '').trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes';
  }

  /**
   * Env `ENABLE_HG_LIST_ADMISSION_GATE` = `1` / `true` / `yes` (case-insensitive). When on, list membership drops only
   * rows that expose a **valid** HG wire triple with `hgMutualPass === false`. Rows with **no** valid triple are **kept**
   * (lenient fallback). Off = no HG membership filter (still `HG_GATE_LEGACY_RANK_V1` legacy sort only).
   */
  isHgListAdmissionGateEnabled(): boolean {
    return parseHgListAdmissionGateEnv(
      this.config.get<string>(ENABLE_HG_LIST_ADMISSION_GATE_ENV),
      process.env[ENABLE_HG_LIST_ADMISSION_GATE_ENV],
    );
  }

  /**
   * Holy Grail pair diagnostics from DB HG row slice only: structured JSON + extractionV2 tags + self signal snapshot.
   * Does not call `compareWithStatus`, attach canonical V2 scalars, or run the legacy match engine.
   */
  async compareHgDiagnostic(body: CompareBodyDto): Promise<CompareHgDiagnosticResult> {
    const aId = body.aId?.trim();
    const bId = body.bId?.trim();
    if (!aId || !bId) throw new Error('aId and bId are required');
    if (aId === bId) throw new Error('aId and bId must be different');

    const bundle = await this.profilesPrisma.loadMatchPairRuntimeBundle(aId, bId);
    if (!bundle) {
      throw new NotFoundException(`One or both profiles not found: ${aId}, ${bId}`);
    }
    const { rowA, rowB, profileA, profileB } = bundle;

    const evaluatedAt = new Date().toISOString();
    const matchId = toCanonicalMatchId(aId, bId);
    const name = (p: ProfileJsonPayload) => ({ id: p.id, name: p.name ?? '' });

    const dirs = evaluateHolyGrailPairDirections(rowA, rowB, new Date(evaluatedAt));
    if (!dirs) {
      return {
        ok: false,
        matchId,
        aId,
        bId,
        evaluatedAt,
        reason: 'HG_EVAL_UNAVAILABLE',
        message:
          'HG mapping or evaluation failed (invalid holyGrail structured JSON, mapper validation, or internal error).',
        a: name(profileA),
        b: name(profileB),
      };
    }

    const children_unsure = {
      profile_a_to_profile_b: dirs.aToB.eligibilityFlags.children_unsure,
      profile_b_to_profile_a: dirs.bToA.eligibilityFlags.children_unsure,
    };
    const holyGrail = holyGrailMatchDiagnosticsFromDirections(dirs.aToB, dirs.bToA);

    return {
      ok: true,
      matchId,
      aId,
      bId,
      evaluatedAt,
      source: 'live_hg_eval_only',
      a: name(profileA),
      b: name(profileB),
      children_unsure,
      holyGrail,
    };
  }

  /**
   * READY match record plus HG profile rows from the same batched read as `compare` (for detail HG without reloading).
   */
  async getReadyMatchDetailContext(matchId: string): Promise<{
    readonly match: MatchRecordDto;
    readonly rowA: ChildrenUnsureProfileRow;
    readonly rowB: ChildrenUnsureProfileRow;
  } | null> {
    const [aId, bId] = matchId.split('__');
    if (!aId || !bId) return null;
    if (toCanonicalMatchId(aId, bId) !== matchId) return null;
    const bundle = await this.profilesPrisma.loadMatchPairRuntimeBundle(aId, bId);
    if (!bundle) return null;
    const result = await this.runCompareOnLoadedBundle(bundle);
    if (result.status !== 'READY') return null;
    return { match: result.match, rowA: bundle.rowA, rowB: bundle.rowB };
  }

  async compare(body: CompareBodyDto): Promise<CompareServiceResult> {
    const aId = body.aId?.trim();
    const bId = body.bId?.trim();
    if (!aId || !bId) throw new Error('aId and bId are required');
    if (aId === bId) throw new Error('aId and bId must be different');

    const bundle = await this.profilesPrisma.loadMatchPairRuntimeBundle(aId, bId);
    if (!bundle) {
      throw new NotFoundException(`One or both profiles not found: ${aId}, ${bId}`);
    }
    return this.runCompareOnLoadedBundle(bundle);
  }

  private async runCompareOnLoadedBundle(bundle: MatchPairRuntimeBundle): Promise<CompareServiceResult> {
    const profileA = bundle.profileA;
    const profileB = bundle.profileB;
    const aId = profileA.id;
    const bId = profileB.id;

    const hgDirections = evaluateHolyGrailPairDirections(bundle.rowA, bundle.rowB);

    // Canonical V2 scalars are optional: neutral defaults when rows are absent (no 404 gate).
    const [v2A, v2B] = await Promise.all([
      this.prisma.profileExtractionV2.findUnique({
        where: { profileId: profileA.id },
        select: {
          relationship_clarity_self: true,
          relationship_clarity_partner: true,
          relationship_clarity_relationship: true,
        },
      }),
      this.prisma.profileExtractionV2.findUnique({
        where: { profileId: profileB.id },
        select: {
          relationship_clarity_self: true,
          relationship_clarity_partner: true,
          relationship_clarity_relationship: true,
        },
      }),
    ]);

    const v2Scalars = (row: typeof v2A) => ({
      relationship_clarity_self: row?.relationship_clarity_self ?? 5,
      relationship_clarity_partner: row?.relationship_clarity_partner ?? 5,
      relationship_clarity_relationship: row?.relationship_clarity_relationship ?? 5,
    });

    (profileA as any).canonicalScalarsV2 = v2Scalars(v2A);
    (profileB as any).canonicalScalarsV2 = v2Scalars(v2B);

    // Canonical scalar source-of-truth for filter/debug layer (no scoring changes here).
    const canonicalClarityA = (profileA as any).canonicalScalarsV2.relationship_clarity_self;
    const canonicalClarityB = (profileB as any).canonicalScalarsV2.relationship_clarity_self;
    void canonicalClarityA;
    void canonicalClarityB;

    let result: CompareResultDto | CompareGuardFailureResultDto = compareWithStatus(
      profileA as ProfileJsonPayload,
      profileB as ProfileJsonPayload,
    );

    if (
      'status' in result &&
      result.status === 'INSUFFICIENT_DATA' &&
      hgDirections &&
      directionsMutualHardPass(hgDirections)
    ) {
      const aP = profileWithNeutralSelfSignalsFallback(profileA as ProfileJsonPayload);
      const bP = profileWithNeutralSelfSignalsFallback(profileB as ProfileJsonPayload);
      const retry = compareWithStatus(aP, bP);
      if (!('status' in retry)) {
        result = retry;
        if (result.debug) {
          result.debug = {
            ...result.debug,
            provenance: [
              ...(result.debug.provenance ?? []),
              'HG_FIRST_NEUTRAL_SIGNAL_LEGACY_FALLBACK',
            ],
          };
        }
      }
    }

    const matchId = toCanonicalMatchId(aId, bId);
    if ('status' in result && result.status === 'NOT_ANALYZED') {
      return {
        status: 'NOT_ANALYZED',
        matchId,
        match: {
          matchId,
          aId,
          bId,
          a: { id: profileA.id, name: profileA.name },
          b: { id: profileB.id, name: profileB.name },
          status: 'NOT_ANALYZED',
          message: result.message,
          compatibility: null,
          partnerFit: null,
          relationshipFit: null,
          coverage: null,
          friction: null,
          overall: null,
          finalScore: null,
        },
      };
    }
    if ('status' in result && result.status === 'INSUFFICIENT_DATA') {
      return {
        status: 'INSUFFICIENT_DATA',
        matchId,
        match: {
          matchId,
          aId,
          bId,
          a: { id: profileA.id, name: profileA.name },
          b: { id: profileB.id, name: profileB.name },
          status: 'INSUFFICIENT_DATA',
          message: result.message,
          compatibility: null,
          partnerFit: null,
          relationshipFit: null,
          coverage: null,
          friction: null,
          overall: null,
          finalScore: null,
        },
      };
    }
    const compareResult = result as CompareResultDto;

    const now = new Date().toISOString();

    const record: MatchRecordDto = {
      matchId,
      aId,
      bId,
      a: { id: profileA.id, name: profileA.name },
      b: { id: profileB.id, name: profileB.name },
      overall: compareResult.finalScore,
      createdAt: now,
      updatedAt: now,
      aToB: compareResult.aToB,
      bToA: compareResult.bToA,
      relationshipStyle: compareResult.relationshipStyle,
      coverage: compareResult.coverage,
      frictionRisk: compareResult.frictionRisk,
      compatibility: compareResult.compatibility,
      finalScore: compareResult.finalScore,
      rawScore: compareResult.rawScore,
      friction: compareResult.friction,
      frictionPenalty: compareResult.frictionPenalty,
      coveragePercent: compareResult.coveragePercent,
      scoreCoverageFactor: compareResult.scoreCoverageFactor,
      coverageFactor: compareResult.coverageFactor,
      confidence: compareResult.confidence,
      infoFlags: compareResult.infoFlags,
      alignments: compareResult.alignments,
      tensions: compareResult.tensions,
      tensionMatrix: compareResult.tensionMatrix,
      derived: compareResult.derived,
      dealbreakers: compareResult.dealbreakers,
      balance: compareResult.balance,
      debug: compareResult.debug,
      explainability: compareResult.explainability,
      recommendation: compareResult.recommendation,
    };

    return { status: 'READY', matchId, match: record };
  }

  /**
   * Upserts `match_pair_hg_snapshot` for every computed pair (called after full recompute / rebuild).
   */
  async persistMatchPairHgSnapshots(records: MatchRecordDto[]): Promise<{ written: number; skipped: number }> {
    const profileMap = await loadChildrenUnsureProfileRowMap(this.prisma);
    return upsertMatchPairHgSnapshots(this.prisma, records, profileMap);
  }

  /**
   * Ordered by legacy display score only (`getDisplayScore` → `rankingScore` === `engineFinalScore`).
   * Production contract: `MATCH_RANKING_CONTRACT === HG_GATE_LEGACY_RANK_V1` — HG diagnostics + `children_unsure` never
   * change sort order (`match-ranking-contract.ts`). Optional `ENABLE_HG_LIST_ADMISSION_GATE` drops only rows with a
   * **valid** HG triple and `hgMutualPass === false`; rows without a valid triple stay listed (lenient).
   */
  async list(opts?: ListMatchesOptions): Promise<MatchListItemDto[]> {
    const hideChildrenUnsure = opts?.hideChildrenUnsure === true;
    const { records, holyGrailRowsById } = await this.loadPairwiseMatchRecordsAndHolyGrailRows();
    const snapshotMap = await loadMatchPairHgSnapshotMap(
      this.prisma,
      records.map((r) => r.matchId),
    );

    this.hgPairSnapshotTelemetry.beginListBatch();

    const mapped: MatchListItemDto[] = records.map((r) => {
      const finalScore = r.finalScore ?? r.overall;
      const dealbreakersRaw = r.dealbreakers ?? r.debug?.dealbreakers ?? [];
      const dealbreakers = dealbreakersRaw.map((d) => ({
        code: d.code,
        ...(d.severity != null && { severity: d.severity }),
      }));
      const shortReason = buildShortReason({
        finalScore,
        dealbreakers,
      });
      const scoreMetadata: MatchListItemDto['scoreMetadata'] = {};
      if (r.coveragePercent != null) scoreMetadata.coveragePercent = r.coveragePercent;
      if (r.coverageFactor != null) scoreMetadata.coverageFactor = r.coverageFactor;
      if (r.friction != null) scoreMetadata.friction = r.friction;
      if (r.rawScore != null) scoreMetadata.rawScore = r.rawScore;

      const rowA = holyGrailRowsById.get(r.aId);
      const rowB = holyGrailRowsById.get(r.bId);
      const { children_unsure, holyGrail, telemetry } = resolvePairHgFieldsFromSnapshotAndRows({
        matchId: r.matchId,
        snapshot: snapshotMap.get(r.matchId),
        rowA,
        rowB,
      });
      this.hgPairSnapshotTelemetry.recordListPair(telemetry);
      const hgWire = tryPickHolyGrailMatchDiagnosticsDto(holyGrail);
      const engineFinalScore = finalScore;
      const rankingScore = engineFinalScore;

      return {
        matchId: r.matchId,
        a: r.a,
        b: r.b,
        overall: r.overall,
        finalScore,
        engineFinalScore,
        rankingScore,
        children_unsure,
        updatedAt: r.updatedAt,
        dealbreakers,
        shortReason,
        ...(r.explainability != null && { explainability: r.explainability }),
        ...(r.recommendation != null && { recommendation: r.recommendation }),
        ...(Object.keys(scoreMetadata).length > 0 && { scoreMetadata }),
        ...(hgWire ? { ...hgWire } : {}),
      };
    });

    const gateOn = this.isHgListAdmissionGateEnabled();
    const afterHgGate = gateOn
      ? mapped.filter((row) => listItemPassesHgListAdmissionGate(true, row))
      : mapped;
    const filtered = hideChildrenUnsure
      ? afterHgGate.filter((row) => !anyChildrenUnsure(row.children_unsure))
      : afterHgGate;

    this.hgPairSnapshotTelemetry.endListBatch({
      itemsAfterFilter: filtered.length,
      hideChildrenUnsure,
    });

    return filtered.sort((a, b) => getDisplayScore(b) - getDisplayScore(a));
  }

  /**
   * Shadow cutover metrics: same runtime path as `list({ hideChildrenUnsure: false })`, read-only aggregates.
   * Does not change public list API payloads. `ShadowHgVsLegacyMetricsReport.contract` is production
   * `MATCH_RANKING_CONTRACT` (`HG_GATE_LEGACY_RANK_V1`); shadow ranking blocks are counterfactual only (no penalty sort).
   */
  async getShadowHgVsLegacyMetrics(): Promise<ShadowHgVsLegacyMetricsReport> {
    const items = await this.list({ hideChildrenUnsure: false });
    return computeShadowHgVsLegacyMetricsFromListItems(items);
  }

  async listFull(opts: {
    policyVersion: string;
    minCoveragePercent?: number;
  }): Promise<MatchRecordDto[]> {
    return (await this.listFullWithHolyGrailRows(opts)).records;
  }

  /**
   * Filtered legacy records plus the HG row map from the same list load (`loadMatchListProfileData`).
   * Avoids a second `UserProfile` query when resolving HG wires for the same record set.
   */
  async listFullWithHolyGrailRows(opts: {
    policyVersion: string;
    minCoveragePercent?: number;
  }): Promise<{
    readonly records: MatchRecordDto[];
    readonly holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
  }> {
    const { records, holyGrailRowsById } = await this.loadPairwiseMatchRecordsAndHolyGrailRows();
    let filtered = records
      .filter((r) => (r.policyVersion ?? '') === opts.policyVersion)
      .filter((r) =>
        opts.minCoveragePercent != null
          ? (r.coveragePercent ?? 0) >= opts.minCoveragePercent
          : true,
      )
      .sort((a, b) => (b.finalScore ?? b.overall) - (a.finalScore ?? a.overall));
    if (this.isHgListAdmissionGateEnabled()) {
      const snapshotMap = await loadMatchPairHgSnapshotMap(
        this.prisma,
        filtered.map((r) => r.matchId),
      );
      filtered = filterMatchRecordsByHgListAdmissionGate({
        gateEnabled: true,
        records: filtered,
        snapshotMap,
        holyGrailRowsById,
      });
    }
    return { records: filtered, holyGrailRowsById };
  }

  /**
   * Same snapshot-primary HG resolution as `list()` (no membership/scoring side effects).
   * Used by secondary list surfaces (e.g. `GET /api/matches`) that do not load full `MatchListItemDto`.
   * Pass `holyGrailRowsById` from `listFullWithHolyGrailRows` to skip an extra profile query.
   */
  async resolveHolyGrailDiagnosticsWireForMatchRecords(
    records: readonly MatchRecordDto[],
    holyGrailRowsById?: ReadonlyMap<string, ChildrenUnsureProfileRow>,
  ): Promise<ReadonlyMap<string, HolyGrailMatchDiagnosticsDto | undefined>> {
    if (records.length === 0) return new Map();
    const snapshotMap = await loadMatchPairHgSnapshotMap(
      this.prisma,
      records.map((r) => r.matchId),
    );
    let rowMap: ReadonlyMap<string, ChildrenUnsureProfileRow>;
    if (holyGrailRowsById) {
      rowMap = holyGrailRowsById;
    } else {
      const idSet = new Set<string>();
      for (const r of records) {
        idSet.add(r.aId);
        idSet.add(r.bId);
      }
      const rows =
        idSet.size === 0
          ? []
          : await this.prisma.userProfile.findMany({
              where: { id: { in: [...idSet] } },
              select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
            });
      rowMap = new Map(rows.map((row) => [row.id, row as ChildrenUnsureProfileRow]));
    }
    const out = new Map<string, HolyGrailMatchDiagnosticsDto | undefined>();
    for (const r of records) {
      const { holyGrail } = resolvePairHgFieldsFromSnapshotAndRows({
        matchId: r.matchId,
        snapshot: snapshotMap.get(r.matchId),
        rowA: rowMap.get(r.aId),
        rowB: rowMap.get(r.bId),
      });
      out.set(r.matchId, tryPickHolyGrailMatchDiagnosticsDto(holyGrail));
    }
    return out;
  }

  async listAllComputed(): Promise<MatchRecordDto[]> {
    const { records } = await this.loadPairwiseMatchRecordsAndHolyGrailRows();
    return records;
  }

  /**
   * Shared match-list load: one profile batch (`loadMatchListProfileData`) → compare records + HG row map.
   */
  private async loadPairwiseMatchRecordsAndHolyGrailRows(): Promise<{
    records: MatchRecordDto[];
    holyGrailRowsById: ReadonlyMap<string, ChildrenUnsureProfileRow>;
  }> {
    const { profiles, holyGrailRowsById } = await this.profilesPrisma.loadMatchListProfileData();
    const records = MatchesService.buildMatchRecordsFromLoadedProfiles(profiles);
    return { records, holyGrailRowsById };
  }

  private static buildMatchRecordsFromLoadedProfiles(profiles: ProfileJsonPayload[]): MatchRecordDto[] {
    const profileById = new Map(profiles.map((p) => [p.id, p] as const));
    const ids = profiles.map((p) => p.id).sort((a, b) => a.localeCompare(b));
    const records: MatchRecordDto[] = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const aId = ids[i];
        const bId = ids[j];
        const profileA = profileById.get(aId);
        const profileB = profileById.get(bId);
        if (!profileA || !profileB) continue;
        const result = compareWithStatus(profileA, profileB);
        if (
          'status' in result &&
          (result.status === 'NOT_ANALYZED' || result.status === 'INSUFFICIENT_DATA')
        ) {
          continue;
        }
        const compareResult = result as CompareResultDto;
        const now = new Date().toISOString();
        records.push({
          matchId: toCanonicalMatchId(aId, bId),
          aId,
          bId,
          a: { id: profileA.id, name: profileA.name },
          b: { id: profileB.id, name: profileB.name },
          overall: compareResult.finalScore,
          createdAt: now,
          updatedAt: now,
          aToB: compareResult.aToB,
          bToA: compareResult.bToA,
          relationshipStyle: compareResult.relationshipStyle,
          coverage: compareResult.coverage,
          frictionRisk: compareResult.frictionRisk,
          compatibility: compareResult.compatibility,
          finalScore: compareResult.finalScore,
          rawScore: compareResult.rawScore,
          friction: compareResult.friction,
          frictionPenalty: compareResult.frictionPenalty,
          coveragePercent: compareResult.coveragePercent,
          scoreCoverageFactor: compareResult.scoreCoverageFactor,
          coverageFactor: compareResult.coverageFactor,
          confidence: compareResult.confidence,
          infoFlags: compareResult.infoFlags,
          alignments: compareResult.alignments,
          tensions: compareResult.tensions,
          tensionMatrix: compareResult.tensionMatrix,
          derived: compareResult.derived,
          dealbreakers: compareResult.dealbreakers,
          balance: compareResult.balance,
          debug: compareResult.debug,
          explainability: compareResult.explainability,
          recommendation: compareResult.recommendation,
        });
      }
    }
    return records;
  }
}

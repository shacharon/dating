import type { HolyGrailDirectionalEvaluationResult } from '../../holy-grail-matching/eligibility.evaluator';
import { HOLY_GRAIL_DIMENSION_KEYS } from '../../holy-grail-matching/holy-grail-dimensions';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ChildrenUnsureProfileRow } from '../children-unsure/children-unsure-profile-row.types';
import { HG_LIST_PRODUCT_POLICY_VERSION } from '../children-unsure/children-unsure.product-policy';
import { evaluateHolyGrailPairDirections } from '../holy-grail/holy-grail-pair-directions';
import type {
  ChildrenUnsureDirectionsDto,
  HolyGrailMatchDiagnosticsDto,
  MatchRecordDto,
} from '../match.types';
import { anyChildrenUnsure } from '../children-unsure/children-unsure.helpers';

const HG_CHILDREN_STATUS_SEP = ':';

/**
 * Persisted pair HG row fields consumed by classifiers (Prisma model removed in Migration 3).
 * In-memory / tests may still supply this shape; runtime DB reads/writes are gone.
 */
export type MatchPairHgSnapshotRow = {
  readonly matchId?: string;
  readonly childrenUnsure?: boolean;
  readonly hgChildrenStatus?: string | null;
  readonly hgOverallStatus?: string | null;
  readonly hgSoftPassCount?: number | null;
  readonly hgRankPenaltyApplied?: boolean;
  readonly hgPolicyVersion?: string | null;
};

/**
 * ## Source of truth (list/detail)
 *
 * List **sort order** ignores HG (see `match-ranking-contract.ts`); this module resolves HG fields for display.
 *
 * - **Snapshot-shaped rows**: classifiers accept `MatchPairHgSnapshotRow` when present (e.g. tests); production maps are empty.
 * - **Fallback**: live `evaluateHolyGrailPairDirections` when slices are missing/invalid and profile rows exist.
 * - **Rebuild**: `buildPairHgSnapshotPayload` remains; DB table dropped (Migration 3).
 */

/** Structured reject reasons for snapshot validity (metrics / logs). */
export const HG_PAIR_SNAPSHOT_REJECT = {
  NO_ROW: 'no_row',
  POLICY_MISMATCH: 'policy_mismatch',
  CHILDREN_STATUS_MISSING: 'children_status_missing',
  CHILDREN_STATUS_MALFORMED: 'children_status_malformed',
  DIAGNOSTICS_OVERALL_INVALID: 'diagnostics_overall_invalid',
  DIAGNOSTICS_SOFT_PASS_COUNT_INVALID: 'diagnostics_soft_pass_count_invalid',
} as const;

export type ClassifyChildrenUnsureFromSnapshotResult =
  | { readonly ok: true; readonly dto: ChildrenUnsureDirectionsDto }
  | { readonly ok: false; readonly reason: string };

export type ClassifyHolyGrailDiagnosticsFromSnapshotResult =
  | { readonly ok: true; readonly dto: HolyGrailMatchDiagnosticsDto }
  | { readonly ok: false; readonly reason: string };

export type HgChildrenResolutionSource = 'snapshot' | 'live' | 'default';
export type HgDiagnosticsResolutionSource = 'snapshot' | 'live' | 'none';

/** Per-pair resolution outcome for list/detail (logging + aggregates). */
export interface HgPairResolutionTelemetry {
  readonly matchId?: string;
  readonly childrenSource: HgChildrenResolutionSource;
  readonly diagnosticsSource: HgDiagnosticsResolutionSource;
  readonly liveEvalRan: boolean;
  readonly snapshotRowPresent: boolean;
  readonly snapshotPolicyCurrent: boolean;
  readonly snapshotChildrenReject?: string;
  readonly snapshotDiagnosticsReject?: string;
  /** Why live HG ran or why defaults applied without live. */
  readonly liveFallbackReason?: string;
  /** Live eval was invoked but returned null (structured inputs insufficient). */
  readonly liveEvalReturnedNull?: boolean;
}

export type PairHgSnapshotUpsertInput = {
  readonly matchId: string;
  readonly childrenUnsure: boolean;
  readonly hgChildrenStatus: string;
  readonly hgOverallStatus: string;
  readonly hgSoftPassCount: number;
  /**
   * Legacy field name: mirrors `childrenUnsure` (any directional soft-pass on wants-children).
   * List ordering no longer applies a score penalty — see `match-ranking-contract.ts`.
   */
  readonly hgRankPenaltyApplied: boolean;
  readonly hgPolicyVersion: string;
};

function countSoftPasses(
  aToB: HolyGrailDirectionalEvaluationResult,
  bToA: HolyGrailDirectionalEvaluationResult,
): number {
  let n = 0;
  for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
    if (aToB.dimensions[k].status === 'SOFT_PASS') n += 1;
    if (bToA.dimensions[k].status === 'SOFT_PASS') n += 1;
  }
  return n;
}

export function buildPairHgSnapshotPayload(
  matchId: string,
  aToB: HolyGrailDirectionalEvaluationResult,
  bToA: HolyGrailDirectionalEvaluationResult,
): PairHgSnapshotUpsertInput {
  // Sprint 15: PARTNER_WANTS_CHILDREN removed — children soft-pass status is always SKIPPED.
  const hgChildrenStatus = `SKIPPED${HG_CHILDREN_STATUS_SEP}SKIPPED`;
  const hgOverallStatus = `${aToB.overallHardEligibility}${HG_CHILDREN_STATUS_SEP}${bToA.overallHardEligibility}`;
  const profile_a_to_profile_b = aToB.eligibilityFlags.children_unsure;
  const profile_b_to_profile_a = bToA.eligibilityFlags.children_unsure;
  const dto: ChildrenUnsureDirectionsDto = {
    profile_a_to_profile_b,
    profile_b_to_profile_a,
  };
  const childrenUnsure = anyChildrenUnsure(dto);
  return {
    matchId,
    childrenUnsure,
    hgChildrenStatus,
    hgOverallStatus,
    hgSoftPassCount: countSoftPasses(aToB, bToA),
    hgRankPenaltyApplied: childrenUnsure,
    hgPolicyVersion: HG_LIST_PRODUCT_POLICY_VERSION,
  };
}

const VALID_CHILD_DIM = new Set(['PASS', 'FAIL', 'SKIPPED', 'SOFT_PASS']);

const VALID_OVERALL_HARD = new Set(['PASS', 'FAIL']);

function parseOverallHardPairFromSnapshot(
  hgOverallStatus: string | null | undefined,
): { a: 'PASS' | 'FAIL'; b: 'PASS' | 'FAIL' } | null {
  if (hgOverallStatus == null || hgOverallStatus === '') return null;
  const parts = hgOverallStatus.split(HG_CHILDREN_STATUS_SEP);
  if (parts.length !== 2) return null;
  const [x, y] = parts;
  if (!VALID_OVERALL_HARD.has(x) || !VALID_OVERALL_HARD.has(y)) return null;
  return { a: x as 'PASS' | 'FAIL', b: y as 'PASS' | 'FAIL' };
}

export function isMatchPairHgSnapshotPolicyCurrent(
  row: MatchPairHgSnapshotRow | null | undefined,
): boolean {
  return Boolean(
    row?.hgPolicyVersion &&
    row.hgPolicyVersion === HG_LIST_PRODUCT_POLICY_VERSION,
  );
}

/**
 * Snapshot validity for **children_unsure** directions (primary list/detail source when `ok`).
 */
export function classifyChildrenUnsureFromSnapshot(
  row: MatchPairHgSnapshotRow | null | undefined,
): ClassifyChildrenUnsureFromSnapshotResult {
  if (row == null) {
    return { ok: false, reason: HG_PAIR_SNAPSHOT_REJECT.NO_ROW };
  }
  if (!isMatchPairHgSnapshotPolicyCurrent(row)) {
    return { ok: false, reason: HG_PAIR_SNAPSHOT_REJECT.POLICY_MISMATCH };
  }
  if (row.hgChildrenStatus == null || row.hgChildrenStatus === '') {
    return {
      ok: false,
      reason: HG_PAIR_SNAPSHOT_REJECT.CHILDREN_STATUS_MISSING,
    };
  }
  const parts = row.hgChildrenStatus.split(HG_CHILDREN_STATUS_SEP);
  if (parts.length !== 2) {
    return {
      ok: false,
      reason: HG_PAIR_SNAPSHOT_REJECT.CHILDREN_STATUS_MALFORMED,
    };
  }
  const [a, b] = parts;
  if (!VALID_CHILD_DIM.has(a) || !VALID_CHILD_DIM.has(b)) {
    return {
      ok: false,
      reason: HG_PAIR_SNAPSHOT_REJECT.CHILDREN_STATUS_MALFORMED,
    };
  }
  return {
    ok: true,
    dto: {
      profile_a_to_profile_b: a === 'SOFT_PASS',
      profile_b_to_profile_a: b === 'SOFT_PASS',
    },
  };
}

/**
 * Snapshot validity for **HG diagnostics** triple (primary list/detail source when `ok`).
 * `hgRankScore` mirrors persisted `hgSoftPassCount`.
 */
export function classifyHolyGrailDiagnosticsFromSnapshot(
  row: MatchPairHgSnapshotRow | null | undefined,
): ClassifyHolyGrailDiagnosticsFromSnapshotResult {
  if (row == null) {
    return { ok: false, reason: HG_PAIR_SNAPSHOT_REJECT.NO_ROW };
  }
  if (!isMatchPairHgSnapshotPolicyCurrent(row)) {
    return { ok: false, reason: HG_PAIR_SNAPSHOT_REJECT.POLICY_MISMATCH };
  }
  const parsed = parseOverallHardPairFromSnapshot(row.hgOverallStatus);
  if (!parsed) {
    return {
      ok: false,
      reason: HG_PAIR_SNAPSHOT_REJECT.DIAGNOSTICS_OVERALL_INVALID,
    };
  }
  if (row.hgSoftPassCount == null || !Number.isFinite(row.hgSoftPassCount)) {
    return {
      ok: false,
      reason: HG_PAIR_SNAPSHOT_REJECT.DIAGNOSTICS_SOFT_PASS_COUNT_INVALID,
    };
  }
  return {
    ok: true,
    dto: {
      hgMutualPass: parsed.a === 'PASS' && parsed.b === 'PASS',
      hgOverallStatus: row.hgOverallStatus!.trim(),
      hgRankScore: row.hgSoftPassCount,
    },
  };
}

export function holyGrailMatchDiagnosticsFromDirections(
  aToB: HolyGrailDirectionalEvaluationResult,
  bToA: HolyGrailDirectionalEvaluationResult,
): HolyGrailMatchDiagnosticsDto {
  const hgOverallStatus = `${aToB.overallHardEligibility}${HG_CHILDREN_STATUS_SEP}${bToA.overallHardEligibility}`;
  return {
    hgMutualPass:
      aToB.overallHardEligibility === 'PASS' &&
      bToA.overallHardEligibility === 'PASS',
    hgOverallStatus,
    hgRankScore: countSoftPasses(aToB, bToA),
  };
}

const DEFAULT_CHILDREN: ChildrenUnsureDirectionsDto = {
  profile_a_to_profile_b: false,
  profile_b_to_profile_a: false,
};

/**
 * List/detail enrichment using **pre-classified** snapshot slices (no second parse of the same row).
 * **Primary:** use each slice from snapshot when `ok`. **Fallback:** at most one live `evaluateHolyGrailPairDirections`
 * when a slice is missing/invalid and profile rows exist.
 */
export function resolvePairHgFieldsFromSnapshotClassifications(args: {
  readonly matchId?: string;
  readonly snapshot: MatchPairHgSnapshotRow | null | undefined;
  readonly rowA: ChildrenUnsureProfileRow | undefined;
  readonly rowB: ChildrenUnsureProfileRow | undefined;
  readonly childClass: ClassifyChildrenUnsureFromSnapshotResult;
  readonly diagClass: ClassifyHolyGrailDiagnosticsFromSnapshotResult;
}): {
  readonly children_unsure: ChildrenUnsureDirectionsDto;
  readonly holyGrail?: HolyGrailMatchDiagnosticsDto;
  readonly telemetry: HgPairResolutionTelemetry;
} {
  const snap = args.snapshot;
  const rowPresent = snap != null;
  const policyCurrent = isMatchPairHgSnapshotPolicyCurrent(snap ?? null);

  const childrenFromSnap = args.childClass.ok ? args.childClass.dto : null;
  const diagFromSnap = args.diagClass.ok ? args.diagClass.dto : null;

  const snapshotChildrenReject = args.childClass.ok
    ? undefined
    : args.childClass.reason;
  const snapshotDiagnosticsReject = args.diagClass.ok
    ? undefined
    : args.diagClass.reason;

  const baseTelemetry = (
    partial: Partial<HgPairResolutionTelemetry>,
  ): HgPairResolutionTelemetry => ({
    matchId: args.matchId,
    snapshotRowPresent: rowPresent,
    snapshotPolicyCurrent: policyCurrent,
    snapshotChildrenReject,
    snapshotDiagnosticsReject,
    childrenSource: 'default',
    diagnosticsSource: 'none',
    liveEvalRan: false,
    ...partial,
  });

  if (childrenFromSnap && diagFromSnap) {
    return {
      children_unsure: childrenFromSnap,
      holyGrail: diagFromSnap,
      telemetry: baseTelemetry({
        childrenSource: 'snapshot',
        diagnosticsSource: 'snapshot',
        liveEvalRan: false,
      }),
    };
  }

  const canLive = Boolean(args.rowA && args.rowB);

  if (!canLive) {
    return {
      children_unsure: childrenFromSnap ?? DEFAULT_CHILDREN,
      ...(diagFromSnap ? { holyGrail: diagFromSnap } : {}),
      telemetry: baseTelemetry({
        childrenSource: childrenFromSnap ? 'snapshot' : 'default',
        diagnosticsSource: diagFromSnap ? 'snapshot' : 'none',
        liveEvalRan: false,
        liveFallbackReason: 'profile_rows_missing',
      }),
    };
  }

  const dirs = evaluateHolyGrailPairDirections(args.rowA!, args.rowB!);
  if (!dirs) {
    return {
      children_unsure: childrenFromSnap ?? DEFAULT_CHILDREN,
      ...(diagFromSnap ? { holyGrail: diagFromSnap } : {}),
      telemetry: baseTelemetry({
        childrenSource: childrenFromSnap ? 'snapshot' : 'default',
        diagnosticsSource: diagFromSnap ? 'snapshot' : 'none',
        liveEvalRan: true,
        liveEvalReturnedNull: true,
        liveFallbackReason: childrenFromSnap
          ? diagFromSnap
            ? 'unexpected_live_null'
            : 'diagnostics_live_unavailable_eval_null'
          : diagFromSnap
            ? 'children_live_unavailable_eval_null'
            : 'children_and_diagnostics_live_unavailable_eval_null',
      }),
    };
  }

  const children_unsure = childrenFromSnap ?? {
    profile_a_to_profile_b: dirs.aToB.eligibilityFlags.children_unsure,
    profile_b_to_profile_a: dirs.bToA.eligibilityFlags.children_unsure,
  };
  const holyGrail =
    diagFromSnap ??
    holyGrailMatchDiagnosticsFromDirections(dirs.aToB, dirs.bToA);

  let liveFallbackReason: string;
  if (!childrenFromSnap && !diagFromSnap) {
    liveFallbackReason = 'children_and_diagnostics_from_live';
  } else if (!childrenFromSnap) {
    liveFallbackReason = 'children_from_live_snapshot_diagnostics_primary';
  } else {
    liveFallbackReason = 'diagnostics_from_live_snapshot_children_primary';
  }

  return {
    children_unsure,
    holyGrail,
    telemetry: baseTelemetry({
      childrenSource: childrenFromSnap ? 'snapshot' : 'live',
      diagnosticsSource: diagFromSnap ? 'snapshot' : 'live',
      liveEvalRan: true,
      liveFallbackReason,
    }),
  };
}

/**
 * List/detail enrichment: **snapshot-primary** per slice; classifies the snapshot row once, then
 * `resolvePairHgFieldsFromSnapshotClassifications`. Live HG runs only when a slice is unserved by snapshot.
 */
export function resolvePairHgFieldsFromSnapshotAndRows(args: {
  readonly matchId?: string;
  readonly snapshot: MatchPairHgSnapshotRow | null | undefined;
  readonly rowA: ChildrenUnsureProfileRow | undefined;
  readonly rowB: ChildrenUnsureProfileRow | undefined;
}): {
  readonly children_unsure: ChildrenUnsureDirectionsDto;
  readonly holyGrail?: HolyGrailMatchDiagnosticsDto;
  readonly telemetry: HgPairResolutionTelemetry;
} {
  const childClass = classifyChildrenUnsureFromSnapshot(args.snapshot);
  const diagClass = classifyHolyGrailDiagnosticsFromSnapshot(args.snapshot);
  return resolvePairHgFieldsFromSnapshotClassifications({
    matchId: args.matchId,
    snapshot: args.snapshot,
    rowA: args.rowA,
    rowB: args.rowB,
    childClass,
    diagClass,
  });
}

export async function upsertMatchPairHgSnapshots(
  prisma: PrismaService,
  records: MatchRecordDto[],
  profileMap: Map<string, ChildrenUnsureProfileRow>,
): Promise<{ written: number; skipped: number }> {
  void prisma;
  void profileMap;
  // Table dropped (Migration 3); retained as no-op for callers.
  return { written: 0, skipped: records.length };
}

export async function loadMatchPairHgSnapshotMap(
  prisma: PrismaService,
  matchIds: readonly string[],
): Promise<Map<string, MatchPairHgSnapshotRow>> {
  void prisma;
  void matchIds;
  // Table dropped (Migration 3); callers use live HG fallbacks.
  return new Map();
}

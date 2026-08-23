/**
 * Read-only analytics over `MatchesService.list` output. Production ordering is always
 * `MATCH_RANKING_CONTRACT` (`HG_GATE_LEGACY_RANK_V1`): legacy sort only; `children_unsure` does not apply a ranking penalty.
 * `admission.*` and `ranking.*` are **counterfactual** (shadow mutual-pass gate, shadow HG sort vs legacy among HG-complete rows);
 * there is no hypothetical penalty sort.
 */
import { anyChildrenUnsure, getDisplayScore } from '../children-unsure/children-unsure.helpers';
import type { MatchListItemDto } from '../match.types';
import { MATCH_RANKING_CONTRACT } from '../recommendation/match-ranking-contract';

/** Legacy dealbreaker codes that proxy “clarity / commitment stress” (not HG structured children). */
export const LEGACY_RELATIONSHIP_CLARITY_DEALBREAKER_CODES = [
  'RELATIONSHIP_CLARITY_MISMATCH',
  'KIDS_TIMELINE_MISMATCH',
] as const;

export type KidsFamilyShadowCase =
  | 'NONE'
  | 'LEGACY_CLARITY_PROXY_AND_HG_CHILDREN_UNSURE'
  | 'LEGACY_CLARITY_PROXY_ONLY'
  | 'HG_CHILDREN_UNSURE_ONLY'
  | 'HG_CHILDREN_UNSURE_AND_NOT_MUTUAL_PASS'
  | 'HG_WIRE_INCOMPLETE';

export interface ShadowHgVsLegacyMetricsReport {
  readonly contract: typeof MATCH_RANKING_CONTRACT;
  readonly generatedAtUtc: string;
  readonly listItemCount: number;
  readonly admission: {
    /** Pairs on the legacy list surface (same as `listItemCount`). */
    readonly legacyListSurfaceCount: number;
    /** Valid HG diagnostic triple present (`hgMutualPass` / `hgOverallStatus` / `hgRankScore`). */
    readonly hgWireCompleteCount: number;
    readonly hgWireIncompleteCount: number;
    /** Counterfactual: would remain if list were gated to `hgMutualPass === true` (HG-complete rows only). */
    readonly keptUnderShadowMutualPassGate: number;
    /** Counterfactual: HG-complete but `hgMutualPass === false` (would drop under strict mutual-pass gate). */
    readonly droppedUnderShadowMutualPassGate: number;
  };
  readonly ranking: {
    /** Human-readable definition of the shadow sort used vs legacy. */
    readonly shadowSortDescription: string;
    /** Among HG-wire-complete rows only: legacy `getDisplayScore` desc vs shadow comparator inversions / (n choose 2). */
    readonly inversionCountAmongHgCompleteVsLegacyOrder: number;
    readonly inversionDenominatorAmongHgComplete: number;
    /** How many HG-complete pairs would move position under shadow HG rank vs legacy order (same multiset). */
    readonly reorderedUnderShadowHgRankAmongHgComplete: number;
  };
  readonly kidsFamily: {
    readonly byCase: Record<KidsFamilyShadowCase, number>;
    readonly sampleMatchIdsByCase: Partial<
      Record<KidsFamilyShadowCase, readonly string[]>
    >;
  };
}

const SHADOW_SORT_DESC =
  'Shadow rank (counterfactual, not production): mutual HG pass first; then lower hgRankScore (fewer SOFT_PASS dims); tie-break legacy getDisplayScore desc.';

const MAX_SAMPLES_PER_CASE = 12;

function dealbreakerCodes(item: MatchListItemDto): readonly string[] {
  return item.dealbreakers.map((d) => d.code);
}

function hasLegacyClarityProxy(item: MatchListItemDto): boolean {
  const codes = new Set(dealbreakerCodes(item));
  return LEGACY_RELATIONSHIP_CLARITY_DEALBREAKER_CODES.some((c) =>
    codes.has(c),
  );
}

function hgWireComplete(item: MatchListItemDto): boolean {
  return (
    typeof item.hgMutualPass === 'boolean' &&
    typeof item.hgOverallStatus === 'string' &&
    typeof item.hgRankScore === 'number' &&
    Number.isFinite(item.hgRankScore)
  );
}

function kidsFamilyCase(
  item: MatchListItemDto,
  complete: boolean,
): KidsFamilyShadowCase {
  if (!complete) return 'HG_WIRE_INCOMPLETE';
  const legacyP = hasLegacyClarityProxy(item);
  const cu = anyChildrenUnsure(item.children_unsure);
  const mutual = item.hgMutualPass === true;
  if (legacyP && cu) return 'LEGACY_CLARITY_PROXY_AND_HG_CHILDREN_UNSURE';
  if (legacyP && !cu) return 'LEGACY_CLARITY_PROXY_ONLY';
  if (!legacyP && cu && !mutual)
    return 'HG_CHILDREN_UNSURE_AND_NOT_MUTUAL_PASS';
  if (!legacyP && cu) return 'HG_CHILDREN_UNSURE_ONLY';
  return 'NONE';
}

function pushSample(
  acc: Partial<Record<KidsFamilyShadowCase, string[]>>,
  k: KidsFamilyShadowCase,
  matchId: string,
): void {
  const arr = acc[k] ?? (acc[k] = []);
  if (arr.length < MAX_SAMPLES_PER_CASE) arr.push(matchId);
}

/** Stable sort: legacy production list comparator (descending display score). */
export function legacyListComparator(
  a: MatchListItemDto,
  b: MatchListItemDto,
): number {
  const sa = getDisplayScore(a);
  const sb = getDisplayScore(b);
  if (sb !== sa) return sb - sa;
  return a.matchId.localeCompare(b.matchId);
}

function shadowHgRankComparator(
  a: MatchListItemDto,
  b: MatchListItemDto,
): number {
  const aPass = a.hgMutualPass === true;
  const bPass = b.hgMutualPass === true;
  if (aPass !== bPass) return aPass ? -1 : 1;
  const ar = a.hgRankScore ?? 0;
  const br = b.hgRankScore ?? 0;
  if (ar !== br) return ar - br;
  return legacyListComparator(a, b);
}

function sortedIds(
  items: MatchListItemDto[],
  cmp: (a: MatchListItemDto, b: MatchListItemDto) => number,
): string[] {
  return [...items].sort(cmp).map((x) => x.matchId);
}

/**
 * Counts inversions: pairs (i,j) with i<j in `orderA` but inverted order in `orderB` (both permutations of same ids).
 */
function inversionCountBetweenOrders(
  orderA: readonly string[],
  orderB: readonly string[],
): {
  count: number;
  denominator: number;
} {
  const n = orderA.length;
  const denom = (n * (n - 1)) / 2;
  if (n < 2) return { count: 0, denominator: denom };
  const posB = new Map(orderB.map((id, idx) => [id, idx]));
  let inv = 0;
  for (let i = 0; i < n; i++) {
    const idi = orderA[i];
    const pi = posB.get(idi);
    if (pi === undefined) continue;
    for (let j = i + 1; j < n; j++) {
      const idj = orderA[j];
      const pj = posB.get(idj);
      if (pj === undefined) continue;
      if (pi > pj) inv++;
    }
  }
  return { count: inv, denominator: denom };
}

function rankIndexChangedCount(
  legacyOrder: readonly string[],
  otherOrder: readonly string[],
): number {
  const posOther = new Map(otherOrder.map((id, idx) => [id, idx]));
  let changed = 0;
  legacyOrder.forEach((id, idx) => {
    const p = posOther.get(id);
    if (p !== undefined && p !== idx) changed++;
  });
  return changed;
}

const EMPTY_CASES: Record<KidsFamilyShadowCase, number> = {
  NONE: 0,
  LEGACY_CLARITY_PROXY_AND_HG_CHILDREN_UNSURE: 0,
  LEGACY_CLARITY_PROXY_ONLY: 0,
  HG_CHILDREN_UNSURE_ONLY: 0,
  HG_CHILDREN_UNSURE_AND_NOT_MUTUAL_PASS: 0,
  HG_WIRE_INCOMPLETE: 0,
};

/**
 * Shadow metrics for the current `MatchesService.list` shape (no API response changes).
 */
export function computeShadowHgVsLegacyMetricsFromListItems(
  items: readonly MatchListItemDto[],
): ShadowHgVsLegacyMetricsReport {
  const sortedLegacy = [...items].sort(legacyListComparator);
  const legacyOrder = sortedLegacy.map((x) => x.matchId);
  const hgCompleteItems = sortedLegacy.filter(hgWireComplete);
  const shadowOrderHg = sortedIds(hgCompleteItems, shadowHgRankComparator);
  const legacyOrderHgSubset = hgCompleteItems.map((x) => x.matchId);
  const invVsShadow = inversionCountBetweenOrders(
    legacyOrderHgSubset,
    shadowOrderHg,
  );
  const reordered = rankIndexChangedCount(legacyOrderHgSubset, shadowOrderHg);

  const byCase: Record<KidsFamilyShadowCase, number> = { ...EMPTY_CASES };
  const samples: Partial<Record<KidsFamilyShadowCase, string[]>> = {};

  for (const it of items) {
    const complete = hgWireComplete(it);
    const k = kidsFamilyCase(it, complete);
    byCase[k]++;
    pushSample(samples, k, it.matchId);
  }

  const admission = {
    legacyListSurfaceCount: items.length,
    hgWireCompleteCount: hgCompleteItems.length,
    hgWireIncompleteCount: items.length - hgCompleteItems.length,
    keptUnderShadowMutualPassGate: hgCompleteItems.filter(
      (x) => x.hgMutualPass === true,
    ).length,
    droppedUnderShadowMutualPassGate: hgCompleteItems.filter(
      (x) => x.hgMutualPass === false,
    ).length,
  };

  return {
    contract: MATCH_RANKING_CONTRACT,
    generatedAtUtc: new Date().toISOString(),
    listItemCount: items.length,
    admission,
    ranking: {
      shadowSortDescription: SHADOW_SORT_DESC,
      inversionCountAmongHgCompleteVsLegacyOrder: invVsShadow.count,
      inversionDenominatorAmongHgComplete: invVsShadow.denominator,
      reorderedUnderShadowHgRankAmongHgComplete: reordered,
    },
    kidsFamily: {
      byCase,
      sampleMatchIdsByCase: samples,
    },
  };
}

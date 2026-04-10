/**
 * HG post-eligibility ranking signals.
 *
 * - **Runtime reads:** `buildHolyGrailRankingSignalsFromDbSelfRow` — `ProfileSignalSnapshot` self row only (typed DB columns).
 * - **Persist:** `composeHolyGrailRankingSignalsForPersist` — in-memory `EvaluateBatchResult` enrichment + extraction + numerics (HG columns only).
 */

import type { MatchingRankingSignalsSnapshot } from '../canonical/matching-canonical.types';
import type { EvaluateBatchResult } from '../evaluate/evaluate.service';
import type { EnrichmentSignalsV1 } from '../evaluate/enrichment-signals';

function normInterest(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

function readEnrichmentRankingSliceForCompose(
  evaluation: EvaluateBatchResult | null | undefined,
): {
  dailyRhythm: string | null;
  autonomyTogetherness: string | null;
  interestsTop3: string[];
} {
  if (!evaluation?.enrichment || evaluation.enrichment.version !== 'v1') {
    return { dailyRhythm: null, autonomyTogetherness: null, interestsTop3: [] };
  }
  const s = evaluation.enrichment.signals as EnrichmentSignalsV1 & Record<string, unknown>;
  const dr = s.dailyRhythm;
  const atRaw = s.autonomyTogethernessDepth ?? s.autonomyTogetherness;
  const dailyRhythm = typeof dr === 'string' && dr.trim() !== '' ? dr.trim() : null;
  const autonomyTogetherness = typeof atRaw === 'string' && atRaw.trim() !== '' ? atRaw.trim() : null;
  const itRaw = s.interestsTop3 ?? s.interestsTop;
  const interestsTop3 = Array.isArray(itRaw)
    ? itRaw.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
    : [];
  return { dailyRhythm, autonomyTogetherness, interestsTop3 };
}

/** Same cap/order as legacy enrichment fallback (extraction `interests_self`). */
export function interestsTopFallbackFromInterestsSelf(
  interestsSelf: readonly string[] | undefined,
): string[] {
  const fallbackTop: string[] = [];
  const seen = new Set<string>();
  for (const raw of interestsSelf ?? []) {
    if (typeof raw !== 'string') continue;
    const t = normInterest(raw);
    if (t.length === 0 || seen.has(t)) continue;
    seen.add(t);
    fallbackTop.push(t);
    if (fallbackTop.length >= 8) break;
  }
  return fallbackTop;
}

/** Self snapshot row shape for HG ranking runtime (matches `HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT`). */
export type ProfileSignalSelfRow = {
  readonly lifestylePace?: number | null;
  readonly conflictStyle?: number | null;
  readonly hgRankingDailyRhythm?: string | null;
  readonly hgRankingAutonomyTogetherness?: string | null;
  readonly hgRankingInterestsTop?: readonly string[];
};

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return null;
}

/**
 * Compose ranking snapshot for DB column writes / scripts — in-memory evaluation enrichment + extraction + numerics.
 */
export function composeHolyGrailRankingSignalsForPersist(args: {
  readonly evaluation: EvaluateBatchResult | null | undefined;
  readonly interestsSelf: readonly string[] | undefined;
  readonly signalSelfNumerics: { lifestylePace: number | null; conflictStyle: number | null } | null | undefined;
}): MatchingRankingSignalsSnapshot {
  const en = readEnrichmentRankingSliceForCompose(args.evaluation ?? undefined);
  const lifestylePace = toFiniteNumber(args.signalSelfNumerics?.lifestylePace);
  const conflictStyle = toFiniteNumber(args.signalSelfNumerics?.conflictStyle);

  const fallbackTop = interestsTopFallbackFromInterestsSelf(args.interestsSelf);

  const interestsTop =
    en.interestsTop3.length > 0 ? en.interestsTop3.map(normInterest).filter((t) => t.length > 0) : fallbackTop;

  return {
    dailyRhythm: en.dailyRhythm,
    autonomyTogetherness: en.autonomyTogetherness,
    conflictStyle,
    lifestylePace,
    interestsTop,
  };
}

/**
 * Runtime: build `MatchingRankingSignalsSnapshot` from persisted self `ProfileSignalSnapshot` columns only.
 */
export function buildHolyGrailRankingSignalsFromDbSelfRow(
  signalSelf: ProfileSignalSelfRow | null | undefined,
): MatchingRankingSignalsSnapshot {
  if (!signalSelf) {
    return {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [],
    };
  }
  const dr = signalSelf.hgRankingDailyRhythm;
  const at = signalSelf.hgRankingAutonomyTogetherness;
  const dailyRhythm = typeof dr === 'string' && dr.trim() !== '' ? dr.trim() : null;
  const autonomyTogetherness = typeof at === 'string' && at.trim() !== '' ? at.trim() : null;
  const rawTop = signalSelf.hgRankingInterestsTop;
  const interestsTop = Array.isArray(rawTop)
    ? rawTop.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
    : [];

  return {
    dailyRhythm,
    autonomyTogetherness,
    conflictStyle: toFiniteNumber(signalSelf.conflictStyle),
    lifestylePace: toFiniteNumber(signalSelf.lifestylePace),
    interestsTop,
  };
}

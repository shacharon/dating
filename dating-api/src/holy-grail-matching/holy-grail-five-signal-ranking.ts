/**
 * Holy Grail post-eligibility ranking.
 *
 * ## HG ranking purity contract (production ordering)
 * **DB purity** means the **sort score** uses only `MatchingCanonicalModel.rankingSignals`
 * (`MatchingRankingSignalsSnapshot`: dailyRhythm, autonomyTogetherness, conflictStyle, lifestylePace, interestsTop)
 * — the fields populated from persisted profile HG sidecar columns — plus **intrinsic mechanics** of that layer:
 * empty-signal hash spread and numeric tie micro. We do **not** require persisting the final float; reproducibility is
 * `(pair ids, five-signal columns, fixed formula)`.
 *
 * **Not** in the purity path: `similarityPreference` adjustment, and personality / lifestyle / interest-tag **rank**
 * overlays (derived from structured text on the canonical model, not the five-signal DB slice). Use
 * `computeHolyGrailFiveSignalRank` for analysis, scripts, and tests that need the full composite score.
 *
 * **Production-freeze (V2 enrichment, locked):** personality / lifestyle / interest tag taxonomies (v2 additive) are
 * **secondary overlays only** — **no** eligibility, **no** promotion into the five `WEIGHTS` primary signals, **no**
 * cap raises without doc + contract revision. Five-signal DB layer stays the main rank driver (`WEIGHTS`). See
 * `docs/HOLY_GRAIL_MATCHING.md` § “Production-freeze — V2 enrichment families”.
 */

import type {
  MatchingCanonicalModel,
  MatchingRankingSignalsSnapshot,
  SimilarityPreference,
} from '../canonical/matching-canonical.types';
import { mergeEffectiveMatchingPreferences } from './eligibility.evaluator';
import { INTEREST_TAG_SET } from './interest-tags-text.extract';
import { LIFESTYLE_SIGNAL_TAG_SET } from './lifestyle-signals-text.extract';
import { PERSONALITY_TRAIT_TAG_SET } from './personality-traits-text.extract';

/** Weights sum to 100 (primary signal layer). */
const WEIGHTS = {
  dailyRhythm: 17,
  autonomyTogetherness: 17,
  conflictStyle: 22,
  lifestylePace: 22,
  interestsTop: 22,
} as const;

/** When all five dimensions contribute 0, add spread in (0, EMPTY_SPREAD_MAX] from stable pair hash (no RNG). */
const EMPTY_SPREAD_MAX = 2.5;

/**
 * Max absolute adjustment from `similarityPreference` (same scale order as EMPTY_SPREAD_MAX).
 * Applied only when the searcher has `similar` | `different` | `balanced` and pairwise overlap `O` is observable.
 */
const SIMILARITY_RANK_BONUS_MAX = 2.5;

/**
 * **LOCKED 2** — secondary overlay cap; not a primary `WEIGHTS` signal; no eligibility. Contract change + batch proof
 * to raise.
 */
const PERSONALITY_RANK_BONUS_MAX = 2;

/**
 * **LOCKED 2** — secondary overlay cap; not a primary `WEIGHTS` signal; no eligibility. Same lock as personality.
 */
const LIFESTYLE_RANK_BONUS_MAX = 2;

/**
 * **LOCKED 2** — secondary overlay cap; not a primary `WEIGHTS` signal; no eligibility. v1+v2 `INTEREST_TAG_SET`.
 */
const INTEREST_TAGS_RANK_BONUS_MAX = 2;

/** One-sided label: fraction of weight when exactly one side has a label. */
const LABEL_ONE_SIDED_FRACTION = 0.12;

/** Both labels present but differ: small credit vs both missing (differentiation). */
const LABEL_MISMATCH_FRACTION = 0.15;

/** One-sided numeric: fraction × weight × normalized value. */
const NUMERIC_ONE_SIDED_FRACTION = 0.26;

/** Numeric values assumed on roughly 0–10 scale for normalization. */
const NUMERIC_SCALE = 10;

export type HolyGrailFiveSignalKey = keyof typeof WEIGHTS;

/** Breakdown keys: five signals, optional similarityPreference bonus, optional tag-overlap bonuses, optional deterministic empty-pair spread. */
export type HolyGrailRankBreakdownKey =
  | HolyGrailFiveSignalKey
  | 'similarityPreference'
  | 'personalityTraits'
  | 'lifestyleSignals'
  | 'interestTags'
  | 'deterministicSpread';

export interface HolyGrailRankSignalBreakdown {
  readonly signal: HolyGrailRankBreakdownKey;
  readonly weight: number;
  readonly points: number;
  readonly note: string;
}

const EMPTY_SNAPSHOT: MatchingRankingSignalsSnapshot = {
  dailyRhythm: null,
  autonomyTogetherness: null,
  conflictStyle: null,
  lifestylePace: null,
  interestsTop: [],
};

function snapshotOf(m: MatchingCanonicalModel): MatchingRankingSignalsSnapshot {
  return m.rankingSignals ?? EMPTY_SNAPSHOT;
}

/** FNV-1a 32-bit; same family as eligibility half-pass (deterministic, non-crypto). */
function fnv1a32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

/**
 * Strictly positive spread for empty-signal pairs; stable for (searcherId, candidateId).
 */
export function deterministicRankingSpread(
  searcherProfileId: string,
  candidateProfileId: string,
): number {
  const h = fnv1a32(
    `${searcherProfileId}\0${candidateProfileId}\0HG_RANK_EMPTY`,
  );
  const u = h / 4294967296;
  return EMPTY_SPREAD_MAX * (0.001 + u * 0.999);
}

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function normNumeric(v: number): number {
  return clamp01(v / NUMERIC_SCALE);
}

function labelPairScore(
  a: string | null,
  b: string | null,
  weight: number,
  signal: HolyGrailFiveSignalKey,
): { points: number; note: string } {
  const ta = a !== null && a.trim() !== '' ? a.trim() : null;
  const tb = b !== null && b.trim() !== '' ? b.trim() : null;
  if (ta !== null && tb !== null) {
    if (ta === tb) {
      return { points: weight, note: `${signal}:match(${ta})` };
    }
    const pts = weight * LABEL_MISMATCH_FRACTION;
    return { points: pts, note: `${signal}:mismatch_partial(${ta}|${tb})` };
  }
  if (ta !== null || tb !== null) {
    const pts = weight * LABEL_ONE_SIDED_FRACTION;
    return { points: pts, note: `${signal}:one_side_label` };
  }
  return { points: 0, note: `${signal}:missing_label` };
}

function numericPairScore(
  a: number | null,
  b: number | null,
  weight: number,
  signal: HolyGrailFiveSignalKey,
): { points: number; note: string } {
  const okA = a !== null && Number.isFinite(a);
  const okB = b !== null && Number.isFinite(b);
  if (okA && okB) {
    const gap = Math.abs(a - b);
    const raw = Math.max(0, NUMERIC_SCALE - gap);
    const points = (raw / NUMERIC_SCALE) * weight;
    return { points, note: `${signal}:closer_better(gap=${gap.toFixed(2)})` };
  }
  if (okA || okB) {
    const v = okA ? a : b!;
    const pts = weight * NUMERIC_ONE_SIDED_FRACTION * normNumeric(v);
    return { points: pts, note: `${signal}:one_side_numeric(v=${v})` };
  }
  return { points: 0, note: `${signal}:missing_numeric` };
}

function normTag(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function interestsPairScore(
  ta: readonly string[],
  tb: readonly string[],
  weight: number,
): { points: number; note: string } {
  const setA = new Set(ta.map(normTag).filter((x) => x.length > 0));
  const setB = new Set(tb.map(normTag).filter((x) => x.length > 0));
  if (setA.size === 0 && setB.size === 0) {
    return { points: 0, note: 'interestsTop:both_empty' };
  }
  if (setA.size === 0 || setB.size === 0) {
    const k = Math.max(setA.size, setB.size);
    const pts = weight * 0.1 * clamp01(k / 5);
    return { points: pts, note: `interestsTop:one_side_tags(k=${k})` };
  }
  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  const jacc = union > 0 ? inter / union : 0;
  const points = jacc * weight;
  return { points, note: `interestsTop:jaccard(${inter}/${union})` };
}

function labelOverlap01(a: string | null, b: string | null): number | null {
  const ta = a !== null && a.trim() !== '' ? a.trim() : null;
  const tb = b !== null && b.trim() !== '' ? b.trim() : null;
  if (ta !== null && tb !== null) {
    return ta === tb ? 1 : 0;
  }
  return null;
}

function numericOverlap01(a: number | null, b: number | null): number | null {
  const okA = a !== null && Number.isFinite(a);
  const okB = b !== null && Number.isFinite(b);
  if (!okA || !okB) return null;
  const gap = Math.abs(a - b);
  return Math.max(0, NUMERIC_SCALE - gap) / NUMERIC_SCALE;
}

function jaccardOverlap01(
  ta: readonly string[],
  tb: readonly string[],
): number | null {
  const setA = new Set(ta.map(normTag).filter((x) => x.length > 0));
  const setB = new Set(tb.map(normTag).filter((x) => x.length > 0));
  if (setA.size === 0 || setB.size === 0) return null;
  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  return union > 0 ? inter / union : null;
}

function filterCanonicalPersonalityTags(
  raw: readonly string[] | undefined,
): string[] {
  if (!raw?.length) return [];
  const out: string[] = [];
  for (const t of raw) {
    if (typeof t !== 'string') continue;
    const x = t.trim();
    if (PERSONALITY_TRAIT_TAG_SET.has(x)) out.push(x);
  }
  return [...new Set(out)];
}

function tagIntersectionSorted(a: string[], b: string[]): string[] {
  const sb = new Set(b);
  return [...new Set(a.filter((x) => sb.has(x)))].sort();
}

function jaccardPersonality01(a: string[], b: string[]): number | null {
  if (a.length === 0 || b.length === 0) return null;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) {
    if (sb.has(x)) inter += 1;
  }
  const union = sa.size + sb.size - inter;
  return union > 0 ? inter / union : null;
}

/**
 * **Scoring:** Two preference↔self alignments (canonical tags only):
 * - **Dir1:** searcher `personalityTraitsPartner` ∩ candidate `personalityTraitsSelf`
 * - **Dir2:** searcher `personalityTraitsSelf` ∩ candidate `personalityTraitsPartner`
 * Let **J1** = Jaccard(dir1 sets), **J2** = Jaccard(dir2 sets), each defined only when **both** sides of that direction have ≥1 tag.
 * **O** = mean of defined Jaccards; if only one direction is defined, **O** = that Jaccard. Additive **points** = `PERSONALITY_RANK_BONUS_MAX × O`.
 *
 * **Explanation (grounded):** `rankBreakdown` note lists only tags that appear in **both** profiles for at least one direction
 * (sorted, `;`-separated), plus **O** — never tags that did not intersect.
 */
function computePersonalityTraitRankBonus(
  s: MatchingRankingSignalsSnapshot,
  c: MatchingRankingSignalsSnapshot,
): { points: number; note: string } | null {
  const sSelf = filterCanonicalPersonalityTags(s.personalityTraitsSelf);
  const sPartner = filterCanonicalPersonalityTags(s.personalityTraitsPartner);
  const cSelf = filterCanonicalPersonalityTags(c.personalityTraitsSelf);
  const cPartner = filterCanonicalPersonalityTags(c.personalityTraitsPartner);

  const j1 = jaccardPersonality01(sPartner, cSelf);
  const j2 = jaccardPersonality01(sSelf, cPartner);
  const inter1 = tagIntersectionSorted(sPartner, cSelf);
  const inter2 = tagIntersectionSorted(sSelf, cPartner);
  const grounded = new Set<string>([...inter1, ...inter2]);

  let overlap01: number | null = null;
  if (j1 !== null && j2 !== null) {
    overlap01 = (j1 + j2) / 2;
  } else if (j1 !== null) {
    overlap01 = j1;
  } else if (j2 !== null) {
    overlap01 = j2;
  }

  if (overlap01 === null || grounded.size === 0) {
    return null;
  }

  const points = PERSONALITY_RANK_BONUS_MAX * overlap01;
  const groundedList = [...grounded].join(';');
  const note = `personalityTraits:grounded(${groundedList},O=${overlap01.toFixed(4)})`;
  return { points, note };
}

function filterCanonicalLifestyleTags(
  raw: readonly string[] | undefined,
): string[] {
  if (!raw?.length) return [];
  const out: string[] = [];
  for (const t of raw) {
    if (typeof t !== 'string') continue;
    const x = t.trim();
    if (LIFESTYLE_SIGNAL_TAG_SET.has(x)) out.push(x);
  }
  return [...new Set(out)];
}

/**
 * Same directional Jaccard pattern as personality traits, on `lifestyleSignalsSelf` / `lifestyleSignalsPartner`.
 * **Explanation:** note lists only intersecting canonical lifestyle tags (`;`-separated), never unmatched tags.
 */
function computeLifestyleSignalsRankBonus(
  s: MatchingRankingSignalsSnapshot,
  c: MatchingRankingSignalsSnapshot,
): { points: number; note: string } | null {
  const sSelf = filterCanonicalLifestyleTags(s.lifestyleSignalsSelf);
  const sPartner = filterCanonicalLifestyleTags(s.lifestyleSignalsPartner);
  const cSelf = filterCanonicalLifestyleTags(c.lifestyleSignalsSelf);
  const cPartner = filterCanonicalLifestyleTags(c.lifestyleSignalsPartner);

  const j1 = jaccardPersonality01(sPartner, cSelf);
  const j2 = jaccardPersonality01(sSelf, cPartner);
  const inter1 = tagIntersectionSorted(sPartner, cSelf);
  const inter2 = tagIntersectionSorted(sSelf, cPartner);
  const grounded = new Set<string>([...inter1, ...inter2]);

  let overlap01: number | null = null;
  if (j1 !== null && j2 !== null) {
    overlap01 = (j1 + j2) / 2;
  } else if (j1 !== null) {
    overlap01 = j1;
  } else if (j2 !== null) {
    overlap01 = j2;
  }

  if (overlap01 === null || grounded.size === 0) {
    return null;
  }

  const points = LIFESTYLE_RANK_BONUS_MAX * overlap01;
  const groundedList = [...grounded].join(';');
  const note = `lifestyleSignals:grounded(${groundedList},O=${overlap01.toFixed(4)})`;
  return { points, note };
}

function filterCanonicalInterestTags(
  raw: readonly string[] | undefined,
): string[] {
  if (!raw?.length) return [];
  const out: string[] = [];
  for (const t of raw) {
    if (typeof t !== 'string') continue;
    const x = t.trim();
    if (INTEREST_TAG_SET.has(x)) out.push(x);
  }
  return [...new Set(out)];
}

/**
 * Directional shared-interest alignment on canonical interest tags (`interestTagsSelf` / `interestTagsPartner`):
 * **J1** = Jaccard(searcher.partner, candidate.self), **J2** = Jaccard(searcher.self, candidate.partner).
 * **Explanation:** only intersecting canonical interest tags (`;`-separated).
 */
function computeInterestTagsRankBonus(
  s: MatchingRankingSignalsSnapshot,
  c: MatchingRankingSignalsSnapshot,
): { points: number; note: string } | null {
  const sSelf = filterCanonicalInterestTags(s.interestTagsSelf);
  const sPartner = filterCanonicalInterestTags(s.interestTagsPartner);
  const cSelf = filterCanonicalInterestTags(c.interestTagsSelf);
  const cPartner = filterCanonicalInterestTags(c.interestTagsPartner);

  const j1 = jaccardPersonality01(sPartner, cSelf);
  const j2 = jaccardPersonality01(sSelf, cPartner);
  const inter1 = tagIntersectionSorted(sPartner, cSelf);
  const inter2 = tagIntersectionSorted(sSelf, cPartner);
  const grounded = new Set<string>([...inter1, ...inter2]);

  let overlap01: number | null = null;
  if (j1 !== null && j2 !== null) {
    overlap01 = (j1 + j2) / 2;
  } else if (j1 !== null) {
    overlap01 = j1;
  } else if (j2 !== null) {
    overlap01 = j2;
  }

  if (overlap01 === null || grounded.size === 0) {
    return null;
  }

  const points = INTEREST_TAGS_RANK_BONUS_MAX * overlap01;
  const groundedList = [...grounded].join(';');
  const note = `interestTags:grounded(${groundedList},O=${overlap01.toFixed(4)})`;
  return { points, note };
}

/**
 * Mean overlap in \[0,1\] over ranking dimensions that have **pairwise** data on both profiles.
 * Omits one-sided or missing dimensions (no imputed facts). Returns `null` if nothing is comparable.
 */
function meanPairwiseOverlap01(
  s: MatchingRankingSignalsSnapshot,
  c: MatchingRankingSignalsSnapshot,
): number | null {
  const parts: number[] = [];
  const r1 = labelOverlap01(s.dailyRhythm, c.dailyRhythm);
  if (r1 !== null) parts.push(r1);
  const r2 = labelOverlap01(s.autonomyTogetherness, c.autonomyTogetherness);
  if (r2 !== null) parts.push(r2);
  const r3 = numericOverlap01(s.conflictStyle, c.conflictStyle);
  if (r3 !== null) parts.push(r3);
  const r4 = numericOverlap01(s.lifestylePace, c.lifestylePace);
  if (r4 !== null) parts.push(r4);
  const r5 = jaccardOverlap01(s.interestsTop, c.interestsTop);
  if (r5 !== null) parts.push(r5);
  if (parts.length === 0) return null;
  return parts.reduce((acc, x) => acc + x, 0) / parts.length;
}

function similarityPreferenceDelta(
  pref: SimilarityPreference,
  o: number,
): number {
  const B = SIMILARITY_RANK_BONUS_MAX;
  if (pref === 'similar') {
    return B * (2 * o - 1);
  }
  if (pref === 'different') {
    return B * (1 - 2 * o);
  }
  return B * (1 - 2 * Math.abs(o - 0.5));
}

function similarityPreferenceRankNote(
  pref: SimilarityPreference,
  o: number,
  delta: number,
): string {
  const kind =
    pref === 'similar'
      ? 'reward_overlap'
      : pref === 'different'
        ? 'reward_contrast'
        : 'reward_mid_overlap';
  const sign = delta >= 0 ? '+' : '';
  return `similarityPreference:${kind}(O=${o.toFixed(4)},${sign}${delta.toFixed(4)})`;
}

/**
 * **Primary formula (weights sum to 100):**
 * - **dailyRhythm, autonomyTogetherness:** full weight if both non-empty and equal; **weight×0.15** if both non-empty and differ;
 *   **weight×0.12** if exactly one side has a label; else 0.
 * - **conflictStyle, lifestylePace:** both numeric → `max(0, 10-|a-b|)/10 × weight`; one numeric → `weight×0.26×min(1, v/10)`; else 0.
 * - **interestsTop:** both non-empty → **Jaccard** `|A∩B|/|A∪B| × weight`; one side only → `weight×0.1×min(1, k/5)` for k = tag count on non-empty side.
 *
 * **similarityPreference (searcher effective prefs only; not a hard filter):** when the five-signal sum `P₅ > 0` and
 * effective `similarityPreference` is `similar` \| `different` \| `balanced`, and at least one pairwise overlap
 * slice exists, compute **O** = mean of applicable overlap indices (each in \[0,1\]):
 * - **Labels** (dailyRhythm, autonomyTogetherness): both non-empty → `1` if equal else `0`; otherwise dimension omitted from the mean.
 * - **Numerics** (conflictStyle, lifestylePace): both finite → `(10-|a-b|)/10` clamped to \[0,1\]; otherwise omitted.
 * - **interestsTop:** both sides have ≥1 normalized tag → Jaccard `|A∩B|/|A∪B|`; otherwise omitted.
 * Let **B** = `SIMILARITY_RANK_BONUS_MAX` (2.5). Additive adjustment **Δ** to the five-signal total:
 * - **similar:** `Δ = B × (2O − 1)` — rewards high overlap (O→1), dampens low overlap.
 * - **different:** `Δ = B × (1 − 2O)` — rewards low overlap / contrast (O→0), dampens high overlap.
 * - **balanced:** `Δ = B × (1 − 2|O − ½|)` — peaks at moderate overlap **O = ½**, zero at **O ∈ {0,1}**.
 * Final pre–tie-break score = `max(0, P₅ + Δ)` with a breakdown row `similarityPreference` (points = **Δ**, note encodes rule).
 * If **O** cannot be formed (all dimensions omitted), or preference is unset / `null`, **Δ = 0** (no row).
 *
 * **Empty-pair fallback:** if **P₅** is ~0, add **deterministicRankingSpread** only (no similarity adjustment).
 *
 * **Tie micro:** if total is strictly below 100, add `(fnv32(searcher|candidate|salt) % 1000) / 1e6`; skipped at perfect **100**.
 *
 * **rankScore** = rounded to 6 decimals when tie micro applies, else 4 decimals at 100.
 */
function computeHolyGrailFiveSignalRankInternal(
  args: {
    readonly searcher: MatchingCanonicalModel;
    readonly candidate: MatchingCanonicalModel;
  },
  includeNonDbRankingOverlays: boolean,
): {
  rankScore: number;
  rankReasons: string[];
  rankBreakdown: HolyGrailRankSignalBreakdown[];
} {
  const s = snapshotOf(args.searcher);
  const c = snapshotOf(args.candidate);

  const breakdown: HolyGrailRankSignalBreakdown[] = [];

  const w1 = labelPairScore(
    s.dailyRhythm,
    c.dailyRhythm,
    WEIGHTS.dailyRhythm,
    'dailyRhythm',
  );
  breakdown.push({
    signal: 'dailyRhythm',
    weight: WEIGHTS.dailyRhythm,
    points: w1.points,
    note: w1.note,
  });

  const w2 = labelPairScore(
    s.autonomyTogetherness,
    c.autonomyTogetherness,
    WEIGHTS.autonomyTogetherness,
    'autonomyTogetherness',
  );
  breakdown.push({
    signal: 'autonomyTogetherness',
    weight: WEIGHTS.autonomyTogetherness,
    points: w2.points,
    note: w2.note,
  });

  const w3 = numericPairScore(
    s.conflictStyle,
    c.conflictStyle,
    WEIGHTS.conflictStyle,
    'conflictStyle',
  );
  breakdown.push({
    signal: 'conflictStyle',
    weight: WEIGHTS.conflictStyle,
    points: w3.points,
    note: w3.note,
  });

  const w4 = numericPairScore(
    s.lifestylePace,
    c.lifestylePace,
    WEIGHTS.lifestylePace,
    'lifestylePace',
  );
  breakdown.push({
    signal: 'lifestylePace',
    weight: WEIGHTS.lifestylePace,
    points: w4.points,
    note: w4.note,
  });

  const w5 = interestsPairScore(
    s.interestsTop,
    c.interestsTop,
    WEIGHTS.interestsTop,
  );
  breakdown.push({
    signal: 'interestsTop',
    weight: WEIGHTS.interestsTop,
    points: w5.points,
    note: w5.note,
  });

  const primaryFive = breakdown.reduce((acc, x) => acc + x.points, 0);
  let rankScore: number;

  if (primaryFive < 1e-9) {
    const spread = deterministicRankingSpread(
      args.searcher.profileId,
      args.candidate.profileId,
    );
    breakdown.push({
      signal: 'deterministicSpread',
      weight: EMPTY_SPREAD_MAX,
      points: spread,
      note: 'empty_signals:pair_hash_spread',
    });
    rankScore = spread;
  } else {
    rankScore = primaryFive;
    if (includeNonDbRankingOverlays) {
      const eff = mergeEffectiveMatchingPreferences(args.searcher);
      const sp = eff.similarityPreference;
      if (sp === 'similar' || sp === 'different' || sp === 'balanced') {
        const oMean = meanPairwiseOverlap01(s, c);
        if (oMean !== null) {
          const delta = similarityPreferenceDelta(sp, oMean);
          breakdown.push({
            signal: 'similarityPreference',
            weight: 0,
            points: delta,
            note: similarityPreferenceRankNote(sp, oMean, delta),
          });
          rankScore = Math.max(0, primaryFive + delta);
        }
      }
    }
  }

  if (includeNonDbRankingOverlays) {
    const pBonus = computePersonalityTraitRankBonus(s, c);
    if (pBonus !== null && pBonus.points > 0) {
      breakdown.push({
        signal: 'personalityTraits',
        weight: 0,
        points: pBonus.points,
        note: pBonus.note,
      });
      rankScore = Math.max(0, rankScore + pBonus.points);
    }

    const lsBonus = computeLifestyleSignalsRankBonus(s, c);
    if (lsBonus !== null && lsBonus.points > 0) {
      breakdown.push({
        signal: 'lifestyleSignals',
        weight: 0,
        points: lsBonus.points,
        note: lsBonus.note,
      });
      rankScore = Math.max(0, rankScore + lsBonus.points);
    }

    const itBonus = computeInterestTagsRankBonus(s, c);
    if (itBonus !== null && itBonus.points > 0) {
      breakdown.push({
        signal: 'interestTags',
        weight: 0,
        points: itBonus.points,
        note: itBonus.note,
      });
      rankScore = Math.max(0, rankScore + itBonus.points);
    }
  }

  /**
   * Deterministic tie-break on the total (max ~0.001); skipped for perfect 100 so golden “full match” stays 100.
   */
  const tieMicro =
    (fnv1a32(
      `${args.searcher.profileId}|${args.candidate.profileId}|HG_RANK_TIE_MICRO`,
    ) %
      1000) /
    1_000_000;
  if (rankScore < 100 - 1e-9) {
    rankScore = Math.round((rankScore + tieMicro) * 1_000_000) / 1_000_000;
  } else {
    rankScore = Math.round(rankScore * 10000) / 10000;
  }
  const rankReasons = [
    `hg_rank_total:${rankScore}`,
    ...breakdown.map(
      (b) => `${b.signal}:+${Math.round(b.points * 10000) / 10000}(${b.note})`,
    ),
  ];

  return { rankScore, rankReasons, rankBreakdown: breakdown };
}

/**
 * Production HG rank: five persisted ranking signals + deterministic spread/tie micro only
 * (see module docblock — HG ranking purity contract).
 */
export function computeHolyGrailRankingPurityRank(args: {
  readonly searcher: MatchingCanonicalModel;
  readonly candidate: MatchingCanonicalModel;
}): {
  rankScore: number;
  rankReasons: string[];
  rankBreakdown: HolyGrailRankSignalBreakdown[];
} {
  return computeHolyGrailFiveSignalRankInternal(args, false);
}

/**
 * Full composite rank: purity score plus optional `similarityPreference` and tag-overlap bonuses.
 * Use for offline analysis, validation scripts, and unit tests of overlay math — not for `rankHolyGrailCandidatesAfterHardFilter`.
 */
export function computeHolyGrailFiveSignalRank(args: {
  readonly searcher: MatchingCanonicalModel;
  readonly candidate: MatchingCanonicalModel;
}): {
  rankScore: number;
  rankReasons: string[];
  rankBreakdown: HolyGrailRankSignalBreakdown[];
} {
  return computeHolyGrailFiveSignalRankInternal(args, true);
}

/**
 * DecisionEngineV1 — deterministic match decision from compatibility score + pair enrichment.
 * Does not modify or recompute compatibilityScore; only uses it for baseline tier, then applies
 * enrichment-based boosts, penalties, and a single primaryReason narrative.
 */

import type { EnrichmentSignalsLike } from './enrichment-display-v1';
import { mapFinalRuleEnrichmentSignals } from './final-rule-signal-mapper';

export type MatchDecisionV1 = 'STRONG_MATCH' | 'GOOD_MATCH' | 'WEAK_MATCH' | 'PASS';

/** Single precedence ladder for both primaryReason and decision (no CTA/reason split). */
export type DominantOutcomeV1 =
  | 'DEALBREAKER'
  | 'HARD_TENSION'
  | 'CORE_MATCH'
  | 'NICE_TO_HAVE'
  | 'SCORE_ONLY';

export interface DecisionEngineV1Input {
  compatibilityScore: number;
  enrichment: {
    profileA: EnrichmentSignalsLike | null | undefined;
    profileB: EnrichmentSignalsLike | null | undefined;
  };
}

export interface DecisionEngineV1Result {
  decision: MatchDecisionV1;
  /** Exactly one dominant human-readable reason (no list). */
  primaryReason: string;
  /** One short action line derived from the same dominant outcome. */
  suggestedNextAction: string;
  /** Optional caution line; shown only for negative dominant/secondary negatives. */
  caution: string | null;
  flags: string[];
  /** Debug-only dominant outcome kind. */
  dominantOutcomeType?: DominantOutcomeV1;
  /** Debug-only dominant winning code (flag), null for SCORE_ONLY. */
  dominantOutcomeCode?: string | null;
  /** Debug: dominant outcome used to derive decision + UX copy. */
  decisionSource?: string;
}

const FAMILY_WANTS = new Set(['wants_kids_soon', 'wants_kids']);

function norm(s: EnrichmentSignalsLike | null | undefined): EnrichmentSignalsLike {
  return {
    dailyRhythm: s?.dailyRhythm ?? null,
    autonomyTogethernessDepth: s?.autonomyTogethernessDepth ?? null,
    kidsTimeline: s?.kidsTimeline ?? null,
    conflictStyleDetail: s?.conflictStyleDetail ?? null,
    interestsTop3: Array.isArray(s?.interestsTop3) ? s!.interestsTop3 : [],
  };
}

function kidsGoalsHardClash(ka: string | null, kb: string | null): boolean {
  if (!ka || !kb) return false;
  const cf = (x: string) => x === 'childfree';
  if ((cf(ka) && FAMILY_WANTS.has(kb)) || (cf(kb) && FAMILY_WANTS.has(ka))) return true;
  return false;
}

function kidsLifestyleClash(ka: string | null, kb: string | null): boolean {
  if (!ka || !kb) return false;
  const cf = (x: string) => x === 'childfree';
  return (cf(ka) && kb === 'already_has_kids') || (cf(kb) && ka === 'already_has_kids');
}

function kidsAligned(ka: string | null, kb: string | null): boolean {
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const family = new Set(['wants_kids_soon', 'wants_kids', 'open_timeline', 'already_has_kids']);
  if (ka === 'childfree' || kb === 'childfree') return false;
  return family.has(ka) && family.has(kb);
}

const HEAT = new Set(['escalates_quickly']);
const SHUT = new Set(['withdraws_shuts_down']);
const CALM = new Set([
  'cooldown_then_talk',
  'process_together',
  'repair_direct',
  'repair_over_blame',
  'avoids_conflict',
]);

function conflictSevereMismatch(ca: string | null, cb: string | null): boolean {
  if (!ca || !cb || ca === cb) return false;
  const ha = HEAT.has(ca);
  const hb = HEAT.has(cb);
  const sa = SHUT.has(ca);
  const sb = SHUT.has(cb);
  if ((ha && (sb || CALM.has(cb))) || (hb && (sa || CALM.has(ca)))) return true;
  if ((sa && hb) || (sb && ha)) return true;
  return false;
}

function conflictAligned(ca: string | null, cb: string | null): boolean {
  return Boolean(ca && cb && ca === cb);
}

function rhythmBucket(code: string | null): string | null {
  if (!code) return null;
  if (code === 'early_bird' || code === 'early_extreme') return 'early';
  if (code === 'late') return 'late';
  if (code === 'stable_nine_to_five') return 'steady';
  if (code === 'irregular' || code === 'startup_grind') return 'intense';
  if (code === 'slow_mornings' || code === 'homebody' || code === 'quiet_evenings') return 'quiet';
  if (code === 'fast_paced') return 'fast';
  if (code === 'location_flexible') return 'flex';
  if (code === 'social_bursts_recharge') return 'social';
  return 'other';
}

function rhythmOpposite(ra: string | null, rb: string | null): boolean {
  if (!ra || !rb) return false;
  const a = rhythmBucket(ra);
  const b = rhythmBucket(rb);
  if (a === 'early' && b === 'late') return true;
  if (a === 'late' && b === 'early') return true;
  return false;
}

function rhythmAligned(ra: string | null, rb: string | null): boolean {
  return Boolean(ra && rb && ra === rb);
}

const SPACE = new Set(['independence_with_space', 'values_alone_time']);
const CONNECT = new Set(['interdependence', 'closeness_individuality', 'quality_over_quantity']);

function autonomyGap(aa: string | null, ab: string | null): boolean {
  if (!aa || !ab || aa === ab) return false;
  if ((SPACE.has(aa) && ab === 'enmeshment') || (SPACE.has(ab) && aa === 'enmeshment')) return true;
  if ((CONNECT.has(aa) && ab === 'enmeshment') || (CONNECT.has(ab) && aa === 'enmeshment')) return true;
  return false;
}

function autonomyAligned(aa: string | null, ab: string | null): boolean {
  return Boolean(aa && ab && aa === ab);
}

function sharedNamedInterest(ia: string[], ib: string[]): boolean {
  const sa = new Set(ia.map((x) => String(x).trim().toLowerCase()).filter(Boolean));
  for (const x of ib) {
    const t = String(x).trim().toLowerCase();
    if (t && sa.has(t)) return true;
  }
  return false;
}

/** Baseline tier index 0..3 from score only (never changes the numeric score). */
function scoreTierIndex(score: number): number {
  const s = Number.isFinite(score) ? score : 0;
  if (s >= 76) return 3;
  if (s >= 60) return 2;
  if (s >= 42) return 1;
  return 0;
}

function indexToDecision(idx: number): MatchDecisionV1 {
  const c = Math.max(0, Math.min(3, idx));
  if (c >= 3) return 'STRONG_MATCH';
  if (c === 2) return 'GOOD_MATCH';
  if (c === 1) return 'WEAK_MATCH';
  return 'PASS';
}

const MAX_PRIMARY_REASON_WORDS = 12;

/** One decisive line for UI; does not affect scoring (copy only). */
const PRIMARY_REASON_BY_FLAG: Record<string, string> = {
  // DEALBREAKER
  KIDS_GOALS_MISMATCH: 'Different timelines for kids — likely long-term conflict',
  KIDS_LIFESTYLE_MISMATCH: 'Kids and family shape clash — hard to reconcile',
  // HARD_TENSION
  CONFLICT_STYLE_MISMATCH: 'Conflict styles mismatch — escalation vs avoidance',
  RHYTHM_MISMATCH: 'Opposite daily rhythm — early bird vs night owl',
  AUTONOMY_MISMATCH: 'Autonomy clash — space versus closeness needs diverge',
  // CORE_MATCH
  KIDS_ALIGNED: 'Aligned on kids timeline — shared family direction',
  CONFLICT_ALIGNED: 'Same conflict pacing — repair style lines up',
  RHYTHM_ALIGNED: 'Same pace and rhythm — easy day-to-day fit',
  AUTONOMY_ALIGNED: 'Independence needs match — autonomy feels mutual',
  // NICE_TO_HAVE
  SHARED_INTEREST: 'Shared listed hobby — natural icebreaker topic',
};

/** Priority when choosing one sentence: conflict tiers beat alignment tiers; order within tier is fixed. */
const DEALBREAKER_FLAGS = ['KIDS_GOALS_MISMATCH', 'KIDS_LIFESTYLE_MISMATCH'] as const;
const HARD_TENSION_FLAGS = ['CONFLICT_STYLE_MISMATCH', 'RHYTHM_MISMATCH', 'AUTONOMY_MISMATCH'] as const;
const CORE_MATCH_FLAGS = ['KIDS_ALIGNED', 'CONFLICT_ALIGNED', 'RHYTHM_ALIGNED', 'AUTONOMY_ALIGNED'] as const;

function clampToMaxWords(sentence: string, maxWords: number): string {
  const parts = sentence.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= maxWords) return sentence.trim();
  return parts.slice(0, maxWords).join(' ');
}

/** First winning flag per tier; defines dominantOutcome + dominantFlag. */
function selectDominantOutcome(flags: string[]): {
  dominantOutcomeType: DominantOutcomeV1;
  dominantOutcomeCode: string | null;
} {
  const set = new Set(flags);
  for (const f of DEALBREAKER_FLAGS) {
    if (set.has(f)) return { dominantOutcomeType: 'DEALBREAKER', dominantOutcomeCode: f };
  }
  for (const f of HARD_TENSION_FLAGS) {
    if (set.has(f)) return { dominantOutcomeType: 'HARD_TENSION', dominantOutcomeCode: f };
  }
  for (const f of CORE_MATCH_FLAGS) {
    if (set.has(f)) return { dominantOutcomeType: 'CORE_MATCH', dominantOutcomeCode: f };
  }
  if (set.has('SHARED_INTEREST')) {
    return { dominantOutcomeType: 'NICE_TO_HAVE', dominantOutcomeCode: 'SHARED_INTEREST' };
  }
  return { dominantOutcomeType: 'SCORE_ONLY', dominantOutcomeCode: null };
}

/** primaryReason follows dominantOutcome only (enrichment line or score-only fallback). */
function primaryReasonForDominant(
  dominantOutcomeType: DominantOutcomeV1,
  dominantOutcomeCode: string | null,
  scoreTier: number,
): string {
  if (dominantOutcomeCode && PRIMARY_REASON_BY_FLAG[dominantOutcomeCode]) {
    return clampToMaxWords(PRIMARY_REASON_BY_FLAG[dominantOutcomeCode]!, MAX_PRIMARY_REASON_WORDS);
  }
  // Only SCORE_ONLY can reach this branch.
  if (dominantOutcomeType !== 'SCORE_ONLY') {
    return clampToMaxWords('Mixed signals — verify fit with one direct question', MAX_PRIMARY_REASON_WORDS);
  }
  // SCORE_ONLY copy is driven by score band only.
  if (scoreTier >= 3) {
    return clampToMaxWords('Very high score — day-to-day fit looks strong', MAX_PRIMARY_REASON_WORDS);
  }
  if (scoreTier === 2) {
    return clampToMaxWords('Solid score — lifestyle rhythm may suit', MAX_PRIMARY_REASON_WORDS);
  }
  if (scoreTier === 1) {
    return clampToMaxWords('Mixed score — rhythm and autonomy still unclear', MAX_PRIMARY_REASON_WORDS);
  }
  return clampToMaxWords('Low score — unlikely day-to-day harmony', MAX_PRIMARY_REASON_WORDS);
}

/**
 * Map dominant outcome to MatchDecisionV1 (UI: STRONG_MATCH→TALK, GOOD_MATCH→SLOW DOWN, else SKIP).
 * Strong/good score band = tier index ≥ 2 (same thresholds as scoreTierIndex).
 */
function decisionFromDominantOutcome(
  dominantOutcomeType: DominantOutcomeV1,
  scoreTier: number,
): { decision: MatchDecisionV1; decisionSource: string } {
  switch (dominantOutcomeType) {
    case 'DEALBREAKER':
      return { decision: 'PASS', decisionSource: 'DEALBREAKER→SKIP(PASS)' };
    case 'HARD_TENSION':
      // SLOW_DOWN -> GOOD_MATCH so the hero shows SLOW DOWN, not full SKIP.
      return { decision: 'GOOD_MATCH', decisionSource: 'HARD_TENSION→SLOW_DOWN(GOOD_MATCH)' };
    case 'CORE_MATCH':
      // TALK -> STRONG_MATCH so the hero shows TALK.
      return { decision: 'STRONG_MATCH', decisionSource: 'CORE_MATCH→TALK(STRONG_MATCH)' };
    case 'NICE_TO_HAVE': {
      // NICE_TO_HAVE uses score band as tie-breaker.
      const strongOrGood = scoreTier >= 2;
      if (strongOrGood) {
        return {
          decision: 'STRONG_MATCH',
          decisionSource: `NICE_TO_HAVE→TALK(STRONG_MATCH);scoreTier>=2`,
        };
      }
      return {
        decision: 'GOOD_MATCH',
        decisionSource: `NICE_TO_HAVE→SLOW_DOWN(GOOD_MATCH);scoreTier<2`,
      };
    }
    default: {
      const decision = indexToDecision(scoreTier);
      return {
        decision,
        decisionSource: `SCORE_ONLY→scoreTier=${scoreTier}→${decision}`,
      };
    }
  }
}

function suggestedNextActionForDominant(
  dominantOutcomeType: DominantOutcomeV1,
  scoreTier: number,
): string {
  switch (dominantOutcomeType) {
    case 'DEALBREAKER':
      return 'Skip this match';
    case 'HARD_TENSION':
      return 'Slow down and ask one hard-fit question';
    case 'CORE_MATCH':
      return 'Start a conversation';
    case 'NICE_TO_HAVE':
      return scoreTier >= 2 ? 'Start a conversation' : 'Review profile and message';
    default:
      if (scoreTier >= 2) return 'Start a conversation';
      if (scoreTier === 1) return 'Review profile and message';
      return 'Consider other matches first';
  }
}

const CAUTION_BY_NEGATIVE_FLAG: Record<string, string> = {
  KIDS_GOALS_MISMATCH: 'Kids goals likely conflict long term.',
  KIDS_LIFESTYLE_MISMATCH: 'Family lifestyle fit may be difficult.',
  CONFLICT_STYLE_MISMATCH: 'Conflict style mismatch could escalate.',
  RHYTHM_MISMATCH: 'Daily rhythm mismatch may create friction.',
  AUTONOMY_MISMATCH: 'Closeness vs space needs may clash.',
};

function cautionForOutcome(
  dominantOutcomeType: DominantOutcomeV1,
  dominantOutcomeCode: string | null,
  flags: string[],
): string | null {
  const negative = [...DEALBREAKER_FLAGS, ...HARD_TENSION_FLAGS];
  if (dominantOutcomeType === 'DEALBREAKER' || dominantOutcomeType === 'HARD_TENSION') {
    if (dominantOutcomeCode && CAUTION_BY_NEGATIVE_FLAG[dominantOutcomeCode]) {
      return CAUTION_BY_NEGATIVE_FLAG[dominantOutcomeCode];
    }
    return 'Potential mismatch flagged.';
  }

  // For positive/score-only outcomes, surface the strongest secondary negative.
  for (const code of negative) {
    if (code !== dominantOutcomeCode && flags.includes(code)) {
      return CAUTION_BY_NEGATIVE_FLAG[code] ?? 'Potential mismatch flagged.';
    }
  }
  return null;
}

/**
 * Run deterministic decision: score → baseline tier, then enrichment boosts/penalties on tier index.
 */
export function runDecisionEngineV1(input: DecisionEngineV1Input): DecisionEngineV1Result {
  const a = norm(mapFinalRuleEnrichmentSignals(input.enrichment.profileA));
  const b = norm(mapFinalRuleEnrichmentSignals(input.enrichment.profileB));
  const flags: string[] = [];

  // Keep baseline score tier to drive SCORE_ONLY and NICE_TO_HAVE mappings.
  const scoreTier = scoreTierIndex(input.compatibilityScore);
  let tier = scoreTier;

  if (kidsGoalsHardClash(a.kidsTimeline, b.kidsTimeline)) {
    flags.push('KIDS_GOALS_MISMATCH');
    tier = 0;
  } else {
    if (kidsLifestyleClash(a.kidsTimeline, b.kidsTimeline)) {
      flags.push('KIDS_LIFESTYLE_MISMATCH');
      tier = Math.max(0, tier - 2);
    }
    if (conflictSevereMismatch(a.conflictStyleDetail, b.conflictStyleDetail)) {
      flags.push('CONFLICT_STYLE_MISMATCH');
      tier -= 1;
    }
    if (rhythmOpposite(a.dailyRhythm, b.dailyRhythm)) {
      flags.push('RHYTHM_MISMATCH');
      tier -= 1;
    }
    if (autonomyGap(a.autonomyTogethernessDepth, b.autonomyTogethernessDepth)) {
      flags.push('AUTONOMY_MISMATCH');
      tier -= 1;
    }

    if (sharedNamedInterest(a.interestsTop3, b.interestsTop3)) {
      flags.push('SHARED_INTEREST');
    }

    let boosted = false;
    if (kidsAligned(a.kidsTimeline, b.kidsTimeline) && tier < 3) {
      flags.push('KIDS_ALIGNED');
      tier += 1;
      boosted = true;
    }
    if (!boosted && conflictAligned(a.conflictStyleDetail, b.conflictStyleDetail) && tier < 3) {
      flags.push('CONFLICT_ALIGNED');
      tier += 1;
      boosted = true;
    }
    if (!boosted && rhythmAligned(a.dailyRhythm, b.dailyRhythm) && tier < 3) {
      flags.push('RHYTHM_ALIGNED');
      tier += 1;
      boosted = true;
    }
    if (!boosted && autonomyAligned(a.autonomyTogethernessDepth, b.autonomyTogethernessDepth) && tier < 3) {
      flags.push('AUTONOMY_ALIGNED');
      tier += 1;
      boosted = true;
    }
  }

  tier = Math.max(0, Math.min(3, tier));

  const { dominantOutcomeType, dominantOutcomeCode } = selectDominantOutcome(flags);
  const primaryReason = primaryReasonForDominant(dominantOutcomeType, dominantOutcomeCode, scoreTier);
  const { decision, decisionSource } = decisionFromDominantOutcome(dominantOutcomeType, scoreTier);
  const suggestedNextAction = suggestedNextActionForDominant(dominantOutcomeType, scoreTier);
  const caution = cautionForOutcome(dominantOutcomeType, dominantOutcomeCode, flags);

  return {
    decision,
    primaryReason,
    suggestedNextAction,
    caution,
    flags,
    dominantOutcomeType,
    dominantOutcomeCode,
    decisionSource,
  };
}

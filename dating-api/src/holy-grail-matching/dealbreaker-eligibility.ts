/**
 * Sprint 17 Story 2 — classifier-derived hard eligibility (NEVER_BLOCKS on UNKNOWN).
 * Soft ranking deferred (architect Option C).
 */

import type { MatchingFacts } from '../canonical/matching-canonical.types';
import {
  AlcoholUseSelf,
  ChildrenStatusSelf,
  SmokingFrequencySelf,
  WantsChildrenSelf,
} from '../canonical/matching-canonical.types';
import type {
  HolyGrailDimensionEvaluation,
  HolyGrailHardEligibilityStatus,
} from './eligibility.evaluator';

/** Minimal signal shape for eligibility (canonical or extract). */
export type DealbreakerEligibilitySignal = {
  readonly tag: string;
  readonly classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE' | 'SOFT';
  readonly evidence: string;
  readonly confidence: number;
};

export type DealbreakerSelfFactPolarity = 'AFFIRMED' | 'DENIED';

function d(
  status: HolyGrailHardEligibilityStatus,
  reasonCode: string,
): HolyGrailDimensionEvaluation {
  return { status, reasonCode };
}

/**
 * Resolve whether the counterparty affirms / denies a trait for a dealbreaker tag.
 * Column facts win over explicit selfFacts map when both present.
 */
export function resolveCounterpartyTraitPolarity(
  tag: string,
  facts: MatchingFacts,
  selfFacts?: Readonly<Partial<Record<string, DealbreakerSelfFactPolarity>>>,
): DealbreakerSelfFactPolarity | undefined {
  const fromMap = selfFacts?.[tag];

  switch (tag) {
    case 'smoking':
    case 'only_non_smokers':
    case 'only_smokers': {
      const sm = facts.smoking;
      if (
        sm === SmokingFrequencySelf.REGULAR ||
        sm === SmokingFrequencySelf.SOCIAL
      ) {
        return 'AFFIRMED';
      }
      if (sm === SmokingFrequencySelf.NEVER) {
        return 'DENIED';
      }
      // FORMER / PREFER_NOT_TO_SAY / absent → fall through to hints
      return fromMap;
    }
    case 'excessive_drinking':
    case 'only_non_drinkers': {
      const a = facts.alcoholUse;
      if (
        a === AlcoholUseSelf.FREQUENT ||
        a === AlcoholUseSelf.MODERATE
      ) {
        return 'AFFIRMED';
      }
      if (a === AlcoholUseSelf.NEVER) {
        return 'DENIED';
      }
      return fromMap;
    }
    case 'vaping':
    case 'only_non_vapers':
    case 'drugs':
      // No dedicated UserProfile columns — hints / map only.
      return fromMap;
    case 'no_kids': {
      // Affirmed = has kids (conflict for "no kids" exclude).
      const cs = facts.childrenStatus;
      if (
        cs === ChildrenStatusSelf.YES_LIVES_WITH_ME ||
        cs === ChildrenStatusSelf.YES_NOT_WITH_ME
      ) {
        return 'AFFIRMED';
      }
      if (cs === ChildrenStatusSelf.NO) {
        return 'DENIED';
      }
      return fromMap;
    }
    case 'kids_required': {
      const w = facts.wantsChildren;
      if (w === WantsChildrenSelf.YES) {
        return 'AFFIRMED';
      }
      if (w === WantsChildrenSelf.NO) {
        return 'DENIED';
      }
      return fromMap;
    }
    case 'no_pets':
    case 'pets_required':
    case 'no_remote_work':
    case 'must_be_local':
    case 'long_distance_impossible':
    default:
      return fromMap;
  }
}

/**
 * Evaluate searcher HARD_EXCLUDE / HARD_REQUIRE signals vs counterparty facts.
 * SOFT signals are ignored (no dimension row). UNKNOWN never blocks (caller uses NEVER_BLOCKS).
 */
export function evaluateDealbreakerDimensions(input: {
  readonly searcherSignals: readonly DealbreakerEligibilitySignal[];
  readonly counterpartyFacts: MatchingFacts;
  readonly counterpartySelfFacts?: Readonly<
    Partial<Record<string, DealbreakerSelfFactPolarity>>
  >;
}): Readonly<Record<string, HolyGrailDimensionEvaluation>> {
  const out: Record<string, HolyGrailDimensionEvaluation> = {};

  for (const signal of input.searcherSignals) {
    if (
      signal.classification !== 'HARD_EXCLUDE' &&
      signal.classification !== 'HARD_REQUIRE'
    ) {
      continue;
    }

    const polarity = resolveCounterpartyTraitPolarity(
      signal.tag,
      input.counterpartyFacts,
      input.counterpartySelfFacts,
    );

    if (polarity === undefined) {
      out[signal.tag] = d('UNKNOWN', `DB_${signal.tag.toUpperCase()}_UNKNOWN`);
      continue;
    }

    if (signal.classification === 'HARD_EXCLUDE') {
      // Affirmed trait = conflict (they have what searcher excludes).
      out[signal.tag] =
        polarity === 'AFFIRMED'
          ? d('FAIL', `DB_${signal.tag.toUpperCase()}_EXCLUDED_TRAIT_PRESENT`)
          : d('PASS', `DB_${signal.tag.toUpperCase()}_EXCLUDED_TRAIT_ABSENT`);
      continue;
    }

    // HARD_REQUIRE — affirmed = match; denied = fail.
    out[signal.tag] =
      polarity === 'AFFIRMED'
        ? d('PASS', `DB_${signal.tag.toUpperCase()}_REQUIRED_TRAIT_PRESENT`)
        : d('FAIL', `DB_${signal.tag.toUpperCase()}_REQUIRED_TRAIT_ABSENT`);
  }

  return out;
}

/** Fold dealbreaker dims with NEVER_BLOCKS into overall PASS/FAIL.
 * Under NEVER_BLOCKS, only raw FAIL blocks — UNKNOWN/PASS/SOFT_PASS do not.
 * (Avoids importing resolveDimensionOutcome → circular dependency with eligibility.evaluator.)
 */
export function foldDealbreakerIntoOverall(
  fixedOverall: 'PASS' | 'FAIL',
  dealbreakerDimensions: Readonly<Record<string, HolyGrailDimensionEvaluation>>,
): 'PASS' | 'FAIL' {
  if (fixedOverall === 'FAIL') {
    return 'FAIL';
  }
  for (const evalDim of Object.values(dealbreakerDimensions)) {
    if (evalDim.status === 'FAIL') {
      return 'FAIL';
    }
  }
  return 'PASS';
}

/**
 * Build AFFIRMED/DENIED map from Story 1 self-fact hints (tag-oriented).
 * smokingFrequency REGULAR → smoking AFFIRMED; NEVER → DENIED; etc.
 */
export function selfFactHintsToPolarityMap(
  hints: readonly {
    readonly field: string;
    readonly value: string;
  }[],
): Partial<Record<string, DealbreakerSelfFactPolarity>> {
  const out: Partial<Record<string, DealbreakerSelfFactPolarity>> = {};
  for (const h of hints) {
    if (h.field === 'smokingFrequency') {
      if (h.value === 'REGULAR' || h.value === 'SOCIAL') {
        out.smoking = 'AFFIRMED';
      } else if (h.value === 'NEVER') {
        out.smoking = 'DENIED';
      }
    } else if (h.field === 'alcoholUse') {
      if (h.value === 'FREQUENT' || h.value === 'MODERATE') {
        out.excessive_drinking = 'AFFIRMED';
      } else if (h.value === 'NEVER') {
        out.excessive_drinking = 'DENIED';
      }
    } else if (h.field === 'wantsChildren') {
      if (h.value === 'YES') {
        out.kids_required = 'AFFIRMED';
      } else if (h.value === 'NO') {
        out.kids_required = 'DENIED';
        // Also useful for no_kids exclude (wants no kids ≠ has kids; leave no_kids to childrenStatus).
      }
    } else if (h.field === 'childrenStatus') {
      if (
        h.value === 'HAS_CHILDREN' ||
        h.value === 'YES_LIVES_WITH_ME' ||
        h.value === 'YES_NOT_WITH_ME'
      ) {
        out.no_kids = 'AFFIRMED';
      } else if (h.value === 'NO') {
        out.no_kids = 'DENIED';
      }
    }
  }
  return out;
}

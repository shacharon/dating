import type { DerivedContextV1 } from '../evaluate/evaluate-batch.types';

/**
 * Derived context: computed or aggregated view of extracted signals for downstream use.
 * Does not introduce new extraction keys; uses only existing signal keys and standard aggregates.
 * No framework decorators.
 */

export type OccupationClass = DerivedContextV1['occupationClass'];

/** Signal key as used in extraction (must match EXTRACTION_SIGNAL_KEYS). */
export type SignalKey = string;

/** Aggregated view derived from one or more ExtractedSignals (e.g. self + partner + relationship). */
export interface DerivedContext {
  /** Optional: average confidence across domains used. */
  avgConfidence?: number;
  /** Optional: count of non-null signals across domains. */
  totalNonNullSignals?: number;
  /** Optional: coverage ratio (non-null / total keys) per domain or overall. */
  coverageRatio?: number;
  /** Optional: domain-specific or combined flags for downstream (e.g. LOW_COVERAGE). */
  flags?: string[];
  /** Optional: minimal summary label derived from signals (e.g. for logging). */
  summaryLabel?: string;
  /** Optional: occupation/lifestyle class for dealbreaker logic (e.g. SHIFT_UNPREDICTABLE, TRAVEL_HEAVY). */
  occupationClass?: string;
  /** Optional: visibility/social exposure need 0–10 for dealbreaker logic. */
  visibilityNeed?: number;
  /** Optional: life stage 0–10 for dealbreaker logic. */
  lifeStage?: number;
}

/**
 * Build a minimal derived context from a set of confidence and non-null counts.
 * Does not add or change extraction keys.
 */
export function buildDerivedContext(opts: {
  avgConfidence?: number;
  totalNonNullSignals?: number;
  totalSignalSlots?: number;
  flags?: string[];
}): DerivedContext {
  const { avgConfidence, totalNonNullSignals, totalSignalSlots, flags } = opts;
  const coverageRatio =
    totalSignalSlots != null &&
    totalSignalSlots > 0 &&
    totalNonNullSignals != null
      ? totalNonNullSignals / totalSignalSlots
      : undefined;
  return {
    ...(avgConfidence != null && { avgConfidence }),
    ...(totalNonNullSignals != null && { totalNonNullSignals }),
    ...(coverageRatio != null && { coverageRatio }),
    ...(flags != null && flags.length > 0 && { flags: [...flags] }),
  };
}

/** Profile texts used to derive context (e.g. for dealbreakers). */
export interface ProfileTexts {
  aboutMe?: string;
  aboutPartner?: string;
  aboutRelationship?: string;
}

/**
 * Derive context from profile texts. Minimal keyword heuristics for occupationClass, visibilityNeed, lifeStage.
 * Returns defaults when no cues found; does not add extraction keys.
 */
export function deriveContextFromProfileTexts(
  texts: ProfileTexts,
): DerivedContext {
  const combined = [
    texts.aboutMe ?? '',
    texts.aboutPartner ?? '',
    texts.aboutRelationship ?? '',
  ]
    .join(' ')
    .toLowerCase();

  let occupationClass: string | undefined;
  if (/\b(?:travel|traveling|flying|road\s*trip|nomad)\b/i.test(combined)) {
    occupationClass = 'TRAVEL_HEAVY';
  } else if (
    /\b(?:shift|night\s*shift|rotating|schedule\s*change|unpredictable\s*hours)\b/i.test(
      combined,
    )
  ) {
    occupationClass = 'SHIFT_UNPREDICTABLE';
  }

  let visibilityNeed: number = 5;
  if (
    /\b(?:low\s*profile|private|keep\s*to\s*myself|introvert|quiet\s*life)\b/i.test(
      combined,
    )
  ) {
    visibilityNeed = 2;
  } else if (
    /\b(?:visible|social|outgoing|public\s*figure|networking)\b/i.test(combined)
  ) {
    visibilityNeed = 8;
  }

  let lifeStage: number = 5;
  if (
    /\b(?:just\s*started|early\s*20s|young\s*professional|first\s*career)\b/i.test(
      combined,
    )
  ) {
    lifeStage = 2;
  } else if (
    /\b(?:settled|established|40s|50s|empty\s*nest|second\s*chapter)\b/i.test(
      combined,
    )
  ) {
    lifeStage = 8;
  }

  return {
    ...(occupationClass != null && { occupationClass }),
    visibilityNeed,
    lifeStage,
  };
}

/** STANDARD and null → undefined for dealbreaker rule #2 (regex never sets STANDARD). */
export function mapOccupationForDealbreakers(
  occ: DerivedContextV1['occupationClass'],
): string | undefined {
  if (occ === 'SHIFT_UNPREDICTABLE' || occ === 'TRAVEL_HEAVY') return occ;
  return undefined;
}

/** Evaluation with optional persisted LLM derived context. */
export type EvaluationWithDerivedContext = {
  derivedContext?: DerivedContextV1;
};

/**
 * Prefer LLM-derived context from evaluationJson when present; else keyword regex fallback.
 */
export function resolveDerivedContext(
  evaluation: EvaluationWithDerivedContext | undefined,
  texts: ProfileTexts,
): DerivedContext {
  const stored = evaluation?.derivedContext;
  if (stored?.version === 'v1') {
    return {
      occupationClass: mapOccupationForDealbreakers(stored.occupationClass),
      visibilityNeed: stored.visibilityNeed,
      lifeStage: stored.lifeStage,
    };
  }
  return deriveContextFromProfileTexts(texts);
}

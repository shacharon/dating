import type { CompatibilityResult } from '../compatibility/compatibility-score';
import type { ProductScores } from '../domain/scoring/product-scores.types';
import type {
  ExtractedSignals,
  LLMUsageStats,
} from '../extraction/extracted-signals.interface';
import type { RawInterests } from '../extraction/extracted-interests.interface';
import type { ChipsBundle } from './chips-builder';
import type { EnrichmentV1 } from './enrichment-signals';
import type { EvaluateLlmCallTrace } from './evaluate-llm-pipeline';
import type {
  AttractionTraitsResult,
  RelationshipMotivationResult,
} from './evaluate-inference-schemas';
import type {
  EvaluateFlag,
  ProductScoresPresentation,
} from './product-scores';

/**
 * v1 extended signals: additive sidecar under evaluation.extendedSignals.
 * Explicit-list fields are capped at 5 items each, deduped semantically and across categories.
 */
export interface ExtendedSignals {
  version: 'v1';
  relationshipMotivation?: RelationshipMotivationResult;
  attractionTraits?: AttractionTraitsResult;
  interests: string[];
  lifestyleTraits: string[];
  preferences: string[];
  boundaries: string[];
  values: string[];
  _usage?: LLMUsageStats;
}

/** v1 dealbreaker context from profile analysis LLM. Scoring-relevant. */
export interface DerivedContextV1 {
  version: 'v1';
  occupationClass: 'STANDARD' | 'SHIFT_UNPREDICTABLE' | 'TRAVEL_HEAVY' | null;
  visibilityNeed: number;
  lifeStage: number;
  confidence?: number;
  evidence?: string[];
}

export interface EvaluateBatchInput {
  aboutMe: string;
  aboutRelationship: string;
  aboutPartner: string;
  modelKey?: string;
  temperature?: number;
  /** Optional profile id for extraction patches (e.g. SPARSE_PROFILE null-only recovery). */
  profileId?: string;
  /** Optional raw interests for chips generation (display-only). */
  rawInterests?: RawInterests;
}

export interface EvaluateBatchResult {
  self: ExtractedSignals;
  partner: ExtractedSignals;
  relationship: ExtractedSignals;
  compatibility: {
    selfVsPartner: CompatibilityResult;
    selfVsRelationship: CompatibilityResult;
  };
  display: {
    /** New presentation field (primary narrative for UI surfaces). */
    overallNarrative: string;
    /** New presentation field (about-me-specific insight). */
    aboutMeInsight: string;
    /** New presentation field (relationship-style insight). */
    relationshipInsight: string;
    /** New presentation field (partner-preference insight). */
    partnerInsight: string;
    /** New presentation field (2–4 concrete follow-up prompts). */
    missingPrompts: string[];
    /** Legacy compatibility field (mirrors overallNarrative). */
    summary: string;
    /** Legacy compatibility field (mirrors relationshipInsight). */
    insight: string;
    /** Present when LOW_COVERAGE or LOW_CONFIDENCE; UI-safe honesty note. */
    note?: string;
  };
  productScores: ProductScores;
  /** Display mapping: use instead of raw productScores when rendering (avoids false zeros). */
  productScoresPresentation: ProductScoresPresentation;
  flags: EvaluateFlag[];
  _usage?: LLMUsageStats;
  /** v1 extended signals: additive sidecar, does not affect scoring. */
  extendedSignals?: ExtendedSignals;
  /** Display chips for UI explainability (read-only, no scoring impact). */
  chips?: ChipsBundle;
  /**
   * Additive text-derived signals only; never used for scoring, matching, or core extraction.
   * Omitted on legacy stored evaluations until re-run.
   */
  enrichment?: EnrichmentV1;
  /** LLM-inferred dealbreaker context (occupation, visibility, life stage). */
  derivedContext?: DerivedContextV1;
  /** Raw LLM payloads + post-process stage diffs for evaluate-time LLM calls (observability only). */
  _evaluateLlmTraces?: {
    evalRequestId: string;
    summary?: EvaluateLlmCallTrace;
    relationshipMotivation?: EvaluateLlmCallTrace;
    attractionTraits?: EvaluateLlmCallTrace;
    derivedContext?: EvaluateLlmCallTrace;
  };
}

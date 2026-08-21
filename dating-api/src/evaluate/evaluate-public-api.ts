/**
 * Stable public type/schema re-exports for evaluate consumers.
 * Prefer importing from here (or original modules) — not from EvaluateService.
 */

export type { ProductScores } from '../domain/scoring/product-scores.types';

export type {
  EvaluateFlag,
  ProductScorePresentationValue,
  ProductScoresPresentation,
} from './product-scores';

export {
  ATTRACTION_TRAITS_KEYS,
  AttractionProfileSchema,
  AttractionResultSchema,
  AttractionTraitsEvidenceItemSchema,
  AttractionTraitsResultSchema,
  AttractionTraitsSchema,
  RELATIONSHIP_MOTIVATION_VALUES,
  RelationshipMotivationResultSchema,
} from './evaluate-inference-schemas';
export type {
  AttractionProfile,
  AttractionResult,
  AttractionTraits,
  AttractionTraitsResult,
  RelationshipMotivation,
  RelationshipMotivationResult,
} from './evaluate-inference-schemas';

export type { Chip, ChipsBundle } from './chips-builder';

export type {
  DerivedContextV1,
  ExtendedSignals,
  EvaluateBatchInput,
  EvaluateBatchResult,
} from './evaluate-batch.types';

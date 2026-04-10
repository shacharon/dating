/**
 * HOLY_GRAIL_MATCHING — deterministic stack above the LLM: map → evaluate → decision/audit (+ optional post-filter rank).
 * LLM stays in extraction services. `HolyGrailMatchingModule` is wired from `app.module.ts`; legacy `MatchesModule` / `match-engine` remains separate until cutover.
 * Eligibility SOFT_PASS rules: see `docs/HOLY_GRAIL_MATCHING.md` § “Locked Layer 3 policy” and `eligibility.evaluator.ts` docblock.
 */

export { MatchingDimensionResults, type MatchingDimensionResult } from './matching-dimension-result';
export { HOLY_GRAIL_DIMENSION_KEYS, type HolyGrailDimensionKey } from './holy-grail-dimensions';
export type {
  HolyGrailExtractionArraysInput,
  HolyGrailProfileMappingInput,
  HolyGrailProfileSourceStub,
  HolyGrailStructuredFactsInput,
  HolyGrailStructuredPreferencesInput,
} from './profile-sources.types';
export { mapProfileSourceToMatchingCanonical } from './profile-to-canonical.mapper';
export {
  evaluateHolyGrailDirectional,
  mergeEffectiveMatchingPreferences,
  type HolyGrailDirectionalEvaluationResult,
  type HolyGrailDimensionEvaluation,
  type HolyGrailEligibilityFlags,
  type HolyGrailHardEligibilityStatus,
} from './eligibility.evaluator';
export { adaptHolyGrailEvaluationToLegacyDimensionMap } from './evaluation-to-legacy-dimension-map';
export { buildHolyGrailEligibilityAuditV1 } from './build-eligibility-audit';
export type { HolyGrailEligibilityAuditV1, HolyGrailDimensionAuditRow } from './eligibility-audit.types';
export {
  HolyGrailPairDecisions,
  type HolyGrailPairDecision,
  type HolyGrailPairDecisionV1,
} from './decision/holy-grail-decision.types';
export { buildHolyGrailPairDecisionV1 } from './decision/build-holy-grail-pair-decision';
export {
  filterCandidatesByHardEligibility,
  type PairwiseHardEligibilityFilterDebug,
  type PairwiseHardEligibilityFilterResult,
} from './pairwise-hard-eligibility-filter';
export {
  rankHolyGrailCandidatesAfterHardFilter,
  type HolyGrailCandidateRankingDebug,
  type HolyGrailCandidateRankingResult,
  type RankedHolyGrailCandidate,
} from './holy-grail-candidate-ranking';
export { HolyGrailMatchingModule } from './holy-grail-matching.module';
export {
  HolyGrailRetrievalService,
  type HolyGrailRetrievalDebugCounts,
  type HolyGrailRetrievalResponse,
} from './retrieval/holy-grail-retrieval.service';
export {
  HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY,
  type HolyGrailProfileSourceRepository,
} from './retrieval/holy-grail-profile-source.repository';
export { PrismaHolyGrailProfileSourceRepository } from './retrieval/prisma-holy-grail-profile-source.repository';
export {
  buildHolyGrailProfileMappingInputFromDbRow,
  parseHolyGrailStructuredFactsFromJson,
  parseHolyGrailStructuredPreferencesFromJson,
} from './retrieval/holy-grail-structured-db-json';
export {
  holyGrailStructuredPreferencesPatchBodySchema,
  parseHolyGrailStructuredPreferencesPatchBody,
  type HolyGrailStructuredPreferencesPatchBody,
} from './retrieval/holy-grail-preferences-patch.schema';
export {
  mapHolyGrailRetrievalResponseToWireDto,
  mapMatchingCanonicalToRetrievalCandidateWireDto,
  mapMatchingPreferencesToWireDto,
  mapMatchingSearchOverridesToWireDto,
  mapRankedHolyGrailCandidateToWireDto,
  type HolyGrailMatchingPreferencesWireDto,
  type HolyGrailMatchingSearchOverridesWireDto,
  type HolyGrailRankedCandidateWireDto,
  type HolyGrailRetrievalCandidateWireDto,
  type HolyGrailRetrievalWireResponse,
} from './retrieval/holy-grail-retrieval-wire.dto';
export {
  HolyGrailStructuredWriteError,
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from './holy-grail-structured-write.merge';
export {
  HolyGrailStructuredWriteService,
  type HolyGrailStructuredWriteRequest,
} from './holy-grail-structured-write.service';
export {
  extractSimilarityPreferenceFromFreeText,
  type SimilarityPreferenceTextExtraction,
} from './similarity-preference-text.extract';
export {
  extractPersonalityTraitsFromFreeText,
  PERSONALITY_TRAIT_TAGS,
  PERSONALITY_TRAIT_TAG_SET,
  type PersonalityTraitEvidenceHit,
  type PersonalityTraitTag,
  type PersonalityTraitsScopeExtraction,
  type PersonalityTraitsTextExtraction,
} from './personality-traits-text.extract';
export {
  extractLifestyleSignalsFromFreeText,
  LIFESTYLE_SIGNAL_TAGS,
  LIFESTYLE_SIGNAL_TAG_SET,
  type LifestyleSignalEvidenceHit,
  type LifestyleSignalTag,
  type LifestyleSignalsScopeExtraction,
  type LifestyleSignalsTextExtraction,
} from './lifestyle-signals-text.extract';
export {
  extractInterestTagsV1FromFreeText,
  INTEREST_TAGS_V1,
  INTEREST_TAG_V1_SET,
  type InterestTagEvidenceHit,
  type InterestTagV1,
  type InterestTagsScopeExtraction,
  type InterestTagsTextExtraction,
} from './interest-tags-text.extract';

/**
 * HOLY_GRAIL_MATCHING — new engine above the LLM: map → evaluate → decision/audit.
 * LLM stays in extraction services; deterministic code lives here only.
 * Do not register in MatchesModule or wire to ranking until explicitly approved.
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
  HolyGrailStructuredWriteError,
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from './holy-grail-structured-write.merge';
export {
  HolyGrailStructuredWriteService,
  type HolyGrailStructuredWriteRequest,
} from './holy-grail-structured-write.service';

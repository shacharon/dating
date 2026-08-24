import {
  MATCHING_CANONICAL_MODEL_VERSION,
  type MatchingCanonicalModel,
} from '../../canonical/matching-canonical.types';
import type { HolyGrailProfileMappingInput } from '../profile-sources.types';
import {
  assertNonEmptyProfileId,
  validateMappingInputShape,
} from './canonical-mapper.validation';
import { validateExtractionArraysSlice } from './map-extraction-arrays.slice';
import {
  mapRankingSignalsSnapshot,
  validateRankingSignalsSlice,
} from './map-ranking-signals.slice';
import {
  buildFacts,
  validateStructuredFactsSlice,
} from './map-structured-facts.slice';
import {
  buildPreferences,
  validateStructuredPreferencesSlice,
} from './map-structured-preferences.slice';
import { parseSearchOverrides } from './map-search-overrides.slice';

/**
 * Layer 2 — Canonical mapping: structured DTO only → `MatchingCanonicalModel` v1.
 * Strict runtime validation: unknown keys rejected; enums checked against `Object.values` allowlists.
 * Spec: docs/HOLY_GRAIL_MATCHING.md Step 4. Deterministic; no raw text; no LLM.
 */
export function mapProfileSourceToMatchingCanonical(
  input: HolyGrailProfileMappingInput,
): MatchingCanonicalModel {
  validateMappingInputShape(input);
  validateExtractionArraysSlice(input.extractionArrays);
  validateStructuredFactsSlice(input.structuredFacts);
  validateStructuredPreferencesSlice(input.structuredPreferences);
  validateRankingSignalsSlice(input.rankingSignals);

  const profileId = assertNonEmptyProfileId(input.profileId);
  const preferences = buildPreferences(input.structuredPreferences);
  if (
    input.dealbreakerSignals !== undefined &&
    input.dealbreakerSignals.length > 0
  ) {
    preferences.dealbreakerSignals = [...input.dealbreakerSignals];
  }
  const base: MatchingCanonicalModel = {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: buildFacts(input),
    preferences,
    searchOverrides: parseSearchOverrides(input.searchOverrides),
  };
  if (input.rankingSignals !== undefined) {
    return {
      ...base,
      rankingSignals: mapRankingSignalsSnapshot(input.rankingSignals),
    };
  }
  return base;
}

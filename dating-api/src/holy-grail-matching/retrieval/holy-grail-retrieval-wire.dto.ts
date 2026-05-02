/**
 * Sparse wire shapes for Holy Grail retrieval / API layers. Mirrors `MatchingCanonicalModel` slices
 * without injecting defaults — omitted keys stay absent.
 *
 * **vs DB JSON:** `HolyGrailMatchingPreferencesWireDto` follows canonical `MatchingPreferences`.
 * For v1 HG, the same field names round-trip through `MatchmakingProfile.holyGrailStructuredPreferences` JSON
 * (`HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS`); see `HolyGrailStructuredPreferencesPersistedWireDto`.
 */

import type {
  AcceptedPartnerAlcohol,
  AcceptedPartnerGender,
  AcceptedPartnerSmoking,
  MatchingCanonicalModel,
  MatchingPreferences,
  MatchingRankingSignalsSnapshot,
  MatchingSearchOverrides,
  MinimumPartnerEducation,
  PartnerHasChildrenAcceptance,
  PartnerWantsChildrenRequirement,
  ReligionSelf,
  SimilarityPreference,
} from '../../canonical/matching-canonical.types';
import type { HolyGrailRankSignalBreakdown } from '../holy-grail-five-signal-ranking';
import type { RankedHolyGrailCandidate } from '../holy-grail-candidate-ranking';
import type { HolyGrailRetrievalDebugCounts } from './holy-grail-retrieval.service';

export interface HolyGrailMatchingPreferencesWireDto {
  readonly acceptedPartnerGenders?: readonly AcceptedPartnerGender[];
  readonly partnerAgeMin?: number;
  readonly partnerAgeMax?: number;
  readonly minimumPartnerEducation?: MinimumPartnerEducation;
  readonly acceptedPartnerSmoking?: readonly AcceptedPartnerSmoking[];
  readonly acceptedPartnerAlcohol?: readonly AcceptedPartnerAlcohol[];
  readonly partnerWantsChildren?: PartnerWantsChildrenRequirement;
  readonly partnerHasChildren?: PartnerHasChildrenAcceptance;
  readonly acceptedPartnerReligions?: readonly ReligionSelf[];
  readonly maxDistanceKm?: number;
  readonly similarityPreference?: SimilarityPreference | null;
}

/** Preference fields stored in `holyGrailStructuredPreferences` JSON (same keys as wire preferences for v1). */
export type HolyGrailStructuredPreferencesPersistedWireDto =
  HolyGrailMatchingPreferencesWireDto;

/** Session/search slice; adds `validUntil` on top of preference-shaped overrides. */
export interface HolyGrailMatchingSearchOverridesWireDto {
  readonly acceptedPartnerGenders?: readonly AcceptedPartnerGender[];
  readonly partnerAgeMin?: number;
  readonly partnerAgeMax?: number;
  readonly minimumPartnerEducation?: MinimumPartnerEducation;
  readonly acceptedPartnerSmoking?: readonly AcceptedPartnerSmoking[];
  readonly acceptedPartnerAlcohol?: readonly AcceptedPartnerAlcohol[];
  readonly partnerWantsChildren?: PartnerWantsChildrenRequirement;
  readonly partnerHasChildren?: PartnerHasChildrenAcceptance;
  readonly acceptedPartnerReligions?: readonly ReligionSelf[];
  readonly maxDistanceKm?: number;
  readonly similarityPreference?: SimilarityPreference | null;
  readonly validUntil?: string;
}

export interface HolyGrailRetrievalCandidateWireDto {
  readonly profileId: string;
  readonly preferences: HolyGrailMatchingPreferencesWireDto;
  readonly searchOverrides: HolyGrailMatchingSearchOverridesWireDto;
  readonly rankingSignals?: MatchingRankingSignalsSnapshot;
}

export interface HolyGrailRankedCandidateWireDto {
  readonly candidate: HolyGrailRetrievalCandidateWireDto;
  readonly rankScore: number;
  readonly rankReasons: readonly string[];
  readonly rankBreakdown: readonly HolyGrailRankSignalBreakdown[];
}

export interface HolyGrailRetrievalWireResponse {
  readonly rankedCandidates: readonly HolyGrailRankedCandidateWireDto[];
  readonly debug: HolyGrailRetrievalDebugCounts;
}

export function mapMatchingPreferencesToWireDto(
  p: MatchingPreferences,
): HolyGrailMatchingPreferencesWireDto {
  return {
    ...(p.acceptedPartnerGenders !== undefined
      ? { acceptedPartnerGenders: [...p.acceptedPartnerGenders] }
      : {}),
    ...(p.partnerAgeMin !== undefined
      ? { partnerAgeMin: p.partnerAgeMin }
      : {}),
    ...(p.partnerAgeMax !== undefined
      ? { partnerAgeMax: p.partnerAgeMax }
      : {}),
    ...(p.minimumPartnerEducation !== undefined
      ? { minimumPartnerEducation: p.minimumPartnerEducation }
      : {}),
    ...(p.acceptedPartnerSmoking !== undefined
      ? { acceptedPartnerSmoking: p.acceptedPartnerSmoking }
      : {}),
    ...(p.acceptedPartnerAlcohol !== undefined
      ? { acceptedPartnerAlcohol: p.acceptedPartnerAlcohol }
      : {}),
    ...(p.partnerWantsChildren !== undefined
      ? { partnerWantsChildren: p.partnerWantsChildren }
      : {}),
    ...(p.partnerHasChildren !== undefined
      ? { partnerHasChildren: p.partnerHasChildren }
      : {}),
    ...(p.acceptedPartnerReligions !== undefined
      ? { acceptedPartnerReligions: [...p.acceptedPartnerReligions] }
      : {}),
    ...(p.maxDistanceKm !== undefined
      ? { maxDistanceKm: p.maxDistanceKm }
      : {}),
    ...(p.similarityPreference !== undefined
      ? { similarityPreference: p.similarityPreference }
      : {}),
  };
}

export function mapMatchingSearchOverridesToWireDto(
  o: MatchingSearchOverrides,
): HolyGrailMatchingSearchOverridesWireDto {
  return {
    ...(o.acceptedPartnerGenders !== undefined
      ? { acceptedPartnerGenders: [...o.acceptedPartnerGenders] }
      : {}),
    ...(o.partnerAgeMin !== undefined
      ? { partnerAgeMin: o.partnerAgeMin }
      : {}),
    ...(o.partnerAgeMax !== undefined
      ? { partnerAgeMax: o.partnerAgeMax }
      : {}),
    ...(o.minimumPartnerEducation !== undefined
      ? { minimumPartnerEducation: o.minimumPartnerEducation }
      : {}),
    ...(o.acceptedPartnerSmoking !== undefined
      ? { acceptedPartnerSmoking: o.acceptedPartnerSmoking }
      : {}),
    ...(o.acceptedPartnerAlcohol !== undefined
      ? { acceptedPartnerAlcohol: o.acceptedPartnerAlcohol }
      : {}),
    ...(o.partnerWantsChildren !== undefined
      ? { partnerWantsChildren: o.partnerWantsChildren }
      : {}),
    ...(o.partnerHasChildren !== undefined
      ? { partnerHasChildren: o.partnerHasChildren }
      : {}),
    ...(o.acceptedPartnerReligions !== undefined
      ? { acceptedPartnerReligions: [...o.acceptedPartnerReligions] }
      : {}),
    ...(o.maxDistanceKm !== undefined
      ? { maxDistanceKm: o.maxDistanceKm }
      : {}),
    ...(o.similarityPreference !== undefined
      ? { similarityPreference: o.similarityPreference }
      : {}),
    ...(o.validUntil !== undefined ? { validUntil: o.validUntil } : {}),
  };
}

export function mapMatchingCanonicalToRetrievalCandidateWireDto(
  m: MatchingCanonicalModel,
): HolyGrailRetrievalCandidateWireDto {
  return {
    profileId: m.profileId,
    preferences: mapMatchingPreferencesToWireDto(m.preferences),
    searchOverrides: mapMatchingSearchOverridesToWireDto(m.searchOverrides),
    ...(m.rankingSignals !== undefined
      ? { rankingSignals: m.rankingSignals }
      : {}),
  };
}

export function mapRankedHolyGrailCandidateToWireDto(
  row: RankedHolyGrailCandidate,
): HolyGrailRankedCandidateWireDto {
  return {
    candidate: mapMatchingCanonicalToRetrievalCandidateWireDto(row.candidate),
    rankScore: row.rankScore,
    rankReasons: row.rankReasons,
    rankBreakdown: row.rankBreakdown,
  };
}

export function mapHolyGrailRetrievalResponseToWireDto(res: {
  readonly rankedCandidates: readonly RankedHolyGrailCandidate[];
  readonly debug: HolyGrailRetrievalDebugCounts;
}): HolyGrailRetrievalWireResponse {
  return {
    rankedCandidates: res.rankedCandidates.map(
      mapRankedHolyGrailCandidateToWireDto,
    ),
    debug: res.debug,
  };
}

/**
 * Sparse wire shapes for Holy Grail retrieval / API layers. Mirrors `MatchingCanonicalModel` slices
 * without injecting defaults — omitted keys stay absent.
 *
 * **vs DB JSON:** `HolyGrailMatchingPreferencesWireDto` follows canonical `MatchingPreferences`.
 * For v1 HG, the same field names round-trip through `MatchmakingProfile.holyGrailStructuredPreferences` JSON
 * (`HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS`); see `HolyGrailStructuredPreferencesPersistedWireDto`.
 */

import type {
  AcceptedPartnerGender,
  MatchingCanonicalModel,
  MatchingPreferences,
  MatchingRankingSignalsSnapshot,
  MatchingSearchOverrides,
} from '../../canonical/matching-canonical.types';
import type { HolyGrailRankSignalBreakdown } from '../holy-grail-five-signal-ranking';
import type { RankedHolyGrailCandidate } from '../holy-grail-candidate-ranking';
import type { HolyGrailRetrievalDebugCounts } from './holy-grail-retrieval.service';

export interface HolyGrailMatchingPreferencesWireDto {
  readonly acceptedPartnerGenders?: readonly AcceptedPartnerGender[];
  readonly partnerAgeMin?: number;
  readonly partnerAgeMax?: number;
  readonly maxDistanceKm?: number;
}

/** Preference fields stored in `holyGrailStructuredPreferences` JSON (same keys as wire preferences for v1). */
export type HolyGrailStructuredPreferencesPersistedWireDto =
  HolyGrailMatchingPreferencesWireDto;

/** Session/search slice; adds `validUntil` on top of preference-shaped overrides. */
export interface HolyGrailMatchingSearchOverridesWireDto {
  readonly acceptedPartnerGenders?: readonly AcceptedPartnerGender[];
  readonly partnerAgeMin?: number;
  readonly partnerAgeMax?: number;
  readonly maxDistanceKm?: number;
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
    ...(p.maxDistanceKm !== undefined
      ? { maxDistanceKm: p.maxDistanceKm }
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
    ...(o.maxDistanceKm !== undefined
      ? { maxDistanceKm: o.maxDistanceKm }
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

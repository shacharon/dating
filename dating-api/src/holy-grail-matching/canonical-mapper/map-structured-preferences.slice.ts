import {
  AcceptedPartnerGender,
  type MatchingPreferences,
} from '../../canonical/matching-canonical.types';
import type { HolyGrailProfileMappingInput } from '../profile-sources.types';
import { matchingCanonicalEnumStringValues } from '../holy-grail-canonical-enum';
import {
  assertHolyGrailStructuredMapPartnerAgeInteger,
  HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_KEY_SET,
} from '../holy-grail-structured-contract';
import {
  assertNoExtraKeys,
  assertPlainRecord,
  assertPositiveFiniteKm,
} from './canonical-mapper.validation';

const STRUCTURED_PREFERENCES_KEYS =
  HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_KEY_SET;

export function validateStructuredPreferencesSlice(
  sp: HolyGrailProfileMappingInput['structuredPreferences'],
): void {
  if (sp === undefined || sp === null) {
    return;
  }
  assertPlainRecord(sp, 'structuredPreferences');
  assertNoExtraKeys(
    sp as Record<string, unknown>,
    STRUCTURED_PREFERENCES_KEYS,
    'structuredPreferences',
  );
}

export function buildPreferences(
  sp: HolyGrailProfileMappingInput['structuredPreferences'],
): MatchingPreferences {
  const p = sp ?? {};
  const out: MatchingPreferences = {};

  if (p.acceptedPartnerGenders !== undefined) {
    const list = p.acceptedPartnerGenders;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error(
        'HolyGrail map: structuredPreferences.acceptedPartnerGenders must be a non-empty array when provided',
      );
    }
    const allowed = new Set(
      matchingCanonicalEnumStringValues(AcceptedPartnerGender),
    );
    out.acceptedPartnerGenders = list.map((g, i) => {
      if (typeof g !== 'string' || !allowed.has(g)) {
        throw new Error(
          `HolyGrail map: invalid structuredPreferences.acceptedPartnerGenders[${i}]: ${JSON.stringify(g)} (not in enum)`,
        );
      }
      return g as AcceptedPartnerGender;
    });
  }

  if (p.partnerAgeMin !== undefined) {
    out.partnerAgeMin = assertHolyGrailStructuredMapPartnerAgeInteger(
      p.partnerAgeMin,
      'structuredPreferences.partnerAgeMin',
    );
  }
  if (p.partnerAgeMax !== undefined) {
    out.partnerAgeMax = assertHolyGrailStructuredMapPartnerAgeInteger(
      p.partnerAgeMax,
      'structuredPreferences.partnerAgeMax',
    );
  }
  if (
    out.partnerAgeMin !== undefined &&
    out.partnerAgeMax !== undefined &&
    out.partnerAgeMin > out.partnerAgeMax
  ) {
    throw new Error('HolyGrail map: partnerAgeMin must be <= partnerAgeMax');
  }

  if (p.maxDistanceKm !== undefined) {
    out.maxDistanceKm = assertPositiveFiniteKm(
      p.maxDistanceKm,
      'structuredPreferences.maxDistanceKm',
    );
  }

  return out;
}

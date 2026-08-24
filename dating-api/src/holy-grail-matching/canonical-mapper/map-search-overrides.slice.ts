import {
  AcceptedPartnerGender,
  type MatchingSearchOverrides,
} from '../../canonical/matching-canonical.types';
import { matchingCanonicalEnumStringValues } from '../holy-grail-canonical-enum';
import {
  assertHolyGrailStructuredMapPartnerAgeInteger,
  HOLY_GRAIL_SEARCH_OVERRIDE_KEY_SET,
} from '../holy-grail-structured-contract';
import {
  assertNoExtraKeys,
  assertPlainRecord,
  assertPositiveFiniteKm,
} from './canonical-mapper.validation';

const SEARCH_OVERRIDE_KEYS = HOLY_GRAIL_SEARCH_OVERRIDE_KEY_SET;

function assertIsoInstant(s: string, field: string): string {
  const t = Date.parse(s);
  if (!Number.isFinite(t)) {
    throw new Error(
      `HolyGrail map: ${field} must be a valid ISO-8601 instant string`,
    );
  }
  return new Date(t).toISOString();
}

export function parseSearchOverrides(raw: unknown): MatchingSearchOverrides {
  if (raw === undefined || raw === null) {
    return {};
  }
  assertPlainRecord(raw, 'searchOverrides');
  const o = raw;
  assertNoExtraKeys(o, SEARCH_OVERRIDE_KEYS, 'searchOverrides');

  const out: MatchingSearchOverrides = {};

  if (o.acceptedPartnerGenders !== undefined) {
    const list = o.acceptedPartnerGenders;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error(
        'HolyGrail map: searchOverrides.acceptedPartnerGenders must be a non-empty array when provided',
      );
    }
    const allowed = new Set(
      matchingCanonicalEnumStringValues(AcceptedPartnerGender),
    );
    out.acceptedPartnerGenders = list.map((g, i) => {
      if (typeof g !== 'string' || !allowed.has(g)) {
        throw new Error(
          `HolyGrail map: invalid searchOverrides.acceptedPartnerGenders[${i}]: ${JSON.stringify(g)} (not in enum)`,
        );
      }
      return g as AcceptedPartnerGender;
    });
  }
  if (o.partnerAgeMin !== undefined) {
    out.partnerAgeMin = assertHolyGrailStructuredMapPartnerAgeInteger(
      o.partnerAgeMin,
      'searchOverrides.partnerAgeMin',
    );
  }
  if (o.partnerAgeMax !== undefined) {
    out.partnerAgeMax = assertHolyGrailStructuredMapPartnerAgeInteger(
      o.partnerAgeMax,
      'searchOverrides.partnerAgeMax',
    );
  }
  if (
    out.partnerAgeMin !== undefined &&
    out.partnerAgeMax !== undefined &&
    out.partnerAgeMin > out.partnerAgeMax
  ) {
    throw new Error(
      'HolyGrail map: searchOverrides.partnerAgeMin must be <= partnerAgeMax',
    );
  }
  if (o.maxDistanceKm !== undefined) {
    out.maxDistanceKm = assertPositiveFiniteKm(
      o.maxDistanceKm,
      'searchOverrides.maxDistanceKm',
    );
  }
  if (o.validUntil !== undefined) {
    if (typeof o.validUntil !== 'string' || o.validUntil.trim().length === 0) {
      throw new Error(
        'HolyGrail map: searchOverrides.validUntil must be a non-empty string',
      );
    }
    out.validUntil = assertIsoInstant(
      o.validUntil.trim(),
      'searchOverrides.validUntil',
    );
  }

  return out;
}

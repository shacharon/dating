import type { MeProfileDto, MeProfileGender, PatchMeProfileBody } from '@/lib/me-profile-api';
import { ME_PARTNER_GENDER_CHOICES } from '@/lib/me-profile-api';
import { validatePartnerGendersNonEmpty } from '@/lib/profile-field-validation';

export type MatchPreferencesValidationError =
  | 'ageRangeInvalid'
  | 'partnerGendersRequired';

export type MatchPreferencesFormState = {
  desiredPartnerGenders: MeProfileGender[];
  partnerAgeMin: string;
  partnerAgeMax: string;
  maxDistanceKm: string;
};

export function emptyMatchPreferencesFormState(): MatchPreferencesFormState {
  return {
    desiredPartnerGenders: [],
    partnerAgeMin: '',
    partnerAgeMax: '',
    maxDistanceKm: '',
  };
}

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

function filterPartnerGenders(
  values: MeProfileGender[] | null | undefined,
): MeProfileGender[] {
  const allowed = new Set<string>(ME_PARTNER_GENDER_CHOICES);
  return (values ?? []).filter(
    (g): g is MeProfileGender => typeof g === 'string' && allowed.has(g),
  );
}

export function profileToMatchPreferencesForm(
  profile: MeProfileDto,
): MatchPreferencesFormState {
  return {
    desiredPartnerGenders: filterPartnerGenders(profile.desiredPartnerGenders),
    partnerAgeMin:
      profile.partnerAgeMin != null ? String(profile.partnerAgeMin) : '',
    partnerAgeMax:
      profile.partnerAgeMax != null ? String(profile.partnerAgeMax) : '',
    maxDistanceKm:
      profile.maxDistanceKm != null ? String(profile.maxDistanceKm) : '',
  };
}

export function validateMatchPreferencesForm(
  state: MatchPreferencesFormState,
): { ok: true } | { ok: false; error: MatchPreferencesValidationError } {
  const partnerResult = validatePartnerGendersNonEmpty(
    state.desiredPartnerGenders,
  );
  if (!partnerResult.ok) {
    return partnerResult;
  }
  const min = parseOptionalInt(state.partnerAgeMin);
  const max = parseOptionalInt(state.partnerAgeMax);
  if (min != null && max != null && min > max) {
    return { ok: false, error: 'ageRangeInvalid' };
  }
  return { ok: true };
}

export function matchPreferencesFormToPatchBody(
  state: MatchPreferencesFormState,
): PatchMeProfileBody {
  return {
    desiredPartnerGenders: [...state.desiredPartnerGenders],
    partnerAgeMin: parseOptionalInt(state.partnerAgeMin),
    partnerAgeMax: parseOptionalInt(state.partnerAgeMax),
    maxDistanceKm: parseOptionalInt(state.maxDistanceKm),
  };
}

export function toggleArrayValue<T extends string>(
  current: readonly T[],
  value: T,
): T[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

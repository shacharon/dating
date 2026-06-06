import type { MeProfileDto, MeProfileGender, PatchMeProfileBody } from '@/lib/me-profile-api';
import { ME_PARTNER_GENDER_CHOICES } from '@/lib/me-profile-api';
import {
  ACCEPTED_PARTNER_ALCOHOL_VALUES,
  ACCEPTED_PARTNER_RELIGION_VALUES,
  ACCEPTED_PARTNER_SMOKING_VALUES,
  MINIMUM_PARTNER_EDUCATION_VALUES,
  PARTNER_HAS_CHILDREN_VALUES,
  PARTNER_WANTS_CHILDREN_VALUES,
  SIMILARITY_PREFERENCE_VALUES,
  type AcceptedPartnerAlcohol,
  type AcceptedPartnerReligion,
  type AcceptedPartnerSmoking,
  type MinimumPartnerEducation,
  type PartnerHasChildrenAcceptance,
  type PartnerWantsChildrenRequirement,
  type SimilarityPreference,
} from '@/lib/match-preference-options';

export type MatchPreferencesValidationError =
  | 'ageRangeInvalid'
  | 'partnerGendersRequired';

export type MatchPreferencesFormState = {
  desiredPartnerGenders: MeProfileGender[];
  partnerAgeMin: string;
  partnerAgeMax: string;
  maxDistanceKm: string;
  minimumPartnerEducation: string;
  acceptedPartnerSmoking: AcceptedPartnerSmoking[];
  acceptedPartnerAlcohol: AcceptedPartnerAlcohol[];
  partnerWantsChildren: string;
  partnerHasChildren: string;
  acceptedPartnerReligions: AcceptedPartnerReligion[];
  similarityPreference: string;
};

export function emptyMatchPreferencesFormState(): MatchPreferencesFormState {
  return {
    desiredPartnerGenders: [],
    partnerAgeMin: '',
    partnerAgeMax: '',
    maxDistanceKm: '',
    minimumPartnerEducation: '',
    acceptedPartnerSmoking: [],
    acceptedPartnerAlcohol: [],
    partnerWantsChildren: '',
    partnerHasChildren: '',
    acceptedPartnerReligions: [],
    similarityPreference: '',
  };
}

function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalEnum<T extends string>(
  raw: string,
  allowed: readonly T[],
): T | null {
  const v = raw.trim();
  if (!v) return null;
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
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
    minimumPartnerEducation: profile.minimumPartnerEducation ?? '',
    acceptedPartnerSmoking: [...(profile.acceptedPartnerSmoking ?? [])],
    acceptedPartnerAlcohol: [...(profile.acceptedPartnerAlcohol ?? [])],
    partnerWantsChildren: profile.partnerWantsChildren ?? '',
    partnerHasChildren: profile.partnerHasChildren ?? '',
    acceptedPartnerReligions: [...(profile.acceptedPartnerReligions ?? [])],
    similarityPreference: profile.similarityPreference ?? '',
  };
}

export function validateMatchPreferencesForm(
  state: MatchPreferencesFormState,
): { ok: true } | { ok: false; error: MatchPreferencesValidationError } {
  if (state.desiredPartnerGenders.length === 0) {
    return { ok: false, error: 'partnerGendersRequired' };
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
    minimumPartnerEducation: parseOptionalEnum<MinimumPartnerEducation>(
      state.minimumPartnerEducation,
      MINIMUM_PARTNER_EDUCATION_VALUES,
    ),
    acceptedPartnerSmoking: [...state.acceptedPartnerSmoking],
    acceptedPartnerAlcohol: [...state.acceptedPartnerAlcohol],
    partnerWantsChildren: parseOptionalEnum<PartnerWantsChildrenRequirement>(
      state.partnerWantsChildren,
      PARTNER_WANTS_CHILDREN_VALUES,
    ),
    partnerHasChildren: parseOptionalEnum<PartnerHasChildrenAcceptance>(
      state.partnerHasChildren,
      PARTNER_HAS_CHILDREN_VALUES,
    ),
    acceptedPartnerReligions: [...state.acceptedPartnerReligions],
    similarityPreference: parseOptionalEnum<SimilarityPreference>(
      state.similarityPreference,
      SIMILARITY_PREFERENCE_VALUES,
    ),
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

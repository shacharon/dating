import type {
  CreateMeProfileBody,
  MeProfileDto,
  MeProfileGender,
  PatchMeProfileBody,
} from '@/lib/me-profile-api';
import { ME_PROFILE_GENDERS } from '@/lib/me-profile-api';
import { fetchMyProfile } from '@/lib/me-profile-api';

/**
 * Loads the current account's product profile (session cookie). `null` when none exists yet.
 */
export async function resolveEditableProfile(): Promise<MeProfileDto | null> {
  return fetchMyProfile();
}

/** Onboarding / save form state (client-only shape). */
export type ProfileFormState = {
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
  birthDate: string;
  /** Empty string = not selected */
  gender: string;
  desiredPartnerGenders: MeProfileGender[];
  city: string;
  country: string;
  locationLabel: string;
};

export function emptyProfileFormState(): ProfileFormState {
  return {
    aboutMe: '',
    aboutPartner: '',
    aboutRelationship: '',
    birthDate: '',
    gender: '',
    desiredPartnerGenders: [],
    city: '',
    country: '',
    locationLabel: '',
  };
}

/** True when there is nothing meaningful to persist (all blanks). */
export function isProfileFormEmpty(s: ProfileFormState): boolean {
  return (
    !s.aboutMe.trim() &&
    !s.aboutPartner.trim() &&
    !s.aboutRelationship.trim() &&
    !s.birthDate.trim() &&
    !s.gender.trim() &&
    s.desiredPartnerGenders.length === 0 &&
    !s.city.trim() &&
    !s.country.trim() &&
    !s.locationLabel.trim()
  );
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const d = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}

export function profileToFormFields(p: MeProfileDto): ProfileFormState {
  const allowed = new Set<string>(ME_PROFILE_GENDERS);
  const genders = (p.desiredPartnerGenders ?? []).filter(
    (x): x is MeProfileGender => typeof x === 'string' && allowed.has(x),
  );
  return {
    aboutMe: p.aboutMe ?? '',
    aboutPartner: p.aboutPartner ?? '',
    aboutRelationship: p.aboutRelationship ?? '',
    birthDate: toDateInputValue(p.birthDate ?? null),
    gender: p.gender ?? '',
    desiredPartnerGenders: genders,
    city: p.city ?? '',
    country: p.country ?? '',
    locationLabel: p.locationLabel ?? '',
  };
}

export function buildCreatePayload(s: ProfileFormState): CreateMeProfileBody {
  return {
    aboutMe: s.aboutMe.trim() ? s.aboutMe : null,
    aboutPartner: s.aboutPartner.trim() ? s.aboutPartner.trim() : null,
    aboutRelationship: s.aboutRelationship.trim()
      ? s.aboutRelationship.trim()
      : null,
    birthDate: s.birthDate.trim() ? s.birthDate.trim() : null,
    gender: (s.gender || null) as MeProfileGender | null,
    desiredPartnerGenders:
      s.desiredPartnerGenders.length > 0 ? s.desiredPartnerGenders : null,
    city: s.city.trim() ? s.city.trim() : null,
    country: s.country.trim() ? s.country.trim() : null,
    locationLabel: s.locationLabel.trim() ? s.locationLabel.trim() : null,
  };
}

export function buildPatchPayload(s: ProfileFormState): PatchMeProfileBody {
  return buildCreatePayload(s);
}

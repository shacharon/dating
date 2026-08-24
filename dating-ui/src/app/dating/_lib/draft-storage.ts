import type { MeProfileGender } from '@/lib/api/me-profile-api';
import { ME_PROFILE_GENDERS } from '@/lib/api/me-profile-api';
import {
  emptyProfileFormState,
  isProfileFormEmpty,
} from '@/lib/profile/profile-form';
import type { ProfileDraft } from './types';

const STORAGE_KEY = 'dating-onboarding-draft';

const emptyDraft = (): ProfileDraft => emptyProfileFormState();

function parsePartnerGenders(raw: unknown): MeProfileGender[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const allowed = new Set<string>(ME_PROFILE_GENDERS);
  return raw.filter(
    (x): x is MeProfileGender => typeof x === 'string' && allowed.has(x),
  );
}

function parseDraft(raw: string): ProfileDraft {
  const base = emptyProfileFormState();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...base,
      aboutMe: typeof parsed.aboutMe === 'string' ? parsed.aboutMe : base.aboutMe,
      aboutPartner:
        typeof parsed.aboutPartner === 'string'
          ? parsed.aboutPartner
          : base.aboutPartner,
      aboutRelationship:
        typeof parsed.aboutRelationship === 'string'
          ? parsed.aboutRelationship
          : base.aboutRelationship,
      birthDate:
        typeof parsed.birthDate === 'string' ? parsed.birthDate : base.birthDate,
      gender: typeof parsed.gender === 'string' ? parsed.gender : base.gender,
      desiredPartnerGenders: parsePartnerGenders(parsed.desiredPartnerGenders),
      city: typeof parsed.city === 'string' ? parsed.city : base.city,
      country:
        typeof parsed.country === 'string' ? parsed.country : base.country,
      locationLabel:
        typeof parsed.locationLabel === 'string'
          ? parsed.locationLabel
          : base.locationLabel,
    };
  } catch {
    return base;
  }
}

/** Read the in-browser profile draft. Safe on server (returns empty strings). */
export function getDraft(): ProfileDraft {
  if (typeof window === 'undefined') return emptyDraft();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyDraft();
  return parseDraft(raw);
}

/** Persist the profile draft (onboarding / profile edit flow). */
export function saveDraft(draft: ProfileDraft): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

/** Clear stored draft (e.g. reset flow); no-op on server. */
export function clearDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function isDraftMeaningfullyEmpty(draft: ProfileDraft): boolean {
  return isProfileFormEmpty(draft);
}

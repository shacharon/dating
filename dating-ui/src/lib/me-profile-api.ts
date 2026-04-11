/**
 * Authenticated product profile: GET / POST / PATCH `/api/v1/me/profile` (session cookie).
 */

import { getApiBase } from '@/lib/api-base';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

/** Matches dating-api `ProfileGender` enum (product profile). */
export type MeProfileGender =
  | 'MALE'
  | 'FEMALE'
  | 'NON_BINARY'
  | 'OTHER'
  | 'PREFER_NOT_TO_SAY';

export const ME_PROFILE_GENDERS: readonly MeProfileGender[] = [
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'OTHER',
  'PREFER_NOT_TO_SAY',
] as const;

/** Openness to match; excludes `PREFER_NOT_TO_SAY` (not meaningful for partner filters). */
export const ME_PARTNER_GENDER_CHOICES: readonly MeProfileGender[] = [
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'OTHER',
];

export interface MeProfileDto {
  id: string;
  userId: string;
  status: string;
  onboardingStep: number;
  aboutMe: string | null;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  birthDate?: string | null;
  gender?: MeProfileGender | null;
  desiredPartnerGenders?: MeProfileGender[] | null;
  city?: string | null;
  country?: string | null;
  locationLabel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeProfileBody {
  aboutMe?: string | null;
  aboutPartner?: string | null;
  aboutRelationship?: string | null;
  onboardingStep?: number;
  birthDate?: string | null;
  gender?: MeProfileGender | null;
  desiredPartnerGenders?: MeProfileGender[] | null;
  city?: string | null;
  country?: string | null;
  locationLabel?: string | null;
}

export type PatchMeProfileBody = CreateMeProfileBody;

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

const credFetch = {
  credentials: 'include' as const,
};

function apiUnreachableMessage(base: string, path: string): string {
  const hint =
    base === ""
      ? 'Start dating-api on port 3001 (or set API_PROXY_TARGET in next.config env). Requests use same-origin /api via Next rewrites.'
      : 'Start dating-api, confirm NEXT_PUBLIC_API_URL, and if the UI uses another hostname than the API, add that origin to dating-api CORS_ORIGIN.';
  return `Network error calling ${base || "(same-origin)"}${path}. ${hint}`;
}

/**
 * Loads the signed-in user's profile. `404` means no profile row yet.
 */
export async function fetchMyProfile(): Promise<MeProfileDto | null> {
  const base = getApiBase();
  const path = '/api/v1/me/profile';
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'GET',
      ...credFetch,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`GET /api/v1/me/profile failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MeProfileDto>(res);
}

export async function createMyProfile(body: CreateMeProfileBody): Promise<MeProfileDto> {
  const base = getApiBase();
  const path = '/api/v1/me/profile';
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      ...credFetch,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `POST /api/v1/me/profile failed: ${res.status} ${errBody || res.statusText}`,
    );
  }
  return readJson<MeProfileDto>(res);
}

export async function patchMyProfile(body: PatchMeProfileBody): Promise<MeProfileDto> {
  const base = getApiBase();
  const path = '/api/v1/me/profile';
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'PATCH',
      ...credFetch,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `PATCH /api/v1/me/profile failed: ${res.status} ${errBody || res.statusText}`,
    );
  }
  return readJson<MeProfileDto>(res);
}

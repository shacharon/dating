/**
 * Authenticated product profile: GET / POST / PATCH `/api/v1/me/profile`, and
 * POST `/api/v1/me/profile/submit` (session cookie).
 */

import { getApiBase } from '@/lib/api-base';
import {
  emitProductLog,
  getObservabilityRoute,
} from '@/lib/observability/product-logger';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

function profileWriteErrorMessage(
  method: 'POST' | 'PATCH',
  status: number,
  errBody: string,
): string {
  try {
    const parsed = JSON.parse(errBody) as {
      error?: string;
      message?: string;
      details?: { field?: string; suggestion?: string; category?: string };
    };
    if (parsed.error === 'nickname_taken') {
      return 'This nickname is already taken. Choose a different one or leave it blank.';
    }
    if (parsed.error === 'profile_edit_blocked') {
      return (
        parsed.message ??
        'Profile editing is currently restricted due to previous content violations.'
      );
    }
    if (parsed.error === 'content_moderation_failed') {
      const field = parsed.details?.field;
      const suggestion = parsed.details?.suggestion;
      const base =
        parsed.message ?? 'Your profile contains inappropriate content';
      if (field && suggestion) {
        return `${base} (${field}: ${suggestion})`;
      }
      if (suggestion) return `${base} ${suggestion}`;
      return base;
    }
    if (parsed.message) return parsed.message;
  } catch {
    // fall through
  }
  return `${method} /api/v1/me/profile failed: ${status} ${errBody || ''}`.trim();
}

/** Expected product policy responses — log without console.error (avoids Next.js overlay). */
function isExpectedProfileWriteFailure(status: number, errBody: string): boolean {
  if (status !== 400 && status !== 403) return false;
  try {
    const parsed = JSON.parse(errBody) as { error?: string };
    const code = parsed.error;
    return (
      code === 'content_moderation_failed' ||
      code === 'profile_edit_blocked' ||
      code === 'nickname_taken'
    );
  } catch {
    return false;
  }
}

// ─── Profile Types ────────────────────────────────────────────────────────────

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
export type MePartnerGenderChoice = Exclude<
  MeProfileGender,
  'PREFER_NOT_TO_SAY'
>;

export const ME_PARTNER_GENDER_CHOICES: readonly MePartnerGenderChoice[] = [
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'OTHER',
];

/** Mirrors dating-api `UserProfileOnboardingStep`. */
export type MeProfileOnboardingStep = 'BASIC' | 'TEXTS' | 'COMPLETED';

export type InferredDealbreakerDto = {
  tag: string;
  classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE';
  evidence: string;
  confidence: number;
};

export interface MeProfileDto {
  id: string;
  userId: string;
  status: string;
  onboardingStep: MeProfileOnboardingStep;
  nickname?: string | null;
  onboardingCompletedAt?: string | null;
  aboutMe: string | null;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  birthDate?: string | null;
  gender?: MeProfileGender | null;
  desiredPartnerGenders?: MeProfileGender[] | null;
  city?: string | null;
  country?: string | null;
  locationLabel?: string | null;
  submittedAt?: string | null;
  analyzedAt?: string | null;
  lastAnalysisError?: string | null;
  createdAt: string;
  updatedAt: string;
  partnerAgeMin?: number | null;
  partnerAgeMax?: number | null;
  maxDistanceKm?: number | null;
  inferredDealbreakers?: InferredDealbreakerDto[];
}

export interface CreateMeProfileBody {
  aboutMe?: string | null;
  aboutPartner?: string | null;
  aboutRelationship?: string | null;
  onboardingStep?: MeProfileOnboardingStep;
  nickname?: string | null;
  birthDate?: string | null;
  gender?: MeProfileGender | null;
  desiredPartnerGenders?: MeProfileGender[] | null;
  city?: string | null;
  country?: string | null;
  locationLabel?: string | null;
  partnerAgeMin?: number | null;
  partnerAgeMax?: number | null;
  maxDistanceKm?: number | null;
}

export type PatchMeProfileBody = CreateMeProfileBody;

export type MeProfileSubmitResult = {
  analysisJobId: string;
  profile: MeProfileDto;
};

// ─── Shared Utilities ─────────────────────────────────────────────────────────

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

// ─── Profile API Functions ────────────────────────────────────────────────────

/**
 * Loads the signed-in user's profile. `404` means no profile row yet.
 */
export async function fetchMyProfile(): Promise<MeProfileDto | null> {
  const base = getApiBase();
  const path = '/api/v1/me/profile';
  const route = getObservabilityRoute();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'GET',
      ...credFetch,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch {
    emitProductLog({
      level: 'error',
      route,
      message: 'GET /api/v1/me/profile network failure',
      errorCode: UiErrorCodes.UI_PROFILE_GET_NETWORK,
      meta: { path },
    });
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 404) {
    emitProductLog({
      level: 'trace',
      route,
      message: 'GET /api/v1/me/profile no row (404)',
      errorCode: UiErrorCodes.UI_PROFILE_GET_EMPTY,
    });
    return null;
  }
  if (!res.ok) {
    emitProductLog({
      level: 'error',
      route,
      message: `GET /api/v1/me/profile failed ${res.status}`,
      errorCode: UiErrorCodes.UI_PROFILE_GET_FAIL,
      meta: { status: res.status, path },
    });
    throw new Error(`GET /api/v1/me/profile failed: ${res.status} ${res.statusText}`);
  }
  const dto = await readJson<MeProfileDto>(res);
  emitProductLog({
    level: 'trace',
    route,
    message: 'GET /api/v1/me/profile success',
    errorCode: UiErrorCodes.UI_PROFILE_GET_OK,
    meta: { profileId: dto.id },
  });
  return dto;
}

export async function createMyProfile(body: CreateMeProfileBody): Promise<MeProfileDto> {
  const base = getApiBase();
  const path = '/api/v1/me/profile';
  const route = getObservabilityRoute();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      ...credFetch,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
  } catch {
    emitProductLog({
      level: 'error',
      route,
      message: 'POST /api/v1/me/profile network failure',
      errorCode: UiErrorCodes.UI_PROFILE_CREATE_NETWORK,
    });
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    const errBody = await res.text();
    const expected = isExpectedProfileWriteFailure(res.status, errBody);
    emitProductLog({
      level: expected ? 'trace' : 'error',
      route,
      message: `POST /api/v1/me/profile failed ${res.status}`,
      errorCode: UiErrorCodes.UI_PROFILE_CREATE_FAIL,
      meta: { status: res.status, bodyPreview: errBody.slice(0, 500) },
    });
    throw new Error(profileWriteErrorMessage('POST', res.status, errBody));
  }
  const dto = await readJson<MeProfileDto>(res);
  emitProductLog({
    level: 'trace',
    route,
    message: 'POST /api/v1/me/profile success',
    errorCode: UiErrorCodes.UI_PROFILE_CREATE_OK,
    meta: { profileId: dto.id },
  });
  return dto;
}

export async function patchMyProfile(body: PatchMeProfileBody): Promise<MeProfileDto> {
  const base = getApiBase();
  const path = '/api/v1/me/profile';
  const route = getObservabilityRoute();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'PATCH',
      ...credFetch,
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
  } catch {
    emitProductLog({
      level: 'error',
      route,
      message: 'PATCH /api/v1/me/profile network failure',
      errorCode: UiErrorCodes.UI_PROFILE_PATCH_NETWORK,
    });
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    const errBody = await res.text();
    const expected = isExpectedProfileWriteFailure(res.status, errBody);
    emitProductLog({
      level: expected ? 'trace' : 'error',
      route,
      message: `PATCH /api/v1/me/profile failed ${res.status}`,
      errorCode: UiErrorCodes.UI_PROFILE_PATCH_FAIL,
      meta: { status: res.status, bodyPreview: errBody.slice(0, 500) },
    });
    throw new Error(profileWriteErrorMessage('PATCH', res.status, errBody));
  }
  const dto = await readJson<MeProfileDto>(res);
  emitProductLog({
    level: 'trace',
    route,
    message: 'PATCH /api/v1/me/profile success',
    errorCode: UiErrorCodes.UI_PROFILE_PATCH_OK,
    meta: { profileId: dto.id },
  });
  return dto;
}

/**
 * Submits the current user's profile for analysis (Phase 3 product flow).
 * Calls `POST /api/v1/me/profile/submit` — returns 202 + analysisJobId; analysis runs async.
 * Uses session cookies (`credentials: 'include'`).
 */
export async function submitMyProfileForAnalysis(): Promise<MeProfileSubmitResult> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/submit';
  const route = getObservabilityRoute();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      ...credFetch,
      headers: JSON_HEADERS,
      body: '{}',
    });
  } catch {
    emitProductLog({
      level: 'error',
      route,
      message: 'POST /api/v1/me/profile/submit network failure',
      errorCode: UiErrorCodes.UI_PROFILE_SUBMIT_NETWORK,
      meta: { path },
    });
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    const errBody = await res.text();
    emitProductLog({
      level: 'error',
      route,
      message: `POST /api/v1/me/profile/submit failed ${res.status}`,
      errorCode: UiErrorCodes.UI_PROFILE_SUBMIT_FAIL,
      meta: { status: res.status, bodyPreview: errBody.slice(0, 500) },
    });
    let detail = errBody;
    try {
      const parsed = JSON.parse(errBody) as { message?: string };
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        detail = parsed.message;
      }
    } catch {
      /* keep raw */
    }
    throw new Error(
      `POST /api/v1/me/profile/submit failed: ${res.status} ${detail || res.statusText}`,
    );
  }
  const body = await readJson<
    MeProfileSubmitResult | MeProfileDto
  >(res);
  // Back-compat: older servers returned the profile DTO alone.
  const result: MeProfileSubmitResult =
    body && typeof body === 'object' && 'profile' in body && 'analysisJobId' in body
      ? (body as MeProfileSubmitResult)
      : {
          analysisJobId: 'legacy',
          profile: body as MeProfileDto,
        };
  emitProductLog({
    level: 'trace',
    route,
    message: 'POST /api/v1/me/profile/submit success',
    errorCode: UiErrorCodes.UI_PROFILE_SUBMIT_OK,
    meta: {
      profileId: result.profile.id,
      status: result.profile.status,
      analysisJobId: result.analysisJobId,
    },
  });
  return result;
}

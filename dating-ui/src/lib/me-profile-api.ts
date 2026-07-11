/**
 * Authenticated product profile: GET / POST / PATCH `/api/v1/me/profile`, and
 * POST `/api/v1/me/profile/submit`, and GET `/api/v1/me/profile/analysis/latest` (session cookie).
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
    };
    if (parsed.error === 'nickname_taken') {
      return 'This nickname is already taken. Choose a different one or leave it blank.';
    }
    if (parsed.message) return parsed.message;
  } catch {
    // fall through
  }
  return `${method} /api/v1/me/profile failed: ${status} ${errBody || ''}`.trim();
}

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

export type InferredDealbreakerDto = {
  tag: string;
  classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE';
  evidence: string;
  confidence: number;
};

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

/** Latest product analysis snapshot (`UserProfileEvaluation` on the API). */
export interface MeLatestAnalysisDto {
  userProfileId: string;
  evaluationId: string | null;
  createdAt: string | null;
  evaluationJson: unknown | null;
}

export type MeProfilePhotoStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MeProfilePhotoDto {
  id: string;
  profileId: string;
  storageKey: string;
  originalFileName: string | null;
  mimeType: string;
  sizeBytes: number;
  position: number;
  isPrimary: boolean;
  status: MeProfilePhotoStatus;
  moderationProvider: string | null;
  moderationResultJson: unknown | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

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
    emitProductLog({
      level: 'error',
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
    emitProductLog({
      level: 'error',
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
 * Calls `POST /api/v1/me/profile/submit` — transitions to SUBMITTED and triggers
 * server-side analysis; `UserProfileEvaluation` is written when analysis completes.
 * Uses session cookies (`credentials: 'include'`).
 */
export async function submitMyProfileForAnalysis(): Promise<MeProfileDto> {
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
  const dto = await readJson<MeProfileDto>(res);
  emitProductLog({
    level: 'trace',
    route,
    message: 'POST /api/v1/me/profile/submit success',
    errorCode: UiErrorCodes.UI_PROFILE_SUBMIT_OK,
    meta: { profileId: dto.id, status: dto.status },
  });
  return dto;
}

// ─── Matches (Phase 3 Step 5 / Step 6) ───────────────────────────────────────

/** One match candidate from `GET /api/v1/me/matches`. */
/** Chips + one-line reason from the match engine. Null when evaluation is missing. */
export interface MatchExplainabilityDto {
  positiveChips: string[];
  /** Present only when friction >= 3 and a tension driver exists. */
  tensionChip?: string;
  reasonShort: string;
}

/** User-facing takeaway from the match engine. Null when evaluation is missing. */
export interface MatchRecommendationDto {
  explainability: MatchExplainabilityDto;
  primaryTakeaway: string;
  caution?: string;
  suggestedNextAction: string;
}

/** Deterministic compatibility trait from `explainability.positiveChips` (detail only). */
export interface MatchExplanationTrait {
  group: string;
  label: string;
  evidence: string;
  strength: 'strong' | 'moderate';
}

export type HardBlockDirection = 'viewer_to_them' | 'them_to_viewer';

export type HardBlockReasonDto = {
  code: string;
  dimension: string;
  direction: HardBlockDirection;
  message: string;
  evidence?: {
    viewerQuote?: string;
    counterpartyQuote?: string;
  };
};

export type HardBlockedDto = {
  disabled: true;
  reasons: HardBlockReasonDto[];
};

export interface MeMatchItemDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  hasEvaluation: boolean;
  /** Engine final score 0–100. Null when either profile lacks a valid evaluation. */
  matchScore: number | null;
  /** True when profile text changed after latest analysis (profile.updatedAt > evaluation.createdAt). */
  profileAnalysisStale?: boolean;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /** Relative path to primary photo file endpoint; null when absent. */
  primaryPhotoUrl?: string | null;
  yourAction?: 'LIKE' | 'PASS' | 'BLOCK' | null;
  /** Present when hard-ineligible but already Liked / mutual with the viewer. */
  hardBlocked?: HardBlockedDto;
}

/** Full response shape of `GET /api/v1/me/matches`. */
export interface MeMatchesListDto {
  status: 'ready' | 'not_ready';
  /** Present when `status = 'not_ready'`. */
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  viewerProfileId?: string;
  viewerGender?: string | null;
  viewerAcceptedPartnerGenders?: string[] | null;
  /**
   * Present when `status = 'ready'`. True when the viewer profile changed after their latest analysis.
   */
  viewerProfileAnalysisStale?: boolean;
  totalCandidatesBeforeFilter?: number;
  matches?: MeMatchItemDto[];
}

/** Response shape of `GET /api/v1/me/matches/:id`. */
export interface MeMatchDetailDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  hasEvaluation: boolean;
  /** Curated `display.summary` from the candidate's evaluation; null when absent. */
  evaluationSummary: string | null;
  /** Engine final score 0–100. Null when either profile lacks a valid evaluation. */
  matchScore: number | null;
  /** True when profile text changed after latest analysis (profile.updatedAt > evaluation.createdAt). */
  profileAnalysisStale?: boolean;
  /** Present when engine returned scored explainability with mapped positive chips. */
  matchExplanationTraits?: MatchExplanationTrait[];
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /** Relative path to primary photo file endpoint; null when absent. */
  primaryPhotoUrl?: string | null;
  /** Present when hard-ineligible but already Liked / mutual with the viewer. */
  hardBlocked?: HardBlockedDto;
}

/**
 * Returns the authenticated user's gender-filtered match list.
 * When the user has no analyzed profile the API returns `{ status: 'not_ready' }` (200),
 * which this function passes through — it does NOT throw.
 */
export async function fetchMyMatches(): Promise<MeMatchesListDto> {
  const base = getApiBase();
  const path = '/api/v1/me/matches';
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
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MeMatchesListDto>(res);
}

/**
 * Returns detail for a single match candidate by their `UserProfile.id`.
 * Throws with message `'Match not found.'` on 404 (candidate absent or gender-ineligible).
 */
export async function fetchMyMatchById(id: string): Promise<MeMatchDetailDto> {
  const base = getApiBase();
  const path = `/api/v1/me/matches/${encodeURIComponent(id)}`;
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
  captureRequestIdFromResponse(res);
  if (res.status === 404) {
    throw new Error('Match not found.');
  }
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MeMatchDetailDto>(res);
}

/** Response shape of `POST /api/v1/me/matches/:id/actions`. */
export interface MatchActionDto {
  id: string;
  actorUserId: string;
  targetUserId: string;
  targetProfileIdSnapshot: string;
  action: 'LIKE' | 'PASS' | 'BLOCK';
  createdAt: string;
  mutualMatch: boolean;
  conversationId: string | null;
}

async function recordMatchAction(
  profileId: string,
  action: 'LIKE' | 'PASS' | 'BLOCK',
): Promise<MatchActionDto> {
  const base = getApiBase();
  const path = `/api/v1/me/matches/${encodeURIComponent(profileId)}/actions`;
  const loginMessages: Record<typeof action, string> = {
    LIKE: 'You must be logged in to like a match.',
    PASS: 'You must be logged in to pass on a match.',
    BLOCK: 'You must be logged in to block a match.',
  };
  const failureMessages: Record<typeof action, string> = {
    LIKE: 'Could not like this match.',
    PASS: 'Could not pass on this match.',
    BLOCK: 'Could not block this match.',
  };
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      ...credFetch,
      headers: JSON_HEADERS,
      body: JSON.stringify({ action }),
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 401) {
    throw new Error(loginMessages[action]);
  }
  if (res.status === 404) {
    throw new Error('Match not found.');
  }
  if (res.status === 400) {
    const errBody = await res.text();
    try {
      const parsed = JSON.parse(errBody) as { message?: string | string[] };
      const msg = parsed.message;
      if (typeof msg === 'string') throw new Error(msg);
      if (Array.isArray(msg)) throw new Error(msg.join(', '));
    } catch (e) {
      if (e instanceof Error && e.message !== errBody) throw e;
    }
    throw new Error(failureMessages[action]);
  }
  if (!res.ok) {
    throw new Error(`POST ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MatchActionDto>(res);
}

/** Records a LIKE action toward a match candidate by their `UserProfile.id`. */
export async function likeMatch(profileId: string): Promise<MatchActionDto> {
  return recordMatchAction(profileId, 'LIKE');
}

/** Records a PASS action toward a match candidate by their `UserProfile.id`. */
export async function passMatch(profileId: string): Promise<MatchActionDto> {
  return recordMatchAction(profileId, 'PASS');
}

/** Permanently blocks a match candidate by their `UserProfile.id`. Cannot be undone. */
export async function blockMatch(profileId: string): Promise<MatchActionDto> {
  return recordMatchAction(profileId, 'BLOCK');
}

/**
 * Removes the viewer's LIKE or PASS toward a match candidate. BLOCK cannot be undone.
 */
export async function undoMatchAction(profileId: string): Promise<void> {
  const base = getApiBase();
  const path = `/api/v1/me/matches/${encodeURIComponent(profileId)}/actions`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'DELETE',
      ...credFetch,
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 401) {
    throw new Error('You must be logged in to undo a match action.');
  }
  if (res.status === 403 || res.status === 400) {
    const errBody = await res.text();
    try {
      const parsed = JSON.parse(errBody) as { message?: string | string[] };
      const msg = parsed.message;
      if (typeof msg === 'string') throw new Error(msg);
      if (Array.isArray(msg)) throw new Error(msg.join(', '));
    } catch (e) {
      if (e instanceof Error && e.message !== errBody) throw e;
    }
    throw new Error('Could not undo this match action.');
  }
  if (res.status === 404) {
    throw new Error('No action to undo.');
  }
  if (res.status !== 204) {
    throw new Error(`DELETE ${path} failed: ${res.status} ${res.statusText}`);
  }
}

/** Response shape of `GET /api/v1/me/matches/:id/actions`. */
export interface MatchActionStateDto {
  action: 'LIKE' | 'PASS' | 'BLOCK' | null;
  createdAt?: string;
  mutualMatch: boolean;
  conversationId: string | null;
}

/**
 * Returns the viewer's current action toward a match candidate, if any.
 */
export async function fetchMatchAction(
  profileId: string,
): Promise<MatchActionStateDto> {
  const base = getApiBase();
  const path = `/api/v1/me/matches/${encodeURIComponent(profileId)}/actions`;
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
  captureRequestIdFromResponse(res);
  if (res.status === 404) {
    throw new Error('Match not found.');
  }
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MatchActionStateDto>(res);
}

/** Response shape of `GET /api/v1/me/matches/:id/feedback`. */
export interface MatchFeedbackStateDto {
  sentiment: 'POSITIVE' | 'NEGATIVE' | null;
}

/** Response shape of `PUT /api/v1/me/matches/:id/feedback`. */
export interface MatchFeedbackDto {
  matchProfileId: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns the viewer's quality feedback for a match candidate, if any.
 */
export async function fetchMatchFeedback(
  profileId: string,
): Promise<MatchFeedbackStateDto> {
  const base = getApiBase();
  const path = `/api/v1/me/matches/${encodeURIComponent(profileId)}/feedback`;
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
  captureRequestIdFromResponse(res);
  if (res.status === 401) {
    throw new Error('You must be logged in to view match feedback.');
  }
  if (res.status === 404) {
    throw new Error('Match not found.');
  }
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MatchFeedbackStateDto>(res);
}

/**
 * Records thumbs up/down quality feedback for a match candidate.
 */
export async function upsertMatchFeedback(
  profileId: string,
  sentiment: 'positive' | 'negative',
): Promise<MatchFeedbackDto> {
  const base = getApiBase();
  const path = `/api/v1/me/matches/${encodeURIComponent(profileId)}/feedback`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'PUT',
      ...credFetch,
      headers: JSON_HEADERS,
      body: JSON.stringify({ sentiment }),
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 401) {
    throw new Error('You must be logged in to submit match feedback.');
  }
  if (res.status === 404) {
    throw new Error('Match not found.');
  }
  if (res.status === 400) {
    const errBody = await res.text();
    try {
      const parsed = JSON.parse(errBody) as {
        error?: string;
        message?: string | string[];
      };
      if (parsed.error === 'cannot_feedback_self') {
        throw new Error('You cannot submit feedback on your own profile.');
      }
      const msg = parsed.message;
      if (typeof msg === 'string') throw new Error(msg);
      if (Array.isArray(msg)) throw new Error(msg.join(', '));
    } catch (e) {
      if (e instanceof Error && e.message !== errBody) throw e;
    }
    throw new Error('Could not submit match feedback.');
  }
  if (!res.ok) {
    throw new Error(`PUT ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MatchFeedbackDto>(res);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Latest persisted analysis for the current user (product `UserProfileEvaluation` row).
 * `GET /api/v1/me/profile/analysis/latest`
 *
 * Returns `null` when the user has no profile yet (404) — callers should redirect to onboarding.
 */
export async function fetchMyLatestAnalysis(): Promise<MeLatestAnalysisDto | null> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/analysis/latest';
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
      message: 'GET /api/v1/me/profile/analysis/latest network failure',
      errorCode: UiErrorCodes.UI_PROFILE_ANALYSIS_LATEST_NETWORK,
      meta: { path },
    });
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 404) {
    emitProductLog({
      level: 'trace',
      route,
      message: 'GET /api/v1/me/profile/analysis/latest 404 (no profile yet)',
      errorCode: UiErrorCodes.UI_PROFILE_ANALYSIS_LATEST_FAIL,
      meta: { path, status: 404 },
    });
    return null;
  }
  if (!res.ok) {
    const errBody = await res.text();
    emitProductLog({
      level: 'error',
      route,
      message: `GET /api/v1/me/profile/analysis/latest failed ${res.status}`,
      errorCode: UiErrorCodes.UI_PROFILE_ANALYSIS_LATEST_FAIL,
      meta: { status: res.status, bodyPreview: errBody.slice(0, 500) },
    });
    throw new Error(
      `GET /api/v1/me/profile/analysis/latest failed: ${res.status} ${errBody || res.statusText}`,
    );
  }
  const dto = await readJson<MeLatestAnalysisDto>(res);
  emitProductLog({
    level: 'trace',
    route,
    message: 'GET /api/v1/me/profile/analysis/latest success',
    errorCode: UiErrorCodes.UI_PROFILE_ANALYSIS_LATEST_OK,
    meta: {
      userProfileId: dto.userProfileId,
      hasEval: Boolean(dto.evaluationId),
    },
  });
  return dto;
}

export async function listMyProfilePhotos(): Promise<MeProfilePhotoDto[]> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/photos';
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
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MeProfilePhotoDto[]>(res);
}

export async function uploadMyProfilePhoto(file: File): Promise<MeProfilePhotoDto> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/photos';
  const form = new FormData();
  form.append('file', file);
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `POST ${path} failed: ${res.status} ${errText || res.statusText}`,
    );
  }
  return readJson<MeProfilePhotoDto>(res);
}

export async function deleteMyProfilePhoto(photoId: string): Promise<void> {
  const base = getApiBase();
  const path = `/api/v1/me/profile/photos/${encodeURIComponent(photoId)}`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'DELETE',
      ...credFetch,
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `DELETE ${path} failed: ${res.status} ${errText || res.statusText}`,
    );
  }
}

export async function setPrimaryMyProfilePhoto(
  photoId: string,
): Promise<MeProfilePhotoDto> {
  const base = getApiBase();
  const path = `/api/v1/me/profile/photos/${encodeURIComponent(photoId)}/primary`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'PATCH',
      ...credFetch,
      headers: JSON_HEADERS,
      body: '{}',
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `PATCH ${path} failed: ${res.status} ${errText || res.statusText}`,
    );
  }
  return readJson<MeProfilePhotoDto>(res);
}

export async function fetchMyProfilePhotoBlob(photoId: string): Promise<Blob> {
  const base = getApiBase();
  const path = `/api/v1/me/profile/photos/${encodeURIComponent(photoId)}/file`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'GET',
      ...credFetch,
      cache: 'no-store',
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.blob();
}

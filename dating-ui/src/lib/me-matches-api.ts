/**
 * Authenticated match operations: GET `/api/v1/me/matches`, like/pass/block/undo/feedback (session cookie).
 */

import { getApiBase } from '@/lib/api-base';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

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

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

// ─── Match Types ──────────────────────────────────────────────────────────────

/** Chips + one-line reason from the match engine. Null when evaluation is missing. */
export interface MatchExplainabilityDto {
  positiveChips: string[];
  /** Present only when friction >= 3 and a tension driver exists. */
  tensionChip?: string;
  reasonShort: string;
  /** Present when both profiles share at least one interest tag. */
  sharedInterestNote?: string;
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

/** One match candidate from `GET /api/v1/me/matches`. */
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
  /**
   * Sprint 41 — same as `matchScore` when finite; null when unscored.
   */
  priorityScore?: number | null;
  /** Sprint 41 — HIGH ≥85, GOOD ≥70, OTHER otherwise. */
  priorityTier?: 'HIGH' | 'GOOD' | 'OTHER';
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
  nextCursor?: string | null;
  hasMore?: boolean;
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
  /**
   * Sprint 22 — long-form grounded "why you match" narrative (detail only).
   * Omitted when unscored / absent; list responses never include this field.
   */
  matchNarrative?: string;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /** Relative path to primary photo file endpoint; null when absent. */
  primaryPhotoUrl?: string | null;
  /** Present when hard-ineligible but already Liked / mutual with the viewer. */
  hardBlocked?: HardBlockedDto;
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

/** Response shape of `GET /api/v1/me/matches/:id/actions`. */
export interface MatchActionStateDto {
  action: 'LIKE' | 'PASS' | 'BLOCK' | null;
  createdAt?: string;
  mutualMatch: boolean;
  conversationId: string | null;
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

// ─── Match API Functions ──────────────────────────────────────────────────────

/**
 * Returns the authenticated user's gender-filtered match list (cursor pagination).
 * When the user has no analyzed profile the API returns `{ status: 'not_ready' }` (200),
 * which this function passes through — it does NOT throw.
 */
export async function fetchMyMatches(opts?: {
  cursor?: string | null;
  limit?: number;
}): Promise<MeMatchesListDto> {
  const base = getApiBase();
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const path = `/api/v1/me/matches${qs ? `?${qs}` : ''}`;
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

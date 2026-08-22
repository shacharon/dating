/**
 * Authenticated match operations: GET `/api/v1/me/matches`, like/pass/block/undo/feedback.
 */

import { getApiBase } from '@/lib/api-base';
import type {
  MatchActionDto,
  MatchActionStateDto,
  MatchFeedbackDto,
  MatchFeedbackStateDto,
  MeMatchDetailDto,
  MeMatchesListDto,
} from '@/lib/api-types/matches';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import {
  JSON_HEADERS,
  apiUnreachableMessage,
  readJson,
} from '@/lib/api-sdk/internal';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';

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
    res = await authenticatedFetch(path, {
      method: 'GET',
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
    res = await authenticatedFetch(path, {
      method: 'GET',
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
    res = await authenticatedFetch(path, {
      method: 'POST',
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
    res = await authenticatedFetch(path, {
      method: 'DELETE',
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
    res = await authenticatedFetch(path, {
      method: 'GET',
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
    res = await authenticatedFetch(path, {
      method: 'GET',
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
    res = await authenticatedFetch(path, {
      method: 'PUT',
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

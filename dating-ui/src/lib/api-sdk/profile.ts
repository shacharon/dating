/**
 * Authenticated product profile: GET / POST / PATCH `/api/v1/me/profile`, submit.
 */

import { getApiBase } from '@/lib/api/api-base';
import type {
  CreateMeProfileBody,
  MeProfileDto,
  MeProfileSubmitResult,
  PatchMeProfileBody,
} from '@/lib/api-types/profile';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';
import {
  JSON_HEADERS,
  apiUnreachableMessage,
  readJson,
} from '@/lib/api-sdk/internal';
import { parseContentModerationErrorBody } from '@/lib/moderation/content-moderation-error';
import {
  emitProductLog,
  getObservabilityRoute,
} from '@/lib/observability/product-logger';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';

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

/**
 * Loads the signed-in user's profile. `404` means no profile row yet.
 */
export async function fetchMyProfile(): Promise<MeProfileDto | null> {
  const base = getApiBase();
  const path = '/api/v1/me/profile';
  const route = getObservabilityRoute();
  let res: Response;
  try {
    res = await authenticatedFetch(path, {
      method: 'GET',
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
    res = await authenticatedFetch(path, {
      method: 'POST',
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
    const moderationError = parseContentModerationErrorBody(res.status, errBody);
    if (moderationError) throw moderationError;
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
    res = await authenticatedFetch(path, {
      method: 'PATCH',
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
    const moderationError = parseContentModerationErrorBody(res.status, errBody);
    if (moderationError) throw moderationError;
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
 */
export async function submitMyProfileForAnalysis(): Promise<MeProfileSubmitResult> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/submit';
  const route = getObservabilityRoute();
  let res: Response;
  try {
    res = await authenticatedFetch(path, {
      method: 'POST',
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
  const body = await readJson<MeProfileSubmitResult | MeProfileDto>(res);
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

/**
 * Authenticated profile analysis: GET analysis status/results (session cookie).
 */

import { getApiBase } from '@/lib/api/api-base';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';
import {
  emitProductLog,
  getObservabilityRoute,
} from '@/lib/observability/product-logger';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';

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

// ─── Analysis Types ───────────────────────────────────────────────────────────

/** Latest product analysis snapshot (`UserProfileEvaluation` on the API). */
export interface MeLatestAnalysisDto {
  userProfileId: string;
  evaluationId: string | null;
  createdAt: string | null;
  evaluationJson: unknown | null;
}

export type AnalysisStatusDto = {
  status: 'pending' | 'processing' | 'complete' | 'failed';
  submittedAt: string | null;
  completedAt?: string | null;
  error?: string | null;
  profileStatus: string;
};

// ─── Analysis API Functions ───────────────────────────────────────────────────

/**
 * Returns the current analysis status for the authenticated user's profile.
 */
export async function fetchAnalysisStatus(): Promise<AnalysisStatusDto> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/analysis-status';
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
  return readJson<AnalysisStatusDto>(res);
}

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
    res = await authenticatedFetch(path, {
      method: 'GET',
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

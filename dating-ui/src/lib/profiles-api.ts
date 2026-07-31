/**
 * Internal admin/dev tool: profile list, detail, analyze, compare.
 * These endpoints are gated in production (admin-only or dev-only).
 */

import { getApiBase } from '@/lib/api-base';
import {
  emitProductLog,
  getObservabilityRoute,
} from '@/lib/observability/product-logger';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';
import type { Evaluation, ProfileTexts } from '@/lib/profile-types';

export type { Evaluation } from '@/lib/profile-types';

const API_BASE = getApiBase();

export interface ProfileListItem {
  id: string;
  name: string;
  savedAt: string;
}

export interface ProfilePayload {
  id: string;
  name: string;
  texts: ProfileTexts;
  evaluation?: Evaluation;
  savedAt: string;
}

/**
 * List all profiles (admin/dev only).
 */
export async function listProfiles(): Promise<ProfileListItem[]> {
  const route = '/api/v1/profiles';

  try {
    const res = await fetch(`${API_BASE}${route}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    captureRequestIdFromResponse(res);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (data?.ok && Array.isArray(data?.items)) {
      return data.items;
    }
    return [];
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'profiles_list_failed',
      errorCode: UiErrorCodes.PROFILES_LIST_FAILED,
      route: getObservabilityRoute(),
      meta: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Get profile by ID (admin/dev only).
 */
export async function getProfileById(id: string): Promise<ProfilePayload> {
  const route = `/api/v1/profiles/${encodeURIComponent(id)}`;

  try {
    const res = await fetch(`${API_BASE}${route}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    captureRequestIdFromResponse(res);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data?.ok || !data?.profile) {
      throw new Error('Profile not found.');
    }

    return data.profile;
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'profile_detail_failed',
      errorCode: UiErrorCodes.PROFILE_DETAIL_FAILED,
      route: getObservabilityRoute(),
      meta: {
        profileId: id,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Trigger profile analysis (admin/dev only).
 */
export async function analyzeProfile(id: string): Promise<{ ok: boolean; message?: string }> {
  const route = `/api/profiles/${encodeURIComponent(id)}/analyze`;

  try {
    const res = await fetch(`${API_BASE}${route}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    captureRequestIdFromResponse(res);

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        typeof data?.message === 'string'
          ? data.message
          : `Analyze failed (${res.status})`;
      throw new Error(msg);
    }

    return { ok: true, message: data?.message };
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'profile_analyze_failed',
      errorCode: UiErrorCodes.PROFILE_ANALYZE_FAILED,
      route: getObservabilityRoute(),
      meta: {
        profileId: id,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

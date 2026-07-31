/**
 * Internal admin/dev tool: match operations (list, detail, compare, auto, rebuild).
 * These endpoints are gated in production (admin-only or dev-only).
 */

import { getApiBase } from '@/lib/api-base';
import {
  emitProductLog,
  getObservabilityRoute,
} from '@/lib/observability/product-logger';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';

const API_BASE = getApiBase();

export interface MatchListItem {
  matchId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  finalScore: number;
  updatedAt: string;
}

interface CompareAlignment {
  key: string;
  pairScore: number;
}

interface CompareTension {
  key: string;
  gap: number;
  text: string;
}

export interface CompareResult {
  matchId?: string;
  aId?: string;
  bId?: string;
  a?: { id: string; name: string };
  b?: { id: string; name: string };
  status?: 'READY' | 'NOT_ANALYZED';
  message?: string;
  finalScore: number | null;
  aToB?: number | null;
  bToA?: number | null;
  relationshipStyle?: number | null;
  coverage?: number | null;
  frictionRisk?: number | null;
  compatibility?: number | null;
  friction?: number | null;
  coveragePercent?: number | null;
  coverageFactor?: number | null;
  alignments?: CompareAlignment[];
  tensions?: CompareTension[];
}

interface WhyTopEntry {
  key: string;
  text: string;
  direction: string;
}

interface TensionsTopEntry {
  key: string;
  text: string;
  gap: number;
  direction: string;
}

export interface MatchIndexItem {
  matchId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  finalScore: number;
  coverage: number;
  frictionRisk: number;
  whyTop: WhyTopEntry[];
  tensionsTop: TensionsTopEntry[];
  updatedAt: string;
}

export interface MatchIndex {
  generatedAt: string;
  profileCount: number;
  matchCount: number;
  items: MatchIndexItem[];
}

/**
 * List all matches (admin/dev only).
 */
export async function listMatches(): Promise<MatchListItem[]> {
  const route = '/api/v1/matches';

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
      message: 'matches_list_failed',
      errorCode: UiErrorCodes.MATCHES_LIST_FAILED,
      route: getObservabilityRoute(),
      meta: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Get match by ID (admin/dev only).
 */
export async function getMatchById(matchId: string): Promise<CompareResult> {
  const route = `/api/v1/matches/${encodeURIComponent(matchId)}`;

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
    if (!data?.ok || !data?.match) {
      throw new Error('Match not found.');
    }

    return {
      ...data.match,
      status: data.status ?? 'READY',
      message: typeof data?.message === 'string' ? data.message : undefined,
    };
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'match_detail_failed',
      errorCode: UiErrorCodes.MATCH_DETAIL_FAILED,
      route: getObservabilityRoute(),
      meta: {
        matchId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Compare two profiles (admin/dev only).
 */
export async function compareProfiles(
  aId: string,
  bId: string
): Promise<CompareResult> {
  const route = '/api/v1/matches/compare';

  try {
    const res = await fetch(`${API_BASE}${route}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ aId, bId }),
    });

    captureRequestIdFromResponse(res);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data?.ok || !data?.match) {
      throw new Error('Invalid response from server.');
    }

    return {
      ...data.match,
      status: data.status ?? 'READY',
      message: typeof data?.message === 'string' ? data.message : undefined,
    };
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'match_compare_failed',
      errorCode: UiErrorCodes.MATCH_COMPARE_FAILED,
      route: getObservabilityRoute(),
      meta: {
        aId,
        bId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Get auto matches index (admin/dev only).
 */
export async function getAutoMatches(): Promise<MatchIndex> {
  const route = '/api/v1/matches/auto';

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
    if (!data?.ok || !data?.index) {
      throw new Error(data?.message ?? 'Invalid response from server.');
    }

    return data.index;
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'match_auto_failed',
      errorCode: UiErrorCodes.MATCH_AUTO_FAILED,
      route: getObservabilityRoute(),
      meta: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Rebuild all matches (admin/dev only).
 */
export async function rebuildMatches(): Promise<{ ok: boolean; stats?: unknown }> {
  const route = '/api/v1/matches/rebuild';

  try {
    const res = await fetch(`${API_BASE}${route}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    captureRequestIdFromResponse(res);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data?.ok) {
      throw new Error('Invalid response from server.');
    }

    return { ok: true, stats: data.stats };
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'match_rebuild_failed',
      errorCode: UiErrorCodes.MATCH_REBUILD_FAILED,
      route: getObservabilityRoute(),
      meta: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

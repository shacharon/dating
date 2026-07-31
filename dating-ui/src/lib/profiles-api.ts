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

const API_BASE = getApiBase();

export interface ProfileListItem {
  id: string;
  name: string;
  savedAt: string;
}

interface ExtractionEvidenceItem {
  signal: string;
  quote: string;
  reason?: string;
}

type ExtractionDomainQualityStatus = 'OK' | 'LOW_DATA' | 'UNRELIABLE';

interface ExtractedSignals {
  domain: string;
  signals: Record<string, number | null>;
  evidence: ExtractionEvidenceItem[];
  confidence: number;
  domainStatus?: ExtractionDomainQualityStatus;
}

interface ProductScores {
  partnerFitScore: number;
  relationshipFitScore: number;
  coverageScore: number;
  frictionRiskScore: number;
  overallDecisionScore: number;
}

interface EvaluationChip {
  label: string;
  source: 'interest' | 'motivation' | 'trait' | 'signal' | 'enrichment';
}

interface ChipsBundle {
  self: EvaluationChip[];
  partner: EvaluationChip[];
  relationship: EvaluationChip[];
}

interface EnrichmentSignalsV1 {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  interestsTop3: string[];
}

interface EnrichmentV1 {
  version: 'v1';
  signals: EnrichmentSignalsV1;
}

interface ProductScoresPresentation {
  partnerFitScore: { kind: 'numeric'; value: number } | { kind: 'insufficient_data' };
  relationshipFitScore: { kind: 'numeric'; value: number } | { kind: 'insufficient_data' };
  coverageScore: { kind: 'numeric'; value: number } | { kind: 'insufficient_data' };
  frictionRiskScore: { kind: 'numeric'; value: number } | { kind: 'insufficient_data' };
  overallDecisionScore: { kind: 'numeric'; value: number } | { kind: 'insufficient_data' };
}

interface Evaluation {
  self: ExtractedSignals;
  partner: ExtractedSignals;
  relationship: ExtractedSignals;
  display: { summary: string; insight: string; note?: string };
  productScores: ProductScores;
  productScoresPresentation?: ProductScoresPresentation;
  flags: string[];
  chips?: ChipsBundle;
  enrichment?: EnrichmentV1;
}

export interface ProfilePayload {
  id: string;
  name: string;
  texts: { aboutMe: string; aboutPartner: string; aboutRelationship: string };
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
      route: getObservabilityRoute(route),
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
      route: getObservabilityRoute(route),
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
      route: getObservabilityRoute(route),
      meta: {
        profileId: id,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

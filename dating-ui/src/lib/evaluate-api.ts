/**
 * Internal admin/dev tool: trigger evaluation pipeline.
 */

import { getApiBase } from '@/lib/api-base';
import {
  emitProductLog,
  getObservabilityRoute,
} from '@/lib/observability/product-logger';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';

const API_BASE = getApiBase();

interface ExtractionEvidenceItem {
  signal: string;
  quote: string;
  reason?: string;
}

type ExtractionDomainQualityStatus = 'OK' | 'LOW_DATA' | 'UNRELIABLE';

export interface ExtractedSignals {
  domain: string;
  signals: Record<string, number | null>;
  evidence: ExtractionEvidenceItem[];
  version: string;
  confidence: number;
  notes?: string;
  domainStatus?: ExtractionDomainQualityStatus;
}

export interface EvaluateBatchResult {
  self: ExtractedSignals;
  partner: ExtractedSignals;
  relationship: ExtractedSignals;
  display: { summary: string; insight: string };
}

export interface EvaluatePayload {
  name: string;
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
  id?: string;
}

export interface EvaluateResult {
  profileId: string;
  evaluation: EvaluateBatchResult;
}

export interface AnalyzeV2Response {
  chips?: unknown;
}

/**
 * Trigger evaluation (admin/dev only).
 */
export async function triggerEvaluation(
  payload: EvaluatePayload
): Promise<EvaluateResult> {
  const route = '/api/v1/profiles/evaluate';

  try {
    const res = await fetch(`${API_BASE}${route}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    captureRequestIdFromResponse(res);

    let data: {
      profileId?: string;
      evaluation?: EvaluateBatchResult;
      message?: string;
    };

    try {
      data = await res.json();
    } catch {
      throw new Error(res.ok ? 'Invalid response.' : `Request failed (${res.status}).`);
    }

    if (!res.ok) {
      throw new Error(
        typeof data?.message === 'string' ? data.message : `Request failed (${res.status})`
      );
    }

    if (!data.profileId || !data.evaluation) {
      throw new Error('Invalid response from server.');
    }

    return {
      profileId: data.profileId,
      evaluation: data.evaluation,
    };
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'evaluation_trigger_failed',
      errorCode: UiErrorCodes.EVALUATION_TRIGGER_FAILED,
      route: getObservabilityRoute(route),
      meta: {
        payload,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/**
 * Fetch analyze-v2 chips for a profile (admin/dev only).
 */
export async function fetchAnalyzeV2Chips(profileId: string): Promise<AnalyzeV2Response> {
  const route = `/api/profiles/${encodeURIComponent(profileId)}/analyze-v2`;

  try {
    const res = await fetch(`${API_BASE}${route}`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    captureRequestIdFromResponse(res);

    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }

    const data = await res.json();
    return data as AnalyzeV2Response;
  } catch (error) {
    emitProductLog({
      level: 'error',
      message: 'evaluation_chips_failed',
      errorCode: UiErrorCodes.EVALUATION_CHIPS_FAILED,
      route: getObservabilityRoute(route),
      meta: {
        profileId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

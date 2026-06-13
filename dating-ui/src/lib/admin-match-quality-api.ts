import { getApiBase } from '@/lib/api-base';

export type MatchQualitySummary = {
  windowDays: number;
  windowStart: string;
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number | null;
  distinctReporters: number;
  distinctCandidates: number;
};

export type NegativeCandidateRow = {
  matchProfileId: string;
  negativeCount: number;
  distinctViewers: number;
  lastNegativeAt: string;
};

export type ListNegativeCandidatesResponse = {
  windowDays: number;
  items: NegativeCandidateRow[];
  total: number;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 20;

export async function getMatchQualitySummary(
  windowDays: number,
): Promise<MatchQualitySummary> {
  const base = getApiBase();
  const params = new URLSearchParams({ windowDays: String(windowDays) });
  const res = await fetch(
    `${base}/api/v1/admin/match-quality/summary?${params.toString()}`,
    { credentials: 'include', headers: { Accept: 'application/json' } },
  );
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`GET match quality summary failed: ${res.status}`);
  }
  return (await res.json()) as MatchQualitySummary;
}

export async function listNegativeCandidates(
  windowDays: number,
  limit: number = PAGE_SIZE,
  offset: number = 0,
): Promise<ListNegativeCandidatesResponse> {
  const base = getApiBase();
  const params = new URLSearchParams({
    windowDays: String(windowDays),
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(
    `${base}/api/v1/admin/match-quality/negative-candidates?${params.toString()}`,
    { credentials: 'include', headers: { Accept: 'application/json' } },
  );
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`GET negative candidates failed: ${res.status}`);
  }
  return (await res.json()) as ListNegativeCandidatesResponse;
}

export function formatPositiveRate(rate: number | null): string {
  if (rate === null) {
    return '—';
  }
  return `${(rate * 100).toFixed(1)}%`;
}

export const MATCH_QUALITY_RUNBOOK_DOC_PATH =
  'dating-api/docs/analytics/MATCH_QUALITY_RUNBOOK.md';

export type CandidateFeedbackSummary = {
  negativeCount: number;
  positiveCount: number;
  lastSentiment: 'POSITIVE' | 'NEGATIVE' | null;
};

export type MatchQualityAuditReport = {
  schemaVersion: 1;
  compare: { outcome: 'scored' | 'guard' };
  matchScore: number | null;
  viewer: { userId: string; profileId: string };
  explainability: {
    positiveChips: string[];
    reasonShort: string;
  } | null;
  recommendation: {
    primaryTakeaway: string;
    suggestedNextAction: string;
  } | null;
};

export type CandidateAuditResponse = {
  candidateProfileId: string;
  viewerUserId: string;
  windowDays: number;
  feedbackSummary: CandidateFeedbackSummary;
  audit: MatchQualityAuditReport | null;
  auditUnavailable?: {
    code: string;
    message: string;
  };
};

export async function getCandidateAudit(
  profileId: string,
  windowDays: number = 7,
  viewerUserId?: string,
): Promise<CandidateAuditResponse> {
  const base = getApiBase();
  const params = new URLSearchParams({ windowDays: String(windowDays) });
  if (viewerUserId?.trim()) {
    params.set('viewerUserId', viewerUserId.trim());
  }
  const res = await fetch(
    `${base}/api/v1/admin/match-quality/candidates/${encodeURIComponent(profileId)}/audit?${params.toString()}`,
    { credentials: 'include', headers: { Accept: 'application/json' } },
  );
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (res.status === 404) {
    throw new Error('candidate_not_found');
  }
  if (!res.ok) {
    throw new Error(`GET candidate audit failed: ${res.status}`);
  }
  return (await res.json()) as CandidateAuditResponse;
}

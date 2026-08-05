import { getApiBase } from '@/lib/api-base';

export type BetaMetricsDto = {
  generatedAt: string;
  betaStart: string;
  activeUsers7d: number;
  signupsSinceBetaStart: number;
  d7: {
    cohortSize: number;
    returnedCount: number;
    rate: number | null;
    advisory: boolean;
  };
  opener: {
    windowDays: 7;
    generated: number;
    displayed: number;
    used: number;
    sent: number;
    replied: number;
    usageRate: number | null;
    responseRate: number | null;
  };
  priorityShare: {
    highCount: number;
    goodCount: number;
    otherCount: number;
    scoredCount: number;
    highShare: number | null;
    goodShare: number | null;
    otherShare: number | null;
  };
  highPriorityEmails7d: number;
};

export function formatRatePct(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate * 1000) / 10}%`;
}

export async function fetchBetaMetrics(
  betaStart?: string,
): Promise<BetaMetricsDto> {
  const base = getApiBase();
  const params = new URLSearchParams();
  if (betaStart?.trim()) params.set('betaStart', betaStart.trim());
  const qs = params.toString();
  const res = await fetch(
    `${base}/api/v1/admin/beta-metrics${qs ? `?${qs}` : ''}`,
    { credentials: 'include', headers: { Accept: 'application/json' } },
  );
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`GET beta metrics failed: ${res.status}`);
  }
  return (await res.json()) as BetaMetricsDto;
}

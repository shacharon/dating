'use client';

// Internal English-only — admin tools are not product-localized.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchBetaMetrics,
  formatRatePct,
  type BetaMetricsDto,
} from '@/lib/admin-beta-metrics-api';

function MetricCard({
  title,
  value,
  hint,
  testId,
}: {
  title: string;
  value: string;
  hint?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AdminBetaMetricsPageClient() {
  const [data, setData] = useState<BetaMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchBetaMetrics());
    } catch (e) {
      if (e instanceof Error && e.message === 'admin_forbidden') {
        setError('You are not authorized to view beta metrics.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load beta metrics');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="mb-4">
        <Link
          href="/admin"
          className="text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          ← Admin
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Beta metrics
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Postgres KPIs for Monday review. Definitions:{' '}
        <code className="text-xs">dating-api/docs/beta/</code>
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="beta-metrics-refresh"
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          disabled={loading}
          onClick={() => void load()}
        >
          Refresh
        </button>
        {data ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Updated {new Date(data.generatedAt).toLocaleString()} · betaStart{' '}
            {new Date(data.betaStart).toISOString().slice(0, 10)}
          </p>
        ) : null}
      </div>

      {loading && (
        <p className="text-sm text-zinc-500" role="status">
          Loading…
        </p>
      )}
      {!loading && error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {!loading && data && (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="beta-metrics-grid"
        >
          <MetricCard
            testId="metric-active-users"
            title="Active users (7d)"
            value={String(data.activeUsers7d)}
            hint="lastLoginAt in last 7 days"
          />
          <MetricCard
            testId="metric-signups"
            title="Sign-ups (beta window)"
            value={String(data.signupsSinceBetaStart)}
            hint="createdAt ≥ betaStart"
          />
          <MetricCard
            testId="metric-d7"
            title="D7 retention"
            value={formatRatePct(data.d7.rate)}
            hint={`${data.d7.returnedCount}/${data.d7.cohortSize}${
              data.d7.advisory ? ' · advisory (n<20)' : ''
            }`}
          />
          <MetricCard
            testId="metric-opener-usage"
            title="Opener usage"
            value={formatRatePct(data.opener.usageRate)}
            hint={`${data.opener.used}/${data.opener.displayed} used/displayed`}
          />
          <MetricCard
            testId="metric-opener-response"
            title="Opener response"
            value={formatRatePct(data.opener.responseRate)}
            hint={`${data.opener.replied}/${data.opener.sent} reply/sent`}
          />
          <MetricCard
            testId="metric-high-share"
            title="HIGH browse share"
            value={formatRatePct(data.priorityShare.highShare)}
            hint={`${data.priorityShare.highCount}/${data.priorityShare.scoredCount} ranks ≥85`}
          />
          <MetricCard
            testId="metric-good-share"
            title="GOOD browse share"
            value={formatRatePct(data.priorityShare.goodShare)}
            hint={`${data.priorityShare.goodCount} ranks 70–84`}
          />
          <MetricCard
            testId="metric-other-share"
            title="OTHER browse share"
            value={formatRatePct(data.priorityShare.otherShare)}
            hint={`${data.priorityShare.otherCount} ranks 0–69`}
          />
          <MetricCard
            testId="metric-hp-emails"
            title="HIGH emails (7d)"
            value={String(data.highPriorityEmails7d)}
            hint="HighPriorityMatchEmailLog"
          />
        </div>
      )}
    </main>
  );
}

'use client';

import dynamic from 'next/dynamic';

const AdminBetaMetricsPageClient = dynamic(
  () => import('./beta-metrics-page-client'),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-sm text-zinc-500" data-testid="admin-chunk-loading">
        Loading…
      </p>
    ),
  },
);

export default function AdminBetaMetricsPage() {
  return <AdminBetaMetricsPageClient />;
}

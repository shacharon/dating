'use client';

import dynamic from 'next/dynamic';

const AdminReportsPageClient = dynamic(() => import('./reports-page-client'), {
  ssr: false,
  loading: () => (
    <p className="p-6 text-sm text-zinc-500" data-testid="admin-chunk-loading">
      Loading…
    </p>
  ),
});

export default function AdminReportsPage() {
  return <AdminReportsPageClient />;
}

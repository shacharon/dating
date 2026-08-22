'use client';

// Internal English-only — admin tools are not product-localized.
import Link from 'next/link';
import { InlineError } from '@/components/errors';
import { BlockedUsersTable } from '@/components/admin/content-violations/blocked-users-table';
import { ContentViolationsFilters } from '@/components/admin/content-violations/content-violations-filters';
import { ContentViolationsStatsGrid } from '@/components/admin/content-violations/content-violations-stats-grid';
import { ContentViolationsTable } from '@/components/admin/content-violations/content-violations-table';
import { useAdminContentViolationsPage } from '@/hooks/use-admin-content-violations';

export default function AdminContentViolationsPageClient() {
  const page = useAdminContentViolationsPage();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="mb-4">
        <Link
          href="/admin"
          className="text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          ← Admin
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Content violations
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Review flagged text, muted/blocked users, and clear enforcement when needed.
      </p>

      <ContentViolationsStatsGrid stats={page.stats} />

      {page.loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : null}
      {page.error ? <InlineError className="mb-4">{page.error}</InlineError> : null}

      <BlockedUsersTable
        loading={page.loading}
        blockedUsers={page.blockedUsers}
        blockedTotal={page.blockedTotal}
        busyUserId={page.busyUserId}
        onUnblock={page.unblock}
      />

      <section>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          All violations
        </h2>
        <ContentViolationsFilters
          surface={page.surface}
          setSurface={page.setSurface}
          category={page.category}
          setCategory={page.setCategory}
          action={page.action}
          setAction={page.setAction}
          userStatus={page.userStatus}
          setUserStatus={page.setUserStatus}
          hasRecipient={page.hasRecipient}
          setHasRecipient={page.setHasRecipient}
          userId={page.userId}
          setUserId={page.setUserId}
        />
        <ContentViolationsTable
          loading={page.loading}
          error={page.error}
          rows={page.rows}
          total={page.total}
          busyUserId={page.busyUserId}
          onUnblock={page.unblock}
        />
      </section>
    </main>
  );
}

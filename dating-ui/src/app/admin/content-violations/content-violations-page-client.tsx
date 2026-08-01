'use client';

// Internal English-only — admin tools are not product-localized.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  getAdminContentViolationStats,
  listAdminContentViolations,
  unblockAdminContentUser,
  type AdminContentViolationListItem,
  type AdminContentViolationStats,
} from '@/lib/admin-content-violations-api';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{label}</div>
    </div>
  );
}

export default function AdminContentViolationsPageClient() {
  const [rows, setRows] = useState<AdminContentViolationListItem[]>([]);
  const [stats, setStats] = useState<AdminContentViolationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [surface, setSurface] = useState('');
  const [category, setCategory] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, nextStats] = await Promise.all([
        listAdminContentViolations({
          surface: surface || undefined,
          category: category || undefined,
          userId: userId.trim() || undefined,
          limit: 50,
          offset: 0,
        }),
        getAdminContentViolationStats(),
      ]);
      setRows(list.violations);
      setTotal(list.total);
      setStats(nextStats);
    } catch (e) {
      if (e instanceof Error && e.message === 'admin_forbidden') {
        setError('You are not authorized to view content violations.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load violations');
      }
    } finally {
      setLoading(false);
    }
  }, [surface, category, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUnblock(targetUserId: string) {
    const reason = window.prompt('Reason for unblock (required):');
    if (reason == null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Unblock reason is required.');
      return;
    }
    setBusyUserId(targetUserId);
    setError(null);
    try {
      await unblockAdminContentUser(targetUserId, trimmed);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unblock failed');
    } finally {
      setBusyUserId(null);
    }
  }

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

      {stats ? (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total violations" value={stats.totalViolations} />
          <StatCard
            label="Blocked profile users"
            value={stats.blockedProfileUsers}
          />
          <StatCard
            label="Muted (temporary)"
            value={stats.mutedMessageUsersTemporary}
          />
          <StatCard
            label="Muted (indefinite)"
            value={stats.mutedMessageUsersIndefinite}
          />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          Surface
          <select
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">All</option>
            <option value="message">message</option>
            <option value="profile_aboutMe">profile_aboutMe</option>
            <option value="profile_aboutPartner">profile_aboutPartner</option>
            <option value="profile_aboutRelationship">
              profile_aboutRelationship
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">All</option>
            <option value="sexual">sexual</option>
            <option value="hate">hate</option>
            <option value="harassment">harassment</option>
            <option value="violence">violence</option>
            <option value="self-harm">self-harm</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
          User ID
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Exact user id"
            className="min-w-[14rem] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading violations…</p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No violations match these filters.</p>
      ) : null}
      {!loading && rows.length > 0 ? (
        <p className="mb-2 text-xs text-zinc-500">
          Showing {rows.length} of {total}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Time</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Surface</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Preview</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-zinc-200 dark:border-zinc-700"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div>{row.userEmail}</div>
                    <div className="text-zinc-500">
                      {row.userNickname ?? 'no nickname'}
                    </div>
                    <div className="font-mono text-[10px] text-zinc-400">
                      {row.userId}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.userStatus}</td>
                  <td className="px-3 py-2">{row.surface}</td>
                  <td className="px-3 py-2">{row.category}</td>
                  <td className="max-w-xs truncate px-3 py-2">
                    {row.flaggedTextPreview}
                  </td>
                  <td className="px-3 py-2">
                    {row.userStatus !== 'ok' ? (
                      <button
                        type="button"
                        disabled={busyUserId === row.userId}
                        onClick={() => void handleUnblock(row.userId)}
                        className="text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400"
                      >
                        {busyUserId === row.userId ? 'Unblocking…' : 'Unblock'}
                      </button>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}

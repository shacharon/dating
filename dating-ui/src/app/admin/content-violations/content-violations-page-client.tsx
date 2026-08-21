'use client';

// Internal English-only — admin tools are not product-localized.
import Link from 'next/link';
import { useState } from 'react';
import { InlineError } from '@/components/errors';
import { useAdminContentViolationsPage } from '@/hooks/use-admin-content-violations';

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

function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function CopyableConversationId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore clipboard failures in restricted contexts
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={copied ? 'Copied' : `Click to copy ${id}`}
      className="font-mono text-[10px] text-left text-emerald-700 hover:underline dark:text-emerald-400"
    >
      {copied ? 'Copied' : truncateId(id)}
    </button>
  );
}

export default function AdminContentViolationsPageClient() {
  const {
    blockedUsers,
    blockedTotal,
    rows,
    stats,
    total,
    surface,
    setSurface,
    category,
    setCategory,
    action,
    setAction,
    userStatus,
    setUserStatus,
    hasRecipient,
    setHasRecipient,
    userId,
    setUserId,
    loading,
    error,
    busyUserId,
    unblock,
  } = useAdminContentViolationsPage();

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

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : null}
      {error ? <InlineError className="mb-4">{error}</InlineError> : null}

      <section className="mb-10">
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Blocked / muted users
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Currently restricted accounts ({blockedUsers.length}
          {blockedTotal > blockedUsers.length ? ` of ${blockedTotal}` : ''}).
        </p>
        {!loading && blockedUsers.length === 0 ? (
          <p className="text-sm text-zinc-500">No blocked or muted users.</p>
        ) : null}
        {blockedUsers.length > 0 ? (
          <div className="overflow-x-auto rounded border border-zinc-200 dark:border-zinc-700">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Muted until</th>
                  <th className="px-3 py-2 font-medium">Last phrase</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">Conversation</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {blockedUsers.map((row) => {
                  const latest = row.latestViolation;
                  return (
                    <tr
                      key={row.userId}
                      className="border-t border-zinc-200 dark:border-zinc-700"
                    >
                      <td className="px-3 py-2">
                        <div>{row.userEmail}</div>
                        <div className="text-zinc-500">
                          {row.userNickname ?? 'no nickname'}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400">
                          {row.userId}
                        </div>
                        <div className="text-zinc-400">
                          violations: {row.violationCount}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.userStatus}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.userMutedUntil
                          ? new Date(row.userMutedUntil).toLocaleString()
                          : row.userStatus === 'messaging_muted'
                            ? 'indefinite'
                            : '—'}
                      </td>
                      <td className="max-w-sm px-3 py-2 whitespace-pre-wrap break-words">
                        {latest?.flaggedText ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {latest?.recipientUserId ? (
                          <>
                            <div>{latest.recipientEmail ?? '—'}</div>
                            <div className="text-zinc-500">
                              {latest.recipientNickname ?? 'no nickname'}
                            </div>
                          </>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px]">
                        {latest?.conversationId ? (
                          <CopyableConversationId id={latest.conversationId} />
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={busyUserId === row.userId}
                          onClick={() => void unblock(row.userId)}
                          className="text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400"
                        >
                          {busyUserId === row.userId
                            ? 'Unblocking…'
                            : 'Unblock'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          All violations
        </h2>
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
              <option value="dating_policy">dating_policy</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            Action
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All</option>
              <option value="blocked">blocked</option>
              <option value="warned">warned</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            Status
            <select
              value={userStatus}
              onChange={(e) => setUserStatus(e.target.value)}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All</option>
              <option value="ok">ok</option>
              <option value="profile_edit_blocked">profile_edit_blocked</option>
              <option value="messaging_muted">messaging_muted</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            Has recipient
            <select
              value={hasRecipient}
              onChange={(e) => setHasRecipient(e.target.value)}
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">All</option>
              <option value="1">Yes</option>
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
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">Conversation</th>
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
                    <td className="px-3 py-2">
                      {row.recipientUserId ? (
                        <>
                          <div>{row.recipientEmail ?? '—'}</div>
                          <div className="text-zinc-500">
                            {row.recipientNickname ?? 'no nickname'}
                          </div>
                        </>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px]">
                      {row.conversationId ? (
                        <CopyableConversationId id={row.conversationId} />
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.userStatus}
                    </td>
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
                          onClick={() => void unblock(row.userId)}
                          className="text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400"
                        >
                          {busyUserId === row.userId
                            ? 'Unblocking…'
                            : 'Unblock'}
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
      </section>
    </main>
  );
}

import type { AdminContentViolationListItem } from '@/lib/admin/admin-content-violations-api';
import { CopyableConversationId } from '@/components/admin/content-violations/copyable-conversation-id';

type Props = {
  loading: boolean;
  error: string | null;
  rows: AdminContentViolationListItem[];
  total: number;
  busyUserId: string | null;
  onUnblock: (userId: string) => void;
};

export function ContentViolationsTable({
  loading,
  error,
  rows,
  total,
  busyUserId,
  onUnblock,
}: Props) {
  return (
    <>
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
                        onClick={() => void onUnblock(row.userId)}
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
    </>
  );
}

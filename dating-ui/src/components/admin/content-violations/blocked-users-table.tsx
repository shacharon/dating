import type { AdminBlockedUserItem } from '@/lib/admin/admin-content-violations-api';
import { CopyableConversationId } from '@/components/admin/content-violations/copyable-conversation-id';

type Props = {
  loading: boolean;
  blockedUsers: AdminBlockedUserItem[];
  blockedTotal: number;
  busyUserId: string | null;
  onUnblock: (userId: string) => void;
};

export function BlockedUsersTable({
  loading,
  blockedUsers,
  blockedTotal,
  busyUserId,
  onUnblock,
}: Props) {
  return (
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
                        onClick={() => void onUnblock(row.userId)}
                        className="text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400"
                      >
                        {busyUserId === row.userId ? 'Unblocking…' : 'Unblock'}
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
  );
}

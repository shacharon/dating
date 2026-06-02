'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  conversationPhotoSrc,
  fetchMyConversations,
  type ConversationListItemDto,
} from '@/lib/conversations-api';
import {
  conversationPrimaryLabel,
  conversationSecondaryMeta,
  formatMatchedAt,
} from './conversation-display';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationListItemDto[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const dto = await fetchMyConversations();
    setConversations(dto.conversations ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyConversations()
      .then((dto) => {
        if (!cancelled) setConversations(dto.conversations ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Failed to load conversations',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void load().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/dating/me-matches"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Your matches
          </Link>
        </nav>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Conversations
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Your mutual matches — open a conversation to message.
          </p>
        </header>

        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            Loading…
          </p>
        )}

        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            {error}
            <button
              type="button"
              className="mt-3 block text-sm font-medium underline"
              onClick={() => void load().catch(() => undefined)}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div
            className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900"
            role="status"
            data-testid="conversations-empty"
          >
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              No matches yet. Keep swiping!
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              When you and someone both like each other, they will appear here.
            </p>
            <Link
              href="/dating/me-matches"
              className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              Browse matches
            </Link>
          </div>
        )}

        {!loading && !error && conversations.length > 0 && (
          <ul className="flex flex-col gap-3" data-testid="conversations-list">
            {conversations.map((item) => {
              const photoSrc = conversationPhotoSrc(item.otherUser.photoUrl);
              const secondary = conversationSecondaryMeta(item.otherUser);
              return (
                <li key={item.id}>
                  <Link
                    href={`/dating/conversations/${item.id}`}
                    className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                    data-testid="conversation-row"
                  >
                    <div className="flex items-center gap-4">
                      {photoSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photoSrc}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800"
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          aria-hidden
                        >
                          ?
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {conversationPrimaryLabel(item.otherUser)}
                        </p>
                        {secondary && (
                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {secondary}
                          </p>
                        )}
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {formatMatchedAt(item.matchedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.unreadCount > 0 && (
                          <span
                            data-testid="conversation-unread-badge"
                            aria-label={`${item.unreadCount} unread message${item.unreadCount === 1 ? '' : 's'}`}
                            className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white dark:bg-emerald-500"
                          >
                            {item.unreadCount > 99 ? '99+' : item.unreadCount}
                          </span>
                        )}
                        <span
                          className="text-zinc-300 dark:text-zinc-600"
                          aria-hidden
                        >
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  conversationPhotoSrc,
  fetchConversationMessages,
  fetchMyConversationById,
  markConversationAsRead,
  sendConversationMessage,
  unmatchMyConversation,
  type ConversationDetailDto,
  type MessageDto,
} from '@/lib/conversations-api';
import {
  MAX_MESSAGE_TEXT_LENGTH,
  SEND_COOLDOWN_MS,
} from '@/lib/conversation-message-limits';
import {
  conversationPrimaryLabel,
  conversationSecondaryMeta,
  formatMatchedOnDate,
  formatMessageTime,
} from '../conversation-display';

const POLL_INTERVAL_MS = 3000;

function scrollListToBottom(listEl: HTMLDivElement | null) {
  if (!listEl) return;
  if (typeof listEl.scrollTo === 'function') {
    listEl.scrollTo({ top: listEl.scrollHeight, behavior: 'auto' });
  } else {
    listEl.scrollTop = listEl.scrollHeight;
  }
}

function isNearBottom(el: HTMLDivElement, thresholdPx = 80): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}

function appendUniqueMessages(
  prev: MessageDto[],
  incoming: MessageDto[],
): MessageDto[] {
  const ids = new Set(prev.map((m) => m.id));
  const append = incoming.filter((m) => !ids.has(m.id));
  if (append.length === 0) return prev;
  return [...prev, ...append];
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = typeof params.id === 'string' ? params.id : '';
  const [data, setData] = useState<ConversationDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unmatchConfirmOpen, setUnmatchConfirmOpen] = useState(false);
  const [unmatchSaving, setUnmatchSaving] = useState(false);
  const [unmatchError, setUnmatchError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<MessageDto[]>([]);
  const initialScrollDoneRef = useRef(false);
  const lastMarkReadAtRef = useRef(0);

  const tryMarkRead = useCallback(async () => {
    if (!id) return;
    try {
      await markConversationAsRead(id);
      lastMarkReadAtRef.current = Date.now();
    } catch {
      // silent — read tracking must not block messaging
    }
  }, [id]);

  useEffect(() => {
    lastMarkReadAtRef.current = 0;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyConversationById(id)
      .then((dto) => {
        if (!cancelled) setData(dto);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : 'Failed to load conversation',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || loading) return;
    void tryMarkRead();
  }, [id, loading, tryMarkRead]);

  useEffect(() => {
    if (!id) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastMarkReadAtRef.current < 5000) return;
      void tryMarkRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [id, tryMarkRead]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setMessagesLoading(true);
    setMessagesError(null);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    initialScrollDoneRef.current = false;

    fetchConversationMessages(id)
      .then((result) => {
        if (cancelled) return;
        setMessages(result.messages);
        setHasMore(result.pagination.hasMore);
        setNextCursor(result.pagination.nextCursor);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setMessagesError(
            e instanceof Error ? e.message : 'Failed to load messages',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (messagesLoading || initialScrollDoneRef.current) return;
    if (messages.length === 0) return;
    initialScrollDoneRef.current = true;
    scrollListToBottom(listRef.current);
  }, [messagesLoading, messages.length]);

  useEffect(() => {
    if (!id || messagesLoading) return;

    const poll = async () => {
      if (document.visibilityState !== 'visible') return;

      const list = messagesRef.current;
      const lastId = list[list.length - 1]?.id;
      if (!lastId) return;

      try {
        const { messages: incoming } = await fetchConversationMessages(id, {
          after: lastId,
          limit: 100,
        });
        if (incoming.length === 0) return;

        setMessages((prev) => {
          const merged = appendUniqueMessages(prev, incoming);
          if (merged === prev) return prev;

          const listEl = listRef.current;
          if (listEl && isNearBottom(listEl)) {
            requestAnimationFrame(() => scrollListToBottom(listEl));
          }
          return merged;
        });
      } catch {
        // silent retry on next tick
      }
    };

    const intervalId = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [id, messagesLoading]);

  const draftTrimmed = draft.trim();
  const overLimit = draft.length > MAX_MESSAGE_TEXT_LENGTH;
  const canSend =
    draftTrimmed.length > 0 &&
    draft.length <= MAX_MESSAGE_TEXT_LENGTH &&
    !sending;

  const handleLoadEarlier = useCallback(async () => {
    if (!id || !hasMore || !nextCursor || loadingEarlier) return;
    setLoadingEarlier(true);
    setMessagesError(null);
    const listEl = listRef.current;
    const prevScrollHeight = listEl?.scrollHeight ?? 0;

    try {
      const result = await fetchConversationMessages(id, {
        before: nextCursor,
      });
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const prepend = result.messages.filter((m) => !ids.has(m.id));
        return [...prepend, ...prev];
      });
      setHasMore(result.pagination.hasMore);
      setNextCursor(result.pagination.nextCursor);

      requestAnimationFrame(() => {
        if (!listEl) return;
        const newScrollHeight = listEl.scrollHeight;
        listEl.scrollTop += newScrollHeight - prevScrollHeight;
      });
    } catch (e: unknown) {
      setMessagesError(
        e instanceof Error ? e.message : 'Failed to load earlier messages',
      );
    } finally {
      setLoadingEarlier(false);
    }
  }, [hasMore, id, loadingEarlier, nextCursor]);

  async function handleSendMessage() {
    if (!id || !canSend) return;
    setSendError(null);
    setSending(true);
    try {
      const sent = await sendConversationMessage(id, draft);
      setMessages((prev) => appendUniqueMessages(prev, [sent]));
      setDraft('');
      requestAnimationFrame(() => scrollListToBottom(listRef.current));
      await new Promise((r) => setTimeout(r, SEND_COOLDOWN_MS));
    } catch (e: unknown) {
      setSendError(
        e instanceof Error ? e.message : 'Failed to send message',
      );
    } finally {
      setSending(false);
    }
  }

  function handleMessageKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  }

  async function handleUnmatchConfirm() {
    if (!id || unmatchSaving) return;
    setUnmatchError(null);
    setUnmatchSaving(true);
    try {
      await unmatchMyConversation(id);
      router.push('/dating/conversations');
    } catch (e: unknown) {
      setUnmatchConfirmOpen(false);
      setUnmatchError(
        e instanceof Error ? e.message : 'Failed to unmatch',
      );
    } finally {
      setUnmatchSaving(false);
    }
  }

  const photoSrc = data
    ? conversationPhotoSrc(data.otherUser.photoUrl)
    : null;
  const secondary = data ? conversationSecondaryMeta(data.otherUser) : null;
  const otherName = data ? conversationPrimaryLabel(data.otherUser) : '';

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
        <nav className="text-sm">
          <Link
            href="/dating/conversations"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            data-testid="conversation-back-link"
          >
            ← Back to conversations
          </Link>
        </nav>

        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            Loading…
          </p>
        )}

        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
            data-testid="conversation-error"
          >
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <section
              className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
              data-testid="conversation-match-card"
            >
              <div className="flex items-center gap-4">
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoSrc}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800"
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                    aria-hidden
                  >
                    ?
                  </div>
                )}
                <div className="min-w-0 space-y-1">
                  <h1 className="truncate text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {otherName}
                  </h1>
                  {secondary && (
                    <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {secondary}
                    </p>
                  )}
                  <p
                    className="text-sm text-zinc-400 dark:text-zinc-500"
                    data-testid="conversation-matched-date"
                  >
                    {formatMatchedOnDate(data.matchedAt)}
                  </p>
                </div>
              </div>
            </section>

            <section
              className="flex min-h-64 flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              aria-label="Messaging"
              data-testid="conversation-messaging"
            >
              <div
                ref={listRef}
                className="flex max-h-96 flex-1 flex-col gap-3 overflow-y-auto p-4"
                data-testid="conversation-message-list"
              >
                {messagesLoading && (
                  <p
                    className="text-center text-sm text-zinc-400 dark:text-zinc-500"
                    role="status"
                    data-testid="conversation-messages-loading"
                  >
                    Loading messages…
                  </p>
                )}

                {!messagesLoading && messagesError && (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                    role="alert"
                    data-testid="conversation-messages-error"
                  >
                    {messagesError}
                  </div>
                )}

                {!messagesLoading && hasMore && (
                  <button
                    type="button"
                    onClick={() => void handleLoadEarlier()}
                    disabled={loadingEarlier}
                    className="mx-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    data-testid="conversation-load-earlier"
                  >
                    {loadingEarlier
                      ? 'Loading…'
                      : 'Load earlier messages'}
                  </button>
                )}

                {!messagesLoading &&
                  messages.length === 0 &&
                  !messagesError && (
                    <p
                      className="text-center text-sm text-zinc-500 dark:text-zinc-400"
                      data-testid="conversation-messages-empty"
                    >
                      No messages yet. Say hi!
                    </p>
                  )}

                {messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}
                      data-testid="conversation-message-bubble"
                      data-sender={isMine ? 'me' : 'other'}
                    >
                      <p
                        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                          isMine
                            ? 'rounded-br-md bg-blue-600 text-white dark:bg-blue-500'
                            : 'rounded-bl-md bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                        }`}
                      >
                        {msg.text}
                      </p>
                      <span
                        className="px-1 text-xs text-zinc-400 dark:text-zinc-500"
                        data-testid="conversation-message-time"
                      >
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
                {sendError && (
                  <div
                    className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                    role="alert"
                    data-testid="conversation-send-error"
                  >
                    {sendError}
                  </div>
                )}
                <label className="sr-only" htmlFor="conversation-message-input">
                  Message
                </label>
                <textarea
                  id="conversation-message-input"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleMessageKeyDown}
                  disabled={sending}
                  placeholder="Type a message…"
                  className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span
                    data-testid="conversation-char-count"
                    className={
                      overLimit
                        ? 'text-xs font-medium text-red-600 dark:text-red-400'
                        : 'text-xs text-zinc-400 dark:text-zinc-500'
                    }
                    aria-live="polite"
                  >
                    {draft.length} / {MAX_MESSAGE_TEXT_LENGTH}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSendMessage()}
                    disabled={!canSend}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
                    data-testid="conversation-send-button"
                  >
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </section>

            <div className="flex flex-col items-start gap-2">
              {unmatchConfirmOpen ? (
                <div
                  className="w-full rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20"
                  data-testid="conversation-unmatch-confirm"
                >
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    Unmatch {otherName}? You&apos;ll no longer see their
                    messages. This can&apos;t be undone.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setUnmatchConfirmOpen(false)}
                      disabled={unmatchSaving}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUnmatchConfirm()}
                      disabled={unmatchSaving}
                      className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      {unmatchSaving ? 'Saving…' : 'Unmatch'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setUnmatchError(null);
                    setUnmatchConfirmOpen(true);
                  }}
                  disabled={unmatchSaving}
                  className="text-sm font-medium text-red-600 underline-offset-4 hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
                >
                  Unmatch
                </button>
              )}
              {unmatchError && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                  role="alert"
                >
                  {unmatchError}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

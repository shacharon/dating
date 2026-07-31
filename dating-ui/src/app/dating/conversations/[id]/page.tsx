'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useConversationUnread } from '@/contexts/conversation-unread-context';
import {
  conversationPhotoSrc,
  fetchMyConversationById,
  type ConversationDetailDto,
} from '@/lib/conversations-api';
import { MAX_MESSAGE_TEXT_LENGTH } from '@/lib/conversation-message-limits';
import {
  conversationPrimaryLabel,
  conversationSecondaryMeta,
  formatMatchedOnDate,
  formatMessageTime,
} from '../conversation-display';
import { ReportUserDialog } from '@/components/report-user-dialog';
import { useAppLocale } from '@/lib/i18n';
import { setActiveConversationId } from '@/lib/conversation-focus';
import { useConversationMessages } from '@/hooks/use-conversation-messages';
import { useConversationActions } from '@/hooks/use-conversation-actions';
import { getRealtimeMode } from '@/lib/realtime-mode';

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

export default function ConversationDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { locale, copy } = useAppLocale();
  const detailCopy = copy.conversations.detail;
  const formatCopy = copy.conversations.format;
  const { refresh: refreshNavUnread } = useConversationUnread();
  const id = typeof params.id === 'string' ? params.id : '';
  const realtimeMode = getRealtimeMode();

  const [data, setData] = useState<ConversationDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unmatchConfirmOpen, setUnmatchConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    sendMessage,
    sending,
    sendError,
    hasMore,
    loadEarlier,
    loadingEarlier,
    socketReconnecting,
    listRef,
    initialScrollDone,
  } = useConversationMessages({
    conversationId: id,
    enabled: true,
    onRefreshUnread: refreshNavUnread,
  });

  const {
    unmatch,
    unmatching,
    unmatchError,
    clearUnmatchError,
  } = useConversationActions(id);

  useEffect(() => {
    if (!id) return;
    setActiveConversationId(id);
    return () => setActiveConversationId(null);
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
            e instanceof Error ? e.message : detailCopy.loadFailed,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, detailCopy.loadFailed]);

  useEffect(() => {
    if (messagesLoading || initialScrollDone) return;
    if (messages.length === 0) return;
    scrollListToBottom(listRef.current);
  }, [messagesLoading, messages.length, initialScrollDone]);

  useEffect(() => {
    if (messages.length === 0) return;
    const listEl = listRef.current;
    if (listEl && isNearBottom(listEl)) {
      requestAnimationFrame(() => scrollListToBottom(listEl));
    }
  }, [messages]);

  const draftTrimmed = draft.trim();
  const overLimit = draft.length > MAX_MESSAGE_TEXT_LENGTH;
  const canSend =
    draftTrimmed.length > 0 &&
    draft.length <= MAX_MESSAGE_TEXT_LENGTH &&
    !sending;

  async function handleSendMessage() {
    if (!id || !canSend) return;
    try {
      await sendMessage(draft);
      setDraft('');
      requestAnimationFrame(() => scrollListToBottom(listRef.current));
    } catch {
      // Error is handled by the hook
    }
  }

  function handleMessageKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  }

  async function handleUnmatchConfirm() {
    try {
      await unmatch();
    } catch {
      setUnmatchConfirmOpen(false);
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
            {detailCopy.backToList}
          </Link>
        </nav>

        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            {copy.common.loading}
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
                    {formatMatchedOnDate(data.matchedAt, formatCopy, locale)}
                  </p>
                </div>
              </div>
            </section>

            <section
              className="flex min-h-64 flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              aria-label={detailCopy.messagingAria}
              data-testid="conversation-messaging"
            >
              {realtimeMode === 'ws' && socketReconnecting && (
                <p
                  role="status"
                  data-testid="conversation-reconnecting"
                  className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  {detailCopy.reconnecting}
                </p>
              )}
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
                    {detailCopy.loadingMessages}
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
                    onClick={() => void loadEarlier()}
                    disabled={loadingEarlier}
                    className="mx-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    data-testid="conversation-load-earlier"
                  >
                    {loadingEarlier ? copy.common.loading : detailCopy.loadEarlier}
                  </button>
                )}

                {!messagesLoading &&
                  messages.length === 0 &&
                  !messagesError && (
                    <p
                      className="text-center text-sm text-zinc-500 dark:text-zinc-400"
                      data-testid="conversation-messages-empty"
                    >
                      {detailCopy.emptyMessages}
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
                        {formatMessageTime(msg.createdAt, formatCopy, locale)}
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
                  {detailCopy.messageLabel}
                </label>
                <textarea
                  id="conversation-message-input"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleMessageKeyDown}
                  disabled={sending}
                  placeholder={detailCopy.messagePlaceholder}
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
                    {sending ? detailCopy.sending : detailCopy.send}
                  </button>
                </div>
              </div>
            </section>

            <div className="flex flex-col items-start gap-2">
              <details className="relative" data-testid="conversation-report-menu">
                <summary className="cursor-pointer list-none text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
                  ⋯
                </summary>
                <div className="absolute left-0 top-full z-10 mt-1 min-w-[10rem] rounded border border-zinc-200 bg-white py-1 shadow dark:border-zinc-700 dark:bg-zinc-900">
                  <button
                    type="button"
                    data-testid="conversation-report-open"
                    onClick={() => setReportOpen(true)}
                    className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {copy.reportUser.linkLabel}
                  </button>
                </div>
              </details>
              {unmatchConfirmOpen ? (
                <div
                  className="w-full rounded-lg border border-red-200 bg-red-50/50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20"
                  data-testid="conversation-unmatch-confirm"
                >
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {detailCopy.unmatchConfirm(otherName)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setUnmatchConfirmOpen(false)}
                      disabled={unmatching}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {copy.common.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleUnmatchConfirm()}
                      disabled={unmatching}
                      className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      {unmatching ? detailCopy.sending : detailCopy.unmatch}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    clearUnmatchError();
                    setUnmatchConfirmOpen(true);
                  }}
                  disabled={unmatching}
                  className="text-sm font-medium text-red-600 underline-offset-4 hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
                >
                  {detailCopy.unmatch}
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
      {data && id ? (
        <ReportUserDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          contextType="CONVERSATION"
          contextId={id}
          subjectLabel={otherName}
        />
      ) : null}
    </div>
  );
}

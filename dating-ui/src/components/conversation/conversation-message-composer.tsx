'use client';

import { useState, type RefObject } from 'react';
import { MAX_MESSAGE_TEXT_LENGTH } from '@/lib/conversation-message-limits';
import { ContentModerationErrorAlert } from '@/components/content-moderation-error-alert';
import type { ContentModerationDetails } from '@/lib/content-moderation-error';
import type { AppCopySchema } from '@/lib/i18n/types';
import { scrollListToBottom } from '@/components/conversation/conversation-message-list';

type Props = {
  detailCopy: AppCopySchema['conversations']['detail'];
  modCopy: AppCopySchema['contentModeration'];
  sending: boolean;
  sendError: string | null;
  sendModerationDetails: ContentModerationDetails | null;
  clearSendError: () => void;
  sendMessage: (content: string) => Promise<void>;
  listRef: RefObject<HTMLDivElement | null>;
};

/**
 * Message draft composer: char limit, Enter-to-send, moderation/send errors.
 * Owns local draft state; calls `sendMessage` from `useConversationMessages`.
 */
export function ConversationMessageComposer({
  detailCopy,
  modCopy,
  sending,
  sendError,
  sendModerationDetails,
  clearSendError,
  sendMessage,
  listRef,
}: Props) {
  const [draft, setDraft] = useState('');
  const draftTrimmed = draft.trim();
  const overLimit = draft.length > MAX_MESSAGE_TEXT_LENGTH;
  const canSend =
    draftTrimmed.length > 0 &&
    draft.length <= MAX_MESSAGE_TEXT_LENGTH &&
    !sending;

  async function handleSendMessage() {
    if (!canSend) return;
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

  return (
    <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
      {sendModerationDetails ? (
        <div className="mb-2">
          <ContentModerationErrorAlert
            details={sendModerationDetails}
            variant="message"
            title={modCopy.messageTitle}
            labels={{
              fieldLabel: modCopy.fieldLabel,
              flaggedLabel: modCopy.flaggedLabel,
              whyLabel: modCopy.whyLabel,
              suggestionLabel: modCopy.suggestionLabel,
              exampleLabel: modCopy.exampleLabel,
              mutedLabel: modCopy.mutedLabel,
              dismiss: modCopy.dismiss,
            }}
            onDismiss={clearSendError}
          />
        </div>
      ) : null}
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
        onChange={(e) => {
          setDraft(e.target.value);
          if (sendError || sendModerationDetails) clearSendError();
        }}
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
  );
}

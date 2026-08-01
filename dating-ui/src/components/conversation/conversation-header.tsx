'use client';

import type { ConversationDetailDto } from '@/lib/conversations-api';
import { conversationPhotoSrc } from '@/lib/conversations-api';
import {
  conversationPrimaryLabel,
  conversationSecondaryMeta,
  formatMatchedOnDate,
} from '@/app/dating/conversations/conversation-display';
import type { AppCopySchema, AppLocale } from '@/lib/i18n/types';

type Props = {
  data: ConversationDetailDto;
  formatCopy: AppCopySchema['conversations']['format'];
  locale: AppLocale;
};

/**
 * Match card for conversation detail (photo, name, matched date).
 * Back link stays on the page so it remains visible during load/error.
 */
export function ConversationHeader({ data, formatCopy, locale }: Props) {
  const photoSrc = conversationPhotoSrc(data.otherUser.photoUrl);
  const secondary = conversationSecondaryMeta(data.otherUser);
  const otherName = conversationPrimaryLabel(data.otherUser);

  return (
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
  );
}

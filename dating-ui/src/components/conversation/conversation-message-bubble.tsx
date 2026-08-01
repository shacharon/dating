'use client';

import { formatMessageTime } from '@/app/dating/conversations/conversation-display';
import type { MessageDto } from '@/lib/conversations-api';
import type { AppCopySchema, AppLocale } from '@/lib/i18n/types';

type Props = {
  message: MessageDto;
  isMine: boolean;
  formatCopy: AppCopySchema['conversations']['format'];
  locale: AppLocale;
};

export function ConversationMessageBubble({
  message,
  isMine,
  formatCopy,
  locale,
}: Props) {
  return (
    <div
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
        {message.text}
      </p>
      <span
        className="px-1 text-xs text-zinc-400 dark:text-zinc-500"
        data-testid="conversation-message-time"
      >
        {formatMessageTime(message.createdAt, formatCopy, locale)}
      </span>
    </div>
  );
}

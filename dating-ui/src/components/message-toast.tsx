'use client';

export type MessageToastViewProps = {
  message: string;
  actionLabel: string;
  dismissLabel: string;
  conversationId: string;
  onDismiss: () => void;
  onOpen: () => void;
};

export function MessageToastView({
  message,
  actionLabel,
  dismissLabel,
  conversationId,
  onDismiss,
  onOpen,
}: MessageToastViewProps) {
  return (
    <div
      className="fixed bottom-4 right-4 z-[60] w-full max-w-sm px-4 sm:px-0"
      role="status"
      aria-live="polite"
      data-testid="message-toast"
      data-conversation-id={conversationId}
    >
      <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        <button
          type="button"
          className="min-w-0 flex-1 text-left text-sm text-zinc-800 dark:text-zinc-100"
          onClick={onOpen}
        >
          <span className="font-medium">{message}</span>
          <span className="mt-1 block text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {actionLabel}
          </span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 rounded-md px-2 py-1 text-lg leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}

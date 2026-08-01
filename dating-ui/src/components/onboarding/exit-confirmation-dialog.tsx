'use client';

import type { AppCopySchema } from '@/lib/i18n';

export function ExitConfirmationDialog({
  open,
  onCancel,
  onConfirm,
  copy,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  copy: AppCopySchema['onboarding']['exitDialog'];
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      data-testid="onboarding-exit-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-exit-title"
        data-testid="onboarding-exit-dialog"
      >
        <h2
          id="onboarding-exit-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {copy.body}
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            data-testid="onboarding-exit-cancel"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            data-testid="onboarding-exit-confirm"
            onClick={onConfirm}
            className="min-h-11 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

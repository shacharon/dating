'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { deleteMyAccount } from '@/lib/delete-account-api';
import { useAppLocale } from '@/lib/i18n';

const CONFIRMATION_TEXT = 'DELETE';

export function DeleteAccountSection() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { copy: appCopy } = useAppLocale();
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = appCopy.deleteAccount;
  const canSubmit =
    confirmation === CONFIRMATION_TEXT && !submitting;

  const handleDelete = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await deleteMyAccount(CONFIRMATION_TEXT);
      await refresh();
      router.replace('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : copy.saveError;
      if (msg === 'account_delete_confirmation_invalid') {
        setError(copy.confirmationInvalid);
      } else {
        setError(copy.saveError);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="rounded border border-red-200 bg-red-50/50 p-4 dark:border-red-900/60 dark:bg-red-950/20"
      aria-labelledby="delete-account-title"
      data-testid="delete-account-section"
    >
      <h2
        id="delete-account-title"
        className="text-sm font-semibold text-red-900 dark:text-red-100"
      >
        {copy.title}
      </h2>
      <p className="mt-2 text-sm text-red-800 dark:text-red-200/90">
        {copy.description}
      </p>
      <label className="mt-4 block text-sm text-red-900 dark:text-red-100">
        <span className="mb-1 block font-medium">{copy.confirmationLabel}</span>
        <input
          type="text"
          data-testid="delete-account-confirmation"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          autoComplete="off"
          className="w-full max-w-xs rounded border border-red-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-red-800 dark:bg-zinc-950 dark:text-zinc-100"
          placeholder={copy.confirmationPlaceholder}
        />
      </label>
      <button
        type="button"
        data-testid="delete-account-submit"
        disabled={!canSubmit}
        onClick={() => void handleDelete()}
        className="mt-4 rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-800 dark:hover:bg-red-700"
      >
        {submitting ? copy.submitting : copy.submit}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-red-800 dark:text-red-200" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

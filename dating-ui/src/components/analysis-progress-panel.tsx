'use client';

import Link from 'next/link';
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  getCopy,
  readStoredLocale,
  type AppLocale,
} from '@/lib/i18n';
import { useEffect, useState } from 'react';

export function AnalysisProgressPanel({
  profileStatus,
  failed = false,
  redirecting = false,
  onRetry,
}: {
  profileStatus: string | undefined;
  failed?: boolean;
  redirecting?: boolean;
  onRetry?: () => void;
}) {
  const [locale, setLocale] = useState<AppLocale>(() => readStoredLocale());
  const copy = getCopy(locale).analysisProgress;

  useEffect(() => {
    setLocale(readStoredLocale());
    const onLocaleChanged = (event: Event) => {
      const e = event as CustomEvent<AppLocale>;
      if (e.detail) {
        setLocale(e.detail);
        return;
      }
      setLocale(readStoredLocale());
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === APP_LOCALE_STORAGE_KEY) {
        setLocale(readStoredLocale());
      }
    };
    window.addEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const submittedActive =
    profileStatus === 'SUBMITTED' ||
    profileStatus === 'ANALYZING' ||
    profileStatus === 'FAILED';
  const analyzingActive =
    profileStatus === 'ANALYZING' || redirecting;

  return (
    <section
      data-testid="analysis-progress-panel"
      className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {failed ? copy.failedTitle : copy.title}
      </h1>
      {!failed ? (
        <>
          <ol className="mt-4 space-y-2 text-sm">
            <li
              data-testid="analysis-step-submitted"
              className={
                submittedActive
                  ? 'font-medium text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-400 dark:text-zinc-500'
              }
            >
              {submittedActive ? '● ' : '○ '}
              {copy.submittedStep}
            </li>
            <li
              data-testid="analysis-step-analyzing"
              className={
                analyzingActive
                  ? 'font-medium text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-400 dark:text-zinc-500'
              }
            >
              {analyzingActive ? '● ' : '○ '}
              {redirecting ? copy.redirecting : copy.analyzingStep}
            </li>
          </ol>
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{copy.waitHint}</p>
        </>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/profile?tab=edit"
          className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          {copy.editProfileLink}
        </Link>
        <Link
          href="/profile?tab=edit#photos"
          className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          {copy.addPhotoLink}
        </Link>
        <Link
          href="/about/algorithm"
          data-testid="analysis-learn-algorithm"
          className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          {copy.learnAlgorithmLink}
        </Link>
        {failed && onRetry ? (
          <button
            type="button"
            data-testid="analysis-progress-retry"
            onClick={onRetry}
            className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            {copy.retryButton}
          </button>
        ) : null}
      </div>
    </section>
  );
}

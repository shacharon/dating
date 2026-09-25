'use client';

import Link from 'next/link';
import { useAppLocale } from '@/lib/i18n';

/**
 * Empty state when matches return `not_ready` / `no_profile`.
 * Stays on Matches. Continue opens onboarding while the four facts are missing.
 */
export function MatchListNoProfileGate() {
  const { copy } = useAppLocale();
  const gate = copy.matches.list.noProfileGate;

  return (
    <div
      data-testid="match-list-no-profile-gate"
      className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/30"
      role="status"
    >
      <p className="text-base font-medium text-amber-950 dark:text-amber-100">
        {gate.title}
      </p>
      <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-200/90">
        {gate.body}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/onboarding"
          data-testid="match-no-profile-gate-cta"
          className="rounded bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600"
        >
          {gate.cta}
        </Link>
      </div>
    </div>
  );
}

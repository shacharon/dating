'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchMyProfile } from '@/lib/me-profile-api';
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  getCopy,
  readStoredLocale,
  type AppLocale,
} from '@/lib/i18n';

export function MatchListEmptyState() {
  const [locale, setLocale] = useState<AppLocale>(() => readStoredLocale());
  const [place, setPlace] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const copy = getCopy(locale).launch.emptyMatches;

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchMyProfile();
        if (cancelled || !profile) return;
        const label =
          profile.locationLabel?.trim() ||
          profile.city?.trim() ||
          null;
        setPlace(label);
      } catch {
        /* optional context */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCopyInviteLink() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
    } catch {
      setInviteCopied(false);
    }
  }

  const body = place ? copy.bodyWithPlace(place) : copy.bodyGeneric;

  return (
    <div
      data-testid="match-list-empty-state"
      className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900"
      role="status"
    >
      <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        {copy.title}
      </p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        {copy.filterHint}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/settings/preferences"
          data-testid="match-empty-edit-preferences"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {copy.editPreferences}
        </Link>
        <Link
          href="/dating/profile"
          data-testid="match-empty-edit-profile"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {copy.editProfile}
        </Link>
        <button
          type="button"
          data-testid="match-empty-invite-copy"
          onClick={() => void onCopyInviteLink()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {copy.inviteCopyLink}
        </button>
      </div>
      {inviteCopied ? (
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400" role="status">
          {copy.inviteCopied}
        </p>
      ) : null}
    </div>
  );
}

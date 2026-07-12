'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DeleteAccountSection } from '@/components/delete-account-section';
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  getCopy,
  readStoredLocale,
  type AppLocale,
} from '@/lib/i18n';

export default function SettingsAccountPage() {
  const [locale, setLocale] = useState<AppLocale>(() => readStoredLocale());
  const copy = getCopy(locale).accountSettings;

  useEffect(() => {
    setLocale(readStoredLocale());
    const onLocaleChanged = (event: Event) => {
      const e = event as CustomEvent<AppLocale>;
      setLocale(e.detail ?? readStoredLocale());
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

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {copy.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {copy.subtitle}
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {copy.legalSectionTitle}
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/privacy"
              data-testid="account-link-privacy"
              className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              {copy.privacyLink}
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              data-testid="account-link-terms"
              className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              {copy.termsLink}
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {copy.notificationsSectionTitle}
        </h2>
        <Link
          href="/dating/profile#notification-prefs"
          data-testid="account-link-notifications"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          {copy.notificationsLink}
        </Link>
      </section>

      <div className="mt-10">
        <DeleteAccountSection />
      </div>
    </main>
  );
}

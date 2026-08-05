'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  getCopy,
  readStoredLocale,
  type AppLocale,
} from '@/lib/i18n';
import { patchNotificationPreferences } from '@/lib/notification-preferences-api';

type PrefKey =
  | 'inAppNotificationsEnabled'
  | 'emailNotificationsEnabled'
  | 'highPriorityMatchEmailsEnabled';

export function NotificationPreferencesSection() {
  const { user, refresh } = useAuth();
  const [locale, setLocale] = useState<AppLocale>(() => readStoredLocale());
  const [saving, setSaving] = useState<PrefKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = getCopy(locale).profile.notifications;

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

  if (!user) {
    return null;
  }

  const highPriorityEnabled = user.highPriorityMatchEmailsEnabled ?? true;

  const handleToggle = async (key: PrefKey, next: boolean) => {
    setError(null);
    setSaving(key);
    try {
      await patchNotificationPreferences({ [key]: next });
      await refresh();
    } catch {
      setError(copy.saveError);
    } finally {
      setSaving(null);
    }
  };

  return (
    <section
      id="notification-prefs"
      className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      aria-labelledby="notification-prefs-title"
    >
      <h2
        id="notification-prefs-title"
        className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {copy.notificationsTitle}
      </h2>
      <div className="space-y-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-900 dark:text-zinc-100">
          <input
            type="checkbox"
            data-testid="notification-pref-in-app"
            checked={user.inAppNotificationsEnabled}
            disabled={saving !== null}
            onChange={(e) =>
              void handleToggle('inAppNotificationsEnabled', e.target.checked)
            }
            className="mt-0.5 rounded border-zinc-400 text-zinc-900 dark:border-zinc-500"
          />
          <span>
            <span className="font-medium">{copy.inAppLabel}</span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              {copy.inAppHelp}
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-900 dark:text-zinc-100">
          <input
            type="checkbox"
            data-testid="notification-pref-email"
            checked={user.emailNotificationsEnabled}
            disabled={saving !== null}
            onChange={(e) =>
              void handleToggle('emailNotificationsEnabled', e.target.checked)
            }
            className="mt-0.5 rounded border-zinc-400 text-zinc-900 dark:border-zinc-500"
          />
          <span>
            <span className="font-medium">{copy.emailLabel}</span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              {copy.emailHelp}
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-900 dark:text-zinc-100">
          <input
            type="checkbox"
            data-testid="notification-pref-high-priority"
            checked={highPriorityEnabled}
            disabled={saving !== null || !user.emailNotificationsEnabled}
            onChange={(e) =>
              void handleToggle(
                'highPriorityMatchEmailsEnabled',
                e.target.checked,
              )
            }
            className="mt-0.5 rounded border-zinc-400 text-zinc-900 dark:border-zinc-500"
          />
          <span>
            <span className="font-medium">{copy.highPriorityLabel}</span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              {copy.highPriorityHelp}
            </span>
          </span>
        </label>
      </div>
      {error ? (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

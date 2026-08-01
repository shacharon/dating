'use client';

import Link from 'next/link';
import { NotificationPreferencesSection } from '@/components/notification-preferences-section';
import { useAppLocale } from '@/lib/i18n';

/** Profile hub Settings tab: notifications and preference deep links. */
export function ProfileSettingsTab() {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;

  return (
    <div className="space-y-8" data-testid="profile-settings-tab">
      <section id="notifications" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {hub.settingsNotificationsHeading}
        </h2>
        <NotificationPreferencesSection />
      </section>

      <section id="match-prefs" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {hub.settingsMatchPrefsHeading}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {hub.settingsMatchPrefsBody}
        </p>
        <Link
          href="/settings/preferences"
          data-testid="profile-match-preferences-link"
          className="inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          {hub.settingsMatchPrefsCta}
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {hub.settingsAccountHeading}
        </h2>
        <div className="flex flex-col gap-2">
          <Link
            href="/settings/account"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
          >
            {hub.settingsAccountLink}
          </Link>
          <Link
            href="/settings/language"
            className="text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
          >
            {hub.settingsLanguageLink}
          </Link>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ProfileOverviewTab } from '@/components/profile/profile-overview-tab';
import { LegacyProfileTabRedirect } from '@/components/profile/legacy-profile-tab-redirect';
import { profileToFormFields } from '@/lib/profile/profile-form';
import { useAppLocale } from '@/lib/i18n';
import { useProfile } from '@/hooks/use-profile';
import { useScrollToHashOnMount } from '@/hooks/use-scroll-to-hash-on-mount';

/** Overview panel for `/profile` (legacy `?tab=` handled by redirect wrapper). */
export function ProfileOverviewPageClient() {
  const { copy } = useAppLocale();
  const vp = copy.profile.viewPage;
  const { profile, isLoading, error: loadError } = useProfile();
  const draft = useMemo(
    () => (profile ? profileToFormFields(profile) : null),
    [profile],
  );

  useScrollToHashOnMount(!isLoading);

  const mounted = !isLoading;

  return (
    <LegacyProfileTabRedirect>
      <div data-testid="profile-panel-overview">
        {!mounted && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
            {copy.common.loading}
          </p>
        )}

        {mounted && loadError && (
          <div className="space-y-3">
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {loadError}
            </p>
            <Link
              href="/onboarding"
              className="inline-block text-sm font-medium text-zinc-700 underline dark:text-zinc-300"
            >
              {vp.backToOnboarding}
            </Link>
          </div>
        )}

        {mounted && !loadError && !draft && (
          <div className="space-y-3">
            <p className="text-zinc-600 dark:text-zinc-400">{vp.noProfileBody}</p>
            <Link
              href="/onboarding"
              className="inline-block rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {copy.matchPreferences.goToOnboarding}
            </Link>
          </div>
        )}

        {mounted && !loadError && draft && (
          <ProfileOverviewTab draft={draft} profile={profile} />
        )}
      </div>
    </LegacyProfileTabRedirect>
  );
}

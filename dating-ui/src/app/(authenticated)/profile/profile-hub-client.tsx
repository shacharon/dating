'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { ProfileAnalysisTab } from '@/components/profile/profile-analysis-tab';
import { ProfileEditTab } from '@/components/profile/profile-edit-tab';
import {
  parseProfileHubTab,
  ProfileHubTabs,
} from '@/components/profile/profile-hub-tabs';
import { ProfileOverviewTab } from '@/components/profile/profile-overview-tab';
import { ProfileQualityMeter } from '@/components/profile/profile-quality-meter';
import { ProfileSettingsTab } from '@/components/profile/profile-settings-tab';
import { profileToFormFields, resolveEditableProfile } from '@/lib/profile-form';
import { useAppLocale } from '@/lib/i18n';

export default function ProfileHubClient() {
  const searchParams = useSearchParams();
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const vp = copy.profile.viewPage;
  const tab = parseProfileHubTab(searchParams.get('tab'));

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await resolveEditableProfile();
        if (cancelled) return;
        setDraft(profile ? profileToFormFields(profile) : null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : copy.onboarding.loadFailed,
          );
          setDraft(null);
        }
      } finally {
        if (!cancelled) setMounted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copy.onboarding.loadFailed]);

  useEffect(() => {
    if (!mounted) return;
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [mounted, tab]);

  return (
    <div
      className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950"
      data-testid="profile-hub"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {hub.title}
          </h1>
        </header>

        <ProfileQualityMeter draft={draft} copy={hub} />

        <ProfileHubTabs activeTab={tab} copy={hub} />

        <div
          role="tabpanel"
          aria-labelledby={`profile-tab-${tab}`}
          data-testid={`profile-panel-${tab}`}
        >
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

          {mounted && !loadError && !draft && tab === 'overview' && (
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

          {mounted && !loadError && tab === 'overview' && draft && (
            <ProfileOverviewTab draft={draft} />
          )}
          {mounted && !loadError && tab === 'edit' && <ProfileEditTab />}
          {mounted && !loadError && tab === 'analysis' && (
            <ProfileAnalysisTab />
          )}
          {mounted && !loadError && tab === 'settings' && (
            <ProfileSettingsTab />
          )}
        </div>
      </div>
    </div>
  );
}

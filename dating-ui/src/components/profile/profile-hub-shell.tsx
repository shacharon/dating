'use client';

import type { ReactNode } from 'react';
import { ProfileHubNav } from '@/components/profile/profile-hub-nav';
import { ProfileQualityMeter } from '@/components/profile/profile-quality-meter';
import {
  ProfileQualityRefreshProvider,
  useProfileQualityRefresh,
} from '@/components/profile/profile-quality-refresh-context';
import { useAppLocale } from '@/lib/i18n';

function ProfileHubShellInner({ children }: { children: ReactNode }) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const { refreshKey } = useProfileQualityRefresh();

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

        <ProfileQualityMeter copy={hub} refreshKey={refreshKey} />
        <ProfileHubNav copy={hub} />
        {children}
      </div>
    </div>
  );
}

/** Shared profile chrome: title, quality meter, section nav. */
export function ProfileHubShell({ children }: { children: ReactNode }) {
  return (
    <ProfileQualityRefreshProvider>
      <ProfileHubShellInner>{children}</ProfileHubShellInner>
    </ProfileQualityRefreshProvider>
  );
}

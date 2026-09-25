'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ProfileHubNav } from '@/components/profile/profile-hub-nav';
import {
  ProfileQualityRefreshProvider,
} from '@/components/profile/profile-quality-refresh-context';
import { useAppLocale } from '@/lib/i18n';
import { profileSectionFromPathname } from '@/lib/profile/profile-hub-paths';

function ProfileHubShellInner({ children }: { children: ReactNode }) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const pathname = usePathname() || '';
  const readOnlyOverview = profileSectionFromPathname(pathname) === 'overview';

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

        {readOnlyOverview ? null : <ProfileHubNav copy={hub} />}
        <main id="profile-main" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Shared profile chrome: title + section nav (quality lives on overview strip). */
export function ProfileHubShell({ children }: { children: ReactNode }) {
  return (
    <ProfileQualityRefreshProvider>
      <ProfileHubShellInner>{children}</ProfileHubShellInner>
    </ProfileQualityRefreshProvider>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AppCopySchema } from '@/lib/i18n/types';
import {
  PROFILE_HREF,
  type ProfileHubSectionId,
  profileSectionFromPathname,
} from '@/lib/profile/profile-hub-paths';

type Props = {
  copy: AppCopySchema['profile']['hub'];
};

/** Section nav for profile routes (overview / edit / analysis / settings). */
export function ProfileHubNav({ copy }: Props) {
  const pathname = usePathname() || PROFILE_HREF.overview;
  const active = profileSectionFromPathname(pathname);

  const tabs: { id: ProfileHubSectionId; label: string; href: string }[] = [
    { id: 'overview', label: copy.tabOverview, href: PROFILE_HREF.overview },
    { id: 'edit', label: copy.tabEdit, href: PROFILE_HREF.edit },
    { id: 'analysis', label: copy.tabAnalysis, href: PROFILE_HREF.analysis },
    { id: 'settings', label: copy.tabSettings, href: PROFILE_HREF.settings },
  ];

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <nav
        className="-mb-px flex flex-wrap gap-1 sm:gap-6"
        aria-label={copy.tablistAria}
        data-testid="profile-hub-tabs"
      >
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={selected ? 'page' : undefined}
              id={`profile-tab-${tab.id}`}
              data-testid={`profile-tab-${tab.id}`}
              className={`min-h-11 border-b-2 px-2 py-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${
                selected
                  ? 'border-zinc-900 font-semibold text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                  : 'border-transparent font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

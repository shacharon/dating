'use client';

import Link from 'next/link';
import type { AppCopySchema } from '@/lib/i18n/types';

export type ProfileHubTabId = 'overview' | 'edit' | 'analysis' | 'settings';

const TAB_IDS: ProfileHubTabId[] = [
  'overview',
  'edit',
  'analysis',
  'settings',
];

export function parseProfileHubTab(raw: string | null): ProfileHubTabId {
  if (raw && TAB_IDS.includes(raw as ProfileHubTabId)) {
    return raw as ProfileHubTabId;
  }
  return 'overview';
}

type Props = {
  activeTab: ProfileHubTabId;
  copy: AppCopySchema['profile']['hub'];
};

export function ProfileHubTabs({ activeTab, copy }: Props) {
  const tabs: { id: ProfileHubTabId; label: string }[] = [
    { id: 'overview', label: copy.tabOverview },
    { id: 'edit', label: copy.tabEdit },
    { id: 'analysis', label: copy.tabAnalysis },
    { id: 'settings', label: copy.tabSettings },
  ];

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800">
      <nav
        className="-mb-px flex flex-wrap gap-1 sm:gap-6"
        role="tablist"
        aria-label={copy.tablistAria}
        data-testid="profile-hub-tabs"
      >
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/profile?tab=${tab.id}`}
              role="tab"
              aria-selected={selected}
              id={`profile-tab-${tab.id}`}
              data-testid={`profile-tab-${tab.id}`}
              className={`min-h-11 border-b-2 px-2 py-3 text-sm transition-colors ${
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

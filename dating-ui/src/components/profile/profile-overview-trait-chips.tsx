'use client';

import { useAppLocale } from '@/lib/i18n';

type Props = {
  highlights: string[];
};

/** Non-link trait chips from latest analysis (omit when empty). */
export function ProfileOverviewTraitChips({ highlights }: Props) {
  const { copy } = useAppLocale();
  if (highlights.length === 0) return null;

  return (
    <ul
      className="flex flex-wrap gap-2"
      data-testid="profile-overview-trait-chips"
      aria-label={copy.profile.hub.overviewTraitsAria}
    >
      {highlights.map((label) => (
        <li
          key={label}
          className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {label}
        </li>
      ))}
    </ul>
  );
}

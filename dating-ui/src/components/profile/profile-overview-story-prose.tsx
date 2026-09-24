'use client';

import Link from 'next/link';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { overviewStoryIsEmpty } from '@/components/profile/profile-overview-display';
import { useAppLocale } from '@/lib/i18n';
import { profileEditHash } from '@/lib/profile/profile-hub-paths';

type Props = {
  draft: ProfileDraft;
};

/**
 * Read-only story sections for profile Overview (not form cards).
 * All-empty → one designed empty state (no grey boxes / bare empties).
 */
export function ProfileOverviewStoryProse({ draft }: Props) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const tf = copy.onboarding.textsForm;
  const empty = copy.profile.viewPage.emptyValue;

  if (overviewStoryIsEmpty(draft)) {
    return (
      <div
        className="space-y-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-5 py-8 text-center dark:border-zinc-600 dark:bg-zinc-900/40"
        data-testid="profile-overview-story-empty"
      >
        <p className="text-base font-medium text-zinc-800 dark:text-zinc-100">
          {hub.overviewStoryEmptyTitle}
        </p>
        <Link
          href={profileEditHash('story')}
          className="inline-flex min-h-11 items-center font-medium text-zinc-900 underline decoration-zinc-400 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-zinc-100"
        >
          {hub.overviewStoryEmptyCta}
        </Link>
      </div>
    );
  }

  const sections: { key: string; label: string; value: string }[] = [
    { key: 'aboutMe', label: tf.aboutMeLabel, value: draft.aboutMe?.trim() ?? '' },
    {
      key: 'aboutPartner',
      label: tf.aboutPartnerLabel,
      value: draft.aboutPartner?.trim() ?? '',
    },
    {
      key: 'aboutRelationship',
      label: tf.aboutRelationshipLabel,
      value: draft.aboutRelationship?.trim() ?? '',
    },
  ];

  return (
    <div className="space-y-4" data-testid="profile-overview-story-prose">
      {sections.map((s) => (
        <section
          key={s.key}
          className="rounded-xl border border-zinc-200/80 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {s.label}
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {s.value || empty}
          </p>
        </section>
      ))}
    </div>
  );
}

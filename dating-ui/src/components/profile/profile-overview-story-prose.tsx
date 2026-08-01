'use client';

import type { ProfileDraft } from '@/app/dating/_lib/types';
import { useAppLocale } from '@/lib/i18n';

type Props = {
  draft: ProfileDraft;
};

/**
 * Read-only story sections for profile Overview (not form cards).
 */
export function ProfileOverviewStoryProse({ draft }: Props) {
  const { copy } = useAppLocale();
  const tf = copy.onboarding.textsForm;
  const empty = copy.profile.viewPage.emptyValue;

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

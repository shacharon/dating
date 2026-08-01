'use client';

import type { ProfileDraft } from '@/app/dating/_lib/types';
import { ProfileOverviewHero } from '@/components/profile/profile-overview-hero';
import { ProfileOverviewStoryProse } from '@/components/profile/profile-overview-story-prose';

type Props = {
  draft: ProfileDraft;
};

/** Profile hub Overview: hero match card + read-only story prose. */
export function ProfileOverviewTab({ draft }: Props) {
  return (
    <div className="space-y-8" data-testid="profile-overview-tab">
      <ProfileOverviewHero draft={draft} />
      <ProfileOverviewStoryProse draft={draft} />
    </div>
  );
}

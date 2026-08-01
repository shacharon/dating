'use client';

import { OnboardingBasicForm } from '@/components/onboarding-basic-form';
import { OnboardingTextsForm } from '@/components/onboarding-texts-form';
import { ProfilePhotoSection } from '@/components/profile-photo-section';
import { useAppLocale } from '@/lib/i18n';

/**
 * Profile hub Edit tab: photos, basics, and story forms with deep-link anchors.
 */
export function ProfileEditTab({
  onProfileMutated,
}: {
  onProfileMutated?: () => void;
} = {}) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;

  return (
    <div className="space-y-10" data-testid="profile-edit-tab">
      <section id="basic" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {hub.editSectionBasic}
        </h2>
        <OnboardingBasicForm variant="profileHub" onSaved={onProfileMutated} />
      </section>

      <section id="story" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {hub.editSectionStory}
        </h2>
        <OnboardingTextsForm variant="profileHub" onSaved={onProfileMutated} />
      </section>

      <section id="photos" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {hub.editSectionPhotos}
        </h2>
        <ProfilePhotoSection
          requiredForMatching
          onMutated={onProfileMutated}
        />
      </section>
    </div>
  );
}

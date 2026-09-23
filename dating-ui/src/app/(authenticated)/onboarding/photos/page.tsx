'use client';

import { ProfilePhotoSection } from '@/components/profile-photo-section';
import { useAppLocale } from '@/lib/i18n';

/** Sprint 75 Story 3 interim photos stub — Finish arrives in Story 4. */
export default function OnboardingPhotosPage() {
  const { copy } = useAppLocale();
  const ff = copy.onboarding.factsForm;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {ff.photosStubTitle}
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {ff.photosStubBody}
          </p>
        </header>
        <ProfilePhotoSection requiredForMatching />
      </div>
    </div>
  );
}

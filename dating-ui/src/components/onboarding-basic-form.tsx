'use client';

import { ContentModerationErrorAlert } from '@/components/content-moderation-error-alert';
import { ProfilePhotoSection } from '@/components/profile-photo-section';
import { OnboardingBasicFields } from '@/components/onboarding-basic-fields';
import { DatingChapterFields } from '@/components/dating-chapter-fields';
import { useOnboardingBasicForm } from '@/hooks/use-onboarding-basic-form';

export function OnboardingBasicForm({
  variant = 'onboarding',
  onSaved,
}: {
  variant?: 'onboarding' | 'profileHub';
  /** Called after a successful persist (hub quality meter refresh). */
  onSaved?: () => void;
} = {}) {
  const m = useOnboardingBasicForm({ variant, onSaved });

  return (
    <div className="space-y-6">
      {m.loadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {m.loadError}
        </p>
      ) : null}

      {m.profileSyncing ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {m.ob.syncingProfile}
        </p>
      ) : null}

      <div
        className={`space-y-6 ${m.profileSyncing ? 'pointer-events-none opacity-60' : ''}`}
        aria-busy={m.profileSyncing}
      >
        <OnboardingBasicFields
          bf={m.bf}
          genderCopy={m.genderCopy}
          googleName={m.googleName}
          nickname={m.nickname}
          onNicknameChange={m.setNickname}
          birthDate={m.birthDate}
          birthDateMax={m.birthDateMax}
          derivedAge={m.derivedAge}
          onBirthDateChange={m.setBirthDate}
          gender={m.gender}
          genderStepError={m.genderStepError}
          onGenderChange={(value) => {
            m.setGenderStepError(null);
            m.setGender(value);
          }}
          desiredPartnerGenders={m.desiredPartnerGenders}
          partnerError={m.partnerError}
          onPartnerGenderChange={m.setPartnerGender}
          city={m.city}
          onCityChange={m.setCity}
          country={m.country}
          onCountryChange={m.setCountry}
          locationLabel={m.locationLabel}
          onLocationLabelChange={m.setLocationLabel}
        />

        <DatingChapterFields
          copy={m.bf.datingChapter}
          value={m.datingChapter}
          onChange={m.setDatingChapter}
          disabled={m.profileSyncing}
        />

        {!m.isHub ? <ProfilePhotoSection requiredForMatching /> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void m.handleSaveProgress()}
            disabled={m.profileSyncing}
            className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {m.ob.saveProgress}
          </button>
          {!m.isHub ? (
            <button
              type="button"
              onClick={() => void m.handleContinueToTexts()}
              disabled={m.profileSyncing}
              className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {m.bf.continueToStory}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void m.handleContinueToTexts()}
              disabled={m.profileSyncing}
              data-testid="profile-hub-basic-save"
              className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {m.ob.saveProgress}
            </button>
          )}
        </div>
      </div>

      {m.savedFlash ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
          {m.ob.savedFlash}
        </p>
      ) : null}
      {m.moderationDetails ? (
        <ContentModerationErrorAlert
          details={m.moderationDetails}
          variant="profile"
          title={m.mod.profileTitle}
          labels={{
            fieldLabel: m.mod.fieldLabel,
            flaggedLabel: m.mod.flaggedLabel,
            whyLabel: m.mod.whyLabel,
            suggestionLabel: m.mod.suggestionLabel,
            exampleLabel: m.mod.exampleLabel,
            mutedLabel: m.mod.mutedLabel,
            dismiss: m.mod.dismiss,
          }}
          onDismiss={() => m.setModerationDetails(null)}
        />
      ) : null}
      {m.saveError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {m.saveError}
        </p>
      ) : null}
    </div>
  );
}

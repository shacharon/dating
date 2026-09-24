'use client';

import { ContentModerationErrorAlert } from '@/components/content-moderation-error-alert';
import { InlineError } from '@/components/errors';
import { ProfilePhotoSection } from '@/components/profile-photo-section';
import { OnboardingBasicFields } from '@/components/onboarding-basic-fields';
import { DatingChapterFields } from '@/components/dating-chapter-fields';
import { useOnboardingBasicForm } from '@/hooks/use-onboarding-basic-form';

/**
 * Profile-hub basics editor (nickname, dating chapter, location, photos).
 * First-login facts live on `/onboarding/basics` via `OnboardingFactsForm`.
 */
export function OnboardingBasicForm({
  variant = 'profileHub',
  onSaved,
}: {
  variant?: 'onboarding' | 'profileHub';
  /** Called after a successful persist (hub quality meter refresh). */
  onSaved?: () => void;
} = {}) {
  const m = useOnboardingBasicForm({ variant, onSaved });

  const hasValidationErrors = Boolean(
    m.genderStepError || m.partnerError || m.locationError,
  );

  return (
    <div className="space-y-6">
      {m.loadError ? <InlineError>{m.loadError}</InlineError> : null}

      {m.profileSyncing ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {m.ob.syncingProfile}
        </p>
      ) : null}

      {hasValidationErrors ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            {m.bf.requiredFieldsBanner}
          </p>
        </div>
      ) : null}

      <div
        className={`space-y-6 ${m.profileSyncing ? 'pointer-events-none opacity-60' : ''}`}
        aria-busy={m.profileSyncing}
      >
        <div className="space-y-6">
          <OnboardingBasicFields
            part="required"
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
            countries={m.countries}
            usStates={m.usStates}
            cities={m.cities}
            countryCode={m.countryCode}
            usStateCode={m.usStateCode}
            cityId={m.cityId}
            locale={m.locale}
            locationError={m.locationError}
            onCountryCodeChange={m.setCountryCode}
            onUsStateCodeChange={m.setUsStateCode}
            onCityIdChange={m.setCityId}
          />
        </div>

        <div className="space-y-6">
          <OnboardingBasicFields
            part="rest"
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
            countries={m.countries}
            usStates={m.usStates}
            cities={m.cities}
            countryCode={m.countryCode}
            usStateCode={m.usStateCode}
            cityId={m.cityId}
            locale={m.locale}
            locationError={m.locationError}
            onCountryCodeChange={m.setCountryCode}
            onUsStateCodeChange={m.setUsStateCode}
            onCityIdChange={m.setCityId}
          />
          <DatingChapterFields
            copy={m.bf.datingChapter}
            value={m.datingChapter}
            onChange={m.setDatingChapter}
            disabled={m.profileSyncing}
          />
        </div>

        <ProfilePhotoSection requiredForMatching />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void m.handleSaveProgress()}
            disabled={m.profileSyncing}
            className="inline-flex min-h-11 items-center rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:outline-zinc-100"
          >
            {m.ob.saveProgress}
          </button>
          <button
            type="button"
            onClick={() => void m.handleHubSave()}
            disabled={m.profileSyncing}
            data-testid="profile-hub-basic-save"
            className="inline-flex min-h-11 items-center rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100"
          >
            {m.bf.hubSaveButton}
          </button>
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
      {m.saveError ? <InlineError>{m.saveError}</InlineError> : null}
    </div>
  );
}

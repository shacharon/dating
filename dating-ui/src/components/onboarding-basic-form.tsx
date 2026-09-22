'use client';

import { useSearchParams } from 'next/navigation';
import { ContentModerationErrorAlert } from '@/components/content-moderation-error-alert';
import { InlineError } from '@/components/errors';
import { ProfilePhotoSection } from '@/components/profile-photo-section';
import { OnboardingBasicFields } from '@/components/onboarding-basic-fields';
import { DatingChapterFields } from '@/components/dating-chapter-fields';
import { OnboardingTextFieldHelp } from '@/components/onboarding/onboarding-text-field-help';
import { useOnboardingBasicForm } from '@/hooks/use-onboarding-basic-form';
import { onboardingTabFromSearchParams } from '@/components/onboarding/onboarding-step';

const inputClass =
  'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400';
const labelClass =
  'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export function OnboardingBasicForm({
  variant = 'onboarding',
  onSaved,
}: {
  variant?: 'onboarding' | 'profileHub';
  /** Called after a successful persist (hub quality meter refresh). */
  onSaved?: () => void;
} = {}) {
  const m = useOnboardingBasicForm({ variant, onSaved });
  const searchParams = useSearchParams();
  const activeTab = m.isHub
    ? 'basic'
    : onboardingTabFromSearchParams(searchParams);

  const hasValidationErrors = Boolean(
    m.genderStepError || m.partnerError || m.locationError,
  );

  const continueLabel =
    activeTab === 'other' ? m.bf.finishButton : m.bf.continueButton;

  return (
    <div className="space-y-6">
      {m.loadError ? <InlineError>{m.loadError}</InlineError> : null}

      {m.profileSyncing ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {m.ob.syncingProfile}
        </p>
      ) : null}

      {!m.isHub && hasValidationErrors ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">
            Please complete required fields in the Basic tab before continuing.
          </p>
        </div>
      ) : null}

      <div
        className={`space-y-6 ${m.profileSyncing ? 'pointer-events-none opacity-60' : ''}`}
        aria-busy={m.profileSyncing}
      >
        {/* Basic tab */}
        {(m.isHub || activeTab === 'basic') && (
          <div className="space-y-6">
            {!m.isHub ? (
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {m.bf.basicTabTitle}
              </h2>
            ) : null}
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
            {!m.isHub ? <ProfilePhotoSection requiredForMatching /> : null}
          </div>
        )}

        {/* Story tab — about me / partner / relationship */}
        {(m.isHub || activeTab === 'story') && (
          <div className="space-y-6">
            {!m.isHub ? (
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {m.bf.storyTabTitle}
              </h2>
            ) : null}
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {m.ob.textsForm.intro}
            </p>
            <div>
              <label htmlFor="onb-about-me" className={labelClass}>
                {m.ob.textsForm.aboutMeLabel}
              </label>
              <textarea
                id="onb-about-me"
                value={m.aboutMe}
                onChange={(e) => m.setAboutMe(e.target.value)}
                rows={4}
                className={`${inputClass} min-h-[6rem]`}
                placeholder={m.ob.textsForm.aboutMePlaceholder}
              />
              <OnboardingTextFieldHelp
                value={m.aboutMe}
                field={m.ob.writingPrompts.aboutMe}
                chrome={m.ob.textsForm.writingHelp}
                testIdPrefix="onb-about-me"
              />
            </div>
            <div>
              <label htmlFor="onb-about-partner" className={labelClass}>
                {m.ob.textsForm.aboutPartnerLabel}
              </label>
              <textarea
                id="onb-about-partner"
                value={m.aboutPartner}
                onChange={(e) => m.setAboutPartner(e.target.value)}
                rows={4}
                className={`${inputClass} min-h-[6rem]`}
                placeholder={m.ob.textsForm.aboutPartnerPlaceholder}
              />
              <OnboardingTextFieldHelp
                value={m.aboutPartner}
                field={m.ob.writingPrompts.aboutPartner}
                chrome={m.ob.textsForm.writingHelp}
                testIdPrefix="onb-about-partner"
              />
            </div>
            <div>
              <label htmlFor="onb-about-rel" className={labelClass}>
                {m.ob.textsForm.aboutRelationshipLabel}
              </label>
              <textarea
                id="onb-about-rel"
                value={m.aboutRelationship}
                onChange={(e) => m.setAboutRelationship(e.target.value)}
                rows={4}
                className={`${inputClass} min-h-[6rem]`}
                placeholder={m.ob.textsForm.aboutRelationshipPlaceholder}
              />
              <OnboardingTextFieldHelp
                value={m.aboutRelationship}
                field={m.ob.writingPrompts.aboutRelationship}
                chrome={m.ob.textsForm.writingHelp}
                testIdPrefix="onb-about-rel"
              />
            </div>
          </div>
        )}

        {/* Other tab — nickname, birth, dating journey */}
        {(m.isHub || activeTab === 'other') && (
          <div className="space-y-6">
            {!m.isHub ? (
              <>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {m.bf.otherTabTitle}
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {m.bf.otherTabSubtitle}
                </p>
              </>
            ) : null}
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
        )}

        {m.isHub ? <ProfilePhotoSection requiredForMatching /> : null}

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
              {continueLabel}
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
      {m.saveError ? <InlineError>{m.saveError}</InlineError> : null}
    </div>
  );
}

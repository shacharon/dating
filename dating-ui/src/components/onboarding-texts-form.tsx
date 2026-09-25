'use client';

import { useEffect, useRef } from 'react';
import { ContentModerationErrorAlert } from '@/components/content-moderation-error-alert';
import { InlineError } from '@/components/errors';
import { FieldSpeechButton } from '@/components/onboarding/field-speech-button';
import { OnboardingTextFieldHelp } from '@/components/onboarding/onboarding-text-field-help';
import { useOnboardingAutosave } from '@/components/onboarding/onboarding-autosave';
import { appendTranscript } from '@/lib/speech/field-speech';
import { useOnboardingTextsForm } from '@/hooks/use-onboarding-texts-form';

function fieldLabelFor(
  field: string | undefined,
  tf: {
    aboutMeLabel: string;
    aboutPartnerLabel: string;
    aboutRelationshipLabel: string;
  },
): string | null {
  if (field === 'aboutMe') return tf.aboutMeLabel;
  if (field === 'aboutPartner') return tf.aboutPartnerLabel;
  if (field === 'aboutRelationship') return tf.aboutRelationshipLabel;
  return null;
}

export function OnboardingTextsForm({
  variant = 'onboarding',
  onSaved,
}: {
  variant?: 'onboarding' | 'profileHub';
  /** Called after a successful save (hub quality meter refresh). */
  onSaved?: () => void;
} = {}) {
  const m = useOnboardingTextsForm({ variant, onSaved });
  const autosave = useOnboardingAutosave();
  const flushRef = useRef(m.flushTexts);
  flushRef.current = m.flushTexts;

  useEffect(() => {
    if (!autosave) return;
    return autosave.register(() => flushRef.current().then(() => undefined));
  }, [autosave]);

  const inputClass =
    'w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-5 text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500';
  const labelClass =
    'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

  return (
    <div className="space-y-6" data-testid="onboarding-story-form">
      {m.loadError ? <InlineError>{m.loadError}</InlineError> : null}

      {m.profileSyncing ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {m.ob.syncingProfile}
        </p>
      ) : null}

      <div
        className={`space-y-6 ${m.profileSyncing ? 'pointer-events-none opacity-60' : ''}`}
        aria-busy={m.profileSyncing}
      >
        <div>
          <label htmlFor="ot-about-me" className={labelClass}>
            {m.tf.aboutMeLabel}
          </label>
          <FieldSpeechButton
            fieldId="ot-about-me"
            fieldLabel={m.tf.aboutMeLabel}
            copy={m.tf.voice}
            onAppend={(spoken) => {
              m.setAboutMe((prev) => appendTranscript(prev, spoken));
              m.clearModeration();
            }}
          >
          <textarea
            id="ot-about-me"
            ref={m.aboutMeRef}
            value={m.aboutMe}
            onChange={(e) => {
              m.setAboutMe(e.target.value);
              m.clearModeration();
            }}
            rows={4}
            className={`${inputClass} min-h-[4.25rem] w-full pb-9 pe-10`}
            placeholder={m.tf.aboutMePlaceholder}
            onBlur={() => void m.flushTexts()}
          />
          </FieldSpeechButton>
          <OnboardingTextFieldHelp
            value={m.aboutMe}
            field={m.prompts.aboutMe}
            chrome={m.wh}
            testIdPrefix="ot-about-me"
          />
        </div>

        <div>
          <label htmlFor="ot-about-partner" className={labelClass}>
            {m.tf.aboutPartnerLabel}
          </label>
          <FieldSpeechButton
            fieldId="ot-about-partner"
            fieldLabel={m.tf.aboutPartnerLabel}
            copy={m.tf.voice}
            onAppend={(spoken) => {
              m.setAboutPartner((prev) => appendTranscript(prev, spoken));
              m.clearModeration();
            }}
          >
          <textarea
            id="ot-about-partner"
            ref={m.aboutPartnerRef}
            value={m.aboutPartner}
            onChange={(e) => {
              m.setAboutPartner(e.target.value);
              m.clearModeration();
            }}
            rows={4}
            className={`${inputClass} min-h-[4.25rem] w-full pb-9 pe-10`}
            placeholder={m.tf.aboutPartnerPlaceholder}
            onBlur={() => void m.flushTexts()}
          />
          </FieldSpeechButton>
          <OnboardingTextFieldHelp
            value={m.aboutPartner}
            field={m.prompts.aboutPartner}
            chrome={m.wh}
            testIdPrefix="ot-about-partner"
          />
        </div>

        <div>
          <label htmlFor="ot-about-rel" className={labelClass}>
            {m.tf.aboutRelationshipLabel}
          </label>
          <FieldSpeechButton
            fieldId="ot-about-rel"
            fieldLabel={m.tf.aboutRelationshipLabel}
            copy={m.tf.voice}
            onAppend={(spoken) => {
              m.setAboutRelationship((prev) => appendTranscript(prev, spoken));
              m.clearModeration();
            }}
          >
          <textarea
            id="ot-about-rel"
            ref={m.aboutRelationshipRef}
            value={m.aboutRelationship}
            onChange={(e) => {
              m.setAboutRelationship(e.target.value);
              m.clearModeration();
            }}
            rows={4}
            className={`${inputClass} min-h-[4.25rem] w-full pb-9 pe-10`}
            placeholder={m.tf.aboutRelationshipPlaceholder}
            onBlur={() => void m.flushTexts()}
          />
          </FieldSpeechButton>
          <OnboardingTextFieldHelp
            value={m.aboutRelationship}
            field={m.prompts.aboutRelationship}
            chrome={m.wh}
            testIdPrefix="ot-about-rel"
          />
        </div>
      </div>
      {m.moderationDetails ? (
        <ContentModerationErrorAlert
          details={m.moderationDetails}
          variant="profile"
          title={m.mod.profileTitle}
          fieldLabel={fieldLabelFor(m.moderationDetails.field, m.tf)}
          labels={m.moderationLabels}
          onDismiss={m.clearModeration}
        />
      ) : null}
      {m.saveError ? <InlineError>{m.saveError}</InlineError> : null}
    </div>
  );
}

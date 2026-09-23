'use client';

import Link from 'next/link';
import { ContentModerationErrorAlert } from '@/components/content-moderation-error-alert';
import { InlineError } from '@/components/errors';
import { OnboardingTextFieldHelp } from '@/components/onboarding/onboarding-text-field-help';
import { StoryVoiceRecorder } from '@/components/onboarding/story-voice-recorder';
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

  const inputClass =
    'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400';
  const labelClass =
    'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

  const primaryLabel =
    m.isHub || m.editMode
      ? m.ob.saveProgress
      : m.ob.basicForm.continueButton;
  const busy = m.continuing || m.profileSyncing;

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
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{m.tf.intro}</p>

        <StoryVoiceRecorder
          copy={m.tf.voice}
          fieldsDirtyForRerecord={m.fieldsDirtyForRerecord}
          onDraft={(draft) => m.applyVoiceDraft(draft)}
          onModerationError={(err) => m.applyVoiceModerationError(err)}
        />

        {m.voiceDraftApplied ? (
          <p
            className="text-xs font-medium text-emerald-700 dark:text-emerald-400"
            role="status"
          >
            {m.tf.voice.draftBadge}
          </p>
        ) : null}

        <div>
          <label htmlFor="ot-about-me" className={labelClass}>
            {m.tf.aboutMeLabel}
          </label>
          <textarea
            id="ot-about-me"
            ref={m.aboutMeRef}
            value={m.aboutMe}
            onChange={(e) => {
              m.setAboutMe(e.target.value);
              m.clearModeration();
            }}
            rows={4}
            className={`${inputClass} min-h-[6rem]`}
            placeholder={m.tf.aboutMePlaceholder}
          />
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
          <textarea
            id="ot-about-partner"
            ref={m.aboutPartnerRef}
            value={m.aboutPartner}
            onChange={(e) => {
              m.setAboutPartner(e.target.value);
              m.clearModeration();
            }}
            rows={4}
            className={`${inputClass} min-h-[6rem]`}
            placeholder={m.tf.aboutPartnerPlaceholder}
          />
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
          <textarea
            id="ot-about-rel"
            ref={m.aboutRelationshipRef}
            value={m.aboutRelationship}
            onChange={(e) => {
              m.setAboutRelationship(e.target.value);
              m.clearModeration();
            }}
            rows={4}
            className={`${inputClass} min-h-[6rem]`}
            placeholder={m.tf.aboutRelationshipPlaceholder}
          />
          <OnboardingTextFieldHelp
            value={m.aboutRelationship}
            field={m.prompts.aboutRelationship}
            chrome={m.wh}
            testIdPrefix="ot-about-rel"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!m.isHub && !m.editMode ? (
            <button
              type="button"
              onClick={() => void m.handleSaveProgress()}
              disabled={busy}
              className="inline-flex min-h-11 items-center rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {m.ob.saveProgress}
            </button>
          ) : null}
          <button
            type="button"
            data-testid="onboarding-story-primary"
            onClick={() => void m.handleContinue()}
            disabled={busy}
            className="inline-flex min-h-11 items-center rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {m.continuing ? m.tf.submitting : primaryLabel}
          </button>
          {/** First-time story is screen 1 — "back to basics" only makes sense in edit mode. */}
          {!m.isHub && m.editMode ? (
            <Link
              href={m.editBasicsHref}
              prefetch
              className={`inline-flex min-h-11 items-center text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100 ${m.profileSyncing ? 'pointer-events-none opacity-50' : ''}`}
              aria-disabled={m.profileSyncing}
            >
              {m.tf.backToBasics}
            </Link>
          ) : null}
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
          fieldLabel={fieldLabelFor(m.moderationDetails.field, m.tf)}
          labels={m.moderationLabels}
          onDismiss={m.clearModeration}
        />
      ) : null}
      {m.saveError ? <InlineError>{m.saveError}</InlineError> : null}
    </div>
  );
}

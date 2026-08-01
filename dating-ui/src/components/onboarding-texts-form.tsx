'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchMyProfile,
  patchMyProfile,
  submitMyProfileForAnalysis,
} from '@/lib/me-profile-api';
import {
  ContentModerationApiError,
  type ContentModerationDetails,
} from '@/lib/content-moderation-error';
import { ContentModerationErrorAlert } from '@/components/content-moderation-error-alert';
import { useAppLocale } from '@/lib/i18n';
import { onboardingResumePath } from '@/lib/onboarding-path';

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

export function OnboardingTextsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { copy } = useAppLocale();
  const ob = copy.onboarding;
  const tf = ob.textsForm;
  const mod = copy.contentModeration;
  const [aboutMe, setAboutMe] = useState('');
  const [aboutPartner, setAboutPartner] = useState('');
  const [aboutRelationship, setAboutRelationship] = useState('');
  const [profileSyncing, setProfileSyncing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [moderationDetails, setModerationDetails] =
    useState<ContentModerationDetails | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const aboutMeRef = useRef<HTMLTextAreaElement>(null);
  const aboutPartnerRef = useRef<HTMLTextAreaElement>(null);
  const aboutRelationshipRef = useRef<HTMLTextAreaElement>(null);

  const resumeOptions = useMemo(
    () =>
      searchParams.get('edit') === '1'
        ? ({ edit: true, page: 'texts' } as const)
        : undefined,
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchMyProfile();
        if (cancelled) return;
        const path = onboardingResumePath(profile, resumeOptions);
        if (path !== '/onboarding/texts') {
          setProfileSyncing(false);
          router.replace(path);
          return;
        }
        if (!profile) {
          setProfileSyncing(false);
          router.replace('/onboarding/basic');
          return;
        }
        setAboutMe(profile.aboutMe ?? '');
        setAboutPartner(profile.aboutPartner ?? '');
        setAboutRelationship(profile.aboutRelationship ?? '');
        setProfileSyncing(false);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : ob.loadFailed);
          setProfileSyncing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, resumeOptions, ob.loadFailed]);

  useEffect(() => {
    if (!moderationDetails?.field) return;
    const el =
      moderationDetails.field === 'aboutMe'
        ? aboutMeRef.current
        : moderationDetails.field === 'aboutPartner'
          ? aboutPartnerRef.current
          : moderationDetails.field === 'aboutRelationship'
            ? aboutRelationshipRef.current
            : null;
    el?.focus();
    if (typeof el?.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [moderationDetails]);

  function clearModeration() {
    setModerationDetails(null);
  }

  function applyCaughtError(
    e: unknown,
    setFlat: (msg: string) => void,
    flatFallback: string,
  ) {
    if (e instanceof ContentModerationApiError) {
      setModerationDetails(e.details);
      setSaveError(null);
      setFinishError(null);
      return;
    }
    clearModeration();
    setFlat(e instanceof Error ? e.message : flatFallback);
  }

  async function handleSaveProgress() {
    setSaveError(null);
    clearModeration();
    try {
      await patchMyProfile({
        aboutMe: aboutMe.trim() ? aboutMe : null,
        aboutPartner: aboutPartner.trim() ? aboutPartner : null,
        aboutRelationship: aboutRelationship.trim()
          ? aboutRelationship
          : null,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      applyCaughtError(e, setSaveError, ob.saveFailed);
    }
  }

  async function handleFinish() {
    setFinishError(null);
    clearModeration();
    try {
      const latest = await fetchMyProfile();
      if (
        !latest?.gender ||
        latest.gender === 'PREFER_NOT_TO_SAY'
      ) {
        setFinishError(tf.genderMissingError);
        return;
      }
    } catch {
      setFinishError(tf.verifyFailedError);
      return;
    }

    setFinishing(true);
    try {
      await patchMyProfile({
        aboutMe: aboutMe.trim() ? aboutMe : null,
        aboutPartner: aboutPartner.trim() ? aboutPartner : null,
        aboutRelationship: aboutRelationship.trim()
          ? aboutRelationship
          : null,
        onboardingStep: 'COMPLETED',
      });
      await submitMyProfileForAnalysis();
      router.replace('/dating/analysis');
    } catch (e) {
      setFinishing(false);
      applyCaughtError(e, setFinishError, tf.finishFailedError);
    }
  }

  const inputClass =
    'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400';
  const labelClass =
    'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

  const moderationLabels = {
    fieldLabel: mod.fieldLabel,
    flaggedLabel: mod.flaggedLabel,
    whyLabel: mod.whyLabel,
    suggestionLabel: mod.suggestionLabel,
    exampleLabel: mod.exampleLabel,
    mutedLabel: mod.mutedLabel,
    dismiss: mod.dismiss,
  };

  return (
    <div className="space-y-6">
      {loadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      {profileSyncing ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {ob.syncingProfile}
        </p>
      ) : null}

      <div
        className={`space-y-6 ${profileSyncing ? 'pointer-events-none opacity-60' : ''}`}
        aria-busy={profileSyncing}
      >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {tf.intro}
      </p>

      <div>
        <label htmlFor="ot-about-me" className={labelClass}>
          {tf.aboutMeLabel}
        </label>
        <textarea
          id="ot-about-me"
          ref={aboutMeRef}
          value={aboutMe}
          onChange={(e) => {
            setAboutMe(e.target.value);
            clearModeration();
          }}
          rows={4}
          className={`${inputClass} min-h-[6rem]`}
          placeholder={tf.aboutMePlaceholder}
        />
      </div>

      <div>
        <label htmlFor="ot-about-partner" className={labelClass}>
          {tf.aboutPartnerLabel}
        </label>
        <textarea
          id="ot-about-partner"
          ref={aboutPartnerRef}
          value={aboutPartner}
          onChange={(e) => {
            setAboutPartner(e.target.value);
            clearModeration();
          }}
          rows={4}
          className={`${inputClass} min-h-[6rem]`}
          placeholder={tf.aboutPartnerPlaceholder}
        />
      </div>

      <div>
        <label htmlFor="ot-about-rel" className={labelClass}>
          {tf.aboutRelationshipLabel}
        </label>
        <textarea
          id="ot-about-rel"
          ref={aboutRelationshipRef}
          value={aboutRelationship}
          onChange={(e) => {
            setAboutRelationship(e.target.value);
            clearModeration();
          }}
          rows={4}
          className={`${inputClass} min-h-[6rem]`}
          placeholder={tf.aboutRelationshipPlaceholder}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSaveProgress()}
          disabled={finishing || profileSyncing}
          className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {ob.saveProgress}
        </button>
        <button
          type="button"
          onClick={() => void handleFinish()}
          disabled={finishing || profileSyncing}
          className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {finishing ? tf.submitting : tf.finishAndAnalyze}
        </button>
        <Link
          href={
            searchParams.get('edit') === '1'
              ? '/onboarding/basic?edit=1'
              : '/onboarding/basic'
          }
          prefetch
          className={`text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100 ${profileSyncing ? 'pointer-events-none opacity-50' : ''}`}
          aria-disabled={profileSyncing}
        >
          {tf.backToBasics}
        </Link>
      </div>
      </div>

      {savedFlash ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
          {ob.savedFlash}
        </p>
      ) : null}
      {moderationDetails ? (
        <ContentModerationErrorAlert
          details={moderationDetails}
          variant="profile"
          title={mod.profileTitle}
          fieldLabel={fieldLabelFor(moderationDetails.field, tf)}
          labels={moderationLabels}
          onDismiss={clearModeration}
        />
      ) : null}
      {saveError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {saveError}
        </p>
      ) : null}
      {finishError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {finishError}
        </p>
      ) : null}
    </div>
  );
}

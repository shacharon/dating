'use client';

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
import { useAppLocale } from '@/lib/i18n';
import { onboardingResumePath } from '@/lib/onboarding-path';

export type UseOnboardingTextsFormOptions = {
  variant?: 'onboarding' | 'profileHub';
  onSaved?: () => void;
};

export function useOnboardingTextsForm({
  variant = 'onboarding',
  onSaved,
}: UseOnboardingTextsFormOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { copy } = useAppLocale();
  const ob = copy.onboarding;
  const tf = ob.textsForm;
  const wh = tf.writingHelp;
  const prompts = ob.writingPrompts;
  const mod = copy.contentModeration;
  const isHub = variant === 'profileHub';
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

  const editBasicsHref =
    isHub
      ? '/profile?tab=edit#basic'
      : searchParams.get('edit') === '1'
        ? '/onboarding/basic?edit=1'
        : '/onboarding/basic';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchMyProfile();
        if (cancelled) return;
        if (!isHub) {
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
        } else if (!profile) {
          setProfileSyncing(false);
          setLoadError(ob.loadFailed);
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
  }, [router, resumeOptions, ob.loadFailed, isHub]);

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
      onSaved?.();
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
      if (!latest?.gender || latest.gender === 'PREFER_NOT_TO_SAY') {
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
      onSaved?.();
      if (isHub) {
        setFinishing(false);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
        return;
      }
      router.replace('/profile?tab=analysis');
    } catch (e) {
      setFinishing(false);
      applyCaughtError(e, setFinishError, tf.finishFailedError);
    }
  }

  const moderationLabels = {
    fieldLabel: mod.fieldLabel,
    flaggedLabel: mod.flaggedLabel,
    whyLabel: mod.whyLabel,
    suggestionLabel: mod.suggestionLabel,
    exampleLabel: mod.exampleLabel,
    mutedLabel: mod.mutedLabel,
    dismiss: mod.dismiss,
  };

  return {
    isHub,
    ob,
    tf,
    wh,
    prompts,
    mod,
    aboutMe,
    setAboutMe,
    aboutPartner,
    setAboutPartner,
    aboutRelationship,
    setAboutRelationship,
    aboutMeRef,
    aboutPartnerRef,
    aboutRelationshipRef,
    profileSyncing,
    loadError,
    saveError,
    finishError,
    moderationDetails,
    savedFlash,
    finishing,
    editBasicsHref,
    clearModeration,
    handleSaveProgress,
    handleFinish,
    moderationLabels,
  };
}

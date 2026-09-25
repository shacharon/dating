'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PatchMeProfileBody } from '@/lib/api/me-profile-api';
import {
  ContentModerationApiError,
  type ContentModerationDetails,
} from '@/lib/moderation/content-moderation-error';
import { useAppLocale } from '@/lib/i18n';
import { profileEditHash } from '@/lib/profile/profile-hub-paths';
import {
  useCreateProfile,
  usePatchProfile,
  useProfile,
} from '@/hooks/use-profile';

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
  const editMode = searchParams.get('edit') === '1';

  const { profile, isLoading, error: profileLoadError } = useProfile();
  const patchMutation = usePatchProfile();
  const createMutation = useCreateProfile();

  const [aboutMe, setAboutMe] = useState('');
  const [aboutPartner, setAboutPartner] = useState('');
  const [aboutRelationship, setAboutRelationship] = useState('');
  const [hasProfile, setHasProfile] = useState(false);
  const [profileSyncing, setProfileSyncing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [moderationDetails, setModerationDetails] =
    useState<ContentModerationDetails | null>(null);
  const [voiceDraftApplied, setVoiceDraftApplied] = useState(false);
  const loadHandledRef = useRef(false);
  const lastVoiceDraftRef = useRef<{
    aboutMe: string;
    aboutPartner: string;
    aboutRelationship: string;
  } | null>(null);

  const aboutMeRef = useRef<HTMLTextAreaElement>(null);
  const aboutPartnerRef = useRef<HTMLTextAreaElement>(null);
  const aboutRelationshipRef = useRef<HTMLTextAreaElement>(null);
  const valuesRef = useRef({ aboutMe, aboutPartner, aboutRelationship });
  valuesRef.current = { aboutMe, aboutPartner, aboutRelationship };
  const savedSnapRef = useRef<string | null>(null);
  const savingRef = useRef<Promise<boolean> | null>(null);

  const editBasicsHref =
    isHub
      ? profileEditHash('basic')
      : editMode
        ? '/onboarding/basics?edit=1'
        : '/onboarding/basics';

  useLayoutEffect(() => {
    if (isLoading || loadHandledRef.current) return;

    if (profileLoadError) {
      loadHandledRef.current = true;
      setLoadError(profileLoadError);
      setProfileSyncing(false);
      return;
    }

    if (!isHub) {
      if (profile?.onboardingStep === 'COMPLETED' && !editMode) {
        loadHandledRef.current = true;
        setProfileSyncing(false);
        router.replace('/profile');
        return;
      }
      if (!profile && editMode) {
        loadHandledRef.current = true;
        setProfileSyncing(false);
        router.replace('/onboarding/basics');
        return;
      }
    } else if (!profile) {
      loadHandledRef.current = true;
      setLoadError(ob.loadFailed);
      setProfileSyncing(false);
      return;
    }

    if (profile) {
      setHasProfile(true);
      const loaded = {
        aboutMe: profile.aboutMe ?? '',
        aboutPartner: profile.aboutPartner ?? '',
        aboutRelationship: profile.aboutRelationship ?? '',
      };
      setAboutMe(loaded.aboutMe);
      setAboutPartner(loaded.aboutPartner);
      setAboutRelationship(loaded.aboutRelationship);
      savedSnapRef.current = JSON.stringify({
        aboutMe: loaded.aboutMe.trim(),
        aboutPartner: loaded.aboutPartner.trim(),
        aboutRelationship: loaded.aboutRelationship.trim(),
      });
    } else {
      setHasProfile(false);
      savedSnapRef.current = JSON.stringify({
        aboutMe: '',
        aboutPartner: '',
        aboutRelationship: '',
      });
    }
    loadHandledRef.current = true;
    setProfileSyncing(false);
  }, [
    profile,
    isLoading,
    profileLoadError,
    router,
    ob.loadFailed,
    isHub,
    editMode,
  ]);

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
      return;
    }
    clearModeration();
    setFlat(e instanceof Error ? e.message : flatFallback);
  }

  function applyVoiceModerationError(e: ContentModerationApiError) {
    setModerationDetails(e.details);
    setSaveError(null);
  }

  function textsPatchBody(
    onboardingStep?: PatchMeProfileBody['onboardingStep'],
  ): PatchMeProfileBody {
    return {
      aboutMe: aboutMe.trim() ? aboutMe : null,
      aboutPartner: aboutPartner.trim() ? aboutPartner : null,
      aboutRelationship: aboutRelationship.trim()
        ? aboutRelationship
        : null,
      ...(onboardingStep ? { onboardingStep } : {}),
    };
  }

  async function persistTexts(advance: boolean): Promise<boolean> {
    setSaveError(null);
    clearModeration();
    /** Stay on BASIC — API requires partner genders before TEXTS. Facts screen advances later. */
    const body = textsPatchBody(advance ? 'BASIC' : undefined);
    try {
      if (hasProfile) {
        await patchMutation.mutateAsync(body);
      } else {
        await createMutation.mutateAsync({
          ...body,
          onboardingStep: 'BASIC',
        });
        setHasProfile(true);
      }
      return true;
    } catch (e) {
      applyCaughtError(e, setSaveError, ob.saveFailed);
      return false;
    }
  }

  function currentSnap(): string {
    const v = valuesRef.current;
    return JSON.stringify({
      aboutMe: v.aboutMe.trim(),
      aboutPartner: v.aboutPartner.trim(),
      aboutRelationship: v.aboutRelationship.trim(),
    });
  }

  /** Save when the field is left or a step tab is clicked. Skip if nothing changed. */
  async function flushTexts(): Promise<boolean> {
    if (profileSyncing) return false;
    const snap = currentSnap();
    if (savedSnapRef.current === snap) return true;
    if (savingRef.current) return savingRef.current;
    const pending = persistTexts(false).then((ok) => {
      if (ok) {
        savedSnapRef.current = snap;
        onSaved?.();
      }
      savingRef.current = null;
      return ok;
    });
    savingRef.current = pending;
    return pending;
  }

  function applyVoiceDraft(draft: {
    aboutMe: string;
    aboutPartner: string;
    aboutRelationship: string;
  }) {
    clearModeration();
    setAboutMe(draft.aboutMe ?? '');
    setAboutPartner(draft.aboutPartner ?? '');
    setAboutRelationship(draft.aboutRelationship ?? '');
    lastVoiceDraftRef.current = {
      aboutMe: draft.aboutMe ?? '',
      aboutPartner: draft.aboutPartner ?? '',
      aboutRelationship: draft.aboutRelationship ?? '',
    };
    setVoiceDraftApplied(true);
  }

  const fieldsDirtyForRerecord = (() => {
    const last = lastVoiceDraftRef.current;
    if (last) {
      return (
        aboutMe !== last.aboutMe ||
        aboutPartner !== last.aboutPartner ||
        aboutRelationship !== last.aboutRelationship
      );
    }
    return (
      aboutMe.trim().length > 0 ||
      aboutPartner.trim().length > 0 ||
      aboutRelationship.trim().length > 0
    );
  })();

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
    editMode,
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
    moderationDetails,
    editBasicsHref,
    clearModeration,
    flushTexts,
    applyVoiceDraft,
    applyVoiceModerationError,
    fieldsDirtyForRerecord,
    voiceDraftApplied,
    moderationLabels,
  };
}

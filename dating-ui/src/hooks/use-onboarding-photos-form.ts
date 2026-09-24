'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';
import type { MeProfilePhotoDto } from '@/lib/api/me-photos-api';
import { useAppLocale } from '@/lib/i18n';
import { usePatchProfile, useProfile } from '@/hooks/use-profile';

export function useOnboardingPhotosForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { copy } = useAppLocale();
  const pf = copy.onboarding.photosForm;
  const editMode = searchParams.get('edit') === '1';

  const { profile, isLoading, error: profileLoadError } = useProfile();
  const patchMutation = usePatchProfile();

  const [profileSyncing, setProfileSyncing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [uploading, setUploading] = useState(false);

  const loadHandledRef = useRef(false);

  const canFinish = photoCount >= 1 && !finishing && !uploading && !profileSyncing;

  useLayoutEffect(() => {
    if (isLoading || loadHandledRef.current) return;

    if (profileLoadError) {
      loadHandledRef.current = true;
      setLoadError(profileLoadError);
      setProfileSyncing(false);
      return;
    }

    if (profile?.onboardingStep === 'COMPLETED' && !editMode) {
      loadHandledRef.current = true;
      setProfileSyncing(false);
      router.replace('/dating/me-matches');
      return;
    }

    loadHandledRef.current = true;
    setProfileSyncing(false);
  }, [profile, isLoading, profileLoadError, router, editMode]);

  function onPhotosChange(photos: MeProfilePhotoDto[]) {
    setPhotoCount(photos.length);
  }

  async function handleFinish() {
    if (!canFinish) return;
    setSaveError(null);
    setFinishing(true);
    try {
      await patchMutation.mutateAsync({ onboardingStep: 'COMPLETED' });
      router.push('/dating/me-matches');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : copy.onboarding.saveFailed);
    } finally {
      setFinishing(false);
    }
  }

  return {
    pf,
    syncingLabel: copy.onboarding.syncingProfile,
    canFinish,
    finishing,
    uploading,
    setUploading,
    profileSyncing,
    loadError,
    saveError,
    onPhotosChange,
    handleFinish,
  };
}

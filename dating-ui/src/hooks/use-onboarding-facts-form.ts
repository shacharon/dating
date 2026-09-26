'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MeProfileGender, PatchMeProfileBody } from '@/lib/api/me-profile-api';
import { useAppLocale } from '@/lib/i18n';
import {
  lookingForFromPartnerGenders,
  partnerGendersFromLookingFor,
  type LookingForTile,
} from '@/lib/profile/looking-for';
import {
  listFactsMissing,
  validateOnboardingFactsAdvance,
} from '@/lib/profile/onboarding-basic-validation';
import {
  useCreateProfile,
  usePatchProfile,
  useProfile,
} from '@/hooks/use-profile';

const SELF_GENDERS: MeProfileGender[] = [
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'OTHER',
];

function todayMaxBirthDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type UseOnboardingFactsFormOptions = {
  variant?: 'onboarding' | 'profileHub';
  onSaved?: () => void;
};

export function useOnboardingFactsForm({
  variant = 'onboarding',
  onSaved,
}: UseOnboardingFactsFormOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { copy } = useAppLocale();
  const ff = copy.onboarding.factsForm;
  const bf = copy.onboarding.basicForm;
  const genderCopy = copy.gender;
  const isHub = variant === 'profileHub';
  const editMode = searchParams.get('edit') === '1';

  const { profile, isLoading, error: profileLoadError } = useProfile();
  const patchMutation = usePatchProfile();
  const createMutation = useCreateProfile();

  const [hasProfile, setHasProfile] = useState(false);
  const [profileSyncing, setProfileSyncing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [gender, setGender] = useState('');
  const [nickname, setNickname] = useState('');
  const [lookingFor, setLookingFor] = useState<LookingForTile | null>(null);
  const [birthDate, setBirthDate] = useState('');

  const loadHandledRef = useRef(false);
  const savedSnapRef = useRef<string | null>(null);
  const savingRef = useRef<Promise<boolean> | null>(null);
  const valuesRef = useRef({
    gender,
    nickname,
    lookingFor,
    birthDate,
    canContinue: false,
    hasProfile: false,
  });

  const desiredPartnerGenders = useMemo(
    () => (lookingFor ? partnerGendersFromLookingFor(lookingFor) : []),
    [lookingFor],
  );

  const advanceFields = {
    gender,
    desiredPartnerGenders,
    birthDate,
  };

  const missing = listFactsMissing(advanceFields);
  const canContinue = validateOnboardingFactsAdvance(advanceFields).ok;

  valuesRef.current = {
    gender,
    nickname,
    lookingFor,
    birthDate,
    canContinue,
    hasProfile,
  };

  useLayoutEffect(() => {
    if (isLoading || loadHandledRef.current) return;

    if (profileLoadError) {
      loadHandledRef.current = true;
      setLoadError(profileLoadError);
      setProfileSyncing(false);
      return;
    }

    if (isHub && !profile) {
      loadHandledRef.current = true;
      setLoadError(copy.onboarding.loadFailed);
      setProfileSyncing(false);
      return;
    }

    if (!isHub && profile?.onboardingStep === 'COMPLETED' && !editMode) {
      loadHandledRef.current = true;
      setProfileSyncing(false);
      router.replace('/profile');
      return;
    }

    if (profile) {
      setHasProfile(true);
      setGender(
        profile.gender && SELF_GENDERS.includes(profile.gender)
          ? profile.gender
          : '',
      );
      setNickname(profile.nickname ?? '');
      setLookingFor(
        lookingForFromPartnerGenders(profile.desiredPartnerGenders ?? []),
      );
      const bd = profile.birthDate?.slice(0, 10) ?? '';
      setBirthDate(/^\d{4}-\d{2}-\d{2}$/.test(bd) ? bd : '');
    }

    loadHandledRef.current = true;
    setProfileSyncing(false);
    savedSnapRef.current = null;
  }, [profile, isLoading, profileLoadError, router, editMode, isHub, copy.onboarding.loadFailed]);

  function currentSnap(): string {
    const v = valuesRef.current;
    return JSON.stringify({
      gender: v.gender,
      nickname: v.nickname.trim(),
      lookingFor: v.lookingFor,
      birthDate: v.birthDate,
    });
  }

  async function flushFacts(): Promise<boolean> {
    if (profileSyncing) return false;
    const snap = currentSnap();
    if (savedSnapRef.current === snap) return true;
    if (savingRef.current) return savingRef.current;
    const v = valuesRef.current;
    const partners = v.lookingFor
      ? partnerGendersFromLookingFor(v.lookingFor)
      : [];
    const body: PatchMeProfileBody = {
      gender: v.gender ? (v.gender as MeProfileGender) : null,
      ...(isHub
        ? {}
        : { nickname: v.nickname.trim() ? v.nickname.trim() : null }),
      ...(partners.length > 0 ? { desiredPartnerGenders: partners } : {}),
      birthDate: v.birthDate || null,
      ...(isHub
        ? {}
        : { onboardingStep: v.canContinue ? ('TEXTS' as const) : ('BASIC' as const) }),
    };
    const pending = (async () => {
      setSaveError(null);
      try {
        if (isHub && !v.hasProfile) {
          setSaveError(copy.onboarding.loadFailed);
          return false;
        }
        if (v.hasProfile) {
          await patchMutation.mutateAsync(body);
        } else {
          await createMutation.mutateAsync(body);
          setHasProfile(true);
        }
        savedSnapRef.current = snap;
        if (isHub) onSaved?.();
        if (currentSnap() !== snap) {
          queueMicrotask(() => void flushFacts());
        }
        return true;
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : copy.onboarding.saveFailed);
        return false;
      } finally {
        savingRef.current = null;
      }
    })();
    savingRef.current = pending;
    return pending;
  }

  useEffect(() => {
    if (profileSyncing) return;
    if (savedSnapRef.current === null) {
      savedSnapRef.current = currentSnap();
      return;
    }
    void flushFacts();
  }, [
    profileSyncing,
    gender,
    nickname,
    lookingFor,
    birthDate,
  ]);

  return {
    isHub,
    ff,
    bf,
    syncingLabel: copy.onboarding.syncingProfile,
    genderCopy,
    selfGenders: SELF_GENDERS,
    gender,
    setGender,
    nickname,
    setNickname,
    lookingFor,
    setLookingFor,
    birthDate,
    setBirthDate,
    birthDateMax: todayMaxBirthDate(),
    missing,
    canContinue,
    profileSyncing,
    loadError,
    saveError,
    flushFacts,
  };
}

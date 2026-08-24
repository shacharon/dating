'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  ME_PROFILE_GENDERS,
  type MeDatingChapter,
  type MeProfileGender,
  type PatchMeProfileBody,
} from '@/lib/api/me-profile-api';
import {
  ContentModerationApiError,
  type ContentModerationDetails,
} from '@/lib/moderation/content-moderation-error';
import { useAppLocale } from '@/lib/i18n';
import { onboardingResumePath } from '@/lib/profile/onboarding-path';
import { validateOnboardingBasicAdvance } from '@/lib/profile/onboarding-basic-validation';
import type { DatingChapterValue } from '@/components/dating-chapter-fields';
import {
  ageFromBirthInput,
  normalizeNicknameValue,
  togglePartnerGender,
} from '@/components/onboarding-basic-helpers';
import {
  useCreateProfile,
  usePatchProfile,
  useProfile,
} from '@/hooks/use-profile';

export type UseOnboardingBasicFormOptions = {
  variant?: 'onboarding' | 'profileHub';
  onSaved?: () => void;
};

function seedBasicFieldsFromProfile(
  profile: NonNullable<ReturnType<typeof useProfile>['profile']>,
  setters: {
    setHasProfile: (v: boolean) => void;
    setLoadedNickname: (v: string | null) => void;
    setNickname: (v: string) => void;
    setBirthDate: (v: string) => void;
    setGender: (v: string) => void;
    setDesiredPartnerGenders: (v: MeProfileGender[]) => void;
    setCity: (v: string) => void;
    setCountry: (v: string) => void;
    setLocationLabel: (v: string) => void;
    setDatingChapter: (v: DatingChapterValue | null) => void;
  },
) {
  setters.setHasProfile(true);
  setters.setLoadedNickname(profile.nickname ?? null);
  setters.setNickname(profile.nickname ?? '');
  const bd = profile.birthDate?.slice(0, 10) ?? '';
  setters.setBirthDate(/^\d{4}-\d{2}-\d{2}$/.test(bd) ? bd : '');
  setters.setGender(profile.gender ?? '');
  const allowed = new Set<string>(ME_PROFILE_GENDERS);
  setters.setDesiredPartnerGenders(
    (profile.desiredPartnerGenders ?? []).filter(
      (x): x is MeProfileGender =>
        typeof x === 'string' && allowed.has(x),
    ),
  );
  setters.setCity(profile.city ?? '');
  setters.setCountry(profile.country ?? '');
  setters.setLocationLabel(profile.locationLabel ?? '');
  const chapter = profile.datingChapter;
  setters.setDatingChapter(
    chapter === 'first_chapter' ||
      chapter === 'ready_again' ||
      chapter === 'new_chapter'
      ? chapter
      : null,
  );
}

export function useOnboardingBasicForm({
  variant = 'onboarding',
  onSaved,
}: UseOnboardingBasicFormOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { copy } = useAppLocale();
  const ob = copy.onboarding;
  const bf = ob.basicForm;
  const mod = copy.contentModeration;
  const genderCopy = copy.gender;
  const googleName = user?.displayName?.trim() || '—';
  const isHub = variant === 'profileHub';

  const { profile, isLoading, error: profileLoadError } = useProfile();
  const patchMutation = usePatchProfile();
  const createMutation = useCreateProfile();

  const [nickname, setNickname] = useState('');
  const [loadedNickname, setLoadedNickname] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [desiredPartnerGenders, setDesiredPartnerGenders] = useState<
    MeProfileGender[]
  >([]);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [datingChapter, setDatingChapter] = useState<DatingChapterValue | null>(
    null,
  );

  const [hasProfile, setHasProfile] = useState(false);
  const [profileSyncing, setProfileSyncing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [moderationDetails, setModerationDetails] =
    useState<ContentModerationDetails | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [genderStepError, setGenderStepError] = useState<string | null>(null);
  const loadHandledRef = useRef(false);

  const birthDateMax = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const derivedAge = useMemo(() => ageFromBirthInput(birthDate), [birthDate]);

  const resumeOptions = useMemo(
    () =>
      searchParams.get('edit') === '1'
        ? ({ edit: true, page: 'basic' } as const)
        : undefined,
    [searchParams],
  );

  useLayoutEffect(() => {
    if (isLoading || loadHandledRef.current) return;

    if (profileLoadError) {
      loadHandledRef.current = true;
      setLoadError(profileLoadError);
      setProfileSyncing(false);
      return;
    }

    if (!profile) {
      loadHandledRef.current = true;
      setHasProfile(false);
      setProfileSyncing(false);
      return;
    }

    if (!isHub) {
      const path = onboardingResumePath(profile, resumeOptions);
      if (path !== '/onboarding/basic') {
        loadHandledRef.current = true;
        setProfileSyncing(false);
        router.replace(path);
        return;
      }
    }

    seedBasicFieldsFromProfile(profile, {
      setHasProfile,
      setLoadedNickname,
      setNickname,
      setBirthDate,
      setGender,
      setDesiredPartnerGenders,
      setCity,
      setCountry,
      setLocationLabel,
      setDatingChapter,
    });
    loadHandledRef.current = true;
    setProfileSyncing(false);
  }, [
    profile,
    isLoading,
    profileLoadError,
    router,
    resumeOptions,
    isHub,
  ]);

  function setPartnerGender(g: MeProfileGender, checked: boolean) {
    setDesiredPartnerGenders((prev) => togglePartnerGender(prev, g, checked));
  }

  function basicBody(advanceToTexts: boolean): PatchMeProfileBody {
    const nextNickname = nickname.trim() ? nickname.trim() : null;
    const nicknameChanged =
      normalizeNicknameValue(nextNickname) !==
      normalizeNicknameValue(loadedNickname);

    const body: PatchMeProfileBody = {
      birthDate: birthDate.trim() ? birthDate.trim() : null,
      gender: (gender || null) as MeProfileGender | null,
      desiredPartnerGenders:
        desiredPartnerGenders.length > 0 ? desiredPartnerGenders : null,
      city: city.trim() ? city.trim() : null,
      country: country.trim() ? country.trim() : null,
      locationLabel: locationLabel.trim() ? locationLabel.trim() : null,
      datingChapter: datingChapter as MeDatingChapter | null,
      onboardingStep: advanceToTexts ? ('TEXTS' as const) : ('BASIC' as const),
    };

    if (!hasProfile || nicknameChanged) {
      body.nickname = nextNickname;
    }

    return body;
  }

  async function persist(advanceToTexts: boolean): Promise<boolean> {
    setSaveError(null);
    setPartnerError(null);
    setGenderStepError(null);
    if (advanceToTexts) {
      const advanceResult = validateOnboardingBasicAdvance({
        gender,
        desiredPartnerGenders,
      });
      if (!advanceResult.ok) {
        if (advanceResult.error === 'genderInvalidForAdvance') {
          setGenderStepError(
            bf.genderRequiredError(genderCopy.PREFER_NOT_TO_SAY),
          );
        } else {
          setPartnerError(bf.partnerGendersRequiredError);
        }
        return false;
      }
    }
    const body = basicBody(advanceToTexts);
    try {
      if (hasProfile) {
        await patchMutation.mutateAsync(body);
        setLoadedNickname(
          normalizeNicknameValue(nickname.trim() ? nickname.trim() : null),
        );
      } else {
        await createMutation.mutateAsync(body);
        setHasProfile(true);
      }
      return true;
    } catch (e) {
      if (e instanceof ContentModerationApiError) {
        setModerationDetails(e.details);
        setSaveError(null);
      } else {
        setModerationDetails(null);
        setSaveError(e instanceof Error ? e.message : ob.saveFailed);
      }
      return false;
    }
  }

  async function handleSaveProgress() {
    const ok = await persist(false);
    if (ok) {
      onSaved?.();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
  }

  async function handleContinueToTexts() {
    const ok = await persist(true);
    if (!ok) return;
    onSaved?.();
    if (isHub) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    router.push('/onboarding/texts');
  }

  return {
    isHub,
    ob,
    bf,
    mod,
    genderCopy,
    googleName,
    nickname,
    setNickname,
    birthDate,
    setBirthDate,
    birthDateMax,
    derivedAge,
    gender,
    setGender,
    genderStepError,
    setGenderStepError,
    desiredPartnerGenders,
    partnerError,
    setPartnerGender,
    city,
    setCity,
    country,
    setCountry,
    locationLabel,
    setLocationLabel,
    datingChapter,
    setDatingChapter,
    profileSyncing,
    loadError,
    saveError,
    moderationDetails,
    setModerationDetails,
    savedFlash,
    handleSaveProgress,
    handleContinueToTexts,
  };
}

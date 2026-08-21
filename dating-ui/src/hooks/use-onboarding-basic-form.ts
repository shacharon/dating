'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  createMyProfile,
  fetchMyProfile,
  ME_PROFILE_GENDERS,
  patchMyProfile,
  type MeDatingChapter,
  type MeProfileGender,
} from '@/lib/me-profile-api';
import {
  ContentModerationApiError,
  type ContentModerationDetails,
} from '@/lib/content-moderation-error';
import { useAppLocale } from '@/lib/i18n';
import { onboardingResumePath } from '@/lib/onboarding-path';
import type { DatingChapterValue } from '@/components/dating-chapter-fields';
import {
  ageFromBirthInput,
  normalizeNicknameValue,
  togglePartnerGender,
} from '@/components/onboarding-basic-helpers';

export type UseOnboardingBasicFormOptions = {
  variant?: 'onboarding' | 'profileHub';
  onSaved?: () => void;
};

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

  const birthDateMax = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const derivedAge = useMemo(() => ageFromBirthInput(birthDate), [birthDate]);

  const resumeOptions = useMemo(
    () =>
      searchParams.get('edit') === '1'
        ? ({ edit: true, page: 'basic' } as const)
        : undefined,
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchMyProfile();
        if (cancelled) return;
        if (!profile) {
          setHasProfile(false);
          setProfileSyncing(false);
          return;
        }
        if (!isHub) {
          const path = onboardingResumePath(profile, resumeOptions);
          if (path !== '/onboarding/basic') {
            setProfileSyncing(false);
            router.replace(path);
            return;
          }
        }
        setHasProfile(true);
        setLoadedNickname(profile.nickname ?? null);
        setNickname(profile.nickname ?? '');
        const bd = profile.birthDate?.slice(0, 10) ?? '';
        setBirthDate(/^\d{4}-\d{2}-\d{2}$/.test(bd) ? bd : '');
        setGender(profile.gender ?? '');
        const allowed = new Set<string>(ME_PROFILE_GENDERS);
        setDesiredPartnerGenders(
          (profile.desiredPartnerGenders ?? []).filter(
            (x): x is MeProfileGender =>
              typeof x === 'string' && allowed.has(x),
          ),
        );
        setCity(profile.city ?? '');
        setCountry(profile.country ?? '');
        setLocationLabel(profile.locationLabel ?? '');
        const chapter = profile.datingChapter;
        setDatingChapter(
          chapter === 'first_chapter' ||
            chapter === 'ready_again' ||
            chapter === 'new_chapter'
            ? chapter
            : null,
        );
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

  function setPartnerGender(g: MeProfileGender, checked: boolean) {
    setDesiredPartnerGenders((prev) => togglePartnerGender(prev, g, checked));
  }

  function basicBody(advanceToTexts: boolean) {
    const nextNickname = nickname.trim() ? nickname.trim() : null;
    const nicknameChanged =
      normalizeNicknameValue(nextNickname) !==
      normalizeNicknameValue(loadedNickname);

    const body: Parameters<typeof patchMyProfile>[0] = {
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
      if (!gender.trim() || gender === 'PREFER_NOT_TO_SAY') {
        setGenderStepError(
          bf.genderRequiredError(genderCopy.PREFER_NOT_TO_SAY),
        );
        return false;
      }
      if (desiredPartnerGenders.length === 0) {
        setPartnerError(bf.partnerGendersRequiredError);
        return false;
      }
    }
    const body = basicBody(advanceToTexts);
    try {
      if (hasProfile) {
        await patchMyProfile(body);
        setLoadedNickname(
          normalizeNicknameValue(nickname.trim() ? nickname.trim() : null),
        );
      } else {
        try {
          await createMyProfile(body);
          setHasProfile(true);
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (
            msg.includes(' 409 ') ||
            msg.toLowerCase().includes('profile_already_exists')
          ) {
            await patchMyProfile(body);
            setHasProfile(true);
          } else {
            throw e;
          }
        }
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

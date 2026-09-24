'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  listPlaceCities,
  listPlaceCountries,
  listPlaceUsStates,
  type PlaceCity,
  type PlaceCountry,
  type PlaceUsState,
} from '@/lib/api/places-api';
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
    setCountryCode: (v: string) => void;
    setUsStateCode: (v: string) => void;
    setCityId: (v: string) => void;
    setDatingChapter: (v: DatingChapterValue | null) => void;
    setAboutMe: (v: string) => void;
    setAboutPartner: (v: string) => void;
    setAboutRelationship: (v: string) => void;
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
  const country = profile.country ?? '';
  setters.setCountryCode(/^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : '');
  setters.setUsStateCode(profile.usStateCode ?? '');
  setters.setCityId(profile.cityId ?? '');
  const chapter = profile.datingChapter;
  setters.setDatingChapter(
    chapter === 'first_chapter' ||
      chapter === 'ready_again' ||
      chapter === 'new_chapter'
      ? chapter
      : null,
  );
  setters.setAboutMe(profile.aboutMe ?? '');
  setters.setAboutPartner(profile.aboutPartner ?? '');
  setters.setAboutRelationship(profile.aboutRelationship ?? '');
}

export function useOnboardingBasicForm({
  variant = 'profileHub',
  onSaved,
}: UseOnboardingBasicFormOptions = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { copy, locale } = useAppLocale();
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
  const [countryCode, setCountryCode] = useState('');
  const [usStateCode, setUsStateCode] = useState('');
  const [cityId, setCityId] = useState('');
  const [countries, setCountries] = useState<PlaceCountry[]>([]);
  const [usStates, setUsStates] = useState<PlaceUsState[]>([]);
  const [cities, setCities] = useState<PlaceCity[]>([]);
  const [citiesLoaded, setCitiesLoaded] = useState(false);
  const [datingChapter, setDatingChapter] = useState<DatingChapterValue | null>(
    null,
  );
  const [aboutMe, setAboutMe] = useState('');
  const [aboutPartner, setAboutPartner] = useState('');
  const [aboutRelationship, setAboutRelationship] = useState('');

  const [hasProfile, setHasProfile] = useState(false);
  const [profileSyncing, setProfileSyncing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [moderationDetails, setModerationDetails] =
    useState<ContentModerationDetails | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [genderStepError, setGenderStepError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const loadHandledRef = useRef(false);

  const birthDateMax = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    let cancelled = false;
    listPlaceCountries(variant === 'onboarding' ? 'onboarding' : undefined)
      .then((res) => {
        if (!cancelled) setCountries(res.countries);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      });
    listPlaceUsStates()
      .then((res) => {
        if (!cancelled) setUsStates(res.states);
      })
      .catch(() => {
        if (!cancelled) setUsStates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [variant]);

  useEffect(() => {
    if (!countryCode) {
      setCities([]);
      setCitiesLoaded(true);
      return;
    }
    if (countryCode === 'US' && !usStateCode) {
      setCities([]);
      setCitiesLoaded(true);
      return;
    }
    let cancelled = false;
    setCitiesLoaded(false);
    listPlaceCities(
      countryCode,
      countryCode === 'US' ? usStateCode : undefined,
    )
      .then((res) => {
        if (!cancelled) setCities(res.cities);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [countryCode, usStateCode]);
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
      /** Allow BASIC on facts even when resume prefers story (no gender yet). */
      if (path === '/profile') {
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
      setCountryCode,
      setUsStateCode,
      setCityId,
      setDatingChapter,
      setAboutMe,
      setAboutPartner,
      setAboutRelationship,
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
      ...(countryCode
        ? {
            country: countryCode,
            usStateCode: countryCode === 'US' ? usStateCode || null : null,
            cityId: cityId || null,
          }
        : {}),
      datingChapter: datingChapter as MeDatingChapter | null,
      aboutMe: aboutMe.trim() ? aboutMe : null,
      aboutPartner: aboutPartner.trim() ? aboutPartner : null,
      aboutRelationship: aboutRelationship.trim() ? aboutRelationship : null,
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
    setLocationError(null);
    if (advanceToTexts) {
      const selectedState = usStates.find((state) => state.code === usStateCode);
      const advanceResult = validateOnboardingBasicAdvance({
        gender,
        desiredPartnerGenders,
        location: {
          countryCode,
          usStateCode,
          cityId,
          countryHasCities: citiesLoaded ? cities.length > 0 : true,
          stateHasCities: selectedState?.hasCities ?? cities.length > 0,
        },
      });
      if (!advanceResult.ok) {
        if (advanceResult.error === 'genderInvalidForAdvance') {
          setGenderStepError(
            bf.genderRequiredError(genderCopy.PREFER_NOT_TO_SAY),
          );
        } else if (advanceResult.error === 'partnerGendersRequired') {
          setPartnerError(bf.partnerGendersRequiredError);
        } else {
          setLocationError(bf.locationRequiredError);
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

  async function handleHubSave() {
    const ok = await persist(true);
    if (!ok) return;
    onSaved?.();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' });
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
    countries,
    usStates,
    cities,
    countryCode,
    setCountryCode: (value: string) => {
      setCountryCode(value);
      setUsStateCode('');
      setCityId('');
      setLocationError(null);
    },
    usStateCode,
    setUsStateCode: (value: string) => {
      setUsStateCode(value);
      setCityId('');
      setLocationError(null);
    },
    cityId,
    setCityId,
    locale,
    locationError,
    datingChapter,
    setDatingChapter,
    aboutMe,
    setAboutMe,
    aboutPartner,
    setAboutPartner,
    aboutRelationship,
    setAboutRelationship,
    profileSyncing,
    loadError,
    saveError,
    moderationDetails,
    setModerationDetails,
    savedFlash,
    handleSaveProgress,
    handleHubSave,
  };
}

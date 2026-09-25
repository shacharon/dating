'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MeProfileGender, PatchMeProfileBody } from '@/lib/api/me-profile-api';
import { useAppLocale } from '@/lib/i18n';
import {
  listPlaceCities,
  listPlaceCountries,
  listPlaceUsStates,
  type PlaceCity,
  type PlaceCountry,
  type PlaceUsState,
} from '@/lib/api/places-api';
import { defaultOnboardingCountryCode } from '@/lib/profile/country-from-timezone';
import {
  lookingForFromPartnerGenders,
  partnerGendersFromLookingFor,
  type LookingForTile,
} from '@/lib/profile/looking-for';
import {
  listFactsMissing,
  locationSatisfied,
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
  const { copy, locale } = useAppLocale();
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
  const [countryCode, setCountryCode] = useState('');
  const [usStateCode, setUsStateCode] = useState('');
  const [cityId, setCityId] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  const [countries, setCountries] = useState<PlaceCountry[]>([]);
  const [usStates, setUsStates] = useState<PlaceUsState[]>([]);
  const [cities, setCities] = useState<PlaceCity[]>([]);
  const [citiesLoaded, setCitiesLoaded] = useState(false);

  const loadHandledRef = useRef(false);
  const countryGuessedRef = useRef(false);
  const savedSnapRef = useRef<string | null>(null);
  const savingRef = useRef<Promise<boolean> | null>(null);
  const valuesRef = useRef({
    gender,
    nickname,
    lookingFor,
    birthDate,
    countryCode,
    usStateCode,
    cityId,
    locationReady: false,
    canContinue: false,
    hasProfile: false,
  });

  const desiredPartnerGenders = useMemo(
    () => (lookingFor ? partnerGendersFromLookingFor(lookingFor) : []),
    [lookingFor],
  );

  const countryHasCities = citiesLoaded ? cities.length > 0 : true;
  const selectedState = usStates.find((s) => s.code === usStateCode);
  const stateHasCities = selectedState?.hasCities ?? cities.length > 0;

  const advanceFields = {
    gender,
    desiredPartnerGenders,
    location: {
      countryCode,
      usStateCode,
      cityId,
      countryHasCities,
      stateHasCities,
    },
    birthDate,
  };

  const missing = listFactsMissing(advanceFields);
  const canContinue = validateOnboardingFactsAdvance(advanceFields).ok;

  valuesRef.current = {
    gender,
    nickname,
    lookingFor,
    birthDate,
    countryCode,
    usStateCode,
    cityId,
    locationReady: locationSatisfied(advanceFields.location),
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
      const country = profile.country ?? '';
      if (/^[A-Za-z]{2}$/.test(country)) {
        setCountryCode(country.toUpperCase());
        setUsStateCode(profile.usStateCode ?? '');
        setCityId(profile.cityId ?? '');
      } else {
        // Keep timezone guess if countries effect already applied one.
        setUsStateCode(profile.usStateCode ?? '');
        setCityId(profile.cityId ?? '');
      }
    }

    loadHandledRef.current = true;
    setProfileSyncing(false);
    savedSnapRef.current = null;
  }, [profile, isLoading, profileLoadError, router, editMode, isHub, copy.onboarding.loadFailed]);

  useEffect(() => {
    if (profileSyncing) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await listPlaceCountries('onboarding');
        if (cancelled) return;
        setCountries(res.countries);
        if (!countryGuessedRef.current && !countryCode) {
          countryGuessedRef.current = true;
          const allowed = new Set(res.countries.map((c) => c.code));
          const guess = defaultOnboardingCountryCode(locale, allowed);
          if (guess) setCountryCode(guess);
        }
      } catch {
        /* keep empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryCode, locale, profileSyncing]);

  useEffect(() => {
    if (locale !== 'he' || countryCode === 'IL') return;
    setCountryCode('IL');
  }, [locale, countryCode]);

  useEffect(() => {
    if (countryCode !== 'US') {
      setUsStates([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await listPlaceUsStates();
        if (!cancelled) setUsStates(res.states);
      } catch {
        if (!cancelled) setUsStates([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

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
    void (async () => {
      try {
        const res = await listPlaceCities(
          countryCode,
          countryCode === 'US' ? usStateCode : undefined,
        );
        if (!cancelled) setCities(res.cities);
      } catch {
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setCitiesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryCode, usStateCode]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    const base = !q
      ? cities
      : cities.filter((c) => {
          const en = c.nameEn.toLowerCase();
          const he = (c.nameHe ?? '').toLowerCase();
          return en.includes(q) || he.includes(q);
        });
    if (locale !== 'he') return base;
    return [...base].sort((a, b) =>
      (a.nameHe || a.nameEn).localeCompare(b.nameHe || b.nameEn, 'he'),
    );
  }, [cities, cityQuery, locale]);

  function cityLabel(c: PlaceCity): string {
    if (locale === 'he' && c.nameHe) return c.nameHe;
    return c.nameEn;
  }

  function currentSnap(): string {
    const v = valuesRef.current;
    return JSON.stringify({
      gender: v.gender,
      nickname: v.nickname.trim(),
      lookingFor: v.lookingFor,
      birthDate: v.birthDate,
      countryCode: v.countryCode,
      usStateCode: v.usStateCode,
      cityId: v.cityId,
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
      ...(v.locationReady
        ? {
            country: v.countryCode || null,
            usStateCode: v.countryCode === 'US' ? v.usStateCode || null : null,
            cityId: v.cityId || null,
          }
        : {}),
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
    countryCode,
    usStateCode,
    cityId,
    citiesLoaded,
    cities.length,
  ]);

  return {
    isHub,
    locale,
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
    countryCode,
    setCountryCode: (code: string) => {
      setCountryCode(code);
      setUsStateCode('');
      setCityId('');
      setCityQuery('');
    },
    usStateCode,
    setUsStateCode: (code: string) => {
      setUsStateCode(code);
      setCityId('');
      setCityQuery('');
    },
    cityId,
    setCityId,
    cityQuery,
    setCityQuery,
    countries,
    usStates,
    filteredCities,
    cityLabel,
    countryHasCities,
    missing,
    canContinue,
    profileSyncing,
    loadError,
    saveError,
    flushFacts,
  };
}

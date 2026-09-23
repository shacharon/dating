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
import { guessOnboardingCountryCode } from '@/lib/profile/country-from-timezone';
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

export function useOnboardingFactsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { copy, locale } = useAppLocale();
  const ff = copy.onboarding.factsForm;
  const bf = copy.onboarding.basicForm;
  const genderCopy = copy.gender;
  const editMode = searchParams.get('edit') === '1';

  const { profile, isLoading, error: profileLoadError } = useProfile();
  const patchMutation = usePatchProfile();
  const createMutation = useCreateProfile();

  const [hasProfile, setHasProfile] = useState(false);
  const [profileSyncing, setProfileSyncing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

  const [gender, setGender] = useState('');
  const [lookingFor, setLookingFor] = useState<LookingForTile | null>(null);
  const [birthDate, setBirthDate] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [usStateCode, setUsStateCode] = useState('');
  const [cityId, setCityId] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  const [countries, setCountries] = useState<PlaceCountry[]>([]);
  const [usStates, setUsStates] = useState<PlaceUsState[]>([]);
  const [cities, setCities] = useState<PlaceCity[]>([]);

  const loadHandledRef = useRef(false);
  const countryGuessedRef = useRef(false);

  const desiredPartnerGenders = useMemo(
    () => (lookingFor ? partnerGendersFromLookingFor(lookingFor) : []),
    [lookingFor],
  );

  const countryHasCities = cities.length > 0 || Boolean(cityId);
  const selectedState = usStates.find((s) => s.code === usStateCode);
  const stateHasCities = selectedState?.hasCities ?? false;

  const advanceFields = {
    gender,
    desiredPartnerGenders,
    location: {
      countryCode,
      usStateCode,
      cityId,
      countryHasCities:
        countryCode === 'US'
          ? true
          : cities.length > 0 || Boolean(cityId),
      stateHasCities,
    },
    birthDate,
  };

  const missing = listFactsMissing(advanceFields);
  const canContinue = validateOnboardingFactsAdvance(advanceFields).ok;

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
  }, [profile, isLoading, profileLoadError, router, editMode]);

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
          const guess = guessOnboardingCountryCode(undefined, allowed);
          if (guess) setCountryCode(guess);
        }
      } catch {
        /* keep empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryCode, profileSyncing]);

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
      return;
    }
    if (countryCode === 'US' && !usStateCode) {
      setCities([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await listPlaceCities(
          countryCode,
          countryCode === 'US' ? usStateCode : undefined,
        );
        if (!cancelled) setCities(res.cities);
      } catch {
        if (!cancelled) setCities([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [countryCode, usStateCode]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => {
      const en = c.nameEn.toLowerCase();
      const he = (c.nameHe ?? '').toLowerCase();
      return en.includes(q) || he.includes(q);
    });
  }, [cities, cityQuery]);

  function cityLabel(c: PlaceCity): string {
    if (locale === 'he' && c.nameHe) return c.nameHe;
    return c.nameEn;
  }

  async function handleContinue() {
    if (!canContinue || continuing) return;
    setSaveError(null);
    setContinuing(true);

    const body: PatchMeProfileBody = {
      gender: gender as MeProfileGender,
      desiredPartnerGenders,
      birthDate,
      country: countryCode,
      usStateCode: countryCode === 'US' ? usStateCode || null : null,
      cityId: cityId || null,
      onboardingStep: 'TEXTS',
    };

    try {
      if (hasProfile) {
        await patchMutation.mutateAsync(body);
      } else {
        await createMutation.mutateAsync(body);
        setHasProfile(true);
      }
      router.push('/onboarding/photos');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : copy.onboarding.saveFailed);
    } finally {
      setContinuing(false);
    }
  }

  return {
    ff,
    bf,
    genderCopy,
    selfGenders: SELF_GENDERS,
    gender,
    setGender,
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
    continuing,
    profileSyncing,
    loadError,
    saveError,
    handleContinue,
  };
}

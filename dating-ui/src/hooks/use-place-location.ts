'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PatchMeProfileBody } from '@/lib/api/me-profile-api';
import {
  listPlaceCities,
  listPlaceCountries,
  listPlaceUsStates,
  type PlaceCity,
  type PlaceCountry,
  type PlaceUsState,
} from '@/lib/api/places-api';
import { useAppLocale } from '@/lib/i18n';
import { defaultOnboardingCountryCode } from '@/lib/profile/country-from-timezone';
import { locationSatisfied } from '@/lib/profile/onboarding-basic-validation';

type LocationProfile = {
  country?: string | null;
  usStateCode?: string | null;
  cityId?: string | null;
};

export function usePlaceLocation(profile: LocationProfile | null | undefined, profileReady: boolean) {
  const { locale } = useAppLocale();
  const hebrew = locale === 'he';

  const [countryCode, setCountryCodeState] = useState('');
  const [usStateCode, setUsStateCodeState] = useState('');
  const [cityId, setCityId] = useState('');
  const [countries, setCountries] = useState<PlaceCountry[]>([]);
  const [usStates, setUsStates] = useState<PlaceUsState[]>([]);
  const [cities, setCities] = useState<PlaceCity[]>([]);
  const [citiesLoaded, setCitiesLoaded] = useState(false);

  const countryGuessedRef = useRef(false);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!profileReady || seededRef.current) return;
    seededRef.current = true;
    if (hebrew) {
      countryGuessedRef.current = true;
      setCountryCodeState('IL');
      if ((profile?.country ?? '').toUpperCase() === 'IL') {
        setCityId(profile?.cityId ?? '');
      }
      return;
    }
    const country = profile?.country ?? '';
    if (/^[A-Za-z]{2}$/.test(country)) {
      countryGuessedRef.current = true;
      setCountryCodeState(country.toUpperCase());
      setUsStateCodeState(profile?.usStateCode ?? '');
      setCityId(profile?.cityId ?? '');
    }
  }, [profileReady, profile, hebrew]);

  useEffect(() => {
    if (!hebrew || countryCode === 'IL') return;
    countryGuessedRef.current = true;
    setCountryCodeState('IL');
    setUsStateCodeState('');
    setCityId('');
  }, [hebrew, countryCode]);

  useEffect(() => {
    if (!profileReady || hebrew) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await listPlaceCountries('onboarding');
        if (cancelled) return;
        setCountries(res.countries);
        if (!countryGuessedRef.current) {
          countryGuessedRef.current = true;
          const allowed = new Set(res.countries.map((c) => c.code));
          const guess = defaultOnboardingCountryCode(locale, allowed);
          if (guess) {
            setCountryCodeState((current) => current || guess);
          }
        }
      } catch {
        /* keep empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileReady, hebrew, countryCode, locale]);

  useEffect(() => {
    if (countryCode !== 'US' || hebrew) {
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
  }, [countryCode, hebrew]);

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
    if (!hebrew) return cities;
    return [...cities].sort((a, b) =>
      (a.nameHe || a.nameEn).localeCompare(b.nameHe || b.nameEn, 'he'),
    );
  }, [cities, hebrew]);

  function cityLabel(c: PlaceCity): string {
    if (hebrew && c.nameHe) return c.nameHe;
    return c.nameEn;
  }

  function patchFor(
    nextCountry: string,
    nextState: string,
    nextCity: string,
  ): PatchMeProfileBody | null {
    const hasCities = citiesLoaded ? cities.length > 0 : true;
    const selected = usStates.find((s) => s.code === nextState);
    const stateHas = selected?.hasCities ?? cities.length > 0;
    const satisfied = locationSatisfied({
      countryCode: nextCountry,
      usStateCode: nextState,
      cityId: nextCity,
      countryHasCities: hasCities,
      stateHasCities: stateHas,
    });
    if (!satisfied) return null;
    return {
      country: nextCountry || null,
      usStateCode: nextCountry === 'US' ? nextState || null : null,
      cityId: nextCity || null,
    };
  }

  const locationPatch = patchFor(countryCode, usStateCode, cityId);
  const patchRef = useRef(locationPatch);
  patchRef.current = locationPatch;

  return {
    hebrew,
    countryCode,
    setCountryCode: (code: string) => {
      patchRef.current = patchFor(code, '', '');
      setCountryCodeState(code);
      setUsStateCodeState('');
      setCityId('');
    },
    usStateCode,
    setUsStateCode: (code: string) => {
      patchRef.current = patchFor(countryCode, code, '');
      setUsStateCodeState(code);
      setCityId('');
    },
    cityId,
    setCityId: (id: string) => {
      patchRef.current = patchFor(countryCode, usStateCode, id);
      setCityId(id);
    },
    countries,
    usStates,
    filteredCities,
    cityLabel,
    locationPatch: () => patchRef.current,
  };
}

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  createMyProfile,
  fetchMyProfile,
  ME_PARTNER_GENDER_CHOICES,
  ME_PROFILE_GENDERS,
  patchMyProfile,
  type MeProfileGender,
} from '@/lib/me-profile-api';
import { useAppLocale } from '@/lib/i18n';
import { onboardingResumePath } from '@/lib/onboarding-path';
import { ProfilePhotoSection } from '@/components/profile-photo-section';

function ageFromBirthInput(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const b = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function OnboardingBasicForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { copy } = useAppLocale();
  const ob = copy.onboarding;
  const bf = ob.basicForm;
  const genderCopy = copy.gender;
  const googleName = user?.displayName?.trim() || '—';

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

  const [hasProfile, setHasProfile] = useState(false);
  /** False once initial profile fetch + step guard finishes (form stays mounted; no full-page loading gate). */
  const [profileSyncing, setProfileSyncing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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
        const path = onboardingResumePath(profile, resumeOptions);
        if (path !== '/onboarding/basic') {
          setProfileSyncing(false);
          router.replace(path);
          return;
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
  }, [router, resumeOptions, ob.loadFailed]);

  function setPartnerGender(g: MeProfileGender, checked: boolean) {
    setDesiredPartnerGenders((prev) => {
      const next = new Set(prev);
      if (checked) next.add(g);
      else next.delete(g);
      return Array.from(next) as MeProfileGender[];
    });
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
      onboardingStep: advanceToTexts ? ('TEXTS' as const) : ('BASIC' as const),
    };

    if (!hasProfile || nicknameChanged) {
      body.nickname = nextNickname;
    }

    return body;
  }

  function normalizeNicknameValue(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
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
      setSaveError(e instanceof Error ? e.message : ob.saveFailed);
      return false;
    }
  }

  async function handleSaveProgress() {
    const ok = await persist(false);
    if (ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
  }

  async function handleContinueToTexts() {
    const ok = await persist(true);
    if (ok) {
      router.push('/onboarding/texts');
    }
  }

  const inputClass =
    'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400';
  const labelClass =
    'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

  return (
    <div className="space-y-6">
      {loadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      {profileSyncing ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {ob.syncingProfile}
        </p>
      ) : null}

      <div
        className={`space-y-6 ${profileSyncing ? 'pointer-events-none opacity-60' : ''}`}
        aria-busy={profileSyncing}
      >
      <section className="rounded border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {bf.sectionTitle}
        </h2>

        <div className="mb-4 rounded border border-dashed border-zinc-300 bg-white/60 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950/40">
          <span className="font-medium text-zinc-600 dark:text-zinc-400">
            {bf.googleNameLabel}
          </span>
          <p className="text-zinc-900 dark:text-zinc-100">{googleName}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {bf.googleNameHelp}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="onb-nickname" className={labelClass}>
              {bf.nicknameLabel}
            </label>
            <input
              id="onb-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={inputClass}
              placeholder={bf.nicknamePlaceholder}
              autoComplete="off"
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="onb-birth" className={labelClass}>
              {bf.birthDateLabel}
            </label>
            <input
              id="onb-birth"
              type="date"
              max={birthDateMax}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={inputClass}
            />
            {derivedAge !== null ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {bf.ageDisplay(derivedAge)}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="onb-gender" className={labelClass}>
              {bf.genderLabel}
            </label>
            <select
              id="onb-gender"
              value={gender}
              onChange={(e) => {
                setGenderStepError(null);
                setGender(e.target.value);
              }}
              className={inputClass}
            >
              <option value="">{bf.genderSelectPlaceholder}</option>
              {ME_PROFILE_GENDERS.map((g) => (
                <option key={g} value={g}>
                  {genderCopy[g]}
                </option>
              ))}
            </select>
            {genderStepError ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                {genderStepError}
              </p>
            ) : null}
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className={`${labelClass} mb-2`}>
            {bf.partnerGendersLegend}{' '}
            <span className="font-normal text-zinc-500">{bf.partnerGendersRequiredHint}</span>
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {ME_PARTNER_GENDER_CHOICES.map((g) => (
              <label
                key={g}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
              >
                <input
                  type="checkbox"
                  checked={desiredPartnerGenders.includes(g)}
                  onChange={(e) => setPartnerGender(g, e.target.checked)}
                  className="rounded border-zinc-400 text-zinc-900 dark:border-zinc-500"
                />
                {genderCopy[g]}
              </label>
            ))}
          </div>
          {partnerError ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {partnerError}
            </p>
          ) : null}
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="onb-city" className={labelClass}>
              {bf.cityLabel}
            </label>
            <input
              id="onb-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
              placeholder={bf.cityPlaceholder}
              autoComplete="address-level2"
            />
          </div>
          <div>
            <label htmlFor="onb-country" className={labelClass}>
              {bf.countryLabel}
            </label>
            <input
              id="onb-country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClass}
              placeholder={bf.countryPlaceholder}
              autoComplete="country-name"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="onb-loc-label" className={labelClass}>
              {bf.locationLabelLabel}
            </label>
            <input
              id="onb-loc-label"
              type="text"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              className={inputClass}
              placeholder={bf.locationLabelPlaceholder}
            />
          </div>
        </div>
      </section>

      <ProfilePhotoSection requiredForMatching />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSaveProgress()}
          disabled={profileSyncing}
          className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {ob.saveProgress}
        </button>
        <button
          type="button"
          onClick={() => void handleContinueToTexts()}
          disabled={profileSyncing}
          className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {bf.continueToStory}
        </button>
        <Link
          href="/dating"
          className={`text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100 ${profileSyncing ? 'pointer-events-none opacity-50' : ''}`}
          aria-disabled={profileSyncing}
        >
          {ob.continueLater}
        </Link>
      </div>
      </div>

      {savedFlash ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
          {ob.savedFlash}
        </p>
      ) : null}
      {saveError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}

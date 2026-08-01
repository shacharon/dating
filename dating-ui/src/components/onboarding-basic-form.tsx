'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  createMyProfile,
  fetchMyProfile,
  ME_PROFILE_GENDERS,
  patchMyProfile,
  type MeProfileGender,
} from '@/lib/me-profile-api';
import {
  ContentModerationApiError,
  type ContentModerationDetails,
} from '@/lib/content-moderation-error';
import { ContentModerationErrorAlert } from '@/components/content-moderation-error-alert';
import { useAppLocale } from '@/lib/i18n';
import { onboardingResumePath } from '@/lib/onboarding-path';
import { ProfilePhotoSection } from '@/components/profile-photo-section';
import { OnboardingBasicFields } from '@/components/onboarding-basic-fields';
import {
  ageFromBirthInput,
  normalizeNicknameValue,
  togglePartnerGender,
} from '@/components/onboarding-basic-helpers';

export function OnboardingBasicForm({
  variant = 'onboarding',
  onSaved,
}: {
  variant?: 'onboarding' | 'profileHub';
  /** Called after a successful persist (hub quality meter refresh). */
  onSaved?: () => void;
} = {}) {
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

  const [hasProfile, setHasProfile] = useState(false);
  /** False once initial profile fetch + step guard finishes (form stays mounted; no full-page loading gate). */
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
        <OnboardingBasicFields
          bf={bf}
          genderCopy={genderCopy}
          googleName={googleName}
          nickname={nickname}
          onNicknameChange={setNickname}
          birthDate={birthDate}
          birthDateMax={birthDateMax}
          derivedAge={derivedAge}
          onBirthDateChange={setBirthDate}
          gender={gender}
          genderStepError={genderStepError}
          onGenderChange={(value) => {
            setGenderStepError(null);
            setGender(value);
          }}
          desiredPartnerGenders={desiredPartnerGenders}
          partnerError={partnerError}
          onPartnerGenderChange={setPartnerGender}
          city={city}
          onCityChange={setCity}
          country={country}
          onCountryChange={setCountry}
          locationLabel={locationLabel}
          onLocationLabelChange={setLocationLabel}
        />

        {!isHub ? <ProfilePhotoSection requiredForMatching /> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSaveProgress()}
            disabled={profileSyncing}
            className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {ob.saveProgress}
          </button>
          {!isHub ? (
            <button
              type="button"
              onClick={() => void handleContinueToTexts()}
              disabled={profileSyncing}
              className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {bf.continueToStory}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleContinueToTexts()}
              disabled={profileSyncing}
              data-testid="profile-hub-basic-save"
              className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {ob.saveProgress}
            </button>
          )}
        </div>
      </div>

      {savedFlash ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
          {ob.savedFlash}
        </p>
      ) : null}
      {moderationDetails ? (
        <ContentModerationErrorAlert
          details={moderationDetails}
          variant="profile"
          title={mod.profileTitle}
          labels={{
            fieldLabel: mod.fieldLabel,
            flaggedLabel: mod.flaggedLabel,
            whyLabel: mod.whyLabel,
            suggestionLabel: mod.suggestionLabel,
            exampleLabel: mod.exampleLabel,
            mutedLabel: mod.mutedLabel,
            dismiss: mod.dismiss,
          }}
          onDismiss={() => setModerationDetails(null)}
        />
      ) : null}
      {saveError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {saveError}
        </p>
      ) : null}
    </div>
  );
}

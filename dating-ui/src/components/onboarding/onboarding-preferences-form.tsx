'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MatchPreferencesAgeSection,
  MatchPreferencesDistanceSection,
} from '@/components/match-preferences-sections';
import { PlaceLocationFields } from '@/components/onboarding/place-location-fields';
import { useCreateProfile, usePatchProfile, useProfile } from '@/hooks/use-profile';
import { usePlaceLocation } from '@/hooks/use-place-location';
import { useAppLocale } from '@/lib/i18n';
import {
  ageDistanceToPatchBody,
  emptyMatchPreferencesFormState,
  matchPreferencesAgeRangeInvalid,
  profileToMatchPreferencesForm,
  type MatchPreferencesFormState,
} from '@/lib/matches/match-preferences-form';

export function OnboardingPreferencesForm() {
  const router = useRouter();
  const { copy } = useAppLocale();
  const stepCopy = copy.onboarding.preferencesStep;
  const mp = copy.matchPreferences;
  const { profile, isLoading, error: profileError } = useProfile();
  const patchMutation = usePatchProfile();
  const createMutation = useCreateProfile();
  const [form, setForm] = useState<MatchPreferencesFormState>(
    emptyMatchPreferencesFormState(),
  );
  const [initialized, setInitialized] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const location = usePlaceLocation(profile, initialized);

  useEffect(() => {
    if (isLoading || initialized) return;
    if (profile) {
      setForm(profileToMatchPreferencesForm(profile));
    }
    setInitialized(true);
  }, [profile, isLoading, initialized]);

  async function persistCurrent(): Promise<boolean> {
    if (savingRef.current) return false;
    const current = formRef.current;
    setSavedFlash(false);
    if (matchPreferencesAgeRangeInvalid(current)) {
      setAgeError(mp.ageRangeInvalid);
      setSaveError(null);
      return false;
    }
    setAgeError(null);
    setSaveError(null);
    savingRef.current = true;
    setSaving(true);
    try {
      const body = {
        ...ageDistanceToPatchBody(current),
        ...(location.locationPatch() ?? {}),
      };
      const updated = profile?.id
        ? await patchMutation.mutateAsync(body)
        : await createMutation.mutateAsync(body);
      if (updated && typeof updated === 'object' && 'id' in updated) {
        setForm(profileToMatchPreferencesForm(updated));
      }
      setSavedFlash(true);
      return true;
    } catch {
      setSaveError(mp.saveError);
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function onDone() {
    const ok = await persistCurrent();
    if (!ok) return;
    router.push('/dating/me-matches');
  }

  if (isLoading || !initialized) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
        {copy.common.loading}
      </p>
    );
  }

  return (
    <div className="space-y-8" data-testid="onboarding-preferences-form">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {stepCopy.title}
        </h1>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {stepCopy.optionalHint}
        </p>
      </header>

      {profileError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {profileError}
        </p>
      ) : null}

      <MatchPreferencesAgeSection
        mp={mp}
        form={form}
        setForm={setForm}
        onBlur={() => void persistCurrent()}
      />
      <MatchPreferencesDistanceSection
        mp={mp}
        form={form}
        setForm={setForm}
        onBlur={() => void persistCurrent()}
      />
      <PlaceLocationFields
        location={location}
        onChange={() => void persistCurrent()}
      />

      {ageError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {ageError}
        </p>
      ) : null}
      {saveError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {saveError}
        </p>
      ) : null}
      {savedFlash ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {copy.onboarding.savedFlash}
        </p>
      ) : null}

      <button
        type="button"
        data-testid="onboarding-preferences-done"
        disabled={saving}
        onClick={() => void onDone()}
        className="inline-flex min-h-11 items-center rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100"
      >
        {stepCopy.done}
      </button>
    </div>
  );
}

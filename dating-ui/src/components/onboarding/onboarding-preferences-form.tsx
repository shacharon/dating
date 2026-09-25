'use client';

import { useEffect, useRef, useState } from 'react';
import {
  MatchPreferencesAgeSection,
  MatchPreferencesDistanceSection,
} from '@/components/match-preferences-sections';
import { usePatchProfile, useProfile } from '@/hooks/use-profile';
import { useAppLocale } from '@/lib/i18n';
import {
  ageDistanceToPatchBody,
  emptyMatchPreferencesFormState,
  matchPreferencesAgeRangeInvalid,
  profileToMatchPreferencesForm,
  type MatchPreferencesFormState,
} from '@/lib/matches/match-preferences-form';

export function OnboardingPreferencesForm() {
  const { copy } = useAppLocale();
  const stepCopy = copy.onboarding.preferencesStep;
  const mp = copy.matchPreferences;
  const { profile, isLoading, error: profileError } = useProfile();
  const patchMutation = usePatchProfile();
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

  useEffect(() => {
    if (isLoading || initialized) return;
    if (profile) {
      setForm(profileToMatchPreferencesForm(profile));
    }
    setInitialized(true);
  }, [profile, isLoading, initialized]);

  async function onFieldBlur() {
    if (savingRef.current) return;
    const current = formRef.current;
    setSavedFlash(false);
    if (matchPreferencesAgeRangeInvalid(current)) {
      setAgeError(mp.ageRangeInvalid);
      setSaveError(null);
      return;
    }
    setAgeError(null);
    setSaveError(null);
    savingRef.current = true;
    try {
      const updated = await patchMutation.mutateAsync(ageDistanceToPatchBody(current));
      if (updated && typeof updated === 'object' && 'id' in updated) {
        setForm(profileToMatchPreferencesForm(updated));
      }
      setSavedFlash(true);
    } catch {
      setSaveError(mp.saveError);
    } finally {
      savingRef.current = false;
    }
  }

  if (isLoading || !initialized) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
        {copy.common.loading}
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="onboarding-preferences-form">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
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
        onBlur={() => void onFieldBlur()}
      />
      <MatchPreferencesDistanceSection
        mp={mp}
        form={form}
        setForm={setForm}
        onBlur={() => void onFieldBlur()}
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
    </div>
  );
}

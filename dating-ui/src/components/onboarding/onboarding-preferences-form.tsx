'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MatchPreferencesAgeSection,
  MatchPreferencesDistanceSection,
} from '@/components/match-preferences-sections';
import { onboardingStepHref } from '@/components/onboarding/onboarding-step';
import { usePatchProfile, useProfile } from '@/hooks/use-profile';
import { useAppLocale } from '@/lib/i18n';
import {
  ageDistanceToPatchBody,
  emptyMatchPreferencesFormState,
  matchPreferencesAgeRangeInvalid,
  profileToMatchPreferencesForm,
  type MatchPreferencesFormState,
} from '@/lib/matches/match-preferences-form';

const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900';
const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100';

export function OnboardingPreferencesForm() {
  const router = useRouter();
  const editMode = useSearchParams().get('edit') === '1';
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading || initialized) return;
    if (profile) {
      setForm(profileToMatchPreferencesForm(profile));
    }
    setInitialized(true);
  }, [profile, isLoading, initialized]);

  function goToPhotos() {
    router.push(onboardingStepHref('photos', editMode));
  }

  async function onContinue() {
    setSaveError(null);
    if (matchPreferencesAgeRangeInvalid(form)) {
      setAgeError(mp.ageRangeInvalid);
      return;
    }
    setAgeError(null);
    setSaving(true);
    try {
      await patchMutation.mutateAsync(ageDistanceToPatchBody(form));
      goToPhotos();
    } catch {
      setSaveError(mp.saveError);
    } finally {
      setSaving(false);
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

      <MatchPreferencesAgeSection mp={mp} form={form} setForm={setForm} />
      <MatchPreferencesDistanceSection mp={mp} form={form} setForm={setForm} />

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

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          data-testid="onboarding-preferences-skip"
          className={secondaryButtonClass}
          onClick={goToPhotos}
        >
          {stepCopy.skip}
        </button>
        <button
          type="button"
          data-testid="onboarding-preferences-continue"
          className={primaryButtonClass}
          disabled={saving}
          onClick={() => void onContinue()}
        >
          {copy.onboarding.basicForm.continueButton}
        </button>
      </div>
    </div>
  );
}

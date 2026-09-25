'use client';

import { useEffect, useState } from 'react';
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

export function ProfileEditPreferencesSection({
  onSaved,
}: {
  onSaved?: () => void;
}) {
  const { copy } = useAppLocale();
  const mp = copy.matchPreferences;
  const { profile, isLoading } = useProfile();
  const patchMutation = usePatchProfile();
  const [form, setForm] = useState<MatchPreferencesFormState>(
    emptyMatchPreferencesFormState(),
  );
  const [initialized, setInitialized] = useState(false);
  const [ageError, setAgeError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading || initialized) return;
    if (profile) {
      setForm(profileToMatchPreferencesForm(profile));
    }
    setInitialized(true);
  }, [profile, isLoading, initialized]);

  async function onSave() {
    if (!profile) return;
    setSaveError(null);
    setSavedFlash(false);
    if (matchPreferencesAgeRangeInvalid(form)) {
      setAgeError(mp.ageRangeInvalid);
      return;
    }
    setAgeError(null);
    setSaving(true);
    try {
      const updated = await patchMutation.mutateAsync(ageDistanceToPatchBody(form));
      setForm(profileToMatchPreferencesForm(updated));
      setSavedFlash(true);
      onSaved?.();
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
    <div className="space-y-4" data-testid="profile-edit-preferences">
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {copy.onboarding.preferencesStep.optionalHint}
      </p>
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
      {savedFlash ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {copy.onboarding.savedFlash}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="profile-edit-preferences-save"
        className="inline-flex min-h-11 items-center justify-center rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100"
        disabled={saving || !profile}
        onClick={() => void onSave()}
      >
        {copy.onboarding.basicForm.hubSaveButton}
      </button>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAppLocale, type AppCopySchema } from '@/lib/i18n';
import {
  emptyMatchPreferencesFormState,
  matchPreferencesFormToPatchBody,
  profileToMatchPreferencesForm,
  validateMatchPreferencesForm,
  type MatchPreferencesFormState,
  type MatchPreferencesValidationError,
} from '@/lib/matches/match-preferences-form';
import type { InferredDealbreakerDto } from '@/lib/api/me-profile-api';
import {
  MatchPreferencesAgeSection,
  MatchPreferencesDistanceSection,
  MatchPreferencesInferredDealbreakersSection,
  MatchPreferencesPartnerGendersSection,
} from '@/components/match-preferences-sections';
import { usePatchProfile, useProfile } from '@/hooks/use-profile';

function validationMessage(
  copy: AppCopySchema['matchPreferences'],
  error: MatchPreferencesValidationError,
): string {
  if (error === 'ageRangeInvalid') return copy.ageRangeInvalid;
  return copy.partnerGendersRequired;
}

export function MatchPreferencesForm({ showTitle = false }: { showTitle?: boolean }) {
  const { copy } = useAppLocale();
  const mp = copy.matchPreferences;
  const { profile, isLoading, error: profileError } = useProfile();
  const patchMutation = usePatchProfile();

  const [form, setForm] = useState<MatchPreferencesFormState>(
    emptyMatchPreferencesFormState(),
  );
  const [inferredDealbreakers, setInferredDealbreakers] = useState<
    InferredDealbreakerDto[]
  >([]);
  const [initialized, setInitialized] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (initialized) return;
    if (profile) {
      setForm(profileToMatchPreferencesForm(profile));
      setInferredDealbreakers(profile.inferredDealbreakers ?? []);
    }
    setInitialized(true);
  }, [profile, isLoading, initialized]);

  const loading = isLoading || !initialized;
  const noProfile = initialized && !isLoading && !profile;
  const loadError = profileError;

  const handleSave = async () => {
    setValidationError(null);
    setSaveError(null);
    setSaveSuccess(false);
    const result = validateMatchPreferencesForm(form);
    if (!result.ok) {
      setValidationError(validationMessage(mp, result.error));
      return;
    }
    setSaving(true);
    try {
      const updated = await patchMutation.mutateAsync(
        matchPreferencesFormToPatchBody(form),
      );
      setForm(profileToMatchPreferencesForm(updated));
      setSaveSuccess(true);
    } catch {
      setSaveError(mp.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
        {copy.common.loading}
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {loadError}
      </p>
    );
  }

  if (noProfile) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{mp.noProfile}</p>
        <Link
          href="/onboarding"
          className="inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          {mp.goToOnboarding}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showTitle ? (
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {mp.title}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{mp.subtitle}</p>
        </header>
      ) : null}

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <MatchPreferencesPartnerGendersSection
          mp={mp}
          form={form}
          setForm={setForm}
        />
        <MatchPreferencesAgeSection mp={mp} form={form} setForm={setForm} />
        <MatchPreferencesDistanceSection mp={mp} form={form} setForm={setForm} />
        <MatchPreferencesInferredDealbreakersSection
          mp={mp}
          inferredDealbreakers={inferredDealbreakers}
        />

        {validationError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {validationError}
          </p>
        ) : null}
        {saveError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {saveError}
          </p>
        ) : null}
        {saveSuccess ? (
          <div className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
            <p data-testid="match-prefs-save-success">{mp.saveSuccess}</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{mp.saveHint}</p>
          </div>
        ) : null}

        <button
          type="submit"
          data-testid="match-prefs-save"
          disabled={saving}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? copy.common.loading : copy.common.save}
        </button>
      </form>
    </div>
  );
}

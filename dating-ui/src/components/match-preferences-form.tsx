'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  getCopy,
  readStoredLocale,
  type AppCopySchema,
  type AppLocale,
} from '@/lib/i18n';
import {
  emptyMatchPreferencesFormState,
  matchPreferencesFormToPatchBody,
  profileToMatchPreferencesForm,
  toggleArrayValue,
  validateMatchPreferencesForm,
  type MatchPreferencesFormState,
  type MatchPreferencesValidationError,
} from '@/lib/match-preferences-form';
import {
  fetchMyProfile,
  ME_PARTNER_GENDER_CHOICES,
  patchMyProfile,
  type InferredDealbreakerDto,
  type MeProfileGender,
} from '@/lib/me-profile-api';

function validationMessage(
  copy: AppCopySchema['matchPreferences'],
  error: MatchPreferencesValidationError,
): string {
  if (error === 'ageRangeInvalid') return copy.ageRangeInvalid;
  return copy.partnerGendersRequired;
}

export function MatchPreferencesForm({ showTitle = false }: { showTitle?: boolean }) {
  const [locale, setLocale] = useState<AppLocale>(() => readStoredLocale());
  const [form, setForm] = useState<MatchPreferencesFormState>(
    emptyMatchPreferencesFormState(),
  );
  const [inferredDealbreakers, setInferredDealbreakers] = useState<
    InferredDealbreakerDto[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const copy = getCopy(locale);
  const mp = copy.matchPreferences;

  useEffect(() => {
    setLocale(readStoredLocale());
    const onLocaleChanged = (event: Event) => {
      const e = event as CustomEvent<AppLocale>;
      setLocale(e.detail ?? readStoredLocale());
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === APP_LOCALE_STORAGE_KEY) {
        setLocale(readStoredLocale());
      }
    };
    window.addEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchMyProfile();
        if (cancelled) return;
        if (!profile) {
          setNoProfile(true);
          return;
        }
        setForm(profileToMatchPreferencesForm(profile));
        setInferredDealbreakers(profile.inferredDealbreakers ?? []);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error
              ? e.message
              : getCopy(readStoredLocale()).matchPreferences.saveError,
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      const updated = await patchMyProfile(matchPreferencesFormToPatchBody(form));
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
        <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {mp.sections.partnerGenders}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {mp.fields.partnerGendersHelp}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {ME_PARTNER_GENDER_CHOICES.map((g: MeProfileGender) => (
              <label
                key={g}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <input
                  type="checkbox"
                  data-testid={`pref-gender-${g}`}
                  checked={form.desiredPartnerGenders.includes(g)}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      desiredPartnerGenders: toggleArrayValue(
                        prev.desiredPartnerGenders,
                        g,
                      ),
                    }))
                  }
                  className="rounded border-zinc-400 dark:border-zinc-500"
                />
                {mp.partnerGender[g]}
              </label>
            ))}
          </div>
        </section>

        <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {mp.sections.age}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{mp.fields.ageMin}</span>
              <input
                type="number"
                min={18}
                max={99}
                data-testid="pref-age-min"
                value={form.partnerAgeMin}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, partnerAgeMin: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{mp.fields.ageMax}</span>
              <input
                type="number"
                min={18}
                max={99}
                data-testid="pref-age-max"
                value={form.partnerAgeMax}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, partnerAgeMax: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-950"
              />
            </label>
          </div>
        </section>

        <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {mp.sections.distance}
          </h2>
          <label className="mt-3 block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              {mp.fields.maxDistanceKm}
            </span>
            <input
              type="number"
              min={1}
              max={500}
              data-testid="pref-max-distance"
              value={form.maxDistanceKm}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, maxDistanceKm: e.target.value }))
              }
              className="mt-1 w-full max-w-xs rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-950"
            />
          </label>
        </section>

        <section
          className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
          data-testid="inferred-dealbreakers"
        >
          <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {mp.inferredDealbreakers.title}
          </h2>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {mp.inferredDealbreakers.disclaimer}
          </p>
          {inferredDealbreakers.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {mp.inferredDealbreakers.empty}
            </p>
          ) : (
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {inferredDealbreakers.map((item) => (
                <li key={`${item.tag}-${item.classification}-${item.evidence}`}>
                  {item.classification === 'HARD_REQUIRE'
                    ? mp.inferredDealbreakers.requirementLine(item.evidence)
                    : mp.inferredDealbreakers.dealbreakerLine(item.evidence)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">
            <Link
              href="/onboarding/texts?edit=1"
              className="text-emerald-700 underline dark:text-emerald-400"
            >
              {mp.inferredDealbreakers.editStoryCta}
            </Link>
          </p>
        </section>

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

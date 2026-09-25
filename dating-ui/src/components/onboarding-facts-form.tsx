'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { InlineError } from '@/components/errors';
import { useOnboardingAutosave } from '@/components/onboarding/onboarding-autosave';
import { onboardingStepHref } from '@/components/onboarding/onboarding-step';
import { useOnboardingFactsForm } from '@/hooks/use-onboarding-facts-form';
import type { LookingForTile } from '@/lib/profile/looking-for';

const tileClass = (active: boolean) =>
  `inline-flex min-h-11 items-center justify-center rounded border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100 ${
    active
      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
      : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
  }`;

const inputClass =
  'min-h-11 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100';
const labelClass =
  'mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

export function OnboardingFactsForm() {
  const m = useOnboardingFactsForm();
  const router = useRouter();
  const editMode = useSearchParams().get('edit') === '1';
  const autosave = useOnboardingAutosave();
  const flushRef = useRef(m.flushFacts);
  flushRef.current = m.flushFacts;

  useEffect(() => {
    if (!autosave) return;
    return autosave.register(() => flushRef.current().then(() => undefined));
  }, [autosave]);
  const lookingTiles: { id: LookingForTile; label: string }[] = [
    { id: 'men', label: m.ff.lookingForMen },
    { id: 'women', label: m.ff.lookingForWomen },
    { id: 'everyone', label: m.ff.lookingForEveryone },
  ];

  const missingLabels: Record<string, string> = {
    gender: m.ff.missingGender,
    lookingFor: m.ff.missingLookingFor,
    location: m.ff.missingLocation,
    birthDate: m.ff.missingBirthDate,
  };

  const missingId = 'onboarding-facts-missing';
  const showMissing = !m.canContinue && m.missing.length > 0;

  return (
    <div className="space-y-8" data-testid="onboarding-facts-form">
      {m.loadError ? <InlineError>{m.loadError}</InlineError> : null}
      {m.profileSyncing ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          {m.syncingLabel}
        </p>
      ) : null}

      <div
        className={`space-y-8 ${m.profileSyncing ? 'pointer-events-none opacity-60' : ''}`}
        aria-busy={m.profileSyncing}
      >
        <div>
          <label htmlFor="facts-nickname" className={labelClass}>
            {m.bf.nicknameLabel}
          </label>
          <input
            id="facts-nickname"
            type="text"
            className={inputClass}
            placeholder={m.bf.nicknamePlaceholder}
            value={m.nickname}
            onChange={(e) => m.setNickname(e.target.value)}
            autoComplete="nickname"
          />
        </div>

        <fieldset>
          <legend className={labelClass}>{m.ff.iAmLabel}</legend>
          <div className="flex flex-wrap gap-2">
            {m.selfGenders.map((g) => (
              <button
                key={g}
                type="button"
                className={tileClass(m.gender === g)}
                aria-pressed={m.gender === g}
                onClick={() => m.setGender(g)}
              >
                {m.genderCopy[g]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={labelClass}>{m.ff.lookingForLabel}</legend>
          <div className="flex flex-wrap gap-2">
            {lookingTiles.map((t) => (
              <button
                key={t.id}
                type="button"
                className={tileClass(m.lookingFor === t.id)}
                aria-pressed={m.lookingFor === t.id}
                onClick={() => m.setLookingFor(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className={labelClass}>{m.ff.whereLabel}</legend>
          {m.locale === 'he' ? null : (
          <div>
            <label htmlFor="facts-country" className={labelClass}>
              {m.bf.countryLabel}
            </label>
            <select
              id="facts-country"
              className={inputClass}
              value={m.countryCode}
              onChange={(e) => m.setCountryCode(e.target.value)}
            >
              <option value="">{m.bf.countryPlaceholder}</option>
              {m.countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameEn}
                </option>
              ))}
            </select>
          </div>
          )}
          {m.countryCode === 'US' ? (
            <div>
              <label htmlFor="facts-state" className={labelClass}>
                {m.bf.stateLabel}
              </label>
              <select
                id="facts-state"
                className={inputClass}
                value={m.usStateCode}
                onChange={(e) => m.setUsStateCode(e.target.value)}
              >
                <option value="">{m.bf.stateLabel}</option>
                {m.usStates.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.nameEn}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {m.countryCode && (m.countryCode !== 'US' || m.usStateCode) ? (
            <div className="space-y-2">
              <label htmlFor="facts-city" className={labelClass}>
                {m.bf.cityLabel}
              </label>
              <select
                id="facts-city"
                className={inputClass}
                value={m.cityId}
                onChange={(e) => m.setCityId(e.target.value)}
              >
                <option value="">{m.bf.cityLabel}</option>
                {m.filteredCities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {m.cityLabel(c)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor="facts-birth" className={labelClass}>
            {m.ff.birthDateLabel}
          </label>
          <input
            id="facts-birth"
            type="date"
            className={inputClass}
            value={m.birthDate}
            max={m.birthDateMax}
            onChange={(e) => m.setBirthDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {showMissing ? (
            <p
              id={missingId}
              className="text-sm text-zinc-600 dark:text-zinc-400"
              role="status"
            >
              {m.ff.missingHeading}{' '}
              {m.missing.map((k) => missingLabels[k]).join(', ')}
            </p>
          ) : null}
          {m.saveError ? <InlineError>{m.saveError}</InlineError> : null}
          {m.canContinue ? (
            <button
              type="button"
              data-testid="onboarding-facts-continue"
              className="inline-flex min-h-11 items-center justify-center rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
              onClick={() => {
                void (async () => {
                  const ok = await m.flushFacts();
                  if (!ok) return;
                  router.push(onboardingStepHref('preferences', editMode));
                })();
              }}
            >
              {m.bf.continueButton}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

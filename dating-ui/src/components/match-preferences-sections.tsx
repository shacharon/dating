'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { AppCopySchema } from '@/lib/i18n';
import type { MatchPreferencesFormState } from '@/lib/matches/match-preferences-form';

type MpCopy = AppCopySchema['matchPreferences'];
type FormSetter = Dispatch<SetStateAction<MatchPreferencesFormState>>;

type SectionProps = {
  mp: MpCopy;
  form: MatchPreferencesFormState;
  setForm: FormSetter;
  onBlur?: () => void;
};

const labelClass =
  'mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300';
const fieldClass =
  'min-h-11 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function MatchPreferencesAgeSection({
  mp,
  form,
  setForm,
  onBlur,
}: SectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {mp.sections.age}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <label className="block" htmlFor="pref-age-min">
          <span className={labelClass}>{mp.fields.ageMin}</span>
          <input
            id="pref-age-min"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            data-testid="pref-age-min"
            value={form.partnerAgeMin}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                partnerAgeMin: digitsOnly(e.target.value),
              }))
            }
            className={fieldClass}
            onBlur={onBlur}
          />
        </label>
        <label className="block" htmlFor="pref-age-max">
          <span className={labelClass}>{mp.fields.ageMax}</span>
          <input
            id="pref-age-max"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            data-testid="pref-age-max"
            value={form.partnerAgeMax}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                partnerAgeMax: digitsOnly(e.target.value),
              }))
            }
            className={fieldClass}
            onBlur={onBlur}
          />
        </label>
      </div>
    </section>
  );
}

export function MatchPreferencesDistanceSection({
  mp,
  form,
  setForm,
  onBlur,
}: SectionProps) {
  return (
    <section>
      <label className="block" htmlFor="pref-max-distance">
        <span className={labelClass}>{mp.fields.maxDistanceKm}</span>
        <input
          id="pref-max-distance"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          data-testid="pref-max-distance"
          value={form.maxDistanceKm}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              maxDistanceKm: digitsOnly(e.target.value),
            }))
          }
          className={fieldClass}
          onBlur={onBlur}
        />
      </label>
    </section>
  );
}

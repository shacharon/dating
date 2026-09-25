'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { AppCopySchema } from '@/lib/i18n';
import type { MatchPreferencesFormState } from '@/lib/matches/match-preferences-form';

type MpCopy = AppCopySchema['matchPreferences'];
type FormSetter = Dispatch<SetStateAction<MatchPreferencesFormState>>;

export function MatchPreferencesAgeSection({
  mp,
  form,
  setForm,
}: {
  mp: MpCopy;
  form: MatchPreferencesFormState;
  setForm: FormSetter;
}) {
  return (
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
            className="mt-1 min-h-11 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
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
            className="mt-1 min-h-11 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
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
}: {
  mp: MpCopy;
  form: MatchPreferencesFormState;
  setForm: FormSetter;
}) {
  return (
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
          className="mt-1 min-h-11 w-full max-w-xs rounded border border-zinc-300 bg-white px-2 py-1.5 text-base text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </label>
    </section>
  );
}

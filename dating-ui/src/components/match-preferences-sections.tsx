'use client';

import Link from 'next/link';
import type { Dispatch, SetStateAction } from 'react';
import type { AppCopySchema } from '@/lib/i18n';
import {
  toggleArrayValue,
  type MatchPreferencesFormState,
} from '@/lib/match-preferences-form';
import {
  ME_PARTNER_GENDER_CHOICES,
  type InferredDealbreakerDto,
  type MeProfileGender,
} from '@/lib/me-profile-api';

type MpCopy = AppCopySchema['matchPreferences'];
type FormSetter = Dispatch<SetStateAction<MatchPreferencesFormState>>;

export function MatchPreferencesPartnerGendersSection({
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
  );
}

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
          className="mt-1 w-full max-w-xs rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-950"
        />
      </label>
    </section>
  );
}

export function MatchPreferencesInferredDealbreakersSection({
  mp,
  inferredDealbreakers,
}: {
  mp: MpCopy;
  inferredDealbreakers: InferredDealbreakerDto[];
}) {
  return (
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
  );
}

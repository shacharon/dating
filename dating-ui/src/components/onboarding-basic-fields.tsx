'use client';

import {
  ME_PARTNER_GENDER_CHOICES,
  ME_PROFILE_GENDERS,
  type MeProfileGender,
} from '@/lib/api/me-profile-api';
import type { AppCopySchema } from '@/lib/i18n/types';

const inputClass =
  'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400';
const labelClass =
  'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

type BasicFormCopy = AppCopySchema['onboarding']['basicForm'];
type GenderCopy = AppCopySchema['gender'];

export type OnboardingBasicFieldsProps = {
  bf: BasicFormCopy;
  genderCopy: GenderCopy;
  googleName: string;
  nickname: string;
  onNicknameChange: (value: string) => void;
  birthDate: string;
  birthDateMax: string;
  derivedAge: number | null;
  onBirthDateChange: (value: string) => void;
  gender: string;
  genderStepError: string | null;
  onGenderChange: (value: string) => void;
  desiredPartnerGenders: MeProfileGender[];
  partnerError: string | null;
  onPartnerGenderChange: (g: MeProfileGender, checked: boolean) => void;
  city: string;
  onCityChange: (value: string) => void;
  country: string;
  onCountryChange: (value: string) => void;
  locationLabel: string;
  onLocationLabelChange: (value: string) => void;
};

export function OnboardingBasicFields({
  bf,
  genderCopy,
  googleName,
  nickname,
  onNicknameChange,
  birthDate,
  birthDateMax,
  derivedAge,
  onBirthDateChange,
  gender,
  genderStepError,
  onGenderChange,
  desiredPartnerGenders,
  partnerError,
  onPartnerGenderChange,
  city,
  onCityChange,
  country,
  onCountryChange,
  locationLabel,
  onLocationLabelChange,
}: OnboardingBasicFieldsProps) {
  return (
    <section className="rounded border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
      <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        {bf.sectionTitle}
      </h2>

      <div className="mb-4 rounded border border-dashed border-zinc-300 bg-white/60 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950/40">
        <span className="font-medium text-zinc-600 dark:text-zinc-400">
          {bf.googleNameLabel}
        </span>
        <p className="text-zinc-900 dark:text-zinc-100">{googleName}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {bf.googleNameHelp}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="onb-nickname" className={labelClass}>
            {bf.nicknameLabel}
          </label>
          <input
            id="onb-nickname"
            type="text"
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            className={inputClass}
            placeholder={bf.nicknamePlaceholder}
            autoComplete="off"
            maxLength={80}
          />
        </div>
        <div>
          <label htmlFor="onb-birth" className={labelClass}>
            {bf.birthDateLabel}
          </label>
          <input
            id="onb-birth"
            type="date"
            max={birthDateMax}
            value={birthDate}
            onChange={(e) => onBirthDateChange(e.target.value)}
            className={inputClass}
          />
          {derivedAge !== null ? (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {bf.ageDisplay(derivedAge)}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="onb-gender" className={labelClass}>
            {bf.genderLabel}
          </label>
          <select
            id="onb-gender"
            value={gender}
            onChange={(e) => onGenderChange(e.target.value)}
            className={inputClass}
          >
            <option value="">{bf.genderSelectPlaceholder}</option>
            {ME_PROFILE_GENDERS.map((g) => (
              <option key={g} value={g}>
                {genderCopy[g]}
              </option>
            ))}
          </select>
          {genderStepError ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {genderStepError}
            </p>
          ) : null}
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className={`${labelClass} mb-2`}>
          {bf.partnerGendersLegend}{' '}
          <span className="font-normal text-zinc-500">
            {bf.partnerGendersRequiredHint}
          </span>
        </legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {ME_PARTNER_GENDER_CHOICES.map((g) => (
            <label
              key={g}
              className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
            >
              <input
                type="checkbox"
                checked={desiredPartnerGenders.includes(g)}
                onChange={(e) => onPartnerGenderChange(g, e.target.checked)}
                className="rounded border-zinc-400 text-zinc-900 dark:border-zinc-500"
              />
              {genderCopy[g]}
            </label>
          ))}
        </div>
        {partnerError ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {partnerError}
          </p>
        ) : null}
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="onb-city" className={labelClass}>
            {bf.cityLabel}
          </label>
          <input
            id="onb-city"
            type="text"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className={inputClass}
            placeholder={bf.cityPlaceholder}
            autoComplete="address-level2"
          />
        </div>
        <div>
          <label htmlFor="onb-country" className={labelClass}>
            {bf.countryLabel}
          </label>
          <input
            id="onb-country"
            type="text"
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            className={inputClass}
            placeholder={bf.countryPlaceholder}
            autoComplete="country-name"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="onb-loc-label" className={labelClass}>
            {bf.locationLabelLabel}
          </label>
          <input
            id="onb-loc-label"
            type="text"
            value={locationLabel}
            onChange={(e) => onLocationLabelChange(e.target.value)}
            className={inputClass}
            placeholder={bf.locationLabelPlaceholder}
          />
        </div>
      </div>
    </section>
  );
}

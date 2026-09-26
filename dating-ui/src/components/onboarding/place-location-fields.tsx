'use client';

import { useAppLocale } from '@/lib/i18n';
import type { usePlaceLocation } from '@/hooks/use-place-location';

const inputClass =
  'min-h-11 w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100';
const labelClass =
  'mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

type PlaceLocation = ReturnType<typeof usePlaceLocation>;

export function PlaceLocationFields({
  location,
  onChange,
}: {
  location: PlaceLocation;
  onChange?: () => void;
}) {
  const { copy } = useAppLocale();
  const bf = copy.onboarding.basicForm;
  const ff = copy.onboarding.factsForm;
  const showCity =
    Boolean(location.countryCode) &&
    (location.countryCode !== 'US' || Boolean(location.usStateCode));

  return (
    <fieldset className="space-y-6" data-testid="place-location-fields">
      <legend className={labelClass}>{ff.whereLabel}</legend>
      {location.hebrew ? null : (
        <div>
          <label htmlFor="pref-country" className={labelClass}>
            {bf.countryLabel}
          </label>
          <select
            id="pref-country"
            data-testid="pref-country"
            className={inputClass}
            value={location.countryCode}
            onChange={(e) => {
              location.setCountryCode(e.target.value);
              onChange?.();
            }}
          >
            <option value="">{bf.countryPlaceholder}</option>
            {location.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </div>
      )}
      {!location.hebrew && location.countryCode === 'US' ? (
        <div>
          <label htmlFor="pref-state" className={labelClass}>
            {bf.stateLabel}
          </label>
          <select
            id="pref-state"
            data-testid="pref-state"
            className={inputClass}
            value={location.usStateCode}
            onChange={(e) => {
              location.setUsStateCode(e.target.value);
              onChange?.();
            }}
          >
            <option value="">{bf.stateLabel}</option>
            {location.usStates.map((s) => (
              <option key={s.code} value={s.code}>
                {s.nameEn}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {showCity ? (
        <div>
          <label htmlFor="pref-city" className={labelClass}>
            {bf.cityLabel}
          </label>
          <select
            id="pref-city"
            data-testid="pref-city"
            className={inputClass}
            value={location.cityId}
            onChange={(e) => {
              location.setCityId(e.target.value);
              onChange?.();
            }}
          >
            <option value="">{bf.cityLabel}</option>
            {location.filteredCities.map((c) => (
              <option key={c.id} value={c.id}>
                {location.cityLabel(c)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </fieldset>
  );
}

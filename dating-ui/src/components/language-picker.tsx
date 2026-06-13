"use client";

import {
  getCopy,
  getLocaleDirection,
  writeStoredLocale,
  type AppLocale,
} from "@/lib/i18n";

type LanguagePickerProps = {
  locale: AppLocale;
  onLocaleChange?: (locale: AppLocale) => void;
  className?: string;
  id?: string;
};

export function LanguagePicker({
  locale,
  onLocaleChange,
  className = "",
  id = "language-picker",
}: LanguagePickerProps) {
  const copy = getCopy(locale).languageSettings;
  const dir = getLocaleDirection(locale);

  function onChange(nextLocale: AppLocale) {
    writeStoredLocale(nextLocale);
    onLocaleChange?.(nextLocale);
  }

  return (
    <div dir={dir} className={className}>
      <label
        htmlFor={id}
        className="mb-1 block text-center text-xs font-medium text-zinc-500 dark:text-zinc-400"
      >
        {copy.label}
      </label>
      <select
        id={id}
        value={locale}
        onChange={(e) => onChange(e.target.value as AppLocale)}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="en">{copy.optionEn}</option>
        <option value="es">{copy.optionEs}</option>
        <option value="he">{copy.optionHe}</option>
      </select>
    </div>
  );
}

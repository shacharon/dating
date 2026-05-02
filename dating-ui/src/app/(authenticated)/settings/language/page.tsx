"use client";

import {
  DEFAULT_LOCALE,
  type AppLocale,
  readStoredLocale,
  writeStoredLocale,
} from "@/lib/i18n";
import { useEffect, useState } from "react";

export default function SettingsLanguagePage() {
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(readStoredLocale());
  }, []);

  function onLocaleChange(nextLocale: AppLocale) {
    setLocale(nextLocale);
    writeStoredLocale(nextLocale);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Language
      </h1>
      <div className="mt-4 max-w-xs">
        <label
          htmlFor="settings-language"
          className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Language
        </label>
        <select
          id="settings-language"
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value as AppLocale)}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
        </select>
      </div>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">TODO</p>
    </main>
  );
}

"use client";

import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  getCopy,
  readStoredLocale,
  type AppLocale,
} from "@/lib/i18n";
import { useEffect, useState } from "react";

export function OnboardingPageHeading({ step }: { step: "basic" | "texts" }) {
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(readStoredLocale());
    const onLocaleChanged = (event: Event) => {
      const e = event as CustomEvent<AppLocale>;
      if (e.detail) {
        setLocale(e.detail);
        return;
      }
      setLocale(readStoredLocale());
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === APP_LOCALE_STORAGE_KEY) {
        setLocale(readStoredLocale());
      }
    };
    window.addEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const copy = getCopy(locale).onboarding;
  const title = step === "basic" ? copy.basicsTitle : copy.storyTitle;
  const subtitle = step === "basic" ? copy.basicsSubtitle : copy.storySubtitle;

  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {subtitle}
      </p>
    </header>
  );
}

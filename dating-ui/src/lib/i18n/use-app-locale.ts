"use client";

import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  getCopy,
  readStoredLocale,
} from "@/lib/i18n/index";
import type { AppCopySchema, AppLocale } from "@/lib/i18n/types";
import { useEffect, useState } from "react";

export function useAppLocale(): { locale: AppLocale; copy: AppCopySchema } {
  const [locale, setLocale] = useState<AppLocale>(() => readStoredLocale());

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

  return { locale, copy: getCopy(locale) };
}

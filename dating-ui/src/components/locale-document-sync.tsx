"use client";

import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  getLocaleDirection,
  getLocaleHtmlLang,
  isSupportedLocale,
  readStoredLocale,
  type AppLocale,
} from "@/lib/i18n";
import { useEffect } from "react";

function applyDocumentLocale(locale: AppLocale): void {
  const root = document.documentElement;
  root.lang = getLocaleHtmlLang(locale);
  root.dir = getLocaleDirection(locale);
}

/**
 * Keeps `<html lang dir>` in sync with the user's locale choice (localStorage).
 */
export function LocaleDocumentSync() {
  useEffect(() => {
    applyDocumentLocale(readStoredLocale());

    const onLocaleChanged = (event: Event) => {
      const detail = (event as CustomEvent<AppLocale>).detail;
      if (detail && isSupportedLocale(detail)) {
        applyDocumentLocale(detail);
        return;
      }
      applyDocumentLocale(readStoredLocale());
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === APP_LOCALE_STORAGE_KEY) {
        applyDocumentLocale(readStoredLocale());
      }
    };

    window.addEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}

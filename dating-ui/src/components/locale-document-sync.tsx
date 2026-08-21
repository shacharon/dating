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
  const newLang = getLocaleHtmlLang(locale);
  const newDir = getLocaleDirection(locale);

  if (root.lang !== newLang) {
    root.lang = newLang;
  }
  if (root.dir !== newDir) {
    root.dir = newDir;
  }
}

/**
 * Updates `<html lang dir>` when user switches locale client-side.
 *
 * Applies stored locale on mount (covers hydration when localStorage differs
 * from SSR), then listens for locale-change / storage events.
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

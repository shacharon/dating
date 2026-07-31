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
 * Server-rendered initial locale is correct from layout.tsx.
 * This component only updates the attributes when the locale changes after hydration.
 * It checks if the locale has actually changed before updating to avoid unnecessary DOM mutations.
 */
export function LocaleDocumentSync() {
  useEffect(() => {
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

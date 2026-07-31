import { enCopy } from "@/lib/i18n/en";
import { esCopy } from "@/lib/i18n/es";
import { heCopy } from "@/lib/i18n/he";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type AppCopySchema,
  type AppLocale,
} from "@/lib/i18n/types";

export const APP_LOCALE_STORAGE_KEY = "dating-ui.locale";
export const APP_LOCALE_CHANGE_EVENT = "dating-ui:locale-change";

const COPY_BY_LOCALE: Record<AppLocale, AppCopySchema> = {
  en: enCopy,
  es: esCopy,
  he: heCopy,
};

export { DEFAULT_LOCALE, SUPPORTED_LOCALES };
export type { AppCopySchema, AppLocale };

export function isSupportedLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function getCopy(locale: AppLocale = DEFAULT_LOCALE): AppCopySchema {
  return COPY_BY_LOCALE[locale];
}

export function t<K extends keyof AppCopySchema>(
  locale: AppLocale,
  section: K,
): AppCopySchema[K] {
  return getCopy(locale)[section];
}

export function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  
  // First try localStorage
  const raw = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  if (raw && isSupportedLocale(raw)) return raw;
  
  // Fallback to cookie if localStorage is empty
  const cookieMatch = document.cookie
    .split("; ")
    .find((row) => row.startsWith("locale="));
  
  if (cookieMatch) {
    const cookieValue = cookieMatch.split("=")[1];
    if (isSupportedLocale(cookieValue)) {
      // Sync to localStorage for consistency
      window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, cookieValue);
      return cookieValue;
    }
  }
  
  return DEFAULT_LOCALE;
}

export function writeStoredLocale(locale: AppLocale): void {
  if (typeof window === "undefined") return;
  
  // Persist to localStorage for client-side access
  window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  
  // Set cookie for SSR access on next page load
  // Max age: 1 year, path: root, SameSite: Lax for security
  document.cookie = `locale=${locale}; max-age=31536000; path=/; SameSite=Lax`;
  
  // Notify listeners of the change
  window.dispatchEvent(
    new CustomEvent<AppLocale>(APP_LOCALE_CHANGE_EVENT, { detail: locale }),
  );
}

/** Text direction for layout (`dir` attribute). Hebrew is RTL; EN/ES are LTR. */
export function getLocaleDirection(locale: AppLocale): "ltr" | "rtl" {
  return locale === "he" ? "rtl" : "ltr";
}

export function getLocaleHtmlLang(locale: AppLocale): string {
  return locale;
}

export { useAppLocale } from "@/lib/i18n/use-app-locale";

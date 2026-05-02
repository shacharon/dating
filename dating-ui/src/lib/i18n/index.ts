import { enCopy } from "@/lib/i18n/en";
import { esCopy } from "@/lib/i18n/es";
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
  const raw = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  if (!raw) return DEFAULT_LOCALE;
  return isSupportedLocale(raw) ? raw : DEFAULT_LOCALE;
}

export function writeStoredLocale(locale: AppLocale): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  window.dispatchEvent(
    new CustomEvent<AppLocale>(APP_LOCALE_CHANGE_EVENT, { detail: locale }),
  );
}

/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getCopy,
  getLocaleDirection,
  getLocaleHtmlLang,
  isSupportedLocale,
  readStoredLocale,
  writeStoredLocale,
} from "@/lib/i18n";

describe("i18n locales", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("supports English, Spanish, and Hebrew", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "es", "he"]);
    expect(isSupportedLocale("he")).toBe(true);
    expect(isSupportedLocale("fr")).toBe(false);
  });

  it("returns copy for every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const copy = getCopy(locale);
      expect(copy.landing.title.length).toBeGreaterThan(0);
      expect(copy.languageSettings.optionHe.length).toBeGreaterThan(0);
    }
  });

  it("uses RTL only for Hebrew", () => {
    expect(getLocaleDirection("en")).toBe("ltr");
    expect(getLocaleDirection("es")).toBe("ltr");
    expect(getLocaleDirection("he")).toBe("rtl");
  });

  it("maps html lang to locale code", () => {
    expect(getLocaleHtmlLang("he")).toBe("he");
  });

  it("readStoredLocale falls back to en when storage is missing or invalid", () => {
    expect(readStoredLocale()).toBe("en");
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, "fr");
    expect(readStoredLocale()).toBe("en");
  });

  it("writeStoredLocale persists and dispatches locale change event", () => {
    const listener = vi.fn();
    window.addEventListener(APP_LOCALE_CHANGE_EVENT, listener);

    writeStoredLocale("he");

    expect(localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe("he");
    expect(readStoredLocale()).toBe("he");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(
      (listener.mock.calls[0]![0] as CustomEvent).detail,
    ).toBe("he");

    window.removeEventListener(APP_LOCALE_CHANGE_EVENT, listener);
  });
});

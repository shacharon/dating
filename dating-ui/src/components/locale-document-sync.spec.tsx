/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  writeStoredLocale,
} from "@/lib/i18n";
import { LocaleDocumentSync } from "./locale-document-sync";

describe("LocaleDocumentSync", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    document.documentElement.removeAttribute("dir");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    document.documentElement.removeAttribute("dir");
  });

  it("sets html lang and dir from stored locale on mount", () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, "he");

    render(<LocaleDocumentSync />);

    expect(document.documentElement.lang).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("updates html lang and dir when locale change event fires", () => {
    render(<LocaleDocumentSync />);
    expect(document.documentElement.lang).toBe("en");
    expect(document.documentElement.dir).toBe("ltr");

    writeStoredLocale("he");

    expect(document.documentElement.lang).toBe("he");
    expect(document.documentElement.dir).toBe("rtl");
  });

  it("updates html attributes when custom event fires without detail", () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, "es");
    render(<LocaleDocumentSync />);

    window.dispatchEvent(new Event(APP_LOCALE_CHANGE_EVENT));

    expect(document.documentElement.lang).toBe("es");
    expect(document.documentElement.dir).toBe("ltr");
  });
});

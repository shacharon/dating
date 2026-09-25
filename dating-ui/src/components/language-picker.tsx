"use client";

import {
  getCopy,
  getLocaleDirection,
  writeStoredLocale,
  type AppLocale,
} from "@/lib/i18n";

type LanguagePickerProps = {
  locale: AppLocale;
  onLocaleChange?: (locale: AppLocale) => void;
  className?: string;
  id?: string;
};

const FLAGS: {
  locale: AppLocale;
  flag: string;
  optionKey: "optionEn" | "optionEs" | "optionHe";
}[] = [
  { locale: "he", flag: "🇮🇱", optionKey: "optionHe" },
  { locale: "en", flag: "🇬🇧", optionKey: "optionEn" },
  { locale: "es", flag: "🇪🇸", optionKey: "optionEs" },
];

export function LanguagePicker({
  locale,
  onLocaleChange,
  className = "",
  id = "language-picker",
}: LanguagePickerProps) {
  const copy = getCopy(locale).languageSettings;
  const dir = getLocaleDirection(locale);

  function choose(nextLocale: AppLocale) {
    writeStoredLocale(nextLocale);
    onLocaleChange?.(nextLocale);
  }

  return (
    <div
      dir={dir}
      id={id}
      role="group"
      aria-label={copy.label}
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      {FLAGS.map((item) => {
        const selected = locale === item.locale;
        const name = copy[item.optionKey];
        return (
          <button
            key={item.locale}
            type="button"
            aria-pressed={selected}
            aria-label={name}
            onClick={() => choose(item.locale)}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none ${
              selected
                ? "ring-2 ring-zinc-900 dark:ring-zinc-100"
                : "opacity-80 hover:opacity-100"
            }`}
          >
            <span aria-hidden>{item.flag}</span>
          </button>
        );
      })}
    </div>
  );
}

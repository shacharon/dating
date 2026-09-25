'use client';

import { getCopy, type AppLocale } from '@/lib/i18n';
import {
  demoLanguageLinks,
  type DemoLanguageLink,
} from '@/lib/platform/demo-language-links';

const LABEL: Record<DemoLanguageLink['locale'], 'optionEn' | 'optionEs' | 'optionHe'> = {
  en: 'optionEn',
  es: 'optionEs',
  he: 'optionHe',
};

export function DemoLanguageLinks({
  locale,
  hostname,
}: {
  locale: AppLocale;
  hostname: string;
}) {
  const links = demoLanguageLinks({ hostname, locale });
  if (links.length === 0) return null;
  const copy = getCopy(locale).languageSettings;

  return (
    <nav
      aria-label={copy.label}
      className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm"
      data-testid="demo-language-links"
    >
      {links.map((link) => (
        <a
          key={link.locale}
          href={link.href}
          className="inline-flex min-h-11 items-center font-medium text-zinc-800 underline underline-offset-4 hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-800 dark:text-zinc-100 dark:hover:text-white dark:focus-visible:outline-zinc-100"
        >
          {copy[LABEL[link.locale]]}
        </a>
      ))}
    </nav>
  );
}

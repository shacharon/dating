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
      className="flex items-center justify-center gap-3 text-sm"
      data-testid="demo-language-links"
    >
      {links.map((link) => (
        <a
          key={link.locale}
          href={link.href}
          className="font-medium text-zinc-800 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-100 dark:hover:text-white"
        >
          {copy[LABEL[link.locale]]}
        </a>
      ))}
    </nav>
  );
}

import type { AppLocale } from '@/lib/i18n';

export type DemoLanguageLink = {
  locale: AppLocale;
  href: string;
};

type Input = {
  hostname: string;
  locale: AppLocale;
  demo?: string;
  hebrewHost?: string;
  comHost?: string;
};

function bareHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function isHost(hostname: string, expected: string): boolean {
  const host = bareHost(hostname);
  const name = bareHost(expected);
  if (!name) return false;
  return host === name || host === `www.${name}`;
}

function siteUrl(host: string, locale: AppLocale): string {
  return `https://${bareHost(host)}/?locale=${locale}`;
}

/**
 * Cross-domain language links. Hostnames come from env so the live `.il`
 * name stays a go-live decision. Missing hosts or DEMO off → no links.
 */
export function demoLanguageLinks(input: Input): DemoLanguageLink[] {
  const demo = (input.demo ?? process.env.NEXT_PUBLIC_DEMO)?.trim();
  if (demo !== '1') return [];

  const hebrewHost = (input.hebrewHost ?? process.env.NEXT_PUBLIC_HEBREW_HOST)?.trim() ?? '';
  const comHost = (input.comHost ?? process.env.NEXT_PUBLIC_COM_HOST)?.trim() || 'findyouraidate.com';
  if (!hebrewHost) return [];

  const onHebrew = isHost(input.hostname, hebrewHost);
  const onCom = isHost(input.hostname, comHost);
  if (!onHebrew && !onCom) return [];

  const locale: AppLocale = onHebrew ? 'he' : input.locale === 'es' ? 'es' : 'en';
  const all: DemoLanguageLink[] = [
    { locale: 'he', href: siteUrl(hebrewHost, 'he') },
    { locale: 'en', href: siteUrl(comHost, 'en') },
    { locale: 'es', href: siteUrl(comHost, 'es') },
  ];
  return all.filter((link) => link.locale !== locale);
}

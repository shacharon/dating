import { describe, expect, it } from 'vitest';
import { demoLanguageLinks } from './demo-language-links';

const hosts = { hebrewHost: 'brand.example.il', comHost: 'brand.example.com' };

describe('demoLanguageLinks', () => {
  it('returns nothing when DEMO is off or the Hebrew host is unset', () => {
    expect(
      demoLanguageLinks({ hostname: 'brand.example.il', locale: 'he', demo: '', ...hosts }),
    ).toEqual([]);
    expect(
      demoLanguageLinks({ hostname: 'brand.example.il', locale: 'he', demo: 'true', ...hosts }),
    ).toEqual([]);
    expect(
      demoLanguageLinks({
        hostname: 'brand.example.com',
        locale: 'en',
        demo: '1',
        hebrewHost: '  ',
        comHost: hosts.comHost,
      }),
    ).toEqual([]);
  });

  it('Hebrew host links to English and Spanish on .com', () => {
    expect(
      demoLanguageLinks({
        hostname: 'www.brand.example.il',
        locale: 'en',
        demo: '1',
        ...hosts,
      }),
    ).toEqual([
      { locale: 'en', href: 'https://brand.example.com/?locale=en' },
      { locale: 'es', href: 'https://brand.example.com/?locale=es' },
    ]);
  });

  it('English on .com links to Hebrew and Spanish', () => {
    expect(
      demoLanguageLinks({
        hostname: 'brand.example.com',
        locale: 'en',
        demo: '1',
        ...hosts,
      }),
    ).toEqual([
      { locale: 'he', href: 'https://brand.example.il/?locale=he' },
      { locale: 'es', href: 'https://brand.example.com/?locale=es' },
    ]);
  });

  it('Spanish on .com links to Hebrew and English', () => {
    expect(
      demoLanguageLinks({
        hostname: 'www.brand.example.com',
        locale: 'es',
        demo: '1',
        ...hosts,
      }),
    ).toEqual([
      { locale: 'he', href: 'https://brand.example.il/?locale=he' },
      { locale: 'en', href: 'https://brand.example.com/?locale=en' },
    ]);
  });

  it('unknown host returns nothing', () => {
    expect(
      demoLanguageLinks({ hostname: 'localhost', locale: 'en', demo: '1', ...hosts }),
    ).toEqual([]);
  });
});

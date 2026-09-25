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

  it('treats a Hebrew locale on .com as English', () => {
    expect(
      demoLanguageLinks({
        hostname: 'BRAND.EXAMPLE.COM',
        locale: 'he',
        demo: '1',
        ...hosts,
      }),
    ).toEqual([
      { locale: 'he', href: 'https://brand.example.il/?locale=he' },
      { locale: 'es', href: 'https://brand.example.com/?locale=es' },
    ]);
  });

  it('uses findyouraidate.com when the .com host is omitted', () => {
    const previous = process.env.NEXT_PUBLIC_COM_HOST;
    delete process.env.NEXT_PUBLIC_COM_HOST;
    try {
      expect(
        demoLanguageLinks({
          hostname: 'findyouraidate.com',
          locale: 'en',
          demo: ' 1 ',
          hebrewHost: 'brand.example.il',
        }),
      ).toEqual([
        { locale: 'he', href: 'https://brand.example.il/?locale=he' },
        { locale: 'es', href: 'https://findyouraidate.com/?locale=es' },
      ]);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_COM_HOST;
      else process.env.NEXT_PUBLIC_COM_HOST = previous;
    }
  });

  it('unknown host returns nothing', () => {
    expect(
      demoLanguageLinks({ hostname: 'localhost', locale: 'en', demo: '1', ...hosts }),
    ).toEqual([]);
  });
});

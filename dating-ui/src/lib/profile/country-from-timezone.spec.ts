import { describe, expect, it } from 'vitest';
import {
  countryCodeFromTimeZone,
  defaultOnboardingCountryCode,
  guessOnboardingCountryCode,
} from '@/lib/profile/country-from-timezone';

describe('country-from-timezone', () => {
  it('maps common time zones', () => {
    expect(countryCodeFromTimeZone('Asia/Jerusalem')).toBe('IL');
    expect(countryCodeFromTimeZone('America/New_York')).toBe('US');
    expect(countryCodeFromTimeZone('Europe/London')).toBe('GB');
    expect(countryCodeFromTimeZone('Europe/Berlin')).toBe('DE');
    expect(countryCodeFromTimeZone('Australia/Sydney')).toBe('AU');
  });

  it('returns null for unmapped zones', () => {
    expect(countryCodeFromTimeZone('Etc/UTC')).toBeNull();
    expect(countryCodeFromTimeZone('Mars/Olympus')).toBeNull();
  });

  it('defaults English and Spanish to US and Hebrew to IL', () => {
    expect(defaultOnboardingCountryCode('en')).toBe('US');
    expect(defaultOnboardingCountryCode('es')).toBe('US');
    expect(defaultOnboardingCountryCode('he')).toBe('IL');
    expect(defaultOnboardingCountryCode('en', new Set(['IL']))).toBeNull();
  });

  it('guessOnboardingCountryCode respects allowed set', () => {
    expect(
      guessOnboardingCountryCode('Asia/Jerusalem', new Set(['US', 'GB'])),
    ).toBeNull();
    expect(
      guessOnboardingCountryCode('Asia/Jerusalem', new Set(['IL', 'US'])),
    ).toBe('IL');
  });
});

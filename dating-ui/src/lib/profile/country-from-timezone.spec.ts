import { describe, expect, it } from 'vitest';
import {
  countryCodeFromTimeZone,
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

  it('guessOnboardingCountryCode respects allowed set', () => {
    expect(
      guessOnboardingCountryCode('Asia/Jerusalem', new Set(['US', 'GB'])),
    ).toBeNull();
    expect(
      guessOnboardingCountryCode('Asia/Jerusalem', new Set(['IL', 'US'])),
    ).toBe('IL');
  });
});

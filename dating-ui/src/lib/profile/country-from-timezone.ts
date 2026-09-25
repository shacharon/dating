/**
 * Guess ISO country from IANA timezone (Sprint 75 Story 3).
 * Unmapped zones return null — user picks country manually.
 */

const TIME_ZONE_TO_COUNTRY: Record<string, string> = {
  'Asia/Jerusalem': 'IL',
  'Asia/Tel_Aviv': 'IL',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL',
  'America/Bogota': 'CO',
  'America/Lima': 'PE',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT',
  'Europe/Stockholm': 'SE',
  'Europe/Copenhagen': 'DK',
  'Europe/Helsinki': 'FI',
  'Europe/Athens': 'GR',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Lisbon': 'PT',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ',
};

/** Map IANA TZ → ISO 3166-1 alpha-2; return null if unknown. */
export function countryCodeFromTimeZone(timeZone: string): string | null {
  const code = TIME_ZONE_TO_COUNTRY[timeZone];
  return code ?? null;
}

/** Empty-country default: Hebrew → IL, English and Spanish → US. */
export function defaultOnboardingCountryCode(
  locale: string,
  allowedCodes?: ReadonlySet<string>,
): string | null {
  const code = locale === 'he' ? 'IL' : 'US';
  if (allowedCodes && !allowedCodes.has(code)) return null;
  return code;
}

export function guessOnboardingCountryCode(
  timeZone?: string,
  allowedCodes?: ReadonlySet<string>,
): string | null {
  const tz =
    timeZone?.trim() ||
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : '');
  if (!tz) return null;
  const code = countryCodeFromTimeZone(tz);
  if (!code) return null;
  if (allowedCodes && !allowedCodes.has(code)) return null;
  return code;
}

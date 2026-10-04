import { apiUrl } from '@/lib/api/api-base';

/** Tracked landing prefixes. Keep in sync with dating-api LANDING_ENTRIES. */
export const LANDING_PREFIX_ENTRIES: Readonly<Record<string, string>> = {
  '/reg': 'reg',
};

export function landingEntryForPath(pathname: string): string | null {
  return LANDING_PREFIX_ENTRIES[pathname] ?? null;
}

/** Fire-and-forget landing-open count. Never throws; never blocks the redirect. */
export function reportLandingOpen(entry: string): Promise<void> {
  return fetch(apiUrl('/api/v1/public/funnel/landing-open'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
    signal: AbortSignal.timeout(2000),
  }).then(
    () => undefined,
    () => undefined,
  );
}

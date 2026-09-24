import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Legacy `/onboarding/basic` → `/onboarding/basics` (Sprint 75).
 * Drops obsolete `tab` query; keeps `edit` and other params.
 */
export default async function OnboardingBasicRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const params = await Promise.resolve(searchParams);
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (key === 'tab') continue;
    if (typeof value === 'string') {
      qs.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        qs.append(key, item);
      }
    }
  }
  const q = qs.toString();
  redirect(q ? `/onboarding/basics?${q}` : '/onboarding/basics');
}

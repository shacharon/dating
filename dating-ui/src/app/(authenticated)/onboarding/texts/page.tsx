import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Legacy `/onboarding/texts` → `/onboarding/story` (Sprint 75 Story 1).
 * Server redirect preserves query (e.g. `?edit=1`).
 */
export default async function OnboardingTextsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams> | SearchParams;
}) {
  const params = await Promise.resolve(searchParams);
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (typeof value === 'string') {
      qs.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        qs.append(key, item);
      }
    }
  }
  const q = qs.toString();
  redirect(q ? `/onboarding/story?${q}` : '/onboarding/story');
}

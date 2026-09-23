'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Legacy `/onboarding/texts` → `/onboarding/story` (Sprint 75 Story 1).
 * Preserves `?edit=1` and any other query params.
 */
export default function OnboardingTextsRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(qs ? `/onboarding/story?${qs}` : '/onboarding/story');
  }, [router, searchParams]);

  return (
    <p className="p-6 text-sm text-zinc-600 dark:text-zinc-400" role="status">
      Redirecting…
    </p>
  );
}

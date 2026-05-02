'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { fetchMyProfile } from '@/lib/me-profile-api';
import { onboardingResumePath } from '@/lib/onboarding-path';

/** `/onboarding` entry: sends the user to the right step from `GET /api/v1/me/profile`. */
export function OnboardingIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await fetchMyProfile();
        if (cancelled) return;
        router.replace(onboardingResumePath(profile));
      } catch {
        if (!cancelled) {
          router.replace('/onboarding/basic');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
  );
}

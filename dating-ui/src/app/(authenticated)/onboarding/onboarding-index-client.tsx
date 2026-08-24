"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppLocale } from "@/lib/i18n";
import { onboardingResumePath } from "@/lib/profile/onboarding-path";
import { useProfile } from "@/hooks/use-profile";

/**
 * `/onboarding` index — resume to the correct step (or profile if complete).
 * Colocated under the route folder (Story 33.4).
 */
export function OnboardingIndexClient() {
  const router = useRouter();
  const { copy } = useAppLocale();
  const { profile, isLoading, error: profileError } = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (isLoading || redirected) return;
    if (profileError) {
      setError(copy.onboarding.loadFailed);
      return;
    }
    setRedirected(true);
    router.replace(onboardingResumePath(profile));
  }, [profile, isLoading, profileError, router, copy.onboarding.loadFailed, redirected]);

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {error}
      </p>
    );
  }

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      {copy.appShell.redirecting}
    </p>
  );
}

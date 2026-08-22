"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { onboardingResumePath } from "@/lib/onboarding-path";
import { useProfile } from "@/hooks/use-profile";

/**
 * `/onboarding` index — resume to the correct step (or profile if complete).
 * Colocated under the route folder (Story 33.4).
 */
export function OnboardingIndexClient() {
  const router = useRouter();
  const t = useTranslations("Onboarding");
  const { profile, isLoading, error: profileError } = useProfile();
  const [error, setError] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (isLoading || redirected) return;
    if (profileError) {
      setError(t("loadError"));
      return;
    }
    setRedirected(true);
    router.replace(onboardingResumePath(profile));
  }, [profile, isLoading, profileError, router, t, redirected]);

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {error}
      </p>
    );
  }

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("redirecting")}</p>
  );
}

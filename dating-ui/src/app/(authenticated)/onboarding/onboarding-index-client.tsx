"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getMyProfile } from "@/lib/me-profile-api";
import { onboardingResumePath } from "@/lib/onboarding-resume";

/**
 * `/onboarding` index — resume to the correct step (or profile if complete).
 * Colocated under the route folder (Story 33.4).
 */
export function OnboardingIndexClient() {
  const router = useRouter();
  const t = useTranslations("Onboarding");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await getMyProfile();
        if (cancelled) return;
        router.replace(onboardingResumePath(profile));
      } catch {
        if (cancelled) return;
        setError(t("loadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, t]);

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

"use client";

import { useAppLocale } from "@/lib/i18n";

export function OnboardingPageHeading({ step }: { step: "basic" | "texts" }) {
  const { copy: appCopy } = useAppLocale();
  const copy = appCopy.onboarding;
  const title = step === "basic" ? copy.basicsTitle : copy.storyTitle;
  const subtitle = step === "basic" ? copy.basicsSubtitle : copy.storySubtitle;

  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {subtitle}
      </p>
    </header>
  );
}

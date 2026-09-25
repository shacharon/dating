'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useAppLocale } from '@/lib/i18n';
import { OnboardingStepper } from './onboarding-stepper';
import { onboardingUiStepFromPathname } from './onboarding-step';

export function OnboardingHeader() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const editMode = searchParams.get('edit') === '1';
  const current = onboardingUiStepFromPathname(pathname);
  const { copy: appCopy } = useAppLocale();

  const copy = appCopy.onboarding;

  return (
    <header
      className="border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
      data-testid="onboarding-header"
    >
      <div
        className="mx-auto flex max-w-xl items-center justify-center gap-2 px-3 py-2 sm:px-4"
        role="navigation"
        aria-label={copy.header.aria}
      >
        <OnboardingStepper
          current={current}
          editMode={editMode}
          copy={copy}
        />
      </div>
    </header>
  );
}

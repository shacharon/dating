'use client';

import Link from 'next/link';
import type { AppCopySchema } from '@/lib/i18n';
import {
  canNavigateOnboardingStep,
  isOnboardingStepFilled,
  type OnboardingUiStep,
} from './onboarding-step';

const STEPS: { id: OnboardingUiStep; href: string }[] = [
  { id: 'basic', href: '/onboarding/basic' },
  { id: 'texts', href: '/onboarding/texts' },
];

export function OnboardingStepper({
  current,
  editMode,
  copy,
}: {
  current: OnboardingUiStep | null;
  editMode: boolean;
  copy: AppCopySchema['onboarding'];
}) {
  const labels: Record<OnboardingUiStep, string> = {
    basic: copy.stepBasic,
    texts: copy.stepTexts,
  };

  return (
    <ol className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2">
      {STEPS.map((step, index) => {
        const filled = isOnboardingStepFilled(step.id, current);
        const isCurrent = current === step.id;
        const navigable = canNavigateOnboardingStep(step.id, current);
        const href =
          editMode && navigable ? `${step.href}?edit=1` : step.href;

        const node = (
          <span className="flex flex-col items-center gap-0.5">
            <span
              className={`flex h-3 w-3 rounded-full border-2 ${
                filled
                  ? 'border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100'
                  : 'border-zinc-400 bg-transparent dark:border-zinc-500'
              }`}
              aria-hidden
            />
            <span
              className={`max-w-[4.5rem] truncate text-[10px] font-medium sm:max-w-none sm:text-xs ${
                isCurrent
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {labels[step.id]}
            </span>
          </span>
        );

        return (
          <li key={step.id} className="flex items-center gap-1 sm:gap-2">
            {index > 0 ? (
              <span
                className={`mb-4 h-0.5 w-6 sm:w-10 ${
                  current === 'texts'
                    ? 'bg-zinc-900 dark:bg-zinc-100'
                    : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
                aria-hidden
              />
            ) : null}
            {navigable ? (
              <Link
                href={href}
                className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100"
                aria-current={isCurrent ? 'step' : undefined}
              >
                {node}
              </Link>
            ) : (
              <span aria-current={isCurrent ? 'step' : undefined}>{node}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AppCopySchema } from '@/lib/i18n';
import { useOnboardingAutosave } from './onboarding-autosave';
import {
  canNavigateOnboardingStep,
  isOnboardingStepFilled,
  onboardingStepHref,
  type OnboardingUiStep,
} from './onboarding-step';

const STEPS: { id: OnboardingUiStep; labelKey: OnboardingUiStep }[] = [
  { id: 'story', labelKey: 'story' },
  { id: 'facts', labelKey: 'facts' },
  { id: 'preferences', labelKey: 'preferences' },
  { id: 'photos', labelKey: 'photos' },
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
  const router = useRouter();
  const autosave = useOnboardingAutosave();
  const labels: Record<OnboardingUiStep, string> = {
    story: copy.tabs.story,
    facts: copy.tabs.facts,
    preferences: copy.tabs.preferences,
    photos: copy.tabs.photos,
  };

  return (
    <ol
      className="flex min-w-0 flex-1 items-center justify-center gap-1 sm:gap-2"
      aria-label={copy.header.aria}
    >
      {STEPS.map((step, index) => {
        const filled = isOnboardingStepFilled(step.id, current);
        const isCurrent = current === step.id;
        const navigable = canNavigateOnboardingStep(step.id, current);
        const href = onboardingStepHref(step.id, editMode);
        const stepName = labels[step.id];

        const node = (
          <span className="flex flex-col items-center justify-center gap-0.5">
            <span
              className={`flex h-3 w-3 rounded-full border-2 ${
                filled
                  ? 'border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100'
                  : 'border-zinc-400 bg-transparent dark:border-zinc-500'
              }`}
              aria-hidden
            />
            <span
              className={`max-w-[3.25rem] truncate text-xs font-medium min-[400px]:max-w-[4.5rem] sm:max-w-none ${
                isCurrent
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {stepName}
            </span>
          </span>
        );

        const stepClassName =
          'inline-flex min-h-11 min-w-[3.25rem] items-center justify-center rounded px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:focus-visible:outline-zinc-100';

        return (
          <li key={step.id} className="flex items-center gap-1 sm:gap-2">
            {index > 0 ? (
              <span
                className={`mb-4 h-0.5 w-2 sm:w-10 ${
                  filled || isCurrent
                    ? 'bg-zinc-900 dark:bg-zinc-100'
                    : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
                aria-hidden
              />
            ) : null}
            {navigable ? (
              <Link
                href={href}
                className={stepClassName}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={stepName}
                onClick={(event) => {
                  if (isCurrent) return;
                  event.preventDefault();
                  void (async () => {
                    await autosave?.flush();
                    router.push(href);
                  })();
                }}
              >
                {node}
              </Link>
            ) : (
              <span
                className={stepClassName}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {node}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

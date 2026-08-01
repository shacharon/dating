'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  APP_LOCALE_CHANGE_EVENT,
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  getCopy,
  readStoredLocale,
  type AppLocale,
} from '@/lib/i18n';
import { ExitConfirmationDialog } from './exit-confirmation-dialog';
import { OnboardingStepper } from './onboarding-stepper';
import { onboardingUiStepFromPathname } from './onboarding-step';

function leaveDestination(editMode: boolean): string {
  return editMode ? '/profile' : '/dating/me-matches';
}

export function OnboardingHeader() {
  const pathname = usePathname() ?? '';
  const searchParams = useSearchParams();
  const router = useRouter();
  const editMode = searchParams.get('edit') === '1';
  const current = onboardingUiStepFromPathname(pathname);

  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE);
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    setLocale(readStoredLocale());
    const onLocaleChanged = (event: Event) => {
      const e = event as CustomEvent<AppLocale>;
      setLocale(e.detail ?? readStoredLocale());
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === APP_LOCALE_STORAGE_KEY) {
        setLocale(readStoredLocale());
      }
    };
    window.addEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(APP_LOCALE_CHANGE_EVENT, onLocaleChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const copy = getCopy(locale).onboarding;
  const dest = leaveDestination(editMode);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
        data-testid="onboarding-header"
      >
        <div
          className="mx-auto flex max-w-xl items-center gap-2 px-3 py-2 sm:px-4"
          role="navigation"
          aria-label={copy.header.aria}
        >
          <button
            type="button"
            data-testid="onboarding-exit"
            onClick={() => setExitOpen(true)}
            className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            ← {copy.header.exit}
          </button>

          <OnboardingStepper
            current={current}
            editMode={editMode}
            copy={copy}
          />

          {editMode ? (
            <span className="inline-block min-h-11 min-w-[5.5rem] shrink-0" aria-hidden />
          ) : (
            <button
              type="button"
              data-testid="onboarding-skip"
              onClick={() => router.push(dest)}
              className="inline-flex min-h-11 shrink-0 items-center justify-end rounded-md px-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              {copy.header.skip}
            </button>
          )}
        </div>
      </header>

      <ExitConfirmationDialog
        open={exitOpen}
        copy={copy.exitDialog}
        onCancel={() => setExitOpen(false)}
        onConfirm={() => {
          setExitOpen(false);
          router.push(dest);
        }}
      />
    </>
  );
}

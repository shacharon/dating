'use client';

import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { OnboardingHeader } from '@/components/onboarding/onboarding-header';

/**
 * First-time onboarding: fixed progress header, no AppNav (shell hides it).
 * Edit mode (`?edit=1`): no progress chrome — AppNav stays visible from the shell.
 */
export function OnboardingChrome({ children }: { children: ReactNode }) {
  const editMode = useSearchParams().get('edit') === '1';

  if (editMode) {
    return <>{children}</>;
  }

  return (
    <>
      <OnboardingHeader />
      <main className="pt-20">{children}</main>
    </>
  );
}
